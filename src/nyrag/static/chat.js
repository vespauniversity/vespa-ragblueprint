const chatEl = document.getElementById("chat");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("send");
const statsEl = document.getElementById("corpus-stats");
const composerArea = document.getElementById("composer-area");
const feedPanel = document.getElementById("feed-panel");
const welcomeMessage = document.getElementById("welcome-message");
const noDataMessage = document.getElementById("no-data-message");
const noDataTitle = document.getElementById("no-data-title");
const noDataDescription = document.getElementById("no-data-description");
const deployModeBadge = document.getElementById("deploy-mode-badge");
const loadingSpinner = document.getElementById("loading-spinner");

// Header action buttons
const saveConfigBtn = document.getElementById("save-config-btn");
const editConfigMenuBtn = document.getElementById("edit-config-menu-btn");
const configSelector = document.getElementById("project-selector");
const configSelectorContainer = document.getElementById("project-selector-container");

// Advanced menu
const advancedMenuBtn = document.getElementById("advanced-menu-btn");
const advancedMenu = document.getElementById("advanced-menu");

if (advancedMenuBtn && advancedMenu) {
  advancedMenuBtn.onclick = (e) => {
    e.stopPropagation();
    const isVisible = advancedMenu.style.display === "block";
    advancedMenu.style.display = isVisible ? "none" : "block";
  };

  // Close menu when clicking outside
  document.addEventListener("click", (e) => {
    if (!advancedMenu.contains(e.target) && e.target !== advancedMenuBtn) {
      advancedMenu.style.display = "none";
    }
  });

  // Close menu when clicking a menu item
  advancedMenu.addEventListener("click", () => {
    advancedMenu.style.display = "none";
  });
}

// Switch to feed button in no-data message
const switchToFeedBtn = document.getElementById("switch-to-feed-btn");
const configModeLabel = document.getElementById("config-mode-label");

// Loading state helpers
function showLoading() {
  if (loadingSpinner) loadingSpinner.style.display = "flex";
  if (statsEl) statsEl.textContent = "Loading...";
}

function hideLoading() {
  if (loadingSpinner) loadingSpinner.style.display = "none";
}

// Settings Modal
const settingsBtn = document.getElementById("settings-btn");
const modal = document.getElementById("settings-modal");
const closeBtn = modal?.querySelector(".close-btn");
const saveBtn = document.getElementById("save-settings");

if (settingsBtn && modal) {
  settingsBtn.onclick = () => modal.style.display = "block";
}
if (closeBtn && modal) {
  closeBtn.onclick = () => modal.style.display = "none";
}
if (saveBtn && modal) {
  saveBtn.onclick = async () => {
    await saveUserSettings();
    modal.style.display = "none";
  };
}

// Save Config Button handler
if (saveConfigBtn) {
  saveConfigBtn.onclick = async () => {
    if (!activeProjectName) {
      alert("No config selected");
      return;
    }
    try {
      const yamlStr = jsyaml.dump(currentConfig);
      const res = await fetch("/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: yamlStr })
      });
      if (res.ok) {
        if (terminalStatus) {
          terminalStatus.textContent = `Saved: ${activeProjectName}`;
          terminalStatus.style.color = "#10b981";
        }
        alert(`Config '${activeProjectName}' saved successfully`);
      } else {
        alert("Failed to save config");
      }
    } catch (e) {
      console.error("Failed to save config:", e);
      alert("Failed to save config");
    }
  };
}

// Edit Config Menu Button handler (in Advanced menu)
if (editConfigMenuBtn) {
  editConfigMenuBtn.onclick = async () => {
    if (activeProjectName) {
      // Load the current project config
      await loadConfigIntoEditor(activeProjectName);
      // Force show feed panel even if data exists (user wants to edit/add data)
      setMode("feed");
      renderConfigEditor();
    } else {
      // No active project, just open feed mode with blank config
      setMode("feed");
    }
  };
}

// Feed Panel elements
const crawlActionBtn = document.getElementById("crawl-action-btn");
const closeFeedBtn = document.getElementById("close-feed-btn");
const terminalLogs = document.getElementById("terminal-logs");
const terminalStatus = document.getElementById("terminal-status");
const yamlContainer = document.getElementById("interactive-yaml-container");
const exampleSelect = document.getElementById("example-select");

// Close feed panel button handler
if (closeFeedBtn) {
  closeFeedBtn.onclick = () => {
    // Switch back to chat mode
    setMode("chat");
  };
}

// Track current event source for stopping
let currentEventSource = null;

// Internal Config State
let currentConfig = {};
let configOptions = {}; // Schema loaded from API
let exampleConfigs = {}; // Example configs from API
let currentMode = "chat"; // "chat" or "feed"
let hasData = false; // Whether corpus has data
let deployMode = "local"; // "local" or "cloud"
let deployModeSource = null; // "deploy-mode" or "stats"
let activeProjectName = null; // Currently selected project
const serverDeployMode = document.body?.dataset?.deployMode;

// Update Input State and Button Visibility
function updateChatInputState() {
  const isChatMode = currentMode === "chat";
  const canChat = activeProjectName && hasData;
  const isDisabled = !isChatMode || !canChat;

  if (inputEl) {
    inputEl.disabled = isDisabled;
    if (activeProjectName && !hasData) {
      inputEl.placeholder = "Feed data to start chatting...";
    } else if (!activeProjectName) {
      inputEl.placeholder = "Select a project to chat...";
    } else {
      inputEl.placeholder = "Ask a question...";
    }
  }
  if (sendBtn) {
    sendBtn.disabled = isDisabled;
    sendBtn.style.opacity = isDisabled ? "0.5" : "1";
    sendBtn.style.cursor = isDisabled ? "not-allowed" : "pointer";
  }

  // Save button is always visible when in feed mode
}

// Mode Toggle Logic
function setMode(mode) {
  currentMode = mode;

  // Show/hide appropriate panels
  if (mode === "chat") {
    if (chatEl) chatEl.style.display = "flex";
    if (feedPanel) feedPanel.style.display = "none";
    if (composerArea) composerArea.style.display = "flex";

    // Show welcome or no-data message based on data availability
    if (hasData) {
      if (welcomeMessage) welcomeMessage.style.display = "block";
      if (noDataMessage) noDataMessage.style.display = "none";
    } else {
      // Project selected but no data - show error
      if (welcomeMessage) welcomeMessage.style.display = "none";
      if (noDataMessage) {
        noDataMessage.style.display = "flex";
        if (noDataTitle) noDataTitle.textContent = "No data available";
        if (noDataDescription) noDataDescription.textContent = activeProjectName
          ? `Project "${activeProjectName}" has no indexed documents. Feed data to start chatting.`
          : "Select a project to start chatting.";

        if (switchToFeedBtn) {
          if (activeProjectName) {
            switchToFeedBtn.textContent = "Feed Data to This Project";
            switchToFeedBtn.style.display = "inline-block";
            switchToFeedBtn.onclick = () => setMode("feed");
          } else {
            switchToFeedBtn.style.display = "none";
          }
        }
      }
    }
  } else {
    // Feed Mode: Clear chat related stuff visually
    if (chatEl) chatEl.style.display = "none";
    if (feedPanel) feedPanel.style.display = "flex";
    if (composerArea) composerArea.style.display = "none";

    // Update config label based on mode (Add vs Edit)
    if (configModeLabel) {
      configModeLabel.textContent = activeProjectName ? "Edit Config:" : "Add Config:";
    }

    // Load feed panel content - don't reload config if already loaded
    // (config is loaded by loadConfigIntoEditor before setMode is called)
    (async () => {
      await loadExamples();
      checkCrawlStatus();
    })();
  }
  updateChatInputState();
}

// Switch to feed from no-data message
if (switchToFeedBtn) {
  switchToFeedBtn.onclick = () => setMode("feed");
}

// Switch to feed from no-data message
if (switchToFeedBtn) {
  switchToFeedBtn.onclick = () => setMode("feed");
}

// Update deploy mode badge
function updateDeployModeBadge(mode, source = "stats") {
  if (!mode) return;
  const normalizedMode = String(mode).toLowerCase();
  if (normalizedMode !== "local" && normalizedMode !== "cloud") {
    return;
  }
  if (deployModeSource === "deploy-mode" && source !== "deploy-mode") {
    return;
  }
  deployModeSource = source;
  deployMode = normalizedMode;
  if (deployModeBadge) {
    deployModeBadge.textContent = deployMode;
    deployModeBadge.className = "deploy-mode-badge " + deployMode;
  }
  if (yamlContainer && Object.keys(configOptions || {}).length > 0) {
    if (currentConfig.deploy_mode !== deployMode) {
      currentConfig.deploy_mode = deployMode;
      renderConfigEditor();
    }
  }
}

if (serverDeployMode) {
  updateDeployModeBadge(serverDeployMode, "deploy-mode");
}

// Fallback Default if file is empty
const FALLBACK_CONFIG = {
  name: "doc_example",
  mode: "docs",
  deploy_mode: "cloud",
  start_loc: "./dataset",
  vespa_app_path: "./vespa_cloud",
  cloud_tenant: "your-tenant",
  exclude: ["*.html"],
  crawl_params: {
    respect_robots_txt: true,
    follow_subdomains: true,
    user_agent_type: "chrome",
    aggressive: false,
    strict_mode: false,
    custom_user_agent: "",
    allowed_domains: []
  },
  doc_params: {
    recursive: true,
    include_hidden: false,
    follow_symlinks: false,
    max_file_size_mb: 100,
    file_extensions: [".pdf", ".docx", ".txt", ".md"]
  },
  rag_params: {
    embedding_model: "sentence-transformers/all-mpnet-base-v2",
    embedding_dim: 768,
    chunk_size: 512,
    chunk_overlap: 50,
    distance_metric: "angular",
    device: "cpu",
    max_tokens: 8192
  },
  llm_config: {
    base_url: "https://openrouter.ai/api/v1",
    model: "openai/gpt-4o-mini",
    api_key: "your-llm-api-key-here"
  },
  vespa_cloud: {
    endpoint: "https://your-vespa-cloud-endpoint-here.vespa-app.cloud",
    token: "your-vespa-cloud-token-here"
  }
};

// =========================================================================
// RENDERER: The Core "Magic" Function
// =========================================================================
function renderConfigEditor() {
  yamlContainer.innerHTML = '';
  if (!configOptions || Object.keys(configOptions).length === 0) {
    yamlContainer.innerHTML = '<div style="color: #666; padding: 1rem;">Loading options...</div>';
    return;
  }

  // Helper to check if field should be shown based on show_when condition
  function shouldShowField(schemaItem, fullConfig) {
    if (!schemaItem.show_when) return true;

    const condition = schemaItem.show_when;
    const fieldPath = condition.field.split('.');
    let fieldValue = fullConfig;

    for (const part of fieldPath) {
      if (fieldValue === undefined || fieldValue === null) return true;
      fieldValue = fieldValue[part];
    }

    if (condition.is_empty) {
      // Show when field is empty/falsy
      return !fieldValue || fieldValue === '' || fieldValue === 'your-vespa-cloud-token-here';
    }
    if (condition.equals !== undefined) {
      return fieldValue === condition.equals;
    }

    return true;
  }

  // Recursive render function
  function renderField(key, schemaItem, value, indentLevel, parentObj, fullConfig) {
    const line = document.createElement('div');
    line.className = 'yaml-line';
    line.dataset.key = key;
    line.dataset.conditionField = schemaItem.show_when ? schemaItem.show_when.field : '';

    // Check conditional visibility
    const shouldShow = shouldShowField(schemaItem, fullConfig || currentConfig);
    if (!shouldShow) {
      line.style.display = 'none';
      line.classList.add('conditionally-hidden');
    }

    // Indentation
    const indentSpan = document.createElement('span');
    indentSpan.className = 'yaml-indent';
    indentSpan.innerHTML = '&nbsp;'.repeat(indentLevel * 2);
    line.appendChild(indentSpan);

    // Key
    const keySpan = document.createElement('span');
    keySpan.className = 'yaml-key';
    keySpan.textContent = key + ':';
    line.appendChild(keySpan);

    // Value Control
    if (key === 'deploy_mode') {
      // Force match server deploy mode
      if (deployMode) {
        value = deployMode;
        parentObj[key] = deployMode;
      }

      const span = document.createElement('span');
      span.className = 'yaml-value-readonly';
      span.textContent = value;
      span.title = "Determined by server start mode";
      span.style.color = "var(--text-secondary)";
      span.style.fontStyle = "italic";
      line.appendChild(span);

      yamlContainer.appendChild(line);
      return;
    }

    if (schemaItem.type === 'nested') {
      yamlContainer.appendChild(line);

      // Ensure object exists - initialize if missing
      if (value === undefined || value === null) {
        value = {};
        parentObj[key] = value;
      }

      const fields = schemaItem.fields || {};
      Object.keys(fields).forEach(subKey => {
        const subSchema = fields[subKey];
        renderField(subKey, subSchema, value[subKey], indentLevel + 1, value, fullConfig);
      });
      return;
    }

    if (schemaItem.type === 'string' || schemaItem.type === 'number') {
      const input = document.createElement('input');
      input.type = schemaItem.type === 'number' ? 'number' : (schemaItem.masked ? 'password' : 'text');
      input.value = value !== undefined ? value : '';
      input.className = 'yaml-input';

      // Dynamic Placeholder
      if (key === 'start_location') {
        input.placeholder = currentConfig.mode === 'web' ? 'https://example.com' : '/path/to/docs';
      } else {
        input.placeholder = 'null';
      }

      input.onchange = (e) => {
        let val = e.target.value;
        if (schemaItem.type === 'number') val = parseFloat(val);
        parentObj[key] = val;
        // Re-check conditional field visibility when any field changes
        updateConditionalVisibility();
      };
      line.appendChild(input);
    } else if (schemaItem.type === 'boolean') {
      const select = document.createElement('select');
      select.className = 'yaml-select ' + (value ? 'bool-true' : 'bool-false');

      const optTrue = new Option('true', 'true');
      const optFalse = new Option('false', 'false');
      select.add(optTrue);
      select.add(optFalse);
      select.value = !!value;

      select.onchange = (e) => {
        const val = e.target.value === 'true';
        parentObj[key] = val;
        select.className = 'yaml-select ' + (val ? 'bool-true' : 'bool-false');
      };
      line.appendChild(select);
    } else if (schemaItem.type === 'select') {
      const select = document.createElement('select');
      select.className = 'yaml-select';
      (schemaItem.options || []).forEach(optVal => {
        select.add(new Option(optVal, optVal));
      });
      select.value = value || schemaItem.options[0];
      select.onchange = async (e) => {
        parentObj[key] = e.target.value;
        // TRIGGER RE-FETCH if mode changes
        if (key === 'mode') {
          await loadSchema(e.target.value);
          renderConfigEditor();
        }
      };
      line.appendChild(select);
    } else if (schemaItem.type === 'list') {
      yamlContainer.appendChild(line);

      const list = Array.isArray(value) ? value : [];
      parentObj[key] = list; // ensure array reference

      const listContainer = document.createElement('div');

      const renderList = () => {
        listContainer.innerHTML = '';
        list.forEach((item, idx) => {
          const itemLine = document.createElement('div');
          itemLine.className = 'yaml-line';

          const iSpan = document.createElement('span');
          iSpan.className = 'yaml-indent';
          iSpan.innerHTML = '&nbsp;'.repeat((indentLevel + 1) * 2);

          const dash = document.createElement('span');
          dash.className = 'yaml-dash';
          dash.textContent = '- ';

          const input = document.createElement('input');
          input.className = 'yaml-input';
          input.value = item;
          // width handled by flex
          input.onchange = (e) => {
            list[idx] = e.target.value;
          };

          const delBtn = document.createElement('span');
          delBtn.innerHTML = '&times;';
          delBtn.style.color = '#ff5555';
          delBtn.style.cursor = 'pointer';
          delBtn.style.marginLeft = '8px';
          delBtn.onclick = () => {
            list.splice(idx, 1);
            renderList();
          };

          itemLine.appendChild(iSpan);
          itemLine.appendChild(dash);
          itemLine.appendChild(input);
          itemLine.appendChild(delBtn);
          listContainer.appendChild(itemLine);
        });

        const newLine = document.createElement('div');
        newLine.className = 'yaml-line';
        const niSpan = document.createElement('span');
        niSpan.className = 'yaml-indent';
        niSpan.innerHTML = '&nbsp;'.repeat((indentLevel + 1) * 2);

        const nDash = document.createElement('span');
        nDash.className = 'yaml-dash';
        nDash.textContent = '+ ';
        nDash.style.opacity = '0.5';
        nDash.style.cursor = 'pointer';

        const nInput = document.createElement('input');
        nInput.className = 'yaml-input';
        nInput.placeholder = '(add item)';
        nInput.onchange = (e) => {
          if (e.target.value) {
            list.push(e.target.value);
            renderList();
            nInput.focus();
          }
        };

        newLine.appendChild(niSpan);
        newLine.appendChild(nDash);
        newLine.appendChild(nInput);
        listContainer.appendChild(newLine);
      };

      renderList();
      yamlContainer.appendChild(listContainer);
      return;
    }

    yamlContainer.appendChild(line);
  }

  // Helper to update visibility of all conditional fields
  function updateConditionalVisibility() {
    const lines = yamlContainer.querySelectorAll('.yaml-line.conditionally-hidden');
    lines.forEach(line => {
      const conditionField = line.dataset.conditionField;
      if (conditionField) {
        // Parse the field path (e.g., "vespa_cloud.token")
        const path = conditionField.split('.');
        let fieldValue = currentConfig;
        for (const part of path) {
          fieldValue = fieldValue?.[part];
        }

        // Show when token is empty or placeholder
        const isEmpty = !fieldValue || fieldValue === '' || fieldValue === 'your-vespa-cloud-token-here';
        line.style.display = isEmpty ? 'flex' : 'none';
      }
    });
  }

  Object.keys(configOptions).forEach(key => {
    // Top-level render
    renderField(key, configOptions[key], currentConfig[key], 0, currentConfig, currentConfig);
  });

  // Initial visibility check
  updateConditionalVisibility();
}

// API Interactions
async function loadSchema(mode) {
  try {
    const res = await fetch(`/config/options?mode=${mode}`);
    configOptions = await res.json();
  } catch (e) {
    console.error("Failed to load schema options", e);
    terminalLogs.textContent = "Error loading schema: " + e.message;
  }
}

async function loadProjectConfig() {
  try {
    // Use activeProjectName or fall back to selector value
    const projectName = activeProjectName || (configSelector ? configSelector.value : "");
    const url = projectName
      ? `/config?project_name=${encodeURIComponent(projectName)}`
      : "/config";
    const res = await fetch(url);
    const data = await res.json();

    let parsed = {};
    if (data.content) {
      parsed = jsyaml.load(data.content);
    }

    // Merge with fallback to ensure structure
    currentConfig = deepMerge(JSON.parse(JSON.stringify(FALLBACK_CONFIG)), parsed);

    // Determine mode to load correct schema
    const mode = currentConfig.mode || "docs";
    await loadSchema(mode);

    renderConfigEditor();
    terminalStatus.textContent = "Ready";
    terminalStatus.style.color = "var(--accent-color)";

  } catch (e) {
    console.error("Failed to load project config", e);
    terminalStatus.textContent = "Load Error";
    terminalStatus.style.color = "#ef4444";
  }
}

async function saveProjectConfig() {
  const yamlStr = jsyaml.dump(currentConfig);
  await fetch("/config", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: yamlStr })
  });
}

// Load and populate example configs
async function loadExamples() {
  if (!exampleSelect) return;
  try {
    const res = await fetch("/config/examples");
    exampleConfigs = await res.json();

    // Populate dropdown
    exampleSelect.innerHTML = '<option value="">-- Select a template --</option>';
    Object.keys(exampleConfigs).forEach(name => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      exampleSelect.appendChild(opt);
    });

    // Auto-select "web" template only if no project is active and config is fallback
    const isFallback =
      !currentConfig ||
      !currentConfig.name ||
      (currentConfig.name === "new-project" &&
        currentConfig.start_loc === "https://example.com");

    // Don't auto-select template if we have an active project (user wants to keep their config)
    if (exampleConfigs["web"] && isFallback && !activeProjectName) {
      exampleSelect.value = "web";
      // Trigger the onchange event
      exampleSelect.dispatchEvent(new Event("change"));
    }
  } catch (e) {
    console.error("Failed to load templates", e);
  }
}

// Handle example selection
if (exampleSelect) {
  exampleSelect.onchange = async () => {
    const name = exampleSelect.value;
    if (!name || !exampleConfigs[name]) return;

    try {
      const parsed = jsyaml.load(exampleConfigs[name]);
      // Merge: start with defaults, then override with example values
      currentConfig = deepMerge(JSON.parse(JSON.stringify(FALLBACK_CONFIG)), parsed);

      const mode = currentConfig.mode || "web";
      await loadSchema(mode);
      renderConfigEditor();

      if (terminalStatus) {
        terminalStatus.textContent = `Loaded: ${name}`;
        terminalStatus.style.color = "#10b981";
      }
    } catch (e) {
      console.error("Failed to parse example", e);
    }
  };
}

// Close modal on outside click
window.onclick = (e) => {
  if (e.target == modal) modal.style.display = "none";
};

function updateCrawlButton(isRunning) {
  if (isRunning) {
    crawlActionBtn.textContent = "Stop Crawl";
    crawlActionBtn.classList.remove("primary-btn");
    crawlActionBtn.classList.add("secondary-btn");
    crawlActionBtn.style.backgroundColor = "#ef4444"; // Make it red for stop
    crawlActionBtn.style.color = "white";
  } else {
    crawlActionBtn.textContent = "Start Indexing";
    crawlActionBtn.classList.remove("secondary-btn");
    crawlActionBtn.classList.add("primary-btn");
    crawlActionBtn.style.backgroundColor = ""; // Reset to default
    crawlActionBtn.style.color = "";
  }
}

async function checkCrawlStatus() {
  try {
    const res = await fetch("/crawl/status");
    const data = await res.json();
    if (data.is_running) {
      updateCrawlButton(true);
      terminalStatus.textContent = "Running...";
      terminalStatus.style.color = "var(--accent-color)";

      if (!currentEventSource) {
        currentEventSource = new EventSource("/crawl/logs");
        currentEventSource.onmessage = async (event) => {
          if (event.data === "[PROCESS COMPLETED]") {
            currentEventSource.close();
            currentEventSource = null;
            terminalStatus.textContent = "Completed";
            terminalStatus.style.color = "#10b981";
            updateCrawlButton(false);
            // Refresh projects after crawl completes
            loadProjects();

            // Select the project on the backend so stats work correctly
            try {
              await fetch("/projects/select", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ project_name: activeProjectName })
              });
            } catch (e) {
              console.warn("Failed to select project:", e);
            }

            // Wait for stats to update before switching to chat mode
            await fetchStats();
            // Auto-switch to chat mode after feeding completes
            setTimeout(() => {
              setMode("chat");
            }, 100);
            return;
          }
          terminalLogs.textContent += event.data + "\n";
          terminalLogs.scrollTop = terminalLogs.scrollHeight;
        };
        currentEventSource.onerror = () => {
          currentEventSource.close();
          currentEventSource = null;
          if (terminalStatus.textContent === "Running...") {
            terminalStatus.textContent = "Completed";
            terminalStatus.style.color = "#10b981";
            loadProjects();
            fetchStats();
          }
          updateCrawlButton(false);
        };
      }
    } else {
      // If not running, we might want to check if there are logs from a previous run?
      // For now, just ensure button state is correct.
      updateCrawlButton(false);
    }
  } catch (e) {
    console.error("Failed to check crawl status", e);
  }
}

crawlActionBtn.onclick = async () => {
  if (currentEventSource) {
    // STOPPING
    try {
      await fetch("/crawl/stop", { method: "POST" });
      if (currentEventSource) {
        currentEventSource.close();
        currentEventSource = null;
      }
      terminalLogs.textContent += "\n[Crawl stopped by user]\n";
      terminalStatus.textContent = "Stopped";
      terminalStatus.style.color = "#f59e0b"; // Orange
      updateCrawlButton(false);
    } catch (e) {
      console.error("Failed to stop crawl", e);
    }
    return;
  }

  // STARTING
  terminalLogs.textContent = "";
  terminalStatus.textContent = "Saving...";
  terminalStatus.style.color = "#fbbf24"; // Amber

  try {
    // 1. Save Config First
    await saveProjectConfig();

    terminalStatus.textContent = "Starting...";
    terminalStatus.style.color = "var(--accent-color)";

    // 2. Start Crawl with the YAML content
    // Clean up currentConfig to remove redundant top-level URL if cloud endpoint is set
    // This prevents stale vespa_url from overriding the new endpoint in the backend
    if (currentConfig.vespa_cloud && currentConfig.vespa_cloud.endpoint) {
      delete currentConfig.vespa_url;
      delete currentConfig.vespa_port;
    }

    const yamlStr = jsyaml.dump(currentConfig);
    const resumeCheckbox = document.getElementById("resume-checkbox");
    // If user explicitly checked/unchecked, use that.
    // If not, and we have an active project, default to true to allow updates.
    let resume = resumeCheckbox ? resumeCheckbox.checked : false;
    if (activeProjectName && (!resumeCheckbox || !resumeCheckbox.checked)) {
      // If it's an existing project, we almost certainly want to resume/update
      // rather than fail with "already exists".
      // However, strictly we should probably respect the checkbox if it exists.
      // The issue is the user interface might not show the checkbox or it defaults to off.
      // Let's force resume=true if we are in an active project to avoid the error.
      resume = true;
    }

    const startRes = await fetch("/crawl/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        config_yaml: yamlStr,
        resume: resume
      })
    });

    if (!startRes.ok) {
      terminalLogs.textContent += `Error starting crawl: ${startRes.statusText}\n`;
      terminalStatus.textContent = "Failed";
      terminalStatus.style.color = "#ef4444";
      return;
    }

    terminalStatus.textContent = "Running...";

    // 3. Connect to log stream using EventSource (SSE)
    currentEventSource = new EventSource("/crawl/logs");
    updateCrawlButton(true);

    currentEventSource.onmessage = async (event) => {
      if (event.data === "[PROCESS COMPLETED]") {
        currentEventSource.close();
        currentEventSource = null;
        terminalStatus.textContent = "Completed";
        terminalStatus.style.color = "#10b981";
        updateCrawlButton(false);
        // Refresh projects and stats after successful crawl
        loadProjects();

        // Select the project on the backend so stats work correctly
        try {
          await fetch("/projects/select", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ project_name: activeProjectName })
          });
        } catch (e) {
          console.warn("Failed to select project:", e);
        }

        // Wait for stats to update before switching to chat mode
        await fetchStats();
        // Auto-switch to chat mode after feeding completes
        setTimeout(() => {
          setMode("chat");
        }, 100);
        return;
      }
      terminalLogs.textContent += event.data + "\n";
      terminalLogs.scrollTop = terminalLogs.scrollHeight;
    };

    currentEventSource.onerror = () => {
      currentEventSource.close();
      currentEventSource = null;
      if (terminalStatus.textContent === "Running...") {
        terminalStatus.textContent = "Completed";
        terminalStatus.style.color = "#10b981";
        // Also refresh on error close (might be normal completion)
        loadProjects();
        fetchStats();
      }
      updateCrawlButton(false);
    };

  } catch (e) {
    terminalLogs.textContent += `Connection error: ${e.message}\n`;
    terminalStatus.textContent = "Error";
    terminalStatus.style.color = "#ef4444";
    updateCrawlButton(false);
  }
};

// Simple Deep Merge Helper
// (Same as before)
function deepMerge(target, source) {
  if (!source) return target;
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) Object.assign(target, { [key]: {} });
      deepMerge(target[key], source[key]);
    } else {
      Object.assign(target, { [key]: source[key] });
    }
  }
  return target;
}

// ... Chat Message Logic
let chatHistory = [];

async function sendMessage() {
  console.log("sendMessage called");
  const text = inputEl.value.trim();
  if (!text) return;

  addMessage("user", text);
  inputEl.value = "";
  inputEl.style.height = 'auto'; // Reset height

  const hits = parseInt(document.getElementById("hits").value) || 5;
  const k = parseInt(document.getElementById("k").value) || 3;
  const query_k = parseInt(document.getElementById("query_k").value) || 3;

  // Create assistant bubble with structure
  const assistantId = addMessage("assistant", "");
  const bubble = document.getElementById(assistantId).querySelector(".bubble");

  // Add typing indicator
  const textEl = bubble.querySelector(".assistant-text");
  textEl.innerHTML = '<div class="typing-indicator"><div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div></div>';

  const metaEl = bubble.querySelector(".assistant-meta");

  // State for streaming
  let fullResponse = "";
  let thinkingContent = "";
  let thinkingEl = null;
  let thinkingBody = null;
  let statusEl = null;
  let isAnswerPhase = false;
  let hasStartedAnswering = false;
  let chunksCache = [];

  try {
    console.log("Fetching /chat...");
    const res = await fetch("/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: text,
        history: chatHistory,
        hits: hits,
        k: k,
        query_k: query_k
      })
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Parse SSE
      while (true) {
        const doubleNewline = buffer.indexOf("\n\n");
        if (doubleNewline === -1) break;

        const raw = buffer.slice(0, doubleNewline);
        buffer = buffer.slice(doubleNewline + 2);

        const lines = raw.split("\n");
        let event = null;
        let dataStr = "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            event = line.substring(7).trim();
          } else if (line.startsWith("data: ")) {
            dataStr += line.substring(6);
          }
        }

        if (event && dataStr) {
          try {
            const data = JSON.parse(dataStr);

            if (event === "status") {
              if (statusEl) statusEl.remove();
              statusEl = document.createElement("div");
              statusEl.className = "status-line";
              statusEl.textContent = data;
              metaEl.appendChild(statusEl);
              if (data.includes("Generating answer")) {
                isAnswerPhase = true;
              }
            } else if (event === "thinking") {
              // Only show thinking during answer phase (not query generation)
              if (!isAnswerPhase) continue;

              if (!thinkingEl) {
                thinkingEl = document.createElement("div");
                thinkingEl.className = "thinking-section";

                const header = document.createElement("div");
                header.className = "thinking-header";
                header.innerHTML = `
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                  Thinking Process
                `;
                header.onclick = () => {
                  thinkingBody.classList.toggle("collapsed");
                };

                thinkingBody = document.createElement("div");
                thinkingBody.className = "thinking-content";

                thinkingEl.appendChild(header);
                thinkingEl.appendChild(thinkingBody);
                bubble.insertBefore(thinkingEl, textEl);
              }
              thinkingContent += data;
              thinkingBody.textContent = thinkingContent;
            } else if (event === "queries") {
              const details = document.createElement("details");
              details.className = "meta-details";
              const summary = document.createElement("summary");
              summary.textContent = `Queries (${data.length})`;
              details.appendChild(summary);

              const ul = document.createElement("ul");
              data.forEach((q) => {
                const li = document.createElement("li");
                li.textContent = q;
                ul.appendChild(li);
              });
              details.appendChild(ul);
              metaEl.appendChild(details);

              // Reset thinking for next phase
              thinkingEl = null;
              thinkingContent = "";
            } else if (event === "sources") {
              chunksCache = data;
              // Reset thinking for next phase
              thinkingEl = null;
              thinkingContent = "";
            } else if (event === "answer") {
              if (!hasStartedAnswering) {
                textEl.innerHTML = ""; // Remove typing indicator
                hasStartedAnswering = true;
              }
              fullResponse += data;
              textEl.innerHTML = DOMPurify.sanitize(marked.parse(fullResponse));
            } else if (event === "done") {
              if (statusEl) statusEl.remove();
              // Append collapsible references after the response
              if (chunksCache.length) {
                const wrap = document.createElement("details");
                wrap.className = "chunks";
                wrap.open = false;

                const listHtml = chunksCache
                  .map(
                    (c) =>
                      `<details class="chunk-item">
                        <summary>${c.loc} <span class="score">(${c.score ? c.score.toFixed(2) : '0.00'})</span></summary>
                        <div class="chunk-content">${c.chunk}</div>
                      </details>`
                  )
                  .join("");

                wrap.innerHTML = `<summary>Relevant sources (${chunksCache.length})</summary><div class="chunk-list">${listHtml}</div>`;
                bubble.appendChild(wrap);
              }
            } else if (event === "error") {
              if (statusEl) statusEl.remove();
              textEl.textContent += "\nError: " + data;
            }

            chatEl.scrollTop = chatEl.scrollHeight;

          } catch (e) {
            console.error("JSON parse error", e);
          }
        }
      }
    }

    chatHistory.push({ role: "user", content: text });
    chatHistory.push({ role: "assistant", content: fullResponse });

  } catch (e) {
    textEl.textContent = "Error: " + e.message;
  }
}

sendBtn.onclick = sendMessage;
inputEl.onkeydown = (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
};

function addMessage(role, text) {
  // Remove welcome message if it exists
  const welcome = document.querySelector('.welcome-message');
  if (welcome) welcome.remove();

  const id = "msg-" + Date.now();
  const div = document.createElement("div");
  div.className = `msg ${role}-msg`;
  div.id = id;

  if (role === 'user') {
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = text;
    div.appendChild(bubble);
  } else {
    div.innerHTML = `
      <div class="bubble">
        <div class="assistant-meta"></div>
        <div class="assistant-text"></div>
      </div>
    `;
  }
  chatEl.appendChild(div);
  chatEl.scrollTop = chatEl.scrollHeight;
  return id;
}

async function fetchStats() {
  showLoading();
  try {
    const res = await fetch("/stats");
    const data = await res.json();

    // Update deploy mode badge - NOW handled by separate endpoint call in initializeApp
    // But we keep this as backup or if stats returns it
    if (data.deploy_mode) {
      updateDeployModeBadge(data.deploy_mode, "stats");
    }

    // Update hasData state
    hasData = data.has_data === true;

    // Check for connection errors first
    if (data.connection_error) {
      statsEl.textContent = `⚠️ ${data.connection_error}`;
      statsEl.style.color = "#ef4444"; // Red color for errors
      statsEl.title = "Cannot connect to Vespa - check your configuration";
    } else if (data.documents) {
      statsEl.textContent = `${data.documents} documents indexed`;
      statsEl.style.color = ""; // Reset to default
      statsEl.title = "";
    } else {
      statsEl.textContent = "No documents indexed";
      statsEl.style.color = ""; // Reset to default
      statsEl.title = "";
    }

    updateChatInputState();

  } catch (e) {
    console.error("Failed to fetch stats", e);
    statsEl.textContent = "Error loading stats";
  } finally {
    hideLoading();
  }
}

async function loadConfigsList() {
  try {
    const res = await fetch("/configs/list");
    const data = await res.json();

    // Show selector in header
    if (configSelectorContainer) {
      configSelectorContainer.style.display = "block";
    }

    // Update config selector
    if (configSelector) {
      configSelector.innerHTML = '';
      if (data.configs.length === 0) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "No configs available";
        opt.disabled = true;
        opt.selected = true;
        configSelector.appendChild(opt);
        return;
      }

      data.configs.forEach(cfg => {
        const opt = document.createElement("option");
        opt.value = cfg.name;
        opt.textContent = `${cfg.name} (${cfg.mode})`;
        configSelector.appendChild(opt);
      });

      // Set default selection (don't auto-load, just set the dropdown value)
      const docOption = data.configs.find(c => c.name === "doc_example");
      if (docOption && !activeProjectName) {
        configSelector.value = "doc_example";
        activeProjectName = "doc_example"; // Set but don't load yet
      } else if (activeProjectName) {
        configSelector.value = activeProjectName;
      }

      // Add onchange handler
      configSelector.onchange = async (e) => {
        if (e.target.value) {
          await selectConfig(e.target.value);
        }
      };
    }
  } catch (e) {
    console.error("Failed to load configs:", e);
  }
}

async function loadConfigIntoEditor(configName) {
  if (!configName) return;

  try {
    // Load config content
    const configRes = await fetch(`/configs/load?name=${configName}`);
    if (!configRes.ok) {
      throw new Error("Failed to load config");
    }
    const configData = await configRes.json();
    const parsed = jsyaml.load(configData.content);

    // Update state
    configSelector.value = configName;
    activeProjectName = configName;
    currentConfig = parsed;

    // Load schema and check if project has data
    await loadSchema(parsed.mode || "docs");

    // Check if project has indexed data
    const statsRes = await fetch("/stats");
    const stats = await statsRes.json();
    hasData = stats.has_data === true || (stats.documents || 0) > 0;

    // Update stats display
    if (stats.connection_error) {
      statsEl.textContent = `⚠️ ${stats.connection_error}`;
      statsEl.style.color = "#ef4444";
    } else if (stats.documents) {
      statsEl.textContent = `${stats.documents} documents indexed`;
      statsEl.style.color = "";
    } else {
      statsEl.textContent = "No documents indexed";
      statsEl.style.color = "";
    }

    if (hasData) {
      // Project has data, go straight to chat mode
      setMode("chat");
    } else {
      // No data yet, show config editor
      setMode("feed");
      renderConfigEditor();
    }

    if (terminalStatus) {
      terminalStatus.textContent = `Editing: ${configName}`;
      terminalStatus.style.color = "#10b981";
    }

    // Also load backend settings for this config
    try {
      await fetch("/projects/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_name: activeProjectName })
      });
    } catch (e) {
      console.warn("Failed to sync backend:", e);
    }
  } catch (e) {
    console.error("Failed to load config:", e);
    alert("Failed to load config");
  }
}

async function selectConfig(configName) {
  // Just load into editor
  return loadConfigIntoEditor(configName);
}

async function loadProjects() {
  // Backward compatibility - now loads configs
  return loadConfigsList();
}

async function selectProject(projectName) {
  if (!projectName) return;

  try {
    const res = await fetch("/projects/select", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_name: projectName })
    });

    const data = await res.json();
    if (data.status === "success") {
      activeProjectName = projectName;
      // Update active project indicator
      const indicator = document.getElementById("active-project-indicator");
      if (indicator) {
        indicator.textContent = `Project: ${projectName}`;
      }
      // Sync settings modal selector
      if (configSelector) configSelector.value = projectName;
      // Refresh stats and then switch to chat mode (which will show error if no data)
      await fetchStats();
      chatHistory = [];
      // Switch to chat mode - it will show no-data error if needed
      setMode("chat");
    }
  } catch (e) {
    console.error("Failed to select project", e);
  }
}

// Create New Project button handler (both buttons do the same thing)
const handleCreateNewProject = async () => {
  activeProjectName = null;
  // Update active project indicator
  const indicator = document.getElementById("active-project-indicator");
  if (indicator) {
    indicator.textContent = "New Project";
  }
  setMode("feed");
  // Reset to a blank/template config
  currentConfig = JSON.parse(JSON.stringify(FALLBACK_CONFIG));
  await loadSchema(currentConfig.mode || "web");
  renderConfigEditor();
};

// Dropdown handler is set in loadConfigsList()

// Legacy handlers removed - using simplified workflow now
// (No more add/edit buttons or config upload)

// Load user settings from backend
async function loadUserSettings() {
  try {
    const res = await fetch("/user-settings");
    const settings = await res.json();

    // Apply settings to form inputs
    if (settings.hits !== undefined) {
      document.getElementById("hits").value = settings.hits;
    }
    if (settings.k !== undefined) {
      document.getElementById("k").value = settings.k;
    }
    if (settings.query_k !== undefined) {
      document.getElementById("query_k").value = settings.query_k;
    }
    // Note: We intentionally do NOT auto-select the project here anymore.
    // if (settings.active_project) { await selectProject(settings.active_project); }
  } catch (e) {
    console.error("Failed to load user settings", e);
  }
}

// Save user settings to backend
async function saveUserSettings() {
  try {
    const settings = {
      active_project: activeProjectName || null,
      hits: parseInt(document.getElementById("hits").value) || 5,
      k: parseInt(document.getElementById("k").value) || 3,
      query_k: parseInt(document.getElementById("query_k").value) || 3,
    };

    const res = await fetch("/user-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings)
    });

    const data = await res.json();
    if (data.status === "success") {
      console.log("Settings saved successfully");
    }
  } catch (e) {
    console.error("Failed to save user settings", e);
  }
}

// Auto-resize textarea
inputEl.addEventListener('input', function () {
  this.style.height = 'auto';
  this.style.height = (this.scrollHeight) + 'px';
  if (this.value === '') {
    this.style.height = 'auto';
  }
});

// Initialize UI state
async function initializeApp() {
  activeProjectName = null;

  // Fetch deploy mode explicitly
  try {
    const res = await fetch("/deploy-mode");
    if (res.ok) {
      const data = await res.json();
      console.log("Deploy mode fetch:", data);
      if (data.mode) {
        updateDeployModeBadge(data.mode, "deploy-mode");
      }
    } else {
      console.warn("Deploy mode fetch failed:", res.status);
    }
  } catch (e) {
    console.error("Failed to fetch deploy mode", e);
  }

  // Fetch and display stats
  await fetchStats();

  // Check if we should auto-load default config
  let autoLoadedProject = false;
  try {
    const res = await fetch("/auto-load-config");
    if (res.ok) {
      const data = await res.json();
      if (data.auto_load && data.project_name) {
        console.log("Auto-loading project:", data.project_name);
        activeProjectName = data.project_name;
        autoLoadedProject = true;
      }
    }
  } catch (e) {
    console.error("Failed to auto-load config", e);
  }

  // Set indicator
  const indicator = document.getElementById("active-project-indicator");
  if (indicator) {
    if (autoLoadedProject) {
      indicator.textContent = `Project: ${activeProjectName}`;
    } else {
      indicator.textContent = "New Project";
    }
  }

  // Load available projects
  await loadProjects();

  // Try to load user settings
  await loadUserSettings();

  // Load config into editor
  if (autoLoadedProject && activeProjectName) {
    // Auto-loaded config - load into editor
    await loadConfigIntoEditor(activeProjectName);
  } else if (!activeProjectName) {
    // No active project - default to "doc_example" if it exists
    const configs = await fetch("/configs/list").then(r => r.json());
    const docConfig = configs.configs.find(c => c.name === "doc_example");
    if (docConfig) {
      await loadConfigIntoEditor("doc_example");
    } else if (configs.configs.length > 0) {
      // Load first available config
      await loadConfigIntoEditor(configs.configs[0].name);
    } else {
      // No configs - show feed mode with fallback
      currentConfig = JSON.parse(JSON.stringify(FALLBACK_CONFIG));
      await loadSchema("docs");
      setMode("feed");
      renderConfigEditor();
    }
  } else {
    // This branch is for when a project is selected from settings
    await loadConfigIntoEditor(activeProjectName);
  }

  updateChatInputState();
}

// Initial call
initializeApp();
