// Content script: injects a collapsible sidebar into GitHub pages and wire up UI actions.
// - Loads the sidebar HTML template from extension resources (we include the template inline here for simplicity).
// - Uses chrome.runtime.sendMessage to call background for MCP requests.
// - Pastes responses into focused input or contenteditable fields on the page when requested.

(function () {
  if (window.__mcp_assistant_injected) return;
  window.__mcp_assistant_injected = true;

  // Create container
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

  // Toggle collapse
  const toggle = container.querySelector("#mcp-toggle");
  const body = container.querySelector(".mcp-body");
  toggle.addEventListener("click", () => {
    container.classList.toggle("collapsed");
    const collapsed = container.classList.contains("collapsed");
    toggle.textContent = collapsed ? "▸" : "◂";
    body.setAttribute("aria-hidden", collapsed ? "true" : "false");
  });

  // Buttons
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
    // Open options page in a new tab
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
    // If input or textarea
    if (active.tagName === "TEXTAREA" || (active.tagName === "INPUT" && active.type === "text")) {
      const start = active.selectionStart || 0;
      const end = active.selectionEnd || 0;
      const current = active.value || "";
      active.value = current.slice(0, start) + text + current.slice(end);
      // Move caret
      const pos = start + text.length;
      active.setSelectionRange(pos, pos);
      active.focus();
    } else if (active.isContentEditable) {
      active.focus();
      // Insert at caret
      const sel = window.getSelection();
      if (sel && sel.getRangeAt && sel.rangeCount) {
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const node = document.createTextNode(text);
        range.insertNode(node);
        // Move caret after inserted node
        range.setStartAfter(node);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      } else {
        active.innerText += text;
      }
    } else {
      // Try fallback: insert at end if property exists
      try {
        active.value = (active.value || "") + text;
      } catch (e) {
        alert("Cannot paste into the focused element. Focus a text field or contenteditable element.");
      }
    }
  }

  // Basic keyboard shortcut: Ctrl+Shift+M to toggle
  window.addEventListener("keydown", (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.shiftKey && ev.key.toLowerCase() === "m") {
      toggle.click();
    }
  });

  // Expose a simple API for other page scripts (optional)
  window.__mcpAssistant = {
    sendPrompt: (p, endpoint = "local") => sendToBackground({ type: "mcpRequest", endpoint, prompt: p })
  };
})();