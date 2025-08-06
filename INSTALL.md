# Installation Guide - Claude Code for n8n (Improved Version)

This guide covers installing the improved version of the Claude Code community node directly from GitHub source, which includes enhanced project path validation, better error handling, and comprehensive debugging capabilities.

## 📋 Prerequisites

### System Requirements
- **Operating System**: Debian/Ubuntu or compatible Linux distribution
- **Node.js**: Version ≥20.15 (check with `node --version`)
- **npm**: Latest version (usually comes with Node.js)
- **Git**: For cloning the repository

### Required Dependencies

#### 1. Claude Code CLI (Required)
The Claude Code CLI must be installed and authenticated on your system:

```bash
# Install Claude Code CLI globally
npm install -g @anthropic-ai/claude-code

# Authenticate (requires Claude Pro or Team subscription)
claude
```

**Note**: Follow the authentication prompts to link your Claude account.

#### 2. n8n Installation
You should have n8n already installed. This guide covers:
- Native n8n installations
- Docker-based n8n deployments
- Systemd service installations

## 🚀 Installation Methods

### Method 1: GitHub Clone + Manual Build (Recommended)

This method installs the latest improved version with all enhancements:

```bash
# 1. Clone the repository
git clone https://github.com/sirmrmarty/n8n-nodes-claudecode.git
cd n8n-nodes-claudecode

# 2. Install dependencies
npm install

# 3. Build the community node
npm run build
```

### Method 2: Installation for Different n8n Setups

#### For Global n8n Installation

```bash
# After building (steps 1-3 above), install globally
sudo npm install -g .

# Restart n8n service
sudo systemctl restart n8n
```

#### For Local n8n Installation

```bash
# After building, find your n8n installation
npm list -g n8n

# Install to n8n's community nodes directory
mkdir -p ~/.n8n/nodes
cd ~/.n8n/nodes
npm install /path/to/your/cloned/n8n-nodes-claudecode

# Restart n8n
n8n start
```

#### For Systemd Service Installation

```bash
# After building the node
sudo cp -r dist ~/.n8n/nodes/@holtweb-n8n-nodes-claudecode

# Find your n8n service and restart
sudo systemctl restart n8n
sudo systemctl status n8n  # Check status
```

### Method 3: Docker Installation

#### For Docker Compose

Add to your `docker-compose.yml`:

```yaml
services:
  n8n:
    image: n8nio/n8n
    ports:
      - "5678:5678"
    environment:
      - GENERIC_TIMEZONE=Europe/Berlin
    volumes:
      - ~/.n8n:/home/node/.n8n
      - ./n8n-nodes-claudecode:/community-node
    command: >
      sh -c "
      npm install /community-node &&
      n8n start
      "
```

#### For Docker Run

```bash
# 1. Build the node locally first
git clone https://github.com/holt-web-ai/n8n-nodes-claudecode.git
cd n8n-nodes-claudecode
npm install && npm run build

# 2. Run Docker with the node mounted
docker run -it --rm \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  -v $(pwd):/community-node \
  -e GENERIC_TIMEZONE="Europe/Berlin" \
  n8nio/n8n sh -c "npm install /community-node && n8n start"
```

## ✅ Verification Steps

### 1. Check n8n Startup Logs

```bash
# For systemd service
sudo journalctl -u n8n -f

# For manual n8n start
n8n start --verbose
```

Look for messages like:
```
Loading community node @holtweb/n8n-nodes-claudecode
Community node @holtweb/n8n-nodes-claudecode loaded successfully
```

### 2. Verify in n8n UI

1. Open your n8n instance (usually `http://localhost:5678`)
2. Create a new workflow
3. Click the "+" to add a node
4. Look for **"Claude Code"** in the node categories
5. The node should appear with the Claude Code icon

### 3. Test Basic Functionality

Create a simple test workflow:

1. Add a **Manual Trigger** node
2. Add the **Claude Code** node
3. Configure:
   - **Operation**: Query
   - **Prompt**: "Hello, can you confirm you're working?"
   - **Model**: Sonnet
   - **Enable Debug Mode**: ✓
4. Execute the workflow
5. Check the output and n8n logs for detailed debug information

### 4. Test Project Path Feature

Test the improved project path validation:

1. Set **Project Path** to a valid directory (e.g., `/home/user/projects/myapp`)
2. Enable **Debug Mode**
3. Execute the workflow
4. Check logs for path validation messages:
   ```
   [ClaudeCode] Validating project path: /home/user/projects/myapp
   [ClaudeCode] Working directory validated and set to: /home/user/projects/myapp
   [ClaudeCode] Configuration files found: {...}
   ```

## 🔧 Troubleshooting

### Common Issues

#### Node Not Appearing in n8n

**Problem**: Claude Code node doesn't appear in the node list.

**Solutions**:
```bash
# Check n8n logs for errors
sudo journalctl -u n8n -n 50

# Verify the node was built correctly
ls -la dist/nodes/ClaudeCode/

# Ensure n8n was restarted after installation
sudo systemctl restart n8n
```

#### Claude Code CLI Not Found

**Problem**: "Claude Code CLI not found" or authentication errors.

**Solutions**:
```bash
# Check CLI installation
which claude
claude --version

# Re-authenticate if needed
claude logout
claude
```

#### Project Path Validation Errors

**Problem**: "Invalid project path" errors even with valid directories.

**Debug Steps**:
1. Enable **Debug Mode** in the node
2. Check n8n logs for detailed validation messages:
   ```bash
   sudo journalctl -u n8n -f | grep ClaudeCode
   ```
3. Verify directory permissions:
   ```bash
   ls -la /path/to/your/project
   stat /path/to/your/project
   ```

#### Permission Issues

**Problem**: Permission denied errors when running commands.

**Solutions**:
```bash
# Ensure n8n process has access to the project directory
sudo chown -R n8n:n8n /path/to/your/project

# Or adjust permissions
chmod 755 /path/to/your/project
```

### Debug Mode

The improved version includes comprehensive debug logging. Enable it by:

1. In the Claude Code node, expand **Additional Options**
2. Check **Debug Mode**
3. Execute your workflow
4. Check n8n logs for detailed information:

```bash
# View real-time debug logs
sudo journalctl -u n8n -f | grep "\[ClaudeCode\]"
```

Debug logs will show:
- Path validation details
- Configuration file detection
- SDK initialization parameters
- Fallback mechanism activation
- Tool availability and restrictions

## 🎯 Key Improvements in This Version

### Enhanced Project Path Validation
- Validates directory existence and permissions
- Resolves relative to absolute paths
- Detects Claude configuration files
- Provides specific error messages for troubleshooting

### Automatic Fallback Mechanisms
- Detects working directory failures
- Automatically retries without custom working directory
- Maintains functionality even when project paths fail
- Logs fallback attempts for transparency

### Comprehensive Debug Logging
- Detailed SDK initialization information
- Path validation step-by-step logging
- Configuration file discovery status
- Real-time error detection and handling

### Better Error Messages
- Specific validation failure reasons
- Helpful suggestions for fixing issues
- Clear distinction between different error types
- Integration with n8n's error handling system

## 📚 Next Steps

After successful installation:

1. **Explore Examples**: Check the `examples/` directory for configuration samples
2. **Configure MCP Servers**: Set up `.mcp.json` for database and API integrations
3. **Create Workflows**: Start building automation workflows with Claude Code
4. **Join Community**: Report issues and share workflows on GitHub

## 🆘 Getting Help

- **Issues**: [GitHub Issues](https://github.com/holt-web-ai/n8n-nodes-claudecode/issues)
- **Discussions**: [GitHub Discussions](https://github.com/holt-web-ai/n8n-nodes-claudecode/discussions)
- **Documentation**: [Main README](./README.md)

---

**Successfully installed?** 🎉 You now have the improved Claude Code node with enhanced project directory support, better error handling, and comprehensive debugging capabilities!
