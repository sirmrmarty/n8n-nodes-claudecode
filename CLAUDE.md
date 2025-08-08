# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development
- `npm run dev` - Run TypeScript compiler in watch mode for development
- `npm run build` - Build the project (clean dist, compile TypeScript, copy icons)
- `npm run format` - Format code using Prettier
- `npm run lint` - Run ESLint to check code quality
- `npm run lintfix` - Auto-fix linting issues where possible

### Publishing
- `npm run publish:dry` - Test publishing without actually publishing
- `npm run publish:public` - Publish to npm with public access

### n8n Integration
- Install locally: `npm link` then `n8n start` to test the node
- The node appears in n8n UI under "Claude Code" category
- Debug output available when Debug option is enabled in node parameters

## Architecture Overview

This is an n8n community node that integrates Claude Code SDK into n8n workflows. The architecture consists of:

1. **Main Node Implementation** (`nodes/ClaudeCode/ClaudeCode.node.ts`)
   - Implements `INodeType` interface from n8n
   - Provides Query, Plan, Approve Plan, and Continue operations
   - Handles Claude Code SDK initialization and message processing
   - Manages tool availability and project path configuration
   - Implements planning workflow with ExitPlanMode integration

2. **Tool System**
   - Dynamic tool enabling/disabling based on user configuration
   - Supports: Bash, Edit/MultiEdit, Read/Write, Web operations, Todo management
   - MCP servers supported via Claude's native configuration system (.claude/settings.local.json)

3. **Output Handling**
   - Multiple output formats: structured JSON, messages array, or plain text
   - Streaming support with abort signal handling
   - Debug mode for troubleshooting

4. **Project Path Support** (v0.2.0+)
   - Configure working directory via `projectPath` parameter
   - **Actually changes the process working directory** during Claude Code execution
   - Claude sees and reports the correct project directory as its current working directory
   - All tools and commands operate from the specified project location
   - n8n's working directory is automatically restored after execution

## Planning Operations (v3.0+)

### Operation Types
- **Plan**: Creates execution plan using ExitPlanMode, waits for approval
- **Approve Plan**: Executes previously created plan with optional modifications
- **Query**: Direct execution without planning (original behavior)
- **Continue**: Continue previous conversation

### Planning Configuration
- **Plan Detail Level**: 
  - `high` - High-level overview (3-7 main steps)
  - `detailed` - Specific actionable steps with technical details
  - `stepwise` - Granular breakdown with sub-steps and validation
- **Auto-Execute Plan**: Whether to automatically execute simple, low-risk plans after creation
- **Plan Modifications**: Apply feedback before execution

### Planning System Prompts
The `generatePlanningSystemPrompt()` method creates operation-specific system prompts:
- Instructs Claude to use ExitPlanMode tool after planning
- Configures detail level and approval requirements
- Supports both auto-execution and manual approval modes based on user configuration

### Example Usage
```javascript
// Create plan and wait for manual approval
{
  "operation": "plan",
  "prompt": "Add user authentication to the API",
  "additionalOptions": {
    "planDetailLevel": "detailed",
    "autoApprove": false
  }
}

// Create plan with auto-execution for simple tasks
{
  "operation": "plan", 
  "prompt": "Add a simple logger utility function",
  "additionalOptions": {
    "planDetailLevel": "detailed",
    "autoApprove": true
  }
}

// Execute previously created plan with modifications
{
  "operation": "approve",
  "prompt": "Add user authentication to the API", 
  "additionalOptions": {
    "planModifications": "Use bcrypt for password hashing instead of default"
  }
}
```

## Key Development Patterns

### n8n Node Structure
- All node logic resides in `ClaudeCode.node.ts`
- Parameters defined using n8n's declarative schema
- Error handling follows n8n patterns with `NodeOperationError`
- Supports both single execution and streaming responses

### TypeScript Configuration
- Strict mode enabled for type safety
- Target ES2019 with CommonJS modules (n8n requirement)
- Source maps generated for debugging
- Output to `dist/` directory

### Code Style
- Uses tabs with width 2 (n8n standard)
- Single quotes for strings
- Semicolons required
- Maximum line width: 100 characters
- ESLint configured with n8n-nodes-base rules


## Testing Approach

No automated tests are configured (typical for n8n community nodes). Testing involves:
1. Building the node: `npm run build`
2. Linking locally: `npm link`
3. Starting n8n: `n8n start`
4. Creating test workflows with various parameter combinations
5. Using Debug mode to inspect Claude Code interactions

## Configuration Examples

The `examples/` directory contains sample configurations:
- **simple-project/**: Basic setup without MCP servers
- **project-with-mcp/**: Full MCP server configuration example

Key configuration files:
- `.mcp.json`: Defines available MCP servers (project root)
- `.claude/settings.json`: Team-shared settings
- `.claude/settings.local.json`: Personal settings (gitignored)

When using Project Path, Claude Code automatically loads these configurations from the specified directory.

**Important**: The Project Path feature now truly changes the Node.js process working directory during execution, ensuring Claude operates from and reports the correct project location. This provides a more authentic and reliable development experience.