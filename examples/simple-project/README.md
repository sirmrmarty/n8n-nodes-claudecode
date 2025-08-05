# Simple Claude Code Project Configuration

This example shows a basic Claude Code configuration without MCP servers.

## File Structure

```
project-root/
├── .claude/
│   └── settings.json    # Basic permissions configuration
└── your-project-files/
```

## Configuration

The `.claude/settings.json` file configures:
- Allowed operations (Read, Write, Edit, npm commands)
- Denied dangerous operations (rm -rf, sudo)

## Usage with n8n

1. Set the **Project Path** parameter to this directory
2. Claude Code will respect the permissions defined in settings.json
3. No MCP servers are configured - only built-in tools are available

This is ideal for:
- Simple code editing tasks
- Running npm scripts
- Basic file operations
- Projects that don't need external integrations