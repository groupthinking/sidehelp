# sidehelp - MCP Assistant Connector

> A Chrome extension that brings AI assistance directly into your GitHub workflow

![Extension Version](https://img.shields.io/badge/version-1.0.0-blue)
![Manifest Version](https://img.shields.io/badge/manifest-v3-green)

## 🚀 What is this?

MCP Assistant Connector is a Chrome extension (Manifest V3) that seamlessly integrates AI assistance into GitHub pages. It provides:

- **Contextual AI Assistance**: Automatically detects GitHub context (repo, PR, file, etc.) and includes it with your prompts
- **Quick Actions**: Pre-built prompts for common tasks like explaining code, refactoring, writing tests, and summarizing PRs
- **Multiple Endpoints**: Support for local and remote MCP endpoints, plus customizable endpoint profiles
- **Smart Sidebar**: Collapsible sidebar that doesn't interfere with your workflow
- **History Tracking**: Per-tab conversation history for easy reference
- **Paste Integration**: Copy responses directly into GitHub text fields

## 📁 Project Structure

```
sidehelp/
├── manifest.json           # Extension manifest
├── src/
│   ├── background.js       # Service worker (request proxy, telemetry)
│   ├── contentScript.js    # Sidebar injection and GitHub context detection
│   ├── sidebar.css         # Sidebar styles with dark theme
│   ├── popup.html/js/css   # Toolbar popup interface
│   └── options.html/js/css # Settings and configuration UI
├── icons/                  # Extension icons (16x16, 48x48, 128x128)
└── .github/workflows/      # CI/CD for automated releases
```

## 🎯 Quick Start

### Installation (Developer Mode)

1. Clone this repository:
   ```bash
   git clone https://github.com/groupthinking/sidehelp.git
   cd sidehelp
   ```

2. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable **Developer mode** (toggle in top-right corner)
   - Click **Load unpacked**
   - Select the `sidehelp` directory

3. Navigate to any GitHub page to see the sidebar!
   - Use `Ctrl+Shift+M` (or `Cmd+Shift+M` on Mac) to toggle the sidebar

### Production Build

Build a production-ready ZIP file for Chrome Web Store:

**macOS / Linux:**
```bash
zip -r mcp-assistant-1.0.0.zip manifest.json src icons README.md
```

**Windows (PowerShell):**
```powershell
Compress-Archive -Path manifest.json,src,icons,README.md -DestinationPath mcp-assistant-1.0.0.zip
```

### Automated Releases

This repository includes GitHub Actions workflow that automatically:
- Creates a ZIP package on git tag pushes (e.g., `v1.0.0`)
- Attaches the package to GitHub releases
- Simplifies distribution and versioning

To trigger a release:
```bash
git tag v1.0.0
git push origin v1.0.0
```

## ⚙️ Configuration

### Basic Setup

1. Click the extension icon in Chrome toolbar
2. Select **Options** from the popup
3. Configure your MCP endpoints:

**Legacy Endpoints:**
- **Local MCP Endpoint**: `http://localhost:8080/mcp` (for local development)
- **Local MCP Bearer Token**: Optional authentication token
- **Remote MCP Endpoint**: `https://mcp.example.com/api` (for production services)
- **Remote MCP Bearer Token**: Optional authentication token
- **Request Timeout**: Default 30000ms (30 seconds)

### Endpoint Profiles (Recommended)

Profiles allow you to configure multiple endpoints with custom settings:

1. In Options page, navigate to **Endpoint Profiles** section
2. Click **+ Add Profile**
3. Configure profile settings:
   - **Name**: Descriptive name for the profile (e.g., "GPT-4", "Claude")
   - **URL**: API endpoint URL
   - **Auth Token**: Bearer token for authentication
   - **Default Preamble**: System instructions sent with every request
   - **Temperature**: Model temperature (0-1, controls randomness)

### Testing Endpoints

Use the **Ping** buttons in Options to verify your endpoints are reachable:
- ✔ **Working**: Endpoint is accessible and responding
- ✖ **Failed**: Connection error or authentication issue
- ⧖ **Testing**: Request in progress

## 💡 Usage Examples

### Quick Actions

The sidebar includes pre-built quick action buttons:

**💡 Explain Selection**
- Select code in a GitHub file view or PR diff
- Click "Explain" to get a detailed explanation
- Works with any programming language

**🔧 Refactor Selection**
- Highlight code that needs improvement
- Click "Refactor" for suggestions on readability and maintainability
- Receive refactored code with explanations

**✓ Write Tests**
- Click while viewing a file to generate comprehensive test cases
- Works with or without code selection
- Generates tests in the appropriate testing framework

**📝 Summarize PR**
- Use when viewing a pull request
- Get a concise summary of all changes
- Perfect for code reviews

**📋 Draft PR Description**
- Automatically generate PR description based on changes
- Includes context from commit messages and diffs
- Saves time when creating pull requests

### Using the Sidebar

1. **Open/Close**: Click the sidebar button or press `Ctrl+Shift+M` (`Cmd+Shift+M` on Mac)
2. **Enter Prompt**: Type your question or request in the text area
3. **Choose Endpoint**: Click "Local" or "Remote" to send your request
4. **View Response**: AI response appears below with timing information
5. **Copy/Paste**: Use buttons to copy response or paste into active field

### GitHub Context Detection

The extension automatically captures and sends:
- **Repository Info**: Owner and repository name
- **Page Type**: File view, PR diff, issue, discussion, commit
- **File Context**: File path, branch/ref, programming language
- **Code Selection**: Any text you've highlighted in code blocks
- **PR/Issue Numbers**: Automatically extracted from URL

Example context sent with requests:
```json
{
  "url": "https://github.com/user/repo/pull/123",
  "viewport_type": "pr_diff",
  "owner": "user",
  "repo": "repo",
  "pr_number": "123",
  "selection": "function example() { ... }"
}
```

### History

Every interaction is saved in per-tab history:
- Click any history item to restore the prompt and response
- View last 20 conversations per tab
- Click "Clear" to reset history
- History is kept in memory only (not synced)

## 🔒 Security & Best Practices

**Token Storage:**
- Tokens are stored in `chrome.storage.sync` (not encrypted)
- Use ephemeral or scoped tokens when possible
- Rotate tokens regularly

**Network Security:**
- Background service worker proxies all requests to avoid CORS issues
- Local endpoints should run behind firewall
- Always use HTTPS for remote endpoints
- Verify SSL certificates

**API Usage:**
- Test endpoints with curl/Postman before configuring
- Respect rate limits and usage policies
- Don't expose proprietary services
- Monitor telemetry for unusual activity

## 🎨 Features

### Core Capabilities
- ✅ GitHub context detection (repo, file, PR, issue, discussion)
- ✅ Code selection capture from diffs and file views
- ✅ Quick action buttons for common tasks
- ✅ Multiple endpoint support (local, remote, profiles)
- ✅ Per-tab conversation history
- ✅ Response envelope with status and timing
- ✅ Endpoint health checking (ping)
- ✅ Telemetry tracking (calls, latency, success rate)

### Accessibility
- ✅ Reduced motion support (`prefers-reduced-motion`)
- ✅ Keyboard shortcuts (`Ctrl+Shift+M` to toggle)
- ✅ ARIA labels for screen readers
- ✅ High contrast dark theme

### Developer Experience
- ✅ Exposed API: `window.__mcpAssistant`
- ✅ Debug telemetry view in options
- ✅ Automated GitHub Actions packaging
- ✅ Comprehensive error handling

## 🐛 Troubleshooting

**Sidebar not appearing:**
- Refresh the GitHub page after installing the extension
- Verify you're on github.com (sidebar only injects on GitHub)
- Check Chrome Extensions page to ensure extension is enabled
- Press `Ctrl+Shift+M` to manually toggle sidebar

**Network request failures:**
- Verify endpoints are configured correctly in Options
- Use "Ping" buttons to test endpoint connectivity
- Check that endpoints support CORS or are properly configured
- Verify authentication tokens are correct

**Background service worker issues:**
- Open `chrome://extensions`
- Find "MCP Assistant Connector"
- Click "Service worker" link to view console logs
- Look for error messages or failed requests

**Performance issues:**
- Check telemetry in Options to see endpoint latency
- Consider increasing request timeout in settings
- Reduce history size by clearing old conversations
- Use local endpoints for faster responses

**Context not being detected:**
- Ensure you're on a supported GitHub page type
- Context detection works on: files, PRs, issues, discussions, commits
- Make selections within code blocks or diff containers
- Check browser console for any JavaScript errors

## 📊 Telemetry

View performance statistics in Options → Telemetry:
- **Total Calls**: Number of requests per endpoint
- **Success Rate**: Percentage of successful requests
- **Failed Requests**: Count of errors
- **Average Latency**: Response time in milliseconds

Use telemetry to:
- Monitor endpoint health
- Compare local vs remote performance
- Identify problematic configurations
- Optimize timeout settings

## 🤝 Contributing

Contributions are welcome! Areas for improvement:
- Additional quick actions for specific workflows
- Support for other code hosting platforms (GitLab, Bitbucket)
- Enhanced context detection for more page types
- Custom theme support
- Profile import/export
- Streaming responses

## 📝 License & Usage

This is an open-source template. Use and adapt it for your environment.

**Important:**
- Do not use to bypass licensing or authentication for third-party services
- Respect API rate limits and terms of service
- Keep authentication tokens secure
- This extension is provided as-is without warranty

## 🔗 Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/mv3/intro/)
- [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)

---

Made with ❤️ for developers who want AI assistance without leaving their workflow.
