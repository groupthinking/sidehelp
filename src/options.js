document.addEventListener("DOMContentLoaded", () => {
  const els = {
    localEndpoint: document.getElementById("localEndpoint"),
    localAuthToken: document.getElementById("localAuthToken"),
    remoteEndpoint: document.getElementById("remoteEndpoint"),
    remoteAuthToken: document.getElementById("remoteAuthToken"),
    requestTimeoutMs: document.getElementById("requestTimeoutMs"),
    save: document.getElementById("save"),
    load: document.getElementById("load"),
    clear: document.getElementById("clear"),
    pingLocal: document.getElementById("ping-local"),
    pingRemote: document.getElementById("ping-remote"),
    pingLocalStatus: document.getElementById("ping-local-status"),
    pingRemoteStatus: document.getElementById("ping-remote-status"),
    profilesList: document.getElementById("profiles-list"),
    addProfile: document.getElementById("add-profile"),
    viewTelemetry: document.getElementById("view-telemetry"),
    telemetryDisplay: document.getElementById("telemetry-display")
  };

  let profiles = [];

  function save() {
    const settings = {
      localEndpoint: els.localEndpoint.value.trim(),
      localAuthToken: els.localAuthToken.value,
      remoteEndpoint: els.remoteEndpoint.value.trim(),
      remoteAuthToken: els.remoteAuthToken.value,
      requestTimeoutMs: Number(els.requestTimeoutMs.value) || 30000,
      profiles: profiles
    };
    chrome.storage.sync.set(settings, () => {
      showMessage("Settings saved successfully", "success");
    });
  }

  function load() {
    chrome.storage.sync.get([
      "localEndpoint",
      "localAuthToken",
      "remoteEndpoint",
      "remoteAuthToken",
      "requestTimeoutMs",
      "profiles"
    ], (items) => {
      els.localEndpoint.value = items.localEndpoint || "";
      els.localAuthToken.value = items.localAuthToken || "";
      els.remoteEndpoint.value = items.remoteEndpoint || "";
      els.remoteAuthToken.value = items.remoteAuthToken || "";
      els.requestTimeoutMs.value = items.requestTimeoutMs || 30000;
      profiles = items.profiles || [];
      renderProfiles();
    });
  }

  function clearAll() {
    if (!confirm("Clear all stored settings?")) return;
    chrome.storage.sync.clear(() => {
      profiles = [];
      load();
      showMessage("All settings cleared", "info");
    });
  }

  function showMessage(msg, type = "info") {
    const existingMsg = document.querySelector(".message-toast");
    if (existingMsg) existingMsg.remove();
    
    const toast = document.createElement("div");
    toast.className = `message-toast message-${type}`;
    toast.textContent = msg;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.remove(), 3000);
  }

  async function pingEndpoint(endpoint) {
    const statusEl = endpoint === "local" ? els.pingLocalStatus : els.pingRemoteStatus;
    statusEl.textContent = "⧖ Testing...";
    statusEl.className = "status testing";
    
    const response = await chrome.runtime.sendMessage({ type: "pingEndpoint", endpoint });
    
    if (response.ok) {
      statusEl.textContent = `✔ Working (${response.duration_ms}ms)`;
      statusEl.className = "status success";
    } else {
      statusEl.textContent = `✖ Failed: ${response.error}`;
      statusEl.className = "status error";
    }
  }

  function renderProfiles() {
    if (profiles.length === 0) {
      els.profilesList.innerHTML = '<div class="empty-state">No profiles configured</div>';
      return;
    }

    els.profilesList.innerHTML = profiles.map((profile, idx) => `
      <div class="profile-item" data-idx="${idx}">
        <div class="profile-header">
          <input type="text" class="profile-name" value="${escapeHtml(profile.name)}" placeholder="Profile name" />
          <button class="btn-icon btn-delete" data-idx="${idx}" title="Delete profile">🗑️</button>
        </div>
        <div class="profile-body">
          <label>URL</label>
          <input type="text" class="profile-url" value="${escapeHtml(profile.url)}" placeholder="https://api.example.com/mcp" />
          
          <label>Auth Token (optional)</label>
          <input type="password" class="profile-token" value="${escapeHtml(profile.auth_token || '')}" placeholder="Bearer token" />
          
          <label>Default Preamble (optional)</label>
          <textarea class="profile-preamble" placeholder="System instructions...">${escapeHtml(profile.default_preamble || '')}</textarea>
          
          <label>Temperature (optional, 0-1)</label>
          <input type="number" class="profile-temperature" value="${profile.default_temperature || ''}" min="0" max="1" step="0.1" placeholder="0.7" />
        </div>
      </div>
    `).join('');

    // Attach event listeners
    document.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => deleteProfile(parseInt(btn.dataset.idx)));
    });

    document.querySelectorAll('.profile-item').forEach((item, idx) => {
      const nameEl = item.querySelector('.profile-name');
      const urlEl = item.querySelector('.profile-url');
      const tokenEl = item.querySelector('.profile-token');
      const preambleEl = item.querySelector('.profile-preamble');
      const tempEl = item.querySelector('.profile-temperature');

      nameEl.addEventListener('change', () => { profiles[idx].name = nameEl.value; });
      urlEl.addEventListener('change', () => { profiles[idx].url = urlEl.value; });
      tokenEl.addEventListener('change', () => { profiles[idx].auth_token = tokenEl.value; });
      preambleEl.addEventListener('change', () => { profiles[idx].default_preamble = preambleEl.value; });
      tempEl.addEventListener('change', () => { 
        const val = tempEl.value.trim();
        const num = parseFloat(val);
        profiles[idx].default_temperature = (val === '' || isNaN(num)) ? undefined : num;
      });
    });
  }

  function addProfile() {
    profiles.push({
      name: `Profile ${profiles.length + 1}`,
      url: '',
      auth_token: '',
      default_preamble: '',
      default_temperature: 0.7
    });
    renderProfiles();
  }

  function deleteProfile(idx) {
    if (!confirm(`Delete profile "${profiles[idx].name}"?`)) return;
    profiles.splice(idx, 1);
    renderProfiles();
  }

  async function viewTelemetry() {
    const stats = await chrome.runtime.sendMessage({ type: "getTelemetry" });
    
    if (!stats || Object.keys(stats).length === 0) {
      els.telemetryDisplay.innerHTML = '<div class="empty-state">No telemetry data yet</div>';
      return;
    }

    els.telemetryDisplay.innerHTML = `
      <table class="telemetry-table">
        <thead>
          <tr>
            <th>Endpoint</th>
            <th>Total</th>
            <th>Success</th>
            <th>Failed</th>
            <th>Avg Latency</th>
          </tr>
        </thead>
        <tbody>
          ${Object.entries(stats).map(([endpoint, data]) => `
            <tr>
              <td>${escapeHtml(endpoint)}</td>
              <td>${data.total}</td>
              <td class="success">${data.success}</td>
              <td class="error">${data.failed}</td>
              <td>${data.avg_latency_ms}ms</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  els.save.addEventListener("click", save);
  els.load.addEventListener("click", load);
  els.clear.addEventListener("click", clearAll);
  els.pingLocal.addEventListener("click", () => pingEndpoint("local"));
  els.pingRemote.addEventListener("click", () => pingEndpoint("remote"));
  els.addProfile.addEventListener("click", addProfile);
  els.viewTelemetry.addEventListener("click", viewTelemetry);

  load();
});