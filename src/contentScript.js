// Content script: injects a collapsible sidebar into GitHub pages and wire up UI actions.
// - Loads the sidebar HTML template from extension resources (we include the template inline here for simplicity).
// - Uses chrome.runtime.sendMessage to call background for MCP requests.
// - Pastes responses into focused input or contenteditable fields on the page when requested.

(function () {
  if (window.__mcp_assistant_injected) return;
  window.__mcp_assistant_injected = true;

  // Detect GitHub context from the current page
  function detectGitHubContext() {
    const url = window.location.href;
    const pathname = window.location.pathname;
    const parts = pathname.split('/').filter(Boolean);
    
    const context = {
      url: url,
      viewport_type: 'unknown'
    };

    // Parse owner/repo
    if (parts.length >= 2) {
      context.owner = parts[0];
      context.repo = parts[1];
    }

    // Detect page type
    if (parts.length >= 4) {
      const section = parts[2];
      
      if (section === 'pull') {
        context.viewport_type = 'pr_diff';
        context.pr_number = parts[3];
        if (parts.length > 4 && parts[4] === 'files') {
          context.viewport_type = 'pr_files';
        }
      } else if (section === 'issues') {
        context.viewport_type = 'issue';
        context.issue_number = parts[3];
      } else if (section === 'discussions') {
        context.viewport_type = 'discussion';
        context.discussion_number = parts[3];
      } else if (section === 'blob' || section === 'tree') {
        context.viewport_type = 'file_view';
        context.ref = parts[3];
        context.file_path = parts.slice(4).join('/');
      } else if (section === 'commit') {
        context.viewport_type = 'commit';
        context.commit_sha = parts[3];
      }
    } else if (parts.length === 2) {
      context.viewport_type = 'repo_home';
    }

    // Detect language from file extension
    if (context.file_path) {
      const ext = context.file_path.split('.').pop().toLowerCase();
      const langMap = {
        'js': 'javascript', 'jsx': 'javascript', 'ts': 'typescript', 'tsx': 'typescript',
        'py': 'python', 'rb': 'ruby', 'java': 'java', 'cpp': 'cpp', 'c': 'c',
        'go': 'go', 'rs': 'rust', 'php': 'php', 'cs': 'csharp', 'swift': 'swift',
        'kt': 'kotlin', 'md': 'markdown', 'html': 'html', 'css': 'css', 'json': 'json',
        'yml': 'yaml', 'yaml': 'yaml', 'xml': 'xml', 'sh': 'shell', 'sql': 'sql'
      };
      context.language = langMap[ext] || ext;
    }

    return context;
  }

  // Get current text selection from code/diff containers
  function getCodeSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return null;

    const selectedText = selection.toString().trim();
    if (!selectedText) return null;

    // Check if selection is within code or diff containers
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container;
    
    // Look for GitHub code/diff containers
    const codeContainer = element.closest('.blob-code, .diff-table, .code-list, pre, code, .highlight');
    if (codeContainer) {
      return selectedText;
    }

    return null;
  }

  // Per-tab history (in-memory, max 20 entries)
  const history = [];
  const MAX_HISTORY = 20;

  function addToHistory(entry) {
    history.unshift(entry);
    if (history.length > MAX_HISTORY) {
      history.pop();
    }
    updateHistoryUI();
  }

  function clearHistory() {
    history.length = 0;
    updateHistoryUI();
  }

  function updateHistoryUI() {
    const historyEl = container.querySelector("#mcp-history");
    if (!historyEl) return;
    
    if (history.length === 0) {
      historyEl.innerHTML = '<div class="mcp-history-empty">No history yet</div>';
      return;
    }

    historyEl.innerHTML = history.map((entry, idx) => `
      <div class="mcp-history-item" data-idx="${idx}">
        <div class="mcp-history-meta">${entry.endpoint} • ${new Date(entry.timestamp).toLocaleTimeString()}</div>
        <div class="mcp-history-prompt">${escapeHtml(entry.prompt.substring(0, 60))}${entry.prompt.length > 60 ? '...' : ''}</div>
      </div>
    `).join('');

    // Add click handlers to restore from history
    historyEl.querySelectorAll('.mcp-history-item').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.idx);
        const entry = history[idx];
        if (entry) {
          promptEl.value = entry.prompt;
          respEl.textContent = typeof entry.response === "string" ? entry.response : JSON.stringify(entry.response, null, 2);
        }
      });
    });
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

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
      <div class="mcp-quick-actions">
        <button id="mcp-explain" title="Explain selection" class="mcp-quick-btn">💡 Explain</button>
        <button id="mcp-refactor" title="Refactor selection" class="mcp-quick-btn">🔧 Refactor</button>
        <button id="mcp-test" title="Write tests" class="mcp-quick-btn">✓ Tests</button>
        <button id="mcp-summarize-pr" title="Summarize PR" class="mcp-quick-btn">📝 PR Summary</button>
        <button id="mcp-draft-pr" title="Draft PR description" class="mcp-quick-btn">📋 PR Desc</button>
      </div>
      <textarea id="mcp-prompt" placeholder="Ask your MCP..."></textarea>
      <div class="mcp-controls">
        <button id="mcp-send-local" title="Send to local MCP">Local</button>
        <button id="mcp-send-remote" title="Send to remote MCP">Remote</button>
        <button id="mcp-copy-response" title="Copy response">Copy</button>
        <button id="mcp-paste-into" title="Paste into focused">Paste</button>
        <button id="mcp-clear" title="Clear">Clear</button>
      </div>
      <div id="mcp-response" class="mcp-response" aria-live="polite"></div>
      <div class="mcp-history-section">
        <div class="mcp-history-header">
          <span>History</span>
          <button id="mcp-clear-history" title="Clear history">Clear</button>
        </div>
        <div id="mcp-history" class="mcp-history"></div>
      </div>
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
  const clearHistoryBtn = container.querySelector("#mcp-clear-history");

  // Quick action buttons
  const explainBtn = container.querySelector("#mcp-explain");
  const refactorBtn = container.querySelector("#mcp-refactor");
  const testBtn = container.querySelector("#mcp-test");
  const summarizePRBtn = container.querySelector("#mcp-summarize-pr");
  const draftPRBtn = container.querySelector("#mcp-draft-pr");

  sendLocal.addEventListener("click", () => sendPrompt("local"));
  sendRemote.addEventListener("click", () => sendPrompt("remote"));
  copyBtn.addEventListener("click", copyResponse);
  pasteBtn.addEventListener("click", pasteIntoFocused);
  clearBtn.addEventListener("click", () => { promptEl.value = ""; respEl.textContent = ""; });
  clearHistoryBtn.addEventListener("click", clearHistory);

  // Quick actions
  explainBtn.addEventListener("click", () => {
    const selection = getCodeSelection();
    const context = detectGitHubContext();
    let prompt = "Explain this code:\n\n";
    if (selection) {
      prompt += selection;
    } else {
      prompt = "Explain the code in this " + (context.viewport_type || "page");
    }
    promptEl.value = prompt;
    sendPrompt("local", prompt);
  });

  refactorBtn.addEventListener("click", () => {
    const selection = getCodeSelection();
    let prompt = "Refactor this code to improve readability and maintainability:\n\n";
    if (selection) {
      prompt += selection;
    } else {
      prompt = "Suggest refactoring improvements for this file";
    }
    promptEl.value = prompt;
    sendPrompt("local", prompt);
  });

  testBtn.addEventListener("click", () => {
    const context = detectGitHubContext();
    const selection = getCodeSelection();
    let prompt = "Write comprehensive tests for this code:\n\n";
    if (selection) {
      prompt += selection;
    } else if (context.file_path) {
      prompt = `Write tests for the file: ${context.file_path}`;
    } else {
      prompt = "Write tests for this code";
    }
    promptEl.value = prompt;
    sendPrompt("local", prompt);
  });

  summarizePRBtn.addEventListener("click", () => {
    const context = detectGitHubContext();
    let prompt = "Summarize the changes in this pull request";
    if (context.pr_number) {
      prompt += ` #${context.pr_number}`;
    }
    promptEl.value = prompt;
    sendPrompt("local", prompt);
  });

  draftPRBtn.addEventListener("click", () => {
    const context = detectGitHubContext();
    let prompt = "Draft a comprehensive pull request description for the changes shown here";
    if (context.pr_number) {
      prompt += ` (PR #${context.pr_number})`;
    }
    promptEl.value = prompt;
    sendPrompt("local", prompt);
  });

  optionsLink.addEventListener("click", (e) => {
    e.preventDefault();
    // Open options page in a new tab
    chrome.runtime.openOptionsPage();
  });

  async function sendPrompt(endpoint, customPrompt = null) {
    const prompt = customPrompt || promptEl.value.trim();
    if (!prompt) {
      respEl.textContent = "Please enter a prompt.";
      return;
    }
    respEl.textContent = "Loading…";
    
    // Capture GitHub context
    const context = detectGitHubContext();
    const selection = getCodeSelection();
    if (selection) {
      context.selection = selection;
    }
    
    const resp = await sendToBackground({ type: "mcpRequest", endpoint, prompt, context });
    if (resp && resp.ok) {
      respEl.textContent = typeof resp.data === "string" ? resp.data : JSON.stringify(resp.data, null, 2);
      
      // Store in history
      addToHistory({ prompt, response: resp.data, endpoint, timestamp: Date.now(), context });
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
    sendPrompt: (p, endpoint = "local") => {
      const context = detectGitHubContext();
      const selection = getCodeSelection();
      if (selection) context.selection = selection;
      return sendToBackground({ type: "mcpRequest", endpoint, prompt: p, context });
    },
    getContext: detectGitHubContext,
    getSelection: getCodeSelection
  };
})();