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
    // Clear previous content
    els.profilesList.innerHTML = '';

    if (profiles.length === 0) {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'empty-state';
      emptyDiv.textContent = 'No profiles configured';
      els.profilesList.appendChild(emptyDiv);
      return;
    }

    profiles.forEach((profile, idx) => {
      const itemDiv = document.createElement('div');
      itemDiv.className = 'profile-item';
      itemDiv.dataset.idx = idx;

      // Profile header
      const headerDiv = document.createElement('div');
      headerDiv.className = 'profile-header';

      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.className = 'profile-name';
      nameInput.value = profile.name;
      nameInput.placeholder = 'Profile name';
      nameInput.addEventListener('change', () => { profiles[idx].name = nameInput.value; });

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'btn-icon btn-delete';
      deleteBtn.title = 'Delete profile';
      deleteBtn.textContent = '🗑️';
      deleteBtn.dataset.idx = idx;
      deleteBtn.addEventListener('click', () => deleteProfile(idx));

      headerDiv.appendChild(nameInput);
      headerDiv.appendChild(deleteBtn);

      // Profile body
      const bodyDiv = document.createElement('div');
      bodyDiv.className = 'profile-body';

      // URL field
      const urlLabel = document.createElement('label');
      urlLabel.textContent = 'URL';
      const urlInput = document.createElement('input');
      urlInput.type = 'text';
      urlInput.className = 'profile-url';
      urlInput.value = profile.url;
      urlInput.placeholder = 'https://api.example.com/mcp';
      urlInput.addEventListener('change', () => { profiles[idx].url = urlInput.value; });

      // Auth Token field
      const tokenLabel = document.createElement('label');
      tokenLabel.textContent = 'Auth Token (optional)';
      const tokenInput = document.createElement('input');
      tokenInput.type = 'password';
      tokenInput.className = 'profile-token';
      tokenInput.value = profile.auth_token || '';
      tokenInput.placeholder = 'Bearer token';
      tokenInput.addEventListener('change', () => { profiles[idx].auth_token = tokenInput.value; });

      // Preamble field
      const preambleLabel = document.createElement('label');
      preambleLabel.textContent = 'Default Preamble (optional)';
      const preambleTextarea = document.createElement('textarea');
      preambleTextarea.className = 'profile-preamble';
      preambleTextarea.placeholder = 'System instructions...';
      preambleTextarea.value = profile.default_preamble || '';
      preambleTextarea.addEventListener('change', () => { profiles[idx].default_preamble = preambleTextarea.value; });

      // Temperature field
      const tempLabel = document.createElement('label');
      tempLabel.textContent = 'Temperature (optional, 0-1)';
      const tempInput = document.createElement('input');
      tempInput.type = 'number';
      tempInput.className = 'profile-temperature';
      tempInput.value = profile.default_temperature || '';
      tempInput.min = '0';
      tempInput.max = '1';
      tempInput.step = '0.1';
      tempInput.placeholder = '0.7';
      tempInput.addEventListener('change', () => { 
        const val = tempInput.value.trim();
        const num = parseFloat(val);
        // Temperature must be between 0 and 1, or undefined
        if (val !== '' && (isNaN(num) || num < 0 || num > 1)) {
          showMessage('Temperature must be between 0 and 1', 'error');
          tempInput.value = profiles[idx].default_temperature || '';
          return;
        }
        profiles[idx].default_temperature = (val === '' || isNaN(num)) ? undefined : num;
      });

      bodyDiv.appendChild(urlLabel);
      bodyDiv.appendChild(urlInput);
      bodyDiv.appendChild(tokenLabel);
      bodyDiv.appendChild(tokenInput);
      bodyDiv.appendChild(preambleLabel);
      bodyDiv.appendChild(preambleTextarea);
      bodyDiv.appendChild(tempLabel);
      bodyDiv.appendChild(tempInput);

      itemDiv.appendChild(headerDiv);
      itemDiv.appendChild(bodyDiv);
      els.profilesList.appendChild(itemDiv);
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
    
    // Clear previous content
    els.telemetryDisplay.innerHTML = "";

    if (!stats || Object.keys(stats).length === 0) {
      const emptyDiv = document.createElement("div");
      emptyDiv.className = "empty-state";
      emptyDiv.textContent = "No telemetry data yet";
      els.telemetryDisplay.appendChild(emptyDiv);
      return;
    }

    const table = document.createElement("table");
    table.className = "telemetry-table";

    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    ["Endpoint", "Total", "Success", "Failed", "Avg Latency"].forEach(text => {
      const th = document.createElement("th");
      th.textContent = text;
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    Object.entries(stats).forEach(([endpoint, data]) => {
      const row = document.createElement("tr");

      const endpointCell = document.createElement("td");
      endpointCell.textContent = endpoint;
      row.appendChild(endpointCell);

      const totalCell = document.createElement("td");
      totalCell.textContent = data.total;
      row.appendChild(totalCell);

      const successCell = document.createElement("td");
      successCell.className = "success";
      successCell.textContent = data.success;
      row.appendChild(successCell);

      const failedCell = document.createElement("td");
      failedCell.className = "error";
      failedCell.textContent = data.failed;
      row.appendChild(failedCell);

      const latencyCell = document.createElement("td");
      latencyCell.textContent = data.avg_latency_ms + "ms";
      row.appendChild(latencyCell);

      tbody.appendChild(row);
    });
    table.appendChild(tbody);
    els.telemetryDisplay.appendChild(table);
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