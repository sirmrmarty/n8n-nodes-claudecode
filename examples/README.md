# Claude Code Configuration Examples

This directory contains example configurations for using Claude Code with n8n.

## Examples

### 1. Simple Project (`simple-project/`)
Basic configuration without MCP servers. Good for:
- Code editing and file operations
- Running npm scripts
- Projects that don't need external integrations

### 2. Project with MCP (`project-with-mcp/`)
Full configuration with MCP servers. Demonstrates:
- `.mcp.json` for defining MCP servers
- `.claude/settings.json` for team-shared settings
- `.claude/settings.local.json` for personal settings
- Integration with GitHub, Slack, PostgreSQL, etc.

## How to Use

1. Copy the example that matches your needs
2. Update the configuration files with your specific requirements
3. Set the **Project Path** parameter in n8n's Claude Code node to your project directory
4. Claude Code will automatically load the configuration

## Configuration Files Overview

| File | Purpose | Git Status |
|------|---------|------------|
| `.mcp.json` | Define available MCP servers | ✅ Commit |
| `.claude/settings.json` | Team-shared settings | ✅ Commit |
| `.claude/settings.local.json` | Personal overrides | ❌ Gitignore |

## Security Best Practices

- Use environment variables for sensitive data (tokens, passwords)
- Add `.claude/settings.local.json` to `.gitignore`
- Review permissions carefully before enabling
- Test configurations in a safe environment first