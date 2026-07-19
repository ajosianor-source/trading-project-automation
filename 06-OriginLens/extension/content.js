const BADGE_CLASS = "originlens-badge";
const TOAST_ID = "originlens-toast";

function getMediaUrl(element) {
  return element.currentSrc || element.src || "";
}

function isLargeEnough(element) {
  const rect = element.getBoundingClientRect();
  return rect.width >= 160 && rect.height >= 160;
}

function isVisible(element) {
  const rect = element.getBoundingClientRect();
  return rect.bottom > 0 && rect.right > 0 && rect.top < window.innerHeight && rect.left < window.innerWidth;
}

function showToast(message, tone = "neutral") {
  let toast = document.getElementById(TOAST_ID);
  if (!toast) {
    toast = document.createElement("div");
    toast.id = TOAST_ID;
    document.documentElement.appendChild(toast);
  }

  toast.className = `originlens-toast originlens-tone-${tone}`;
  toast.textContent = message;
  window.clearTimeout(showToast.timeoutId);
  showToast.timeoutId = window.setTimeout(() => {
    toast.remove();
  }, 3000);
}

function removeBadgeForUrl(mediaUrl) {
  document.querySelectorAll(`.${BADGE_CLASS}[data-originlens-url="${CSS.escape(mediaUrl)}"]`).forEach((node) => node.remove());
}

function renderBadge(mediaUrl, result) {
  const element = findMediaByUrl(mediaUrl);
  if (!element) {
    showToast("OriginLens result returned, but the media is no longer visible.", "warning");
    return;
  }

  removeBadgeForUrl(mediaUrl);

  const rect = element.getBoundingClientRect();
  const badge = document.createElement("div");
  badge.className = `${BADGE_CLASS} originlens-tone-${result.risk_band}`;
  badge.dataset.originlensUrl = mediaUrl;
  badge.style.top = `${Math.max(8, rect.top + window.scrollY + 8)}px`;
  badge.style.left = `${Math.max(8, rect.left + window.scrollX + 8)}px`;
  badge.innerHTML = `
    <div class="originlens-badge-title">OriginLens ${result.risk_band.toUpperCase()}</div>
    <div class="originlens-badge-copy">${Math.round(result.confidence * 100)}% confidence</div>
    <div class="originlens-badge-copy">${result.message}</div>
    <div class="originlens-badge-signals">${result.signals.slice(0, 3).map((signal) => signal.name.replaceAll("_", " ")).join(" • ")}</div>
    <button class="originlens-dismiss" type="button">Dismiss</button>
  `;

  badge.querySelector(".originlens-dismiss").addEventListener("click", () => badge.remove());
  document.documentElement.appendChild(badge);

  if (result.policy_action === "blur_and_warn" || result.policy_action === "block") {
    element.classList.add("originlens-obscured");
    element.dataset.originlensProtected = "true";
  }
}

function findMediaByUrl(mediaUrl) {
  return Array.from(document.querySelectorAll("img, video")).find((element) => getMediaUrl(element) === mediaUrl) || null;
}

function scanVisibleMedia() {
  const candidates = Array.from(document.querySelectorAll("img, video"))
    .filter((element) => isVisible(element) && isLargeEnough(element))
    .slice(0, 5);

  if (candidates.length === 0) {
    showToast("No visible media eligible for scanning.", "warning");
    return;
  }

  for (const element of candidates) {
    const sourceType = element.tagName.toLowerCase() === "video" ? "video" : "image";
    const mediaUrl = getMediaUrl(element);
    if (!mediaUrl) {
      continue;
    }

    chrome.runtime.sendMessage({
      action: "originlens:scan",
      mediaUrl,
      sourceType,
      pageUrl: window.location.href
    });
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.action === "originlens:scan-visible") {
    scanVisibleMedia();
  }

  if (message.action === "originlens:started") {
    showToast(message.message || "OriginLens analysis started.");
  }

  if (message.action === "originlens:result") {
    renderBadge(message.mediaUrl, message.result);
  }

  if (message.action === "originlens:error") {
    showToast(message.message || "OriginLens analysis failed.", "warning");
  }
});

chrome.runtime.sendMessage({ action: "originlens:get-settings" }, (settings) => {
  if (!settings?.autoScan) {
    return;
  }

  window.setTimeout(() => {
    scanVisibleMedia();
  }, 1200);
});
