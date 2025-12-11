#!/usr/bin/env bash
set -euo pipefail

REPO_OWNER="groupthinking"
REPO_NAME="sidehelp"
ROOT_DIR="${PWD}/${REPO_NAME}"

if [ -d "$ROOT_DIR" ]; then
  echo "Directory $ROOT_DIR already exists. Please remove or choose another location."
  exit 1
fi

mkdir -p "$ROOT_DIR"
cd "$ROOT_DIR"

echo "Creating project structure..."
mkdir -p src icons demo-server .github/workflows

cat > manifest.json <<'EOF'
{
  "manifest_version": 3,
  "name": "MCP Assistant Connector",
  "short_name": "MCP-Assistant",
  "version": "1.0.0",
  "description": "Connect GitHub pages to your local and remote MCPs and surface assistant responses (works alongside Copilot).",
  "permissions": [
    "storage",
    "scripting",
    "activeTab",
    "clipboardWrite"
  ],
  "host_permissions": [
    "http://localhost/*",
    "https://*/*"
  ],
  "background": {
    "service_worker": "src/background.js"
  },
  "action": {
    "default_popup": "src/popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "icons": {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "content_scripts": [
    {
      "matches": ["https://github.com/*"],
      "js": ["src/contentScript.js"],
      "css": ["src/sidebar.css"],
      "run_at": "document_idle"
    }
  ],
  "options_page": "src/options.html"
}
EOF

cat > src/background.js <<'EOF'
// Background service worker (MV3)
// Listens for mcp requests and proxies them to configured endpoints.
//
// Message format:
// { type: "mcpRequest", endpoint: "local"|"remote", prompt: "<string>", options?: { method, headers, ... } }
//
// Responds with:
// { success: true, body: "<string>", status: 200 } or { success: false, error: "<message>" }

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === "mcpRequest") {
    handleMcpRequest(message).then((resp) => sendResponse(resp)).catch((err) => sendResponse({ success: false, error: String(err) }));
    // Tell chrome we will send a response asynchronously:
    return true;
  }
});

async function handleMcpRequest(message) {
  const { endpoint, prompt } = message;
  if (!prompt || typeof prompt !== "string") {
    return { success: false, error: "Missing prompt" };
  }

  const keys = await getSettings(["localEndpoint", "remoteEndpoint", "localAuthToken", "remoteAuthToken", "requestTimeoutMs"]);
  const timeoutMs = keys.requestTimeoutMs || 30000;
  let url = endpoint === "local" ? keys.localEndpoint : keys.remoteEndpoint;
  const token = endpoint === "local" ? keys.localAuthToken : keys.remoteAuthToken;

  if (!url) {
    return { success: false, error: `${endpoint} endpoint not configured` };
  }

  const fetchOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ prompt })
  };

  if (token) {
    fetchOptions.headers.Authorization = `Bearer ${token}`;
  }

  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { ...fetchOptions, signal: controller.signal });
    clearTimeout(id);

    const contentType = res.headers.get("content-type") || "";
    let body;
    if (contentType.includes("application/json")) {
      body = await res.json();
    } else {
      body = await res.text();
    }

    return { success: true, status: res.status, headers: Object.fromEntries(res.headers.entries()), body };
  } catch (err) {
    if (err.name === "AbortError") {
      return { success: false, error: `Request timed out after ${timeoutMs}ms` };
    }
    return { success: false, error: err.message || String(err) };
  }
}

function getSettings(keys) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(keys, (items) => resolve(items));
  });
}
EOF

cat > src/contentScript.js <<'EOF'
(function () {
  if (window.__mcp_assistant_injected) return;
  window.__mcp_assistant_injected = true;

  const container = document.createElement("aside");
  container.id = "mcp-assistant-sidebar";
  container.className = "mcp-sidebar collapsed";
  container.innerHTML = `
    <div class="mcp-header">
      <div class="mcp-title">MCP Assistant</div>
      <button id="mcp-toggle" aria-label="Toggle assistant">▸</button>
    </div>
    <div class="mcp-body" aria-hidden="true">
      <textarea id="mcp-prompt" placeholder="Ask your MCP..."></textarea>
      <div class="mcp-controls">
        <button id="mcp-send-local" title="Send to local MCP">Local</button>
        <button id="mcp-send-remote" title="Send to remote MCP">Remote</button>
        <button id="mcp-copy-response" title="Copy response">Copy</button>
        <button id="mcp-paste-into" title="Paste into focused">Paste</button>
        <button id="mcp-clear" title="Clear">Clear</button>
      </div>
      <div id="mcp-response" class="mcp-response" aria-live="polite"></div>
      <div class="mcp-footer">
        <a href="#" id="mcp-open-options">Options</a>
      </div>
    </div>
  `;

  document.body.appendChild(container);

  const toggle = container.querySelector("#mcp-toggle");
  const body = container.querySelector(".mcp-body");
  toggle.addEventListener("click", () => {
    container.classList.toggle("collapsed");
    const collapsed = container.classList.contains("collapsed");
    toggle.textContent = collapsed ? "▸" : "◂";
    body.setAttribute("aria-hidden", collapsed ? "true" : "false");
  });

  const promptEl = container.querySelector("#mcp-prompt");
  const respEl = container.querySelector("#mcp-response");
  const sendLocal = container.querySelector("#mcp-send-local");
  const sendRemote = container.querySelector("#mcp-send-remote");
  const copyBtn = container.querySelector("#mcp-copy-response");
  const pasteBtn = container.querySelector("#mcp-paste-into");
  const clearBtn = container.querySelector("#mcp-clear");
  const optionsLink = container.querySelector("#mcp-open-options");

  sendLocal.addEventListener("click", () => sendPrompt("local"));
  sendRemote.addEventListener("click", () => sendPrompt("remote"));
  copyBtn.addEventListener("click", copyResponse);
  pasteBtn.addEventListener("click", pasteIntoFocused);
  clearBtn.addEventListener("click", () => { promptEl.value = ""; respEl.textContent = ""; });

  optionsLink.addEventListener("click", (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });

  async function sendPrompt(endpoint) {
    const prompt = promptEl.value.trim();
    if (!prompt) {
      respEl.textContent = "Please enter a prompt.";
      return;
    }
    respEl.textContent = "Loading…";
    const resp = await sendToBackground({ type: "mcpRequest", endpoint, prompt });
    if (resp && resp.success) {
      respEl.textContent = typeof resp.body === "string" ? resp.body : JSON.stringify(resp.body, null, 2);
    } else {
      respEl.textContent = `Error: ${resp?.error || "Unknown error"}`;
    }
  }

  function sendToBackground(msg) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(msg, (resp) => resolve(resp));
    });
  }

  function copyResponse() {
    const text = respEl.textContent || "";
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      respEl.textContent = respEl.textContent + "\n\n(Copied to clipboard)";
    });
  }

  function pasteIntoFocused() {
    const text = respEl.textContent || "";
    if (!text) return;
    const active = document.activeElement;
    if (!active) {
      alert("No focused element to paste into.");
      return;
    }
    if (active.tagName === "TEXTAREA" || (active.tagName === "INPUT" && active.type === "text")) {
      const start = active.selectionStart || 0;
      const end = active.selectionEnd || 0;
      const current = active.value || "";
      active.value = current.slice(0, start) + text + current.slice(end);
      const pos = start + text.length;
      active.setSelectionRange(pos, pos);
      active.focus();
    } else if (active.isContentEditable) {
      active.focus();
      const sel = window.getSelection();
      if (sel && sel.getRangeAt && sel.rangeCount) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const node = document.createTextNode(text);
        range.insertNode(node);
        range.setStartAfter(node);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        active.innerText += text;
      }
    } else {
      try {
        active.value = (active.value || "") + text;
      } catch (e) {
        alert("Cannot paste into the focused element. Focus a text field or contenteditable element.");
      }
    }
  }

  window.addEventListener("keydown", (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.shiftKey && ev.key.toLowerCase() === "m") {
      toggle.click();
    }
  });

  window.__mcpAssistant = {
    sendPrompt: (p, endpoint = "local") => sendToBackground({ type: "mcpRequest", endpoint, prompt: p })
  };
})();
EOF

cat > src/sidebar.css <<'EOF'
/* Minimal sidebar styles (dark-friendly). You can adapt styles to match your product. */
#mcp-assistant-sidebar {
  position: fixed;
  right: 12px;
  bottom: 12px;
  width: 360px;
  max-width: calc(100% - 24px);
  z-index: 2147483647;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 8px 40px rgba(2,6,23,0.6);
  background: linear-gradient(180deg, #0b0b0d, #0f1113);
  color: #e6eef5;
  border: 1px solid rgba(255,255,255,0.04);
  transition: transform 220ms ease, opacity 220ms ease;
}

/* collapsed state only shows header */
#mcp-assistant-sidebar.collapsed {
  width: 48px;
  height: 48px;
  border-radius: 999px;
  padding: 0;
  overflow: visible;
}

#mcp-assistant-sidebar .mcp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px;
}

#mcp-assistant-sidebar .mcp-title {
  font-weight: 600;
  font-size: 13px;
  padding-left: 6px;
}

#mcp-assistant-sidebar button {
  background: transparent;
  border: none;
  color: inherit;
  font-size: 12px;
  cursor: pointer;
}

#mcp-assistant-sidebar .mcp-body {
  padding: 12px;
}

#mcp-assistant-sidebar textarea#mcp-prompt {
  width: 100%;
  min-height: 80px;
  border-radius: 8px;
  resize: vertical;
  padding: 8px;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.03);
  color: inherit;
  outline: none;
}

.mcp-controls {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.mcp-controls button {
  flex: 1;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.03);
  color: inherit;
}

.mcp-response {
  margin-top: 12px;
  white-space: pre-wrap;
  max-height: 280px;
  overflow: auto;
  padding: 8px;
  background: rgba(255,255,255,0.01);
  border-radius: 8px;
  border: 1px solid rgba(255,255,255,0.02);
}

.mcp-footer {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
  font-size: 12px;
}
EOF

cat > src/popup.html <<'EOF'
<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>MCP Assistant</title>
  <link rel="stylesheet" href="src/popup.css">
</head>
<body>
  <div class="popup">
    <h3>MCP Assistant</h3>
    <textarea id="popup-prompt" placeholder="Ask your MCP..."></textarea>
    <div class="popup-controls">
      <button id="popup-local">Send Local</button>
      <button id="popup-remote">Send Remote</button>
      <button id="popup-open-sidebar">Sidebar</button>
    </div>
    <pre id="popup-response" class="popup-response"></pre>
    <div class="popup-footer">
      <a id="popup-options" href="#">Options</a>
    </div>
  </div>
  <script src="src/popup.js"></script>
</body>
</html>
EOF

cat > src/popup.css <<'EOF'
body { margin: 0; font-family: -apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto; width: 360px; color: #111; }
.popup { padding: 12px; }
.popup h3 { margin: 0 0 8px 0; font-size: 14px; }
textarea#popup-prompt { width: 100%; min-height: 60px; padding: 6px; border-radius: 6px; border: 1px solid #ddd; }
.popup-controls { display:flex; gap:8px; margin-top:8px; }
.popup-controls button { flex:1; padding:8px; border-radius:6px; }
.popup-response { white-space: pre-wrap; margin-top:8px; max-height:240px; overflow:auto; background:#f8f8f8; padding:8px; border-radius:6px; border:1px solid #eee; }
.popup-footer { margin-top:8px; font-size:12px; }
EOF

cat > src/popup.js <<'EOF'
document.addEventListener("DOMContentLoaded", () => {
  const promptEl = document.getElementById("popup-prompt");
  const localBtn = document.getElementById("popup-local");
  const remoteBtn = document.getElementById("popup-remote");
  const respEl = document.getElementById("popup-response");
  const openSidebarBtn = document.getElementById("popup-open-sidebar");
  const optionsLink = document.getElementById("popup-options");

  localBtn.addEventListener("click", () => sendPrompt("local"));
  remoteBtn.addEventListener("click", () => sendPrompt("remote"));
  openSidebarBtn.addEventListener("click", openSidebar);
  optionsLink.addEventListener("click", (e) => { e.preventDefault(); chrome.runtime.openOptionsPage(); });

  function sendPrompt(endpoint) {
    const prompt = promptEl.value.trim();
    if (!prompt) {
      respEl.textContent = "Enter a prompt.";
      return;
    }
    respEl.textContent = "Loading…";
    chrome.runtime.sendMessage({ type: "mcpRequest", endpoint, prompt }, (resp) => {
      if (!resp) {
        respEl.textContent = "No response from background (maybe blocked by permissions).";
        return;
      }
      if (resp.success) {
        respEl.textContent = typeof resp.body === "string" ? resp.body : JSON.stringify(resp.body, null, 2);
      } else {
        respEl.textContent = `Error: ${resp.error}`;
      }
    });
  }

  function openSidebar() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs.length) return;
      chrome.scripting.executeScript({
        target: { tabId: tabs[0].id },
        func: () => {
          const el = document.getElementById("mcp-assistant-sidebar");
          if (el) {
            const toggle = el.querySelector("#mcp-toggle");
            if (toggle) toggle.click();
          } else {
            alert("Sidebar not injected on this page yet. Refresh the page to load it.");
          }
        }
      });
    });
  }
});
EOF

cat > src/options.html <<'EOF'
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>MCP Assistant Options</title>
  <link rel="stylesheet" href="src/options.css">
</head>
<body>
  <main class="options">
    <h2>MCP Assistant Settings</h2>

    <label>Local MCP Endpoint (e.g. http://localhost:8080/api)</label>
    <input id="localEndpoint" type="text" placeholder="http://localhost:8080/mcp" />

    <label>Local MCP Bearer Token (optional)</label>
    <input id="localAuthToken" type="password" placeholder="optional token" />

    <label>Remote MCP Endpoint (HTTPS)</label>
    <input id="remoteEndpoint" type="text" placeholder="https://mcp.example.com/api" />

    <label>Remote MCP Bearer Token (optional)</label>
    <input id="remoteAuthToken" type="password" placeholder="optional token" />

    <label>Request timeout (ms)</label>
    <input id="requestTimeoutMs" type="number" min="1000" step="1000" value="30000" />

    <div class="buttons">
      <button id="save">Save</button>
      <button id="load">Load</button>
      <button id="clear">Clear</button>
    </div>

    <p class="note">Make sure CORS / server settings allow requests from the extension. Background worker will proxy requests to endpoints to avoid page CORS issues.</p>
  </main>

  <script src="src/options.js"></script>
</body>
</html>
EOF

cat > src/options.css <<'EOF'
body { font-family: -apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto; margin: 0; padding: 12px; color: #111; }
.options { max-width: 720px; margin: 0 auto; }
label { display:block; margin-top: 12px; font-weight:600; }
input[type="text"], input[type="password"], input[type="number"] { width: 100%; padding: 8px; border-radius:6px; border:1px solid #ddd; margin-top:6px; box-sizing:border-box;}
.buttons { display:flex; gap:8px; margin-top:12px; }
.buttons button { padding:8px 12px; border-radius:6px; }
.note { margin-top:12px; font-size:12px; color:#555; }
EOF

cat > src/options.js <<'EOF'
document.addEventListener("DOMContentLoaded", () => {
  const els = {
    localEndpoint: document.getElementById("localEndpoint"),
    localAuthToken: document.getElementById("localAuthToken"),
    remoteEndpoint: document.getElementById("remoteEndpoint"),
    remoteAuthToken: document.getElementById("remoteAuthToken"),
    requestTimeoutMs: document.getElementById("requestTimeoutMs"),
    save: document.getElementById("save"),
    load: document.getElementById("load"),
    clear: document.getElementById("clear")
  };

  function save() {
    const settings = {
      localEndpoint: els.localEndpoint.value.trim(),
      localAuthToken: els.localAuthToken.value,
      remoteEndpoint: els.remoteEndpoint.value.trim(),
      remoteAuthToken: els.remoteAuthToken.value,
      requestTimeoutMs: Number(els.requestTimeoutMs.value) || 30000
    };
    chrome.storage.sync.set(settings, () => {
      alert("Settings saved.");
    });
  }

  function load() {
    chrome.storage.sync.get([
      "localEndpoint",
      "localAuthToken",
      "remoteEndpoint",
      "remoteAuthToken",
      "requestTimeoutMs"
    ], (items) => {
      els.localEndpoint.value = items.localEndpoint || "";
      els.localAuthToken.value = items.localAuthToken || "";
      els.remoteEndpoint.value = items.remoteEndpoint || "";
      els.remoteAuthToken.value = items.remoteAuthToken || "";
      els.requestTimeoutMs.value = items.requestTimeoutMs || 30000;
    });
  }

  function clearAll() {
    if (!confirm("Clear all stored settings?")) return;
    chrome.storage.sync.clear(() => {
      load();
    });
  }

  els.save.addEventListener("click", save);
  els.load.addEventListener("click", load);
  els.clear.addEventListener("click", clearAll);

  load();
});
EOF

cat > README.md <<'EOF'
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
4. Open a GitHub page to see the injected sidebar. Use Ctrl/Cmd+Shift+M to toggle the sidebar.

How to build a zip for upload to Chrome Web Store
1. From the extension root folder, run:
   - macOS / Linux:
     ```
     zip -r mcp-assistant-1.0.0.zip manifest.json src icons README.md
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
- Keyboard shortcut (Ctrl/Cmd+Shift+M) to toggle the sidebar.
- Popup action that can open the sidebar on the active tab.
- Options page to configure endpoints + tokens + request timeout.

Troubleshooting
- If sidebar doesn't inject, refresh the GitHub page after loading the extension.
- If network requests fail, ensure endpoints are reachable and configured correctly in Options.
- Check the background service worker logs in chrome://extensions → Service worker view (click "background page" or "inspect views") for debugging.

License & usage
- This is a template starter. Use it and adapt it for your environment. Do not use to bypass licensing or authentication for third-party services.
EOF

cat > .gitignore <<'EOF'
node_modules/
release/
.env
.DS_Store
EOF

cat > LICENSE <<'EOF'
MIT License

Copyright (c) 2025 groupthinking

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF

cat > .github/workflows/release.yml <<'EOF'
name: Release Extension Zip

on:
  push:
    tags:
      - 'v*.*.*'
  workflow_dispatch: {}

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Zip extension
        run: |
          mkdir -p release
          zip -r release/sidehelp-${{ github.ref_name }}.zip manifest.json src icons README.md
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: sidehelp-${{ github.ref_name }}.zip
          path: release/sidehelp-${{ github.ref_name }}.zip
EOF

cat > demo-server/package.json <<'EOF'
{
  "name": "sidehelp-demo-mcp",
  "version": "1.0.0",
  "main": "index.js",
  "license": "MIT",
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "body-parser": "^1.20.2"
  }
}
EOF

cat > demo-server/index.js <<'EOF'
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const port = process.env.PORT || 8080;

app.use(cors());
app.use(bodyParser.json());

app.get('/health', (req, res) => res.json({ ok: true }));

app.post('/mcp', (req, res) => {
  const { prompt } = req.body || {};
  const response = {
    id: 'demo-1',
    prompt: prompt || '',
    text: `Demo assistant response for prompt: ${prompt || '<empty>'}`
  };
  res.json(response);
});

app.listen(port, () => console.log(`Demo MCP listening on http://localhost:${port}`));
EOF

# Transparent 1x1 PNG (base64)
PNG_BASE64="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIW2P4z8DwHwAFhgJ/lzZqMgAAAABJRU5ErkJggg=="
echo "$PNG_BASE64" | base64 --decode > icons/icon16.png
echo "$PNG_BASE64" | base64 --decode > icons/icon48.png
echo "$PNG_BASE64" | base64 --decode > icons/icon128.png

echo "Initializing git repository, making initial commit..."
git init -b main
git add .
git commit -m "Initial commit"

echo "Attempting to create repo on GitHub using gh (requires gh and you authenticated as $REPO_OWNER)..."
if command -v gh >/dev/null 2>&1; then
  if gh repo view "${REPO_OWNER}/${REPO_NAME}" >/dev/null 2>&1; then
    echo "Repository ${REPO_OWNER}/${REPO_NAME} already exists. Adding remote and pushing..."
    git remote add origin "git@github.com:${REPO_OWNER}/${REPO_NAME}.git" || true
    git push -u origin main
  else
    gh repo create "${REPO_OWNER}/${REPO_NAME}" --public --source=. --remote=origin --push --confirm
  fi
  echo "Operation complete. Visit https://github.com/${REPO_OWNER}/${REPO_NAME}"
else
  echo "gh CLI not found. Please install GitHub CLI and authenticate (gh auth login), or create the repo manually and push:"
  echo "  gh repo create ${REPO_OWNER}/${REPO_NAME} --public"
  echo "  git remote add origin git@github.com:${REPO_OWNER}/${REPO_NAME}.git"
  echo "  git push -u origin main"
fi

echo "Done."