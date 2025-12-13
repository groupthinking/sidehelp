// Background service worker (MV3)
// Listens for mcp requests and proxies them to configured endpoints.
//
// Message format:
// { type: "mcpRequest", endpoint: "local"|"remote"|"profile:<name>", prompt: "<string>", context?: {...}, options?: { method, headers, ... } }
//
// Responds with standard envelope:
// { ok: true, status: 200, endpoint: "local", duration_ms: 123, data: "<response>", error: null }
// or
// { ok: false, status: 0, endpoint: "local", duration_ms: 0, data: null, error: "<message>" }

// Telemetry tracking
// Keep last 100 latency samples to balance memory usage with statistical accuracy
const MAX_LATENCY_SAMPLES = 100;

const telemetry = {
  calls: {},
  latencies: {}
};

function trackCall(endpoint, duration_ms, success) {
  if (!telemetry.calls[endpoint]) {
    telemetry.calls[endpoint] = { total: 0, success: 0, failed: 0 };
    telemetry.latencies[endpoint] = [];
  }
  telemetry.calls[endpoint].total++;
  if (success) {
    telemetry.calls[endpoint].success++;
  } else {
    telemetry.calls[endpoint].failed++;
  }
  telemetry.latencies[endpoint].push(duration_ms);
  // Keep only last MAX_LATENCY_SAMPLES latencies
  if (telemetry.latencies[endpoint].length > MAX_LATENCY_SAMPLES) {
    telemetry.latencies[endpoint].shift();
  }
}

function getTelemetry() {
  const stats = {};
  for (const endpoint in telemetry.calls) {
    const latencies = telemetry.latencies[endpoint];
    const avg = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
    stats[endpoint] = {
      ...telemetry.calls[endpoint],
      avg_latency_ms: Math.round(avg)
    };
  }
  return stats;
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message && message.type === "mcpRequest") {
    handleMcpRequest(message).then((resp) => sendResponse(resp)).catch((err) => sendResponse({ 
      ok: false, 
      status: 0, 
      endpoint: message.endpoint, 
      duration_ms: 0, 
      data: null, 
      error: String(err) 
    }));
    // Tell chrome we will send a response asynchronously:
    return true;
  }

  if (message && message.type === "getTelemetry") {
    sendResponse(getTelemetry());
    return true;
  }

  if (message && message.type === "pingEndpoint") {
    pingEndpoint(message.endpoint).then((resp) => sendResponse(resp));
    return true;
  }

  // Unknown message types ignored
});

async function handleMcpRequest(message) {
  const startTime = Date.now();
  const { endpoint, prompt, context } = message;
  
  if (!prompt || typeof prompt !== "string") {
    return { ok: false, status: 0, endpoint, duration_ms: 0, data: null, error: "Missing prompt" };
  }

  const keys = await getSettings(["localEndpoint", "remoteEndpoint", "localAuthToken", "remoteAuthToken", "requestTimeoutMs", "profiles"]);
  const timeoutMs = keys.requestTimeoutMs || 30000;
  
  let url, token, preamble, temperature;
  
  // Check if endpoint is a profile reference
  if (endpoint.startsWith("profile:")) {
    const profileName = endpoint.substring(8);
    const profiles = keys.profiles || [];
    const profile = profiles.find(p => p.name === profileName);
    
    if (!profile) {
      return { ok: false, status: 0, endpoint, duration_ms: 0, data: null, error: `Profile '${profileName}' not found` };
    }
    
    url = profile.url;
    token = profile.auth_token;
    preamble = profile.default_preamble;
    temperature = profile.default_temperature;
  } else {
    // Legacy endpoint format
    url = endpoint === "local" ? keys.localEndpoint : keys.remoteEndpoint;
    token = endpoint === "local" ? keys.localAuthToken : keys.remoteAuthToken;
  }

  if (!url) {
    return { ok: false, status: 0, endpoint, duration_ms: 0, data: null, error: `${endpoint} endpoint not configured` };
  }

  // Build request body with context
  const requestBody = {
    prompt,
    ...(context && { context }),
    ...(preamble && { preamble }),
    ...(temperature !== undefined && { temperature })
  };

  const fetchOptions = {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(requestBody)
  };

  if (token) {
    fetchOptions.headers.Authorization = `Bearer ${token}`;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { ...fetchOptions, signal: controller.signal });
    clearTimeout(timeoutId);

    const contentType = res.headers.get("content-type") || "";
    let data;
    if (contentType.includes("application/json")) {
      data = await res.json();
    } else {
      data = await res.text();
    }

    const duration_ms = Date.now() - startTime;
    trackCall(endpoint, duration_ms, res.ok);

    return { 
      ok: res.ok, 
      status: res.status, 
      endpoint, 
      duration_ms, 
      data, 
      error: res.ok ? null : `HTTP ${res.status}` 
    };
  } catch (err) {
    const duration_ms = Date.now() - startTime;
    trackCall(endpoint, duration_ms, false);
    
    if (err.name === "AbortError") {
      return { ok: false, status: 0, endpoint, duration_ms, data: null, error: `Request timed out after ${timeoutMs}ms` };
    }
    return { ok: false, status: 0, endpoint, duration_ms, data: null, error: err.message || String(err) };
  }
}

// Ping timeout is shorter than regular requests for faster health checks
const PING_TIMEOUT_MS = 5000;

async function pingEndpoint(endpoint) {
  const startTime = Date.now();
  const keys = await getSettings(["localEndpoint", "remoteEndpoint", "localAuthToken", "remoteAuthToken", "profiles"]);
  
  let url, token;
  
  if (endpoint.startsWith("profile:")) {
    const profileName = endpoint.substring(8);
    const profiles = keys.profiles || [];
    const profile = profiles.find(p => p.name === profileName);
    if (!profile) {
      return { ok: false, endpoint, duration_ms: 0, error: `Profile '${profileName}' not found` };
    }
    url = profile.url;
    token = profile.auth_token;
  } else {
    url = endpoint === "local" ? keys.localEndpoint : keys.remoteEndpoint;
    token = endpoint === "local" ? keys.localAuthToken : keys.remoteAuthToken;
  }

  if (!url) {
    return { ok: false, endpoint, duration_ms: 0, error: `${endpoint} endpoint not configured` };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PING_TIMEOUT_MS);
    
    const fetchOptions = {
      method: "GET",
      headers: {},
      signal: controller.signal
    };
    
    if (token) {
      fetchOptions.headers.Authorization = `Bearer ${token}`;
    }
    
    const res = await fetch(url, fetchOptions);
    clearTimeout(timeoutId);
    
    const duration_ms = Date.now() - startTime;
    return { ok: res.ok, endpoint, duration_ms, status: res.status, error: res.ok ? null : `HTTP ${res.status}` };
  } catch (err) {
    const duration_ms = Date.now() - startTime;
    if (err.name === "AbortError") {
      return { ok: false, endpoint, duration_ms, error: "Ping timed out" };
    }
    return { ok: false, endpoint, duration_ms, error: err.message || String(err) };
  }
}

function getSettings(keys) {
  return new Promise((resolve) => {
    chrome.storage.sync.get(keys, (items) => resolve(items));
  });
}