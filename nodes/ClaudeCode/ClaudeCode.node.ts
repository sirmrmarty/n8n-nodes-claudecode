import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import { query, type SDKMessage } from '@anthropic-ai/claude-code';

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
						name: 'Query',
						value: 'query',
						description: 'Start a new conversation with Claude Code',
						action: 'Start a new conversation with claude code',
					},
					{
						name: 'Plan',
						value: 'plan',
						description: 'Create a plan for a task without execution',
						action: 'Create a plan for a task without execution',
					},
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
						displayName: 'Debug Mode',
						name: 'debug',
						type: 'boolean',
						default: false,
						description: 'Whether to enable debug logging',
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
					queryOptions.cwd = projectPath.trim();
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

				// Execute query
				const messages: SDKMessage[] = [];
				const startTime = Date.now();

				try {
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
