# MCP Assistant Connector — Chrome Extension (source)

What this is
- A Chrome extension (manifest v3) that injects a small assistant sidebar into GitHub pages, provides a popup, and an options page.
- It proxies prompts to two configurable MCP endpoints (local and remote) via the background service worker.
- It supports quick copy/paste of responses into focused input fields or contenteditable regions.

Files of interest
- manifest.json — extension manifest
- src/background.js — service worker that proxies requests
- src/contentScript.js — injects the sidebar UI into GitHub pages
- src/sidebar.css — sidebar styles
- src/popup.html / src/popup.js / src/popup.css — toolbar popup
- src/options.html / src/options.js / src/options.css — settings UI
- icons/ — add your 16/48/128 PNG icons here as referenced in the manifest

How to load locally (developer)
1. Save the files above into a directory, preserving the paths.
2. Add icons into `icons/` named `icon16.png`, `icon48.png`, `icon128.png`.
3. In Chrome: Menu → Extensions → Developer mode → Load unpacked → pick the extension folder.
4. Open a GitHub page to see the injected sidebar. Use Ctrl/Cmd+Shift+M to toggle.

How to build a zip for upload to Chrome Web Store
1. From the extension root folder, run:
   - macOS / Linux:
     ```
     zip -r mcp-assistant-1.0.0.zip manifest.json src icons
     ```
   - Windows (PowerShell)
     ```
     Compress-Archive -Path manifest.json,src,icons -DestinationPath mcp-assistant-1.0.0.zip
     ```
2. Upload the .zip to the Chrome Web Store developer dashboard and follow publishing steps.

Configuration
- Open the extension options page (via popup → Options, or Chrome Extensions → Details → Extension options).
- Configure:
  - Local MCP Endpoint (e.g. http://localhost:8080/mcp)
  - Local MCP Bearer Token (optional)
  - Remote MCP Endpoint (HTTPS) (e.g. https://mcp.example.com/api)
  - Remote MCP Bearer Token (optional)
  - Request timeout (ms)

Security & recommendations
- Store tokens carefully. chrome.storage.sync is convenient but not encrypted. Prefer ephemeral tokens.
- Run your local MCP behind local firewall and don't expose secrets unnecessarily.
- Background service worker performs the network fetch to avoid page CORS restrictions. Keep endpoints secure.
- Test endpoints manually with curl/postman before wiring into the extension.
- Respect remote endpoint usage policies and don't attempt to misuse proprietary services.

Extensibility / Ideas added
- Sidebar injection and popup to surface responses quickly.
- Paste-into-focused-element convenience (best-effort).
- Quick choice between local and remote MCP for each request.
- API exposed on window.__mcpAssistant for page-level integrations or automation.

Troubleshooting
- If sidebar doesn't inject, refresh the GitHub page after loading the extension.
- If network requests fail, ensure endpoints are reachable and configured correctly in Options.
- Check the background service worker logs in chrome://extensions → Service worker view (click "background page" or "inspect views") for debugging.

License & usage
- This is a template starter. Use it and adapt it for your environment. Do not use to bypass licensing or authentication for third-party services.
