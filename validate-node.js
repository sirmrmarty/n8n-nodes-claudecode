#!/usr/bin/env node

// Simple validation script to check if the n8n node is properly structured
const path = require('path');
const fs = require('fs');

console.log('🔍 Validating n8n-nodes-claudecode structure...\n');

// Check if dist directory exists and has the required files
const distPath = path.join(__dirname, 'dist');
const nodePath = path.join(distPath, 'nodes', 'ClaudeCode', 'ClaudeCode.node.js');
const iconPath = path.join(distPath, 'nodes', 'ClaudeCode', 'claudecode.svg');

let allValid = true;

// Check compiled node file
if (fs.existsSync(nodePath)) {
    console.log('✅ ClaudeCode.node.js found');
    
    // Basic validation - check if it exports an n8n node
    try {
        const nodeContent = fs.readFileSync(nodePath, 'utf8');
        if (nodeContent.includes('ClaudeCode') && nodeContent.includes('displayName')) {
            console.log('✅ Node class and configuration found');
        } else {
            console.log('❌ Node file may not be properly structured');
            allValid = false;
        }
    } catch (error) {
        console.log('❌ Error reading node file:', error.message);
        allValid = false;
    }
} else {
    console.log('❌ ClaudeCode.node.js not found');
    allValid = false;
}

// Check icon file
if (fs.existsSync(iconPath)) {
    console.log('✅ Icon file found');
} else {
    console.log('❌ Icon file not found');
    allValid = false;
}

// Check package.json structure
const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
    console.log('✅ package.json found');
    
    try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        
        if (packageJson.n8n && packageJson.n8n.nodes) {
            console.log('✅ n8n configuration found in package.json');
            
            const nodeConfig = packageJson.n8n.nodes[0];
            if (nodeConfig === 'dist/nodes/ClaudeCode/ClaudeCode.node.js') {
                console.log('✅ Node path correctly configured');
            } else {
                console.log('❌ Node path configuration incorrect');
                allValid = false;
            }
        } else {
            console.log('❌ n8n configuration missing from package.json');
            allValid = false;
        }
    } catch (error) {
        console.log('❌ Error parsing package.json:', error.message);
        allValid = false;
    }
} else {
    console.log('❌ package.json not found');
    allValid = false;
}

console.log('\n' + '='.repeat(50));
if (allValid) {
    console.log('🎉 All validations passed! The node should work in n8n.');
    console.log('\nNext steps:');
    console.log('1. Run the install script: ./install-to-n8n.sh');
    console.log('2. Restart n8n');
    console.log('3. Look for "Claude Code" in the node palette');
} else {
    console.log('❌ Some validations failed. Please check the issues above.');
    process.exit(1);
}