import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionType, NodeOperationError } from 'n8n-workflow';
import { query, type SDKMessage } from '@anthropic-ai/claude-code';
import { promises as fs } from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface ProjectPathValidationResult {
	isValid: boolean;
	resolvedPath?: string;
	error?: string;
	warnings?: string[];
	configurationFound?: {
		claudeSettings?: boolean;
		claudeLocalSettings?: boolean;
		mcpConfig?: boolean;
	};
}

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

	private static async checkClaudeCLI(debug: boolean = false): Promise<{
		isAvailable: boolean;
		isAuthenticated: boolean;
		version?: string;
		error?: string;
	}> {
		try {
			// Check if claude command is available
			const versionOutput = execSync('claude --version', {
				encoding: 'utf8',
				timeout: 10000,
				stdio: ['pipe', 'pipe', 'pipe'],
			}).trim();

			if (debug) {
				console.log(`[ClaudeCode] Claude CLI version: ${versionOutput}`);
			}

			// Try to check authentication by running a simple command
			try {
				execSync('claude auth whoami', {
					encoding: 'utf8',
					timeout: 10000,
					stdio: ['pipe', 'pipe', 'pipe'],
				});

				if (debug) {
					console.log(`[ClaudeCode] Claude CLI authentication: OK`);
				}

				return {
					isAvailable: true,
					isAuthenticated: true,
					version: versionOutput,
				};
			} catch (authError) {
				if (debug) {
					console.warn(
						`[ClaudeCode] Claude CLI authentication check failed: ${authError instanceof Error ? authError.message : 'Unknown error'}`,
					);
				}

				return {
					isAvailable: true,
					isAuthenticated: false,
					version: versionOutput,
					error:
						'Claude CLI is installed but not authenticated. Run "claude auth login" to authenticate.',
				};
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';

			if (debug) {
				console.error(`[ClaudeCode] Claude CLI not available: ${errorMessage}`);
			}

			return {
				isAvailable: false,
				isAuthenticated: false,
				error:
					'Claude CLI is not installed or not accessible. Install with: npm install -g @anthropic-ai/claude-code',
			};
		}
	}

	private static async validateProjectPath(
		projectPath: string,
		debug: boolean = false,
	): Promise<ProjectPathValidationResult> {
		const result: ProjectPathValidationResult = {
			isValid: false,
			warnings: [],
			configurationFound: {},
		};

		try {
			// Resolve and normalize the path
			const resolvedPath = path.resolve(projectPath);
			result.resolvedPath = resolvedPath;

			if (debug) {
				console.log(`[ClaudeCode] Validating project path: ${projectPath} -> ${resolvedPath}`);
			}

			// Check if path exists
			try {
				const stats = await fs.stat(resolvedPath);
				if (!stats.isDirectory()) {
					result.error = `Path exists but is not a directory: ${resolvedPath}`;
					return result;
				}
			} catch (err) {
				result.error = `Directory does not exist: ${resolvedPath}`;
				return result;
			}

			// Check read/write permissions
			try {
				await fs.access(resolvedPath, fs.constants.R_OK | fs.constants.W_OK);
			} catch (err) {
				result.error = `Insufficient permissions for directory: ${resolvedPath}`;
				return result;
			}

			// Check for Claude configuration files
			const configChecks = [
				{ file: '.claude/settings.json', key: 'claudeSettings' as const },
				{ file: '.claude/settings.local.json', key: 'claudeLocalSettings' as const },
				{ file: '.mcp.json', key: 'mcpConfig' as const },
			];

			for (const { file, key } of configChecks) {
				const configPath = path.join(resolvedPath, file);
				try {
					await fs.access(configPath, fs.constants.R_OK);
					result.configurationFound![key] = true;
					if (debug) {
						console.log(`[ClaudeCode] Found configuration file: ${configPath}`);
					}
				} catch (err) {
					result.configurationFound![key] = false;
					if (debug) {
						console.log(`[ClaudeCode] Configuration file not found: ${configPath}`);
					}
				}
			}

			// Add warnings for missing configuration
			const foundConfigs = Object.values(result.configurationFound || {}).filter(Boolean).length;
			if (foundConfigs === 0) {
				result.warnings!.push(
					'No Claude configuration files found (.claude/settings.json, .claude/settings.local.json, .mcp.json). Claude Code may not work as expected.',
				);
			} else if (
				!result.configurationFound?.claudeSettings &&
				!result.configurationFound?.claudeLocalSettings
			) {
				result.warnings!.push(
					'No Claude settings files found. Consider creating .claude/settings.json or .claude/settings.local.json for proper configuration.',
				);
			}

			result.isValid = true;
			return result;
		} catch (err) {
			result.error = `Unexpected error validating project path: ${err instanceof Error ? err.message : 'Unknown error'}`;
			return result;
		}
	}

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

				// Check Claude CLI availability and authentication
				const cliCheck = await ClaudeCode.checkClaudeCLI(additionalOptions.debug);

				if (!cliCheck.isAvailable) {
					throw new NodeOperationError(
						this.getNode(),
						cliCheck.error || 'Claude CLI not available',
						{
							itemIndex,
							description: 'Ensure Claude CLI is installed and accessible in the system PATH',
						},
					);
				}

				if (!cliCheck.isAuthenticated) {
					throw new NodeOperationError(
						this.getNode(),
						cliCheck.error || 'Claude CLI not authenticated',
						{
							itemIndex,
							description: 'Run "claude auth login" to authenticate with your Claude account',
						},
					);
				}

				// Log start
				if (additionalOptions.debug) {
					console.log(`[ClaudeCode] ========== EXECUTION START ==========`);
					console.log(`[ClaudeCode] Starting execution for item ${itemIndex}`);
					console.log(`[ClaudeCode] Claude CLI: ${cliCheck.version} (authenticated)`);
					console.log(`[ClaudeCode] Operation: ${operation} (Plan Mode: ${isPlanMode})`);
					console.log(`[ClaudeCode] Prompt length: ${prompt.length} chars`);
					console.log(
						`[ClaudeCode] Prompt preview: ${prompt.substring(0, 200)}${prompt.length > 200 ? '...' : ''}`,
					);
					console.log(`[ClaudeCode] Model: ${model}`);
					console.log(`[ClaudeCode] Max turns: ${maxTurns}`);
					console.log(`[ClaudeCode] Timeout: ${timeout}s`);
					console.log(`[ClaudeCode] Output format: ${outputFormat}`);
					console.log(`[ClaudeCode] Allowed built-in tools: ${allowedTools.join(', ')}`);
					console.log(
						`[ClaudeCode] System prompt: ${systemPrompt ? 'Yes (' + systemPrompt.length + ' chars)' : 'None'}`,
					);
					if (isPlanMode) {
						console.log(`[ClaudeCode] Auto execute after plan: ${autoExecuteAfterPlan}`);
					}
					console.log(`[ClaudeCode] ========================================`);
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

				// Add project path (cwd) if specified with comprehensive validation
				if (projectPath && projectPath.trim() !== '') {
					const pathValidation = await ClaudeCode.validateProjectPath(
						projectPath.trim(),
						additionalOptions.debug,
					);

					if (!pathValidation.isValid) {
						const errorMsg = `Invalid project path: ${pathValidation.error}`;
						if (additionalOptions.debug) {
							console.error(`[ClaudeCode] ${errorMsg}`);
						}
						throw new NodeOperationError(this.getNode(), errorMsg, {
							itemIndex,
							description:
								'The specified project path could not be validated. Please check the path exists, is a directory, and has proper permissions.',
						});
					}

					queryOptions.cwd = pathValidation.resolvedPath;

					if (additionalOptions.debug) {
						console.log(
							`[ClaudeCode] Working directory validated and set to: ${pathValidation.resolvedPath}`,
						);
						console.log(
							`[ClaudeCode] Configuration files found:`,
							pathValidation.configurationFound,
						);
					}

					// Log warnings about missing configuration
					if (pathValidation.warnings && pathValidation.warnings.length > 0) {
						for (const warning of pathValidation.warnings) {
							if (additionalOptions.debug) {
								console.warn(`[ClaudeCode] Warning: ${warning}`);
							}
						}
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

				// Execute query with enhanced error handling and fallback
				const messages: SDKMessage[] = [];
				const startTime = Date.now();
				let querySucceeded = false;
				let originalCwd = queryOptions.cwd;

				if (additionalOptions.debug) {
					console.log(`[ClaudeCode] Starting Claude Code SDK query with options:`, {
						model: queryOptions.options.model,
						maxTurns: queryOptions.options.maxTurns,
						cwd: queryOptions.cwd || 'default',
						toolsCount: queryOptions.options.allowedTools?.length || 0,
						isPlanMode,
					});
				}

				try {
					let messageCount = 0;
					let lastMessageTime = Date.now();
					const messageTimeout = 30000; // 30 seconds without messages indicates issue

					for await (const message of query(queryOptions)) {
						messages.push(message);
						messageCount++;
						lastMessageTime = Date.now();

						if (additionalOptions.debug) {
							console.log(`[ClaudeCode] Received message ${messageCount} type: ${message.type}`);
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

						// Check for working directory related errors in real-time
						if (message.type === 'result' && (message as any).error && originalCwd) {
							const errorStr = JSON.stringify((message as any).error).toLowerCase();
							if (
								errorStr.includes('working directory') ||
								errorStr.includes('cwd') ||
								errorStr.includes('chdir')
							) {
								if (additionalOptions.debug) {
									console.warn(
										`[ClaudeCode] Detected working directory error, will retry without custom working directory`,
									);
								}
								break; // Break out to trigger fallback
							}
						}
					}

					// Check if we may have timed out waiting for messages
					const timeSinceLastMessage = Date.now() - lastMessageTime;
					if (messageCount === 0 && timeSinceLastMessage > messageTimeout) {
						if (additionalOptions.debug) {
							console.warn(
								`[ClaudeCode] No messages received for ${timeSinceLastMessage}ms - possible connection issue`,
							);
						}
					}
					querySucceeded = true;

					clearTimeout(timeoutId);

					const duration = Date.now() - startTime;

					// Validate that we received meaningful messages
					if (messages.length === 0) {
						const warningMsg =
							'Claude Code SDK returned no messages. This may indicate authentication issues, network problems, or API limitations.';
						if (additionalOptions.debug) {
							console.warn(`[ClaudeCode] ${warningMsg}`);
						}

						// Return diagnostic information instead of empty result
						returnData.push({
							json: {
								warning: warningMsg,
								messages: [],
								messageCount: 0,
								duration_ms: duration,
								diagnostics: {
									claudeCLI: cliCheck,
									queryOptions: {
										model: queryOptions.options.model,
										maxTurns: queryOptions.options.maxTurns,
										toolCount: queryOptions.options.allowedTools?.length || 0,
										hasSystemPrompt: !!queryOptions.options.systemPrompt,
										hasCwd: !!queryOptions.cwd,
									},
								},
								success: false,
							},
							pairedItem: itemIndex,
						});
						continue; // Skip to next item
					}

					if (additionalOptions.debug) {
						console.log(
							`[ClaudeCode] Execution completed in ${duration}ms with ${messages.length} messages`,
						);

						// Log message types for debugging
						const messageTypes = messages.reduce(
							(acc, msg) => {
								acc[msg.type] = (acc[msg.type] || 0) + 1;
								return acc;
							},
							{} as Record<string, number>,
						);
						console.log(`[ClaudeCode] Message breakdown:`, messageTypes);
					}

					// Additional validation for meaningful responses
					const resultMessage = messages.find((m) => m.type === 'result') as any;
					const assistantMessages = messages.filter((m) => m.type === 'assistant');
					const hasAssistantContent = assistantMessages.some(
						(m: any) =>
							m.message?.content?.length > 0 &&
							m.message.content.some((c: any) => c.type === 'text' && c.text?.trim()),
					);

					// Check if we have a meaningful response
					if (!hasAssistantContent && !resultMessage) {
						const diagnosticMsg = `Claude Code executed but produced no meaningful response. Received ${messages.length} messages but no assistant content or result.`;

						if (additionalOptions.debug) {
							console.warn(`[ClaudeCode] ${diagnosticMsg}`);
							console.log(`[ClaudeCode] Raw messages:`, JSON.stringify(messages, null, 2));
						}

						returnData.push({
							json: {
								warning: diagnosticMsg,
								messages,
								messageCount: messages.length,
								duration_ms: duration,
								diagnostics: {
									claudeCLI: cliCheck,
									messageTypes: messages.reduce(
										(acc, msg) => {
											acc[msg.type] = (acc[msg.type] || 0) + 1;
											return acc;
										},
										{} as Record<string, number>,
									),
									hasAssistantMessages: assistantMessages.length > 0,
									hasResultMessage: !!resultMessage,
									queryOptions: {
										model: queryOptions.options.model,
										maxTurns: queryOptions.options.maxTurns,
										toolCount: queryOptions.options.allowedTools?.length || 0,
										hasSystemPrompt: !!queryOptions.options.systemPrompt,
										hasCwd: !!queryOptions.cwd,
									},
								},
								success: false,
							},
							pairedItem: itemIndex,
						});
						continue; // Skip to next item
					}

					// Format output based on selected format
					if (outputFormat === 'text') {
						// Find the result message
						returnData.push({
							json: {
								result: resultMessage?.result || resultMessage?.error || '',
								success: resultMessage?.subtype === 'success',
								duration_ms: resultMessage?.duration_ms || duration,
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
									hasAssistantContent,
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
									: {
											duration_ms: duration,
											num_turns: messages.length,
											total_cost_usd: 0,
											usage: null,
										},
								success: resultMessage?.subtype === 'success',
								// Add diagnostic info if no meaningful result
								diagnostics:
									!resultMessage && !hasAssistantContent
										? {
												claudeCLI: cliCheck,
												messageTypes: messages.reduce(
													(acc, msg) => {
														acc[msg.type] = (acc[msg.type] || 0) + 1;
														return acc;
													},
													{} as Record<string, number>,
												),
											}
										: undefined,
							},
							pairedItem: itemIndex,
						});
					}
				} catch (queryError) {
					clearTimeout(timeoutId);

					// Check if this is a working directory related error and we have a custom cwd
					const isWorkingDirError =
						queryError instanceof Error &&
						(queryError.message.toLowerCase().includes('working directory') ||
							queryError.message.toLowerCase().includes('cwd') ||
							queryError.message.toLowerCase().includes('chdir') ||
							queryError.message.toLowerCase().includes('no such file or directory'));

					if (isWorkingDirError && originalCwd && !querySucceeded) {
						if (additionalOptions.debug) {
							console.warn(
								`[ClaudeCode] Query failed with working directory error: ${queryError.message}`,
							);
							console.warn(
								`[ClaudeCode] Attempting fallback execution without custom working directory`,
							);
						}

						// Create new timeout for fallback attempt
						const fallbackAbortController = new AbortController();
						const fallbackTimeoutId = setTimeout(() => fallbackAbortController.abort(), timeoutMs);

						try {
							// Retry without custom working directory
							const fallbackOptions = { ...queryOptions };
							delete fallbackOptions.cwd;
							fallbackOptions.abortController = fallbackAbortController;

							if (additionalOptions.debug) {
								console.log(`[ClaudeCode] Retrying query without custom working directory`);
							}

							// Clear previous messages and retry
							messages.length = 0;
							const fallbackStartTime = Date.now();

							for await (const message of query(fallbackOptions)) {
								messages.push(message);

								if (additionalOptions.debug) {
									console.log(`[ClaudeCode] Fallback - Received message type: ${message.type}`);
								}
							}

							clearTimeout(fallbackTimeoutId);
							querySucceeded = true;

							if (additionalOptions.debug) {
								const fallbackDuration = Date.now() - fallbackStartTime;
								console.log(
									`[ClaudeCode] Fallback execution completed successfully in ${fallbackDuration}ms`,
								);
								console.warn(
									`[ClaudeCode] Note: Execution completed using default working directory instead of specified project path`,
								);
							}
						} catch (fallbackError) {
							clearTimeout(fallbackTimeoutId);
							if (additionalOptions.debug) {
								console.error(
									`[ClaudeCode] Fallback execution also failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`,
								);
							}
							throw queryError; // Throw original error, not fallback error
						}
					} else {
						throw queryError;
					}
				}

				// Only proceed if query succeeded (either initially or via fallback)
				if (!querySucceeded) {
					throw new NodeOperationError(
						this.getNode(),
						'Query execution failed without specific error information',
						{
							itemIndex,
						},
					);
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
