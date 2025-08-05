# Claude Code Project Configuration Example

This example demonstrates how to configure a project to use MCP servers with Claude Code via n8n.

## File Structure

```
project-root/
├── .mcp.json                    # MCP server definitions
├── .claude/                     # Claude configuration directory
│   ├── settings.json           # Shared team settings (commit to git)
│   └── settings.local.json     # Personal settings (gitignore this)
└── your-project-files/
```

## Configuration Files

### `.mcp.json`
Defines available MCP servers for the project. This file should be in the project root.

### `.claude/settings.json`
Team-shared settings that control:
- Which MCP servers are enabled/disabled
- Allowed/denied permissions
- Can be committed to version control

### `.claude/settings.local.json`
Personal settings that override team settings:
- `enableAllProjectMcpServers: true` - Auto-approves all MCP servers
- Personal environment variables
- Should be added to `.gitignore`

## Usage with n8n

1. Set the **Project Path** parameter in the Claude Code node to this directory
2. Claude Code will automatically:
   - Load MCP server definitions from `.mcp.json`
   - Apply settings from `.claude/settings.json` and `.claude/settings.local.json`
   - Have access to the configured MCP tools

## Environment Variables

Replace the following in `.mcp.json` with actual values:
- `${GITHUB_TOKEN}` - GitHub personal access token
- `${POSTGRES_CONNECTION_STRING}` - PostgreSQL connection string
- `${SLACK_BOT_TOKEN}` - Slack bot token
- `${SLACK_TEAM_ID}` - Slack team ID

## Security Notes

- **Important**: In a real project, add `.claude/settings.local.json` to your `.gitignore`
- This example includes it for demonstration purposes only
- Never commit personal settings or tokens to version control
- Use environment variables for sensitive data
- Review permissions carefully before enabling MCP servers