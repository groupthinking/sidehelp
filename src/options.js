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