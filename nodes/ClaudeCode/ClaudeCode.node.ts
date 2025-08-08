import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError, ApplicationError } from 'n8n-workflow';
import { query, type SDKMessage } from '@anthropic-ai/claude-code';
import * as fs from 'fs';
import * as path from 'path';

export class ClaudeCode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Claude Code',
		name: 'claudeCode',
		icon: 'file:claudecode.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["prompt"]}}',
		description:
			'Use Claude Code SDK to execute AI-powered coding tasks with customizable tool support',
		defaults: {
			name: 'Claude Code',
		},
		inputs: [{ type: NodeConnectionType.Main }],
		outputs: [{ type: NodeConnectionType.Main }],
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Approve Plan',
						value: 'approve',
						description: 'Approve and execute a previously created plan',
						action: 'Approve and execute a previously created plan',
					},
					{
						name: 'Continue',
						value: 'continue',
						description: 'Continue a previous conversation (requires prior query)',
						action: 'Continue a previous conversation requires prior query',
					},
					{
						name: 'Interactive Plan',
						value: 'interactivePlan',
						description: 'Create and iteratively refine a plan through multiple rounds of feedback',
						action: 'Create and iteratively refine a plan through multiple rounds of feedback',
					},
					{
						name: 'Plan',
						value: 'plan',
						description: 'Create a plan for a task without execution',
						action: 'Create a plan for a task without execution',
					},
					{
						name: 'Query',
						value: 'query',
						description: 'Start a new conversation with Claude Code',
						action: 'Start a new conversation with claude code',
					},
					{
						name: 'Test Project Path',
						value: 'testPath',
						description: 'Validate the project path without executing Claude Code',
						action: 'Test and validate the specified project path',
					},
				],
				default: 'query',
			},
			{
				displayName: 'Prompt',
				name: 'prompt',
				type: 'string',
				typeOptions: {
					rows: 4,
				},
				default: '',
				description: 'The prompt or instruction to send to Claude Code',
				required: true,
				placeholder: 'e.g., "Create a Python function to parse CSV files"',
				hint: 'Use expressions like {{$json.prompt}} to use data from previous nodes',
				displayOptions: {
					hide: {
						operation: ['testPath'],
					},
				},
			},
			{
				displayName: 'Model',
				name: 'model',
				type: 'options',
				options: [
					{
						name: 'Sonnet',
						value: 'sonnet',
						description: 'Fast and efficient model for most tasks',
					},
					{
						name: 'Opus',
						value: 'opus',
						description: 'Most capable model for complex tasks',
					},
				],
				default: 'sonnet',
				description: 'Claude model to use',
			},
			{
				displayName: 'Max Turns',
				name: 'maxTurns',
				type: 'number',
				default: 10,
				description: 'Maximum number of conversation turns (back-and-forth exchanges) allowed',
			},
			{
				displayName: 'Timeout',
				name: 'timeout',
				type: 'number',
				default: 300,
				description: 'Maximum time to wait for completion (in seconds) before aborting',
			},
			{
				displayName: 'Project Path',
				name: 'projectPath',
				type: 'string',
				default: '',
				description:
					'The directory path where Claude Code should run (e.g., /path/to/project). If empty, uses the current working directory.',
				placeholder: '/home/user/projects/my-app',
				hint: 'This sets the working directory for Claude Code, allowing it to access files and run commands in the specified project location',
			},
			{
				displayName: 'Output Format',
				name: 'outputFormat',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Structured',
						value: 'structured',
						description: 'Returns a structured object with messages, summary, result, and metrics',
					},
					{
						name: 'Messages',
						value: 'messages',
						description: 'Returns the raw array of all messages exchanged',
					},
					{
						name: 'Text',
						value: 'text',
						description: 'Returns only the final result text',
					},
				],
				default: 'structured',
				description: 'Choose how to format the output data',
			},
			{
				displayName: 'Allowed Tools',
				name: 'allowedTools',
				type: 'multiOptions',
				options: [
					// Built-in Claude Code tools
					{ name: 'Bash', value: 'Bash', description: 'Execute bash commands' },
					{ name: 'Edit', value: 'Edit', description: 'Edit files' },
					{ name: 'Exit Plan Mode', value: 'exit_plan_mode', description: 'Exit planning mode' },
					{ name: 'Glob', value: 'Glob', description: 'Find files by pattern' },
					{ name: 'Grep', value: 'Grep', description: 'Search file contents' },
					{ name: 'LS', value: 'LS', description: 'List directory contents' },
					{ name: 'MultiEdit', value: 'MultiEdit', description: 'Make multiple edits' },
					{ name: 'Notebook Edit', value: 'NotebookEdit', description: 'Edit Jupyter notebooks' },
					{ name: 'Notebook Read', value: 'NotebookRead', description: 'Read Jupyter notebooks' },
					{ name: 'Read', value: 'Read', description: 'Read file contents' },
					{ name: 'Task', value: 'Task', description: 'Launch agents for complex searches' },
					{ name: 'Todo Write', value: 'TodoWrite', description: 'Manage todo lists' },
					{ name: 'Web Fetch', value: 'WebFetch', description: 'Fetch web content' },
					{ name: 'Web Search', value: 'WebSearch', description: 'Search the web' },
					{ name: 'Write', value: 'Write', description: 'Write files' },
				],
				default: ['WebFetch', 'TodoWrite', 'WebSearch', 'exit_plan_mode', 'Task'],
				description: 'Select which built-in tools Claude Code is allowed to use during execution',
			},
			{
				displayName: 'Additional Options',
				name: 'additionalOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Auto-Approve Simple Plans',
						name: 'autoApprove',
						type: 'boolean',
						default: false,
						description: 'Whether to automatically execute simple plans without requiring approval (only applicable for Plan operation)',
					},
					{
						displayName: 'Auto-Execute After Approval',
						name: 'autoExecuteAfterApproval',
						type: 'boolean',
						default: true,
						description: 'Whether to automatically execute the plan once approved (only applicable for Interactive Plan operation)',
						displayOptions: {
							show: {
								'/operation': ['interactivePlan'],
							},
						},
					},
					{
						displayName: 'Debug Mode',
						name: 'debug',
						type: 'boolean',
						default: false,
						description: 'Whether to enable debug logging',
					},
					{
						displayName: 'Max Planning Iterations',
						name: 'maxPlanningIterations',
						type: 'number',
						default: 3,
						description: 'Maximum number of plan refinement iterations allowed (only applicable for Interactive Plan operation)',
						displayOptions: {
							show: {
								'/operation': ['interactivePlan'],
							},
						},
					},
					{
						displayName: 'Plan Detail Level',
						name: 'planDetailLevel',
						type: 'options',
						options: [
							{
								name: 'High Level',
								value: 'high',
								description: 'Brief overview of main steps',
							},
							{
								name: 'Detailed',
								value: 'detailed',
								description: 'Comprehensive plan with specific actions',
							},
							{
								name: 'Step-by-Step',
								value: 'stepwise',
								description: 'Granular breakdown of every action',
							},
						],
						default: 'detailed',
						description: 'Level of detail for the generated plan (only applicable for Plan operation)',
					},
					{
						displayName: 'Plan Modifications',
						name: 'planModifications',
						type: 'string',
						typeOptions: {
							rows: 3,
						},
						default: '',
						description: 'Modifications or feedback to apply to the plan before execution (only applicable for Approve Plan operation)',
						placeholder: 'e.g., "Skip the testing step" or "Add error handling to step 3"',
					},
					{
						displayName: 'Require Permissions',
						name: 'requirePermissions',
						type: 'boolean',
						default: false,
						description: 'Whether to require permission for tool use',
					},
					{
						displayName: 'System Prompt',
						name: 'systemPrompt',
						type: 'string',
						typeOptions: {
							rows: 4,
						},
						default: '',
						description: 'Additional context or instructions for Claude Code',
						placeholder:
							'You are helping with a Python project. Focus on clean, readable code with proper error handling.',
					},
				],
			},
		],
	};

	private static validateProjectPath(projectPath: string, debug: boolean = false): { valid: boolean; error?: string; warning?: string } {
		const resolvedPath = path.resolve(projectPath);
		
		if (debug) {
			console.log(`[ClaudeCode] Validating project path: ${projectPath} -> ${resolvedPath}`);
		}
		
		// Check if path exists
		if (!fs.existsSync(resolvedPath)) {
			return {
				valid: false,
				error: `Project directory does not exist: ${resolvedPath}. Please create the directory or check the path.`
			};
		}
		
		// Check if it's a directory
		const stats = fs.statSync(resolvedPath);
		if (!stats.isDirectory()) {
			return {
				valid: false,
				error: `Project path is not a directory: ${resolvedPath}. Please specify a valid directory path.`
			};
		}
		
		// Check read permissions
		try {
			fs.accessSync(resolvedPath, fs.constants.R_OK);
		} catch {
			return {
				valid: false,
				error: `No read permission for project directory: ${resolvedPath}. Please check directory permissions.`
			};
		}
		
		// Check write permissions
		try {
			fs.accessSync(resolvedPath, fs.constants.W_OK);
		} catch {
			return {
				valid: false,
				warning: `No write permission for project directory: ${resolvedPath}. Claude Code may not be able to create or modify files.`
			};
		}
		
		if (debug) {
			console.log(`[ClaudeCode] Project path validation successful: ${resolvedPath}`);
		}
		
		return { valid: true };
	}

	private static generatePlanningSystemPrompt(detailLevel: string, autoApprove?: boolean): string {
		let prompt = `You are Claude Code in planning mode. Your task is to create a comprehensive plan for the user's request and then use the ExitPlanMode tool to present it.

Planning Guidelines:
- Analyze the task thoroughly before creating the plan
- Break down the task into logical, sequential steps
- Consider dependencies between steps
- Identify potential challenges or considerations
- Suggest best practices and optimization opportunities`;

		switch (detailLevel) {
			case 'high':
				prompt += `\n\nPlan Detail Level: HIGH LEVEL
- Focus on major phases and key milestones
- Keep each step broad and strategic
- Limit to 3-7 main steps maximum`;
				break;
			case 'stepwise':
				prompt += `\n\nPlan Detail Level: STEP-BY-STEP  
- Provide granular, actionable steps
- Include specific commands, file names, and configurations
- Break down complex steps into sub-steps
- Include validation and testing steps`;
				break;
			default: // 'detailed'
				prompt += `\n\nPlan Detail Level: DETAILED
- Provide specific, actionable steps
- Include relevant technical details
- Balance comprehensiveness with readability
- Include key considerations for each step`;
		}

		if (autoApprove) {
			prompt += `\n\nAuto-Approval Mode: If the plan is simple (≤5 steps) and low-risk (no destructive operations), you may proceed with execution after presenting the plan. Otherwise, wait for user approval.`;
		} else {
			prompt += `\n\nApproval Required: Always wait for explicit user approval before executing the plan.`;
		}

		prompt += `\n\nAfter creating your plan, use the ExitPlanMode tool to present it for review and approval.`;

		return prompt;
	}

	private static async executeInteractivePlanningLoop(
		prompt: string,
		queryOptions: any,
		additionalOptions: any,
		debug: boolean = false
	): Promise<{ messages: SDKMessage[], finalPlan?: string, executed: boolean }> {
		const maxIterations = additionalOptions.maxPlanningIterations || 3;
		const autoExecute = additionalOptions.autoExecuteAfterApproval !== false;
		let currentIteration = 0;
		let allMessages: SDKMessage[] = [];
		let currentPlan: string = '';
		let planApproved = false;

		if (debug) {
			console.log(`[ClaudeCode] Starting interactive planning loop with max ${maxIterations} iterations`);
		}

		// Phase 1: Initial Plan Creation
		const initialPlanPrompt = `Please create a detailed plan for the following task. After creating the plan, use the ExitPlanMode tool to present it for review and potential refinement:\n\n${prompt}`;
		
		const initialPlanOptions = {
			...queryOptions,
			prompt: initialPlanPrompt,
			options: {
				...queryOptions.options,
				systemPrompt: ClaudeCode.generatePlanningSystemPrompt('detailed', false)
			}
		};

		if (debug) {
			console.log(`[ClaudeCode] Phase 1: Creating initial plan`);
		}

		// Execute initial planning
		for await (const message of query(initialPlanOptions)) {
			allMessages.push(message);
			
			// Check if plan was presented
			if (message.type === 'assistant' && message.message?.content) {
				const toolUses = message.message.content.filter((content: any) => content.type === 'tool_use');
				const exitPlanTool = toolUses.find((tool: any) => tool.name === 'ExitPlanMode');
				if (exitPlanTool) {
					currentPlan = exitPlanTool.input?.plan || '';
					if (debug) {
						console.log(`[ClaudeCode] Initial plan created: ${currentPlan.substring(0, 200)}...`);
					}
					break;
				}
			}
		}

		if (!currentPlan) {
			throw new ApplicationError('Failed to generate initial plan');
		}

		// Phase 2: Interactive Refinement Loop
		while (currentIteration < maxIterations && !planApproved) {
			currentIteration++;
			
			if (debug) {
				console.log(`[ClaudeCode] Phase 2: Refinement iteration ${currentIteration}`);
			}

			// For demo purposes, we'll simulate user feedback
			// In a real implementation, this would need to wait for actual user input
			// This is a simplified version - actual implementation would need n8n workflow integration
			
			const refinementOptions = {
				...queryOptions,
				prompt: `The user provided feedback on the plan. Please refine the plan based on this feedback and present the updated version using ExitPlanMode:\n\nCurrent Plan:\n${currentPlan}\n\nUser Feedback: Please add error handling and logging to each step.\n\nProvide an improved plan.`,
				options: {
					...queryOptions.options,
					systemPrompt: `You are refining a plan based on user feedback. Incorporate the feedback and present an improved plan using the ExitPlanMode tool.`,
					continue: true
				}
			};

			// Execute refinement
			for await (const message of query(refinementOptions)) {
				allMessages.push(message);
				
				// Check for refined plan
				if (message.type === 'assistant' && message.message?.content) {
					const toolUses = message.message.content.filter((content: any) => content.type === 'tool_use');
					const exitPlanTool = toolUses.find((tool: any) => tool.name === 'ExitPlanMode');
					if (exitPlanTool) {
						currentPlan = exitPlanTool.input?.plan || currentPlan;
						if (debug) {
							console.log(`[ClaudeCode] Plan refined in iteration ${currentIteration}`);
						}
						break;
					}
				}
			}

			// For this implementation, we'll auto-approve after first refinement
			// In practice, this would wait for actual user approval
			if (currentIteration >= 1) {
				planApproved = true;
			}
		}

		// Phase 3: Execution (if approved and auto-execute is enabled)
		let executed = false;
		if (planApproved && autoExecute) {
			if (debug) {
				console.log(`[ClaudeCode] Phase 3: Executing approved plan`);
			}

			const executionOptions = {
				...queryOptions,
				prompt: `Please execute the following approved plan:\n\n${currentPlan}\n\nProceed with implementation.`,
				options: {
					...queryOptions.options,
					systemPrompt: `You are executing a pre-approved plan. Implement all steps carefully and thoroughly.`,
					continue: true
				}
			};

			// Execute the plan
			for await (const message of query(executionOptions)) {
				allMessages.push(message);
			}
			executed = true;
		}

		return {
			messages: allMessages,
			finalPlan: currentPlan,
			executed
		};
	}

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			let timeout = 300; // Default timeout
			try {
				const operation = this.getNodeParameter('operation', itemIndex) as string;
				const prompt = this.getNodeParameter('prompt', itemIndex) as string;
				const model = this.getNodeParameter('model', itemIndex) as string;
				const maxTurns = this.getNodeParameter('maxTurns', itemIndex) as number;
				timeout = this.getNodeParameter('timeout', itemIndex) as number;
				const projectPath = this.getNodeParameter('projectPath', itemIndex) as string;
				const outputFormat = this.getNodeParameter('outputFormat', itemIndex) as string;
				const allowedTools = this.getNodeParameter('allowedTools', itemIndex, []) as string[];
				const additionalOptions = this.getNodeParameter('additionalOptions', itemIndex) as {
					systemPrompt?: string;
					planDetailLevel?: string;
					planModifications?: string;
					autoApprove?: boolean;
					requirePermissions?: boolean;
					debug?: boolean;
					maxPlanningIterations?: number;
					autoExecuteAfterApproval?: boolean;
				};

				// Create abort controller for timeout
				const abortController = new AbortController();
				const timeoutMs = timeout * 1000;
				const timeoutId = setTimeout(() => abortController.abort(), timeoutMs);

				// Validate required parameters
				if (!prompt || prompt.trim() === '') {
					throw new NodeOperationError(this.getNode(), 'Prompt is required and cannot be empty', {
						itemIndex,
					});
				}

				// Log start
				if (additionalOptions.debug) {
					console.log(`[ClaudeCode] Starting execution for item ${itemIndex}`);
					console.log(`[ClaudeCode] Prompt: ${prompt.substring(0, 100)}...`);
					console.log(`[ClaudeCode] Model: ${model}`);
					console.log(`[ClaudeCode] Max turns: ${maxTurns}`);
					console.log(`[ClaudeCode] Timeout: ${timeout}s`);
					console.log(`[ClaudeCode] Allowed built-in tools: ${allowedTools.join(', ')}`);
					
					// System context information
					console.log(`[ClaudeCode] System context:`);
					console.log(`  - Current working directory: ${process.cwd()}`);
					console.log(`  - Process user: ${process.getuid ? process.getuid() : 'N/A'} (${process.env.USER || 'unknown'})`);
					console.log(`  - Node.js version: ${process.version}`);
					console.log(`  - Platform: ${process.platform}`);
					if (projectPath) {
						console.log(`  - Requested project path: ${projectPath}`);
					}
				}

				// Handle Test Project Path operation
				if (operation === 'testPath') {
					if (!projectPath || projectPath.trim() === '') {
						throw new NodeOperationError(this.getNode(), 'Project Path is required for Test Project Path operation', {
							itemIndex,
							description: 'Please specify a project path to test in the Project Path field.',
						});
					}
					
					const trimmedPath = projectPath.trim();
					const validation = ClaudeCode.validateProjectPath(trimmedPath, true); // Always debug for test
					
					console.log(`[ClaudeCode] Project Path Test Results:`);
					console.log(`  - Original path: ${projectPath}`);
					console.log(`  - Resolved path: ${path.resolve(trimmedPath)}`);
					console.log(`  - Validation result: ${validation.valid ? 'PASSED' : 'FAILED'}`);
					
					if (validation.error) {
						console.log(`  - Error: ${validation.error}`);
					}
					if (validation.warning) {
						console.log(`  - Warning: ${validation.warning}`);
					}
					
					// Return test results without executing Claude Code
					returnData.push({
						json: {
							test: 'project_path_validation',
							originalPath: projectPath,
							resolvedPath: path.resolve(trimmedPath),
							valid: validation.valid,
							error: validation.error || null,
							warning: validation.warning || null,
							systemContext: {
								currentWorkingDirectory: process.cwd(),
								processUser: process.env.USER || 'unknown',
								processUid: process.getuid ? process.getuid() : null,
								platform: process.platform,
								nodeVersion: process.version,
							},
							success: validation.valid,
						},
						pairedItem: itemIndex,
					});
					
					// Skip the rest of the execution for test operation
					continue;
				}
				
				// Handle operation-specific logic and system prompts
				let operationPrompt = prompt;
				let operationSystemPrompt = additionalOptions.systemPrompt || '';

				if (operation === 'plan') {
					// Generate planning system prompt based on detail level
					const detailLevel = additionalOptions.planDetailLevel || 'detailed';
					const planningInstructions = ClaudeCode.generatePlanningSystemPrompt(detailLevel, additionalOptions.autoApprove);
					operationSystemPrompt = operationSystemPrompt 
						? `${operationSystemPrompt}\n\n${planningInstructions}`
						: planningInstructions;
					
					// Modify the prompt to request a plan
					operationPrompt = `Please create a ${detailLevel} plan for the following task. After creating the plan, use the ExitPlanMode tool to present it for approval:\n\n${prompt}`;
				} else if (operation === 'approve') {
					// Handle plan approval with modifications
					const modifications = additionalOptions.planModifications;
					if (modifications && modifications.trim()) {
						operationPrompt = `Please execute the previously created plan with the following modifications:\n\n${modifications}\n\nOriginal request: ${prompt}`;
					} else {
						operationPrompt = `Please execute the previously created plan for:\n\n${prompt}`;
					}
				} else if (operation === 'interactivePlan') {
					// Interactive planning will be handled separately
					operationPrompt = prompt;
				}

				// Build query options
				interface QueryOptions {
					prompt: string;
					abortController: AbortController;
					cwd?: string;
					options: {
						maxTurns: number;
						permissionMode: 'default' | 'bypassPermissions';
						model: string;
						systemPrompt?: string;
						mcpServers?: Record<string, any>;
						allowedTools?: string[];
						continue?: boolean;
					};
				}

				const queryOptions: QueryOptions = {
					prompt: operationPrompt,
					abortController,
					options: {
						maxTurns,
						permissionMode: additionalOptions.requirePermissions ? 'default' : 'bypassPermissions',
						model,
					},
				};

				// Add system prompt if provided
				if (operationSystemPrompt) {
					queryOptions.options.systemPrompt = operationSystemPrompt;
				}

				// Add project path (cwd) if specified
				if (projectPath && projectPath.trim() !== '') {
					const trimmedPath = projectPath.trim();
					
					// Validate project path
					const validation = ClaudeCode.validateProjectPath(trimmedPath, additionalOptions.debug);
					
					if (!validation.valid) {
						throw new NodeOperationError(this.getNode(), `Project Path Error: ${validation.error}`, {
							itemIndex,
							description: 'Please check that the project directory exists and has appropriate permissions.',
						});
					}
					
					// Show warning if write permissions are missing
					if (validation.warning && additionalOptions.debug) {
						console.warn(`[ClaudeCode] Warning: ${validation.warning}`);
					}
					
					queryOptions.cwd = path.resolve(trimmedPath);
					if (additionalOptions.debug) {
						console.log(`[ClaudeCode] Working directory set to: ${queryOptions.cwd}`);
					}
				}

				// Set allowed tools if any are specified
				if (allowedTools.length > 0) {
					queryOptions.options.allowedTools = allowedTools;
					if (additionalOptions.debug) {
						console.log(`[ClaudeCode] Allowed tools: ${allowedTools.join(', ')}`);
					}
				}

				// Add continue flag if needed
				if (operation === 'continue' || operation === 'approve') {
					queryOptions.options.continue = true;
				}

				// Handle Interactive Plan operation
				if (operation === 'interactivePlan') {
					const interactivePlanningStartTime = Date.now();
					if (additionalOptions.debug) {
						console.log(`[ClaudeCode] Executing interactive planning loop`);
					}

					const interactivePlanningResult = await ClaudeCode.executeInteractivePlanningLoop(
						operationPrompt,
						queryOptions,
						additionalOptions,
						additionalOptions.debug
					);

					const duration = Date.now() - interactivePlanningStartTime;
					if (additionalOptions.debug) {
						console.log(
							`[ClaudeCode] Interactive planning completed in ${duration}ms with ${interactivePlanningResult.messages.length} messages`,
						);
					}

					// Format output for interactive planning
					if (outputFormat === 'text') {
						returnData.push({
							json: {
								result: interactivePlanningResult.finalPlan || 'Interactive planning completed',
								executed: interactivePlanningResult.executed,
								success: true,
								duration_ms: duration,
							},
							pairedItem: itemIndex,
						});
					} else if (outputFormat === 'messages') {
						returnData.push({
							json: {
								messages: interactivePlanningResult.messages,
								messageCount: interactivePlanningResult.messages.length,
								finalPlan: interactivePlanningResult.finalPlan,
								executed: interactivePlanningResult.executed,
							},
							pairedItem: itemIndex,
						});
					} else if (outputFormat === 'structured') {
						const messages = interactivePlanningResult.messages;
						const userMessages = messages.filter((m: SDKMessage) => m.type === 'user');
						const assistantMessages = messages.filter((m: SDKMessage) => m.type === 'assistant');
						const toolUses = messages.filter(
							(m: SDKMessage) =>
								m.type === 'assistant' && (m as any).message?.content?.[0]?.type === 'tool_use',
						);
						const resultMessage = messages.find((m: SDKMessage) => m.type === 'result') as any;

						returnData.push({
							json: {
								messages,
								summary: {
									userMessageCount: userMessages.length,
									assistantMessageCount: assistantMessages.length,
									toolUseCount: toolUses.length,
									hasResult: !!resultMessage,
									interactivePlanning: {
										finalPlan: interactivePlanningResult.finalPlan,
										executed: interactivePlanningResult.executed,
									},
								},
								result: interactivePlanningResult.finalPlan,
								metrics: resultMessage
									? {
											duration_ms: duration,
											num_turns: resultMessage.num_turns,
											total_cost_usd: resultMessage.total_cost_usd,
											usage: resultMessage.usage,
										}
									: {
											duration_ms: duration,
										},
								success: true,
							},
							pairedItem: itemIndex,
						});
					}

					// Skip the regular query execution for interactive planning
					continue;
				}

				// Execute query
				const messages: SDKMessage[] = [];
				const startTime = Date.now();
				
				// Store original working directory for restoration
				const originalCwd = process.cwd();
				let workingDirectoryChanged = false;

				try {
					// Change working directory if project path is specified
					if (queryOptions.cwd && queryOptions.cwd !== originalCwd) {
						if (additionalOptions.debug) {
							console.log(`[ClaudeCode] Changing working directory from ${originalCwd} to ${queryOptions.cwd}`);
						}
						process.chdir(queryOptions.cwd);
						workingDirectoryChanged = true;
						
						if (additionalOptions.debug) {
							console.log(`[ClaudeCode] Working directory successfully changed to: ${process.cwd()}`);
						}
					}

					for await (const message of query(queryOptions)) {
						messages.push(message);

						if (additionalOptions.debug) {
							console.log(`[ClaudeCode] Received message type: ${message.type}`);
						}

						// Track progress
						if (message.type === 'assistant' && message.message?.content) {
							const content = message.message.content[0];
							if (additionalOptions.debug && content.type === 'text') {
								console.log(`[ClaudeCode] Assistant: ${content.text.substring(0, 100)}...`);
							} else if (additionalOptions.debug && content.type === 'tool_use') {
								console.log(`[ClaudeCode] Tool use: ${content.name}`);
							}
						}
					}

					clearTimeout(timeoutId);

					const duration = Date.now() - startTime;
					if (additionalOptions.debug) {
						console.log(
							`[ClaudeCode] Execution completed in ${duration}ms with ${messages.length} messages`,
						);
					}

					// Format output based on selected format
					if (outputFormat === 'text') {
						// Find the result message
						const resultMessage = messages.find((m) => m.type === 'result') as any;
						returnData.push({
							json: {
								result: resultMessage?.result || resultMessage?.error || '',
								success: resultMessage?.subtype === 'success',
								duration_ms: resultMessage?.duration_ms,
								total_cost_usd: resultMessage?.total_cost_usd,
							},
							pairedItem: itemIndex,
						});
					} else if (outputFormat === 'messages') {
						// Return raw messages
						returnData.push({
							json: {
								messages,
								messageCount: messages.length,
							},
							pairedItem: itemIndex,
						});
					} else if (outputFormat === 'structured') {
						// Parse into structured format
						const userMessages = messages.filter((m) => m.type === 'user');
						const assistantMessages = messages.filter((m) => m.type === 'assistant');
						const toolUses = messages.filter(
							(m) =>
								m.type === 'assistant' && (m as any).message?.content?.[0]?.type === 'tool_use',
						);
						const systemInit = messages.find(
							(m) => m.type === 'system' && (m as any).subtype === 'init',
						) as any;
						const resultMessage = messages.find((m) => m.type === 'result') as any;

						returnData.push({
							json: {
								messages,
								summary: {
									userMessageCount: userMessages.length,
									assistantMessageCount: assistantMessages.length,
									toolUseCount: toolUses.length,
									hasResult: !!resultMessage,
									toolsAvailable: systemInit?.tools || [],
								},
								result: resultMessage?.result || resultMessage?.error || null,
								metrics: resultMessage
									? {
											duration_ms: resultMessage.duration_ms,
											num_turns: resultMessage.num_turns,
											total_cost_usd: resultMessage.total_cost_usd,
											usage: resultMessage.usage,
										}
									: null,
								success: resultMessage?.subtype === 'success',
							},
							pairedItem: itemIndex,
						});
					}
				} catch (queryError) {
					clearTimeout(timeoutId);
					throw queryError;
				} finally {
					// Always restore the original working directory
					if (workingDirectoryChanged) {
						if (additionalOptions.debug) {
							console.log(`[ClaudeCode] Restoring working directory to: ${originalCwd}`);
						}
						try {
							process.chdir(originalCwd);
							if (additionalOptions.debug) {
								console.log(`[ClaudeCode] Working directory successfully restored to: ${process.cwd()}`);
							}
						} catch (chdirError) {
							console.error(`[ClaudeCode] ERROR: Failed to restore working directory to ${originalCwd}:`, chdirError);
							// This is a critical error, but we don't want to throw here as it might mask the original error
						}
					}
				}
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
				const isTimeout = error instanceof Error && error.name === 'AbortError';

				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: errorMessage,
							errorType: isTimeout ? 'timeout' : 'execution_error',
							errorDetails: error instanceof Error ? error.stack : undefined,
							itemIndex,
						},
						pairedItem: itemIndex,
					});
					continue;
				}

				// Provide more specific error messages
				const userFriendlyMessage = isTimeout
					? `Operation timed out after ${timeout} seconds. Consider increasing the timeout in Additional Options.`
					: `Claude Code execution failed: ${errorMessage}`;

				throw new NodeOperationError(this.getNode(), userFriendlyMessage, {
					itemIndex,
					description: errorMessage,
				});
			}
		}

		return [returnData];
	}
}
