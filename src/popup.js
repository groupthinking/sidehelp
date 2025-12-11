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
    // Attempt to open sidebar by running the toggle on the active tab
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
            // If not injected, let content script add it on next load by reloading the tab
            // but we won't force reload here - user can refresh
            alert("Sidebar not injected on this page yet. Refresh the page to load it.");
          }
        }
      });
    });
  }
});