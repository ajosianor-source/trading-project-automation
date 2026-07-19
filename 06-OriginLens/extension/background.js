const DEFAULT_SETTINGS = {
  backendUrl: "http://127.0.0.1:8000",
  requestedPolicy: "warn",
  autoScan: false
};

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "originlens-scan-image",
    title: "Scan image with OriginLens",
    contexts: ["image"]
  });

  chrome.contextMenus.create({
    id: "originlens-scan-video",
    title: "Scan video with OriginLens",
    contexts: ["video"]
  });

  chrome.storage.sync.get(DEFAULT_SETTINGS, (stored) => {
    chrome.storage.sync.set({ ...DEFAULT_SETTINGS, ...stored });
  });
});

function getSettings() {
  return chrome.storage.sync.get(DEFAULT_SETTINGS);
}

async function fetchBlobFromUrl(url) {
  const response = await fetch(url, { credentials: "omit" });
  if (!response.ok) {
    throw new Error(`Failed to fetch media: ${response.status}`);
  }

  return response.blob();
}

async function analyzeMedia({ tabId, mediaUrl, sourceType, pageUrl }) {
  const settings = await getSettings();
  const baseUrl = settings.backendUrl.replace(/\/$/, "");
  const endpoint = sourceType === "video"
    ? `${baseUrl}/api/v1/analyze/video`
    : `${baseUrl}/api/v1/analyze/image`;

  chrome.tabs.sendMessage(tabId, {
    action: "originlens:started",
    mediaUrl,
    message: sourceType === "video"
      ? "OriginLens queued this video for analysis."
      : "OriginLens is analyzing this image."
  });

  try {
    const blob = await fetchBlobFromUrl(mediaUrl);
    const formData = new FormData();
    formData.append("file", blob, "originlens-scan");
    formData.append(
      "context_json",
      JSON.stringify({
        page_url: pageUrl,
        source_type: sourceType,
        requested_policy: settings.requestedPolicy,
        provenance: {
          has_c2pa: false,
          source_verified: false,
          signer: null
        }
      })
    );

    const response = await fetch(endpoint, {
      method: "POST",
      body: formData
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(detail || `Backend returned ${response.status}`);
    }

    const payload = await response.json();
    if (sourceType === "video") {
      await pollVideoJob({
        baseUrl,
        tabId,
        mediaUrl,
        jobId: payload.job_id,
        pollAfterSeconds: payload.poll_after_seconds || 1.5
      });
      return;
    }

    const result = payload;
    chrome.tabs.sendMessage(tabId, {
      action: "originlens:result",
      mediaUrl,
      result
    });
  } catch (error) {
    chrome.tabs.sendMessage(tabId, {
      action: "originlens:error",
      mediaUrl,
      message: error instanceof Error ? error.message : "Unexpected analysis error."
    });
  }
}

async function pollVideoJob({ baseUrl, tabId, mediaUrl, jobId, pollAfterSeconds }) {
  const maxAttempts = 20;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, pollAfterSeconds * 1000));
    const response = await fetch(`${baseUrl}/api/v1/jobs/${jobId}`);
    if (!response.ok) {
      throw new Error(`Video job polling failed: ${response.status}`);
    }

    const state = await response.json();
    if (state.status === "completed") {
      chrome.tabs.sendMessage(tabId, {
        action: "originlens:result",
        mediaUrl,
        result: state.result
      });
      return;
    }

    if (state.status === "failed") {
      throw new Error(state.error || "Video analysis job failed.");
    }
  }

  throw new Error("Video analysis timed out before completion.");
}

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab?.id) {
    return;
  }

  if (info.menuItemId === "originlens-scan-image" && info.srcUrl) {
    analyzeMedia({ tabId: tab.id, mediaUrl: info.srcUrl, sourceType: "image", pageUrl: info.pageUrl || tab.url || "" });
  }

  if (info.menuItemId === "originlens-scan-video" && info.srcUrl) {
    analyzeMedia({ tabId: tab.id, mediaUrl: info.srcUrl, sourceType: "video", pageUrl: info.pageUrl || tab.url || "" });
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "originlens:scan" && sender.tab?.id) {
    analyzeMedia({
      tabId: sender.tab.id,
      mediaUrl: message.mediaUrl,
      sourceType: message.sourceType,
      pageUrl: message.pageUrl || sender.tab.url || ""
    });
    sendResponse({ accepted: true });
    return true;
  }

  if (message.action === "originlens:get-settings") {
    getSettings().then((settings) => sendResponse(settings));
    return true;
  }

  if (message.action === "originlens:scan-visible-from-popup") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab?.id) {
        chrome.tabs.sendMessage(activeTab.id, { action: "originlens:scan-visible" });
      }
      sendResponse({ accepted: true });
    });
    return true;
  }
});
