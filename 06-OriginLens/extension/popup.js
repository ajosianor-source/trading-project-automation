const DEFAULT_SETTINGS = {
  backendUrl: "http://127.0.0.1:8000",
  requestedPolicy: "warn",
  autoScan: false
};

const backendUrlInput = document.getElementById("backendUrl");
const requestedPolicySelect = document.getElementById("requestedPolicy");
const autoScanInput = document.getElementById("autoScan");
const saveButton = document.getElementById("saveButton");
const scanButton = document.getElementById("scanButton");
const statusElement = document.getElementById("status");

function setStatus(message, isError = false) {
  statusElement.textContent = message;
  statusElement.style.color = isError ? "#b42318" : "#0b5c73";
}

function loadSettings() {
  chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
    backendUrlInput.value = settings.backendUrl;
    requestedPolicySelect.value = settings.requestedPolicy;
    autoScanInput.checked = Boolean(settings.autoScan);
  });
}

saveButton.addEventListener("click", () => {
  const nextSettings = {
    backendUrl: backendUrlInput.value.trim() || DEFAULT_SETTINGS.backendUrl,
    requestedPolicy: requestedPolicySelect.value,
    autoScan: autoScanInput.checked
  };

  chrome.storage.sync.set(nextSettings, () => {
    setStatus("Settings saved.");
  });
});

scanButton.addEventListener("click", () => {
  chrome.runtime.sendMessage({ action: "originlens:scan-visible-from-popup" }, () => {
    setStatus("Visible media scan requested.");
    window.close();
  });
});

loadSettings();
