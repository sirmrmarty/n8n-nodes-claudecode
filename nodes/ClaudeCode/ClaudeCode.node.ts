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
						description: 'Create a detailed plan before execution (research-only mode)',
						action: 'Create a detailed plan before execution',
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
				displayName: 'Enable Plan Mode',
				name: 'enablePlanMode',
				type: 'boolean',
				default: false,
				description:
					'Whether to enable planning mode for Query operations (creates a plan before execution)',
				displayOptions: {
					show: {
						operation: ['query'],
					},
				},
			},
			{
				displayName: 'Auto Execute After Plan',
				name: 'autoExecuteAfterPlan',
				type: 'boolean',
				default: false,
				description:
					'Whether to automatically proceed to execution after plan approval (requires Enable Plan Mode)',
				displayOptions: {
					show: {
						operation: ['query'],
						enablePlanMode: [true],
					},
				},
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
					{
						displayName: 'Require Permissions',
						name: 'requirePermissions',
						type: 'boolean',
						default: false,
						description: 'Whether to require permission for tool use',
					},
					{
						displayName: 'Debug Mode',
						name: 'debug',
						type: 'boolean',
						default: false,
						description: 'Whether to enable debug logging',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			let timeout = 300; // Default timeout
			let operation: string = '';
			try {
				operation = this.getNodeParameter('operation', itemIndex) as string;
				const prompt = this.getNodeParameter('prompt', itemIndex) as string;
				const model = this.getNodeParameter('model', itemIndex) as string;
				const maxTurns = this.getNodeParameter('maxTurns', itemIndex) as number;
				timeout = this.getNodeParameter('timeout', itemIndex) as number;
				const projectPath = this.getNodeParameter('projectPath', itemIndex) as string;
				const outputFormat = this.getNodeParameter('outputFormat', itemIndex) as string;
				const enablePlanMode = this.getNodeParameter('enablePlanMode', itemIndex, false) as boolean;
				const autoExecuteAfterPlan = this.getNodeParameter(
					'autoExecuteAfterPlan',
					itemIndex,
					false,
				) as boolean;
				const allowedTools = this.getNodeParameter('allowedTools', itemIndex, []) as string[];
				const additionalOptions = this.getNodeParameter('additionalOptions', itemIndex) as {
					systemPrompt?: string;
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

				// Determine if plan mode should be active
				const isPlanMode = operation === 'plan' || (operation === 'query' && enablePlanMode);

				// Create planning-specific system prompt
				let systemPrompt = additionalOptions.systemPrompt || '';
				if (isPlanMode) {
					const planningPrompt = `
You are in plan mode. This is a research and planning phase where you should:

1. **Research thoroughly**: Use read-only tools (Read, Grep, Glob, LS, Task) to understand the codebase and requirements
2. **Analyze the request**: Break down what needs to be accomplished
3. **Create a detailed plan**: Present a structured plan of implementation steps
4. **Use ExitPlanMode tool**: When your plan is complete, use the ExitPlanMode tool to present it

IMPORTANT: In plan mode, you MUST NOT use tools that modify files or execute commands (Write, Edit, MultiEdit, Bash). Only use research and analysis tools.

Your goal is to create a comprehensive plan before any implementation begins.
					`.trim();

					systemPrompt = systemPrompt ? `${systemPrompt}\n\n${planningPrompt}` : planningPrompt;
				}

				// Log start
				if (additionalOptions.debug) {
					console.log(`[ClaudeCode] Starting execution for item ${itemIndex}`);
					console.log(`[ClaudeCode] Operation: ${operation} (Plan Mode: ${isPlanMode})`);
					console.log(`[ClaudeCode] Prompt: ${prompt.substring(0, 100)}...`);
					console.log(`[ClaudeCode] Model: ${model}`);
					console.log(`[ClaudeCode] Max turns: ${maxTurns}`);
					console.log(`[ClaudeCode] Timeout: ${timeout}s`);
					console.log(`[ClaudeCode] Allowed built-in tools: ${allowedTools.join(', ')}`);
					if (isPlanMode) {
						console.log(`[ClaudeCode] Auto execute after plan: ${autoExecuteAfterPlan}`);
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
					prompt,
					abortController,
					options: {
						maxTurns,
						permissionMode: additionalOptions.requirePermissions ? 'default' : 'bypassPermissions',
						model,
					},
				};

				// Add system prompt (includes planning prompt if in plan mode)
				if (systemPrompt) {
					queryOptions.options.systemPrompt = systemPrompt;
				}

				// Add project path (cwd) if specified
				if (projectPath && projectPath.trim() !== '') {
					queryOptions.cwd = projectPath.trim();
					if (additionalOptions.debug) {
						console.log(`[ClaudeCode] Working directory set to: ${queryOptions.cwd}`);
					}
				}

				// Set allowed tools based on plan mode
				let effectiveAllowedTools = allowedTools;
				if (isPlanMode) {
					// In plan mode, restrict to read-only tools and ensure ExitPlanMode is available
					const readOnlyTools = [
						'Read',
						'Grep',
						'Glob',
						'LS',
						'Task',
						'WebFetch',
						'WebSearch',
						'TodoWrite',
					];
					const planModeTools = allowedTools.filter(
						(tool) =>
							readOnlyTools.includes(tool) || tool === 'exit_plan_mode' || tool === 'ExitPlanMode',
					);

					// Ensure ExitPlanMode tool is always available in plan mode
					if (!planModeTools.includes('exit_plan_mode')) {
						planModeTools.push('exit_plan_mode');
					}

					effectiveAllowedTools = planModeTools;
					if (additionalOptions.debug) {
						console.log(
							`[ClaudeCode] Plan mode - filtered tools: ${effectiveAllowedTools.join(', ')}`,
						);
					}
				}

				if (effectiveAllowedTools.length > 0) {
					queryOptions.options.allowedTools = effectiveAllowedTools;
					if (additionalOptions.debug && !isPlanMode) {
						console.log(`[ClaudeCode] Allowed tools: ${effectiveAllowedTools.join(', ')}`);
					}
				}

				// Add continue flag if needed
				if (operation === 'continue') {
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

						// Look for ExitPlanMode tool usage to detect if a plan was created
						const exitPlanModeUse = toolUses.find((m) => {
							const content = (m as any).message?.content?.[0];
							return content?.type === 'tool_use' && content?.name === 'ExitPlanMode';
						});
						const planContent = exitPlanModeUse
							? (exitPlanModeUse as any).message?.content?.[0]?.input?.plan
							: null;

						returnData.push({
							json: {
								messages,
								summary: {
									userMessageCount: userMessages.length,
									assistantMessageCount: assistantMessages.length,
									toolUseCount: toolUses.length,
									hasResult: !!resultMessage,
									toolsAvailable: systemInit?.tools || [],
									isPlanMode,
									hasPlan: !!planContent,
									autoExecuteAfterPlan,
								},
								plan: planContent || null,
								planApproved: false, // This would be set by user interaction in future versions
								readyForExecution: isPlanMode && autoExecuteAfterPlan && !!planContent,
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
				const isPlanModeError =
					errorMessage.includes('plan mode') || errorMessage.includes('ExitPlanMode');

				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: errorMessage,
							errorType: isTimeout
								? 'timeout'
								: isPlanModeError
									? 'plan_mode_error'
									: 'execution_error',
							errorDetails: error instanceof Error ? error.stack : undefined,
							itemIndex,
							isPlanMode:
								operation === 'plan' ||
								(operation === 'query' &&
									this.getNodeParameter('enablePlanMode', itemIndex, false)),
						},
						pairedItem: itemIndex,
					});
					continue;
				}

				// Provide more specific error messages
				let userFriendlyMessage: string;
				if (isTimeout) {
					userFriendlyMessage = `Operation timed out after ${timeout} seconds. Consider increasing the timeout in Additional Options.`;
				} else if (isPlanModeError) {
					userFriendlyMessage = `Plan mode execution failed: ${errorMessage}. This may be due to known SDK issues with plan mode. Try using regular Query mode instead.`;
				} else {
					userFriendlyMessage = `Claude Code execution failed: ${errorMessage}`;
				}

				throw new NodeOperationError(this.getNode(), userFriendlyMessage, {
					itemIndex,
					description: errorMessage,
				});
			}
		}

		return [returnData];
	}
}
