# npm Publishing Guide - Claude Code for n8n

This guide walks you through publishing your improved Claude Code node to npm so it can be installed via the n8n user interface.

## 📋 Prerequisites

### 1. npm Account Setup
You'll need an npm account to publish packages:

```bash
# Create account at https://www.npmjs.com/signup
# Or login if you already have one
npm login
```

### 2. Email Verification
Ensure your npm account email is verified, as npm requires this for publishing scoped packages.

### 3. Two-Factor Authentication (Recommended)
Enable 2FA on your npm account for security:

```bash
npm profile enable-2fa auth-and-writes
```

## 🚀 Publishing Process

### Step 1: Prepare Your Package

**Make sure you've completed the setup:**
- ✅ Updated `package.json` with your scope (`@sirmrmarty/n8n-nodes-claudecode`)
- ✅ Updated author information and repository URLs
- ✅ Created proper `.npmignore` file
- ✅ Fixed `index.js` file

### Step 2: Build the Package

```bash
# Install dependencies (if not done already)
npm install

# Build the TypeScript code
npm run build

# Verify the dist directory was created
ls -la dist/
```

### Step 3: Test Locally

Before publishing, test your package locally:

```bash
# Create a test package
npm pack

# This creates a .tgz file like: sirmrmarty-n8n-nodes-claudecode-0.3.0.tgz
# You can install this locally to test:
# npm install ./sirmrmarty-n8n-nodes-claudecode-0.3.0.tgz
```

### Step 4: Publish to npm

```bash
# Publish your package (first time)
npm publish --access=public

# Note: Scoped packages (@sirmrmarty/*) are private by default
# The --access=public flag makes it publicly available
```

### Step 5: Verify Publication

```bash
# Check your package on npm
npm view @sirmrmarty/n8n-nodes-claudecode

# Visit your package page
# https://www.npmjs.com/package/@sirmrmarty/n8n-nodes-claudecode
```

## 🔄 Publishing Updates

When you make improvements to your node:

### Step 1: Update Version

```bash
# For patch changes (bug fixes)
npm version patch

# For minor changes (new features)
npm version minor

# For major changes (breaking changes)
npm version major

# Or manually edit package.json version
```

### Step 2: Build and Publish

```bash
npm run build
npm publish
```

## 📦 Package Structure Verification

Before publishing, ensure your package structure is correct:

```
@sirmrmarty/n8n-nodes-claudecode/
├── package.json          # ✅ Updated with your info
├── index.js             # ✅ Points to compiled node
├── .npmignore           # ✅ Excludes source files
├── dist/                # ✅ Compiled output
│   └── nodes/
│       └── ClaudeCode/
│           ├── ClaudeCode.node.js
│           └── claudecode.svg
├── README.md            # ✅ Included in package
└── LICENSE.md           # ✅ Included in package
```

## ✅ Installation via n8n UI

Once published, users can install your package via the n8n user interface:

### Method 1: n8n Community Nodes UI

1. Open n8n instance
2. Go to **Settings** → **Community Nodes**
3. Click **Install a community node**
4. Enter: `@sirmrmarty/n8n-nodes-claudecode`
5. Click **Install**
6. Restart n8n when prompted

### Method 2: Manual Installation

```bash
# Users can also install manually
cd ~/.n8n/nodes
npm install @sirmrmarty/n8n-nodes-claudecode
# Restart n8n
```

## 🔧 Troubleshooting Publishing Issues

### Issue: "You do not have permission to publish"

**Solution**: Make sure you're logged in and have the right permissions:
```bash
npm whoami  # Check logged in user
npm login   # Re-login if needed
```

### Issue: "Package name already exists"

**Solution**: Choose a different package name or scope:
```bash
# Update package.json with a unique name
"name": "@yourusername/n8n-nodes-claudecode-improved"
```

### Issue: "Email not verified"

**Solution**: Verify your email in your npm account settings.

### Issue: "Cannot publish over existing version"

**Solution**: Bump the version number:
```bash
npm version patch
npm publish
```

## 📊 Package Statistics

After publishing, you can track your package:

- **Download stats**: https://www.npmjs.com/package/@sirmrmarty/n8n-nodes-claudecode
- **npm trends**: https://npmtrends.com/@sirmrmarty/n8n-nodes-claudecode

## 🎯 Key Benefits of npm Publishing

1. **Easy Installation**: Users can install via n8n UI
2. **Automatic Updates**: Users get notified of new versions
3. **Professional Distribution**: Standard way to distribute n8n community nodes
4. **Better Discoverability**: Listed in npm and n8n community nodes
5. **Version Management**: Semantic versioning for updates

## 📝 Post-Publishing Checklist

- [ ] Verify package appears on npmjs.com
- [ ] Test installation via n8n UI
- [ ] Update repository README with npm installation instructions
- [ ] Share with the n8n community
- [ ] Monitor for user feedback and issues

## 🆘 Getting Help

- **npm CLI Help**: `npm help publish`
- **npm Documentation**: https://docs.npmjs.com/cli/v8/commands/npm-publish
- **n8n Community**: https://community.n8n.io/

---

**Ready to publish?** 🚀 Follow this guide step-by-step to make your improved Claude Code node available to the entire n8n community!