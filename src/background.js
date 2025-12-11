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

  // Unknown message types ignored
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

  // If user gave a relative path, ensure it's a full URL
  // We'll POST by default with JSON body { prompt }
  const fetchOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ prompt }),
    // Keep credentials off by default; user may configure token
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