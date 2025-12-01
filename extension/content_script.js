/****************************************************
 * Data Guardian — Enhanced Content Script (Stable)
 ****************************************************/
console.log("%c[Data Guardian] Content script active:", "color:#4CAF50", location.hostname);

// ---------------------------------------------------
// Helper: cookie count
// ---------------------------------------------------
function getCookieCount() {
  try {
    const c = document.cookie || "";
    return c ? c.split(";").filter(Boolean).length : 0;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------
// Script tracker detection
// ---------------------------------------------------
function detectScriptTrackers() {
  const found = new Set();
  const patterns = [
    "doubleclick", "googletagmanager", "google-analytics",
    "analytics", "adsystem", "adservice", "adnxs", "taboola",
    "outbrain", "criteo", "facebook", "pixel", "tracking",
    "quantserve", "scorecardresearch", "snowplow",
    "pubmatic", "adsrvr", "adtech", "adform",
    "hotjar", "segment", "mixpanel", "matomo",
    "yandex", "ttq", "bing"
  ];

  document.querySelectorAll("script[src]").forEach(s => {
    const src = (s.src || "").toLowerCase();
    patterns.forEach(p => { if (src.includes(p)) found.add(p); });
  });

  return Array.from(found);
}

// ---------------------------------------------------
// Detect iframe-based trackers
// ---------------------------------------------------
function detectIframeTrackers() {
  const found = new Set();
  const patterns = [
    "doubleclick", "taboola", "outbrain", "adservice",
    "adsystem", "adnxs", "criteo", "adtech",
    "pubmatic", "cookielaw", "brightcove",
    "jwplayer", "vidcdn", "player"
  ];

  document.querySelectorAll("iframe[src]").forEach(f => {
    const src = (f.src || "").toLowerCase();
    patterns.forEach(p => { if (src.includes(p)) found.add(p); });
  });

  return Array.from(found);
}

// ---------------------------------------------------
// Detect pixel trackers & beacons
// ---------------------------------------------------
function detectPixelImages() {
  const found = new Set();

  document.querySelectorAll("img[src]").forEach(img => {
    const s = (img.src || "").toLowerCase();
    if (/\/pixel|\/track|\/collect|\/beacon|\.gif($|\?)/.test(s)) {
      found.add(s);
    }
  });

  performance.getEntriesByType("resource").forEach(r => {
    const u = (r.name || "").toLowerCase();
    if (/\/pixel|\/track|\/collect|\/beacon|\.gif($|\?)/.test(u)) {
      found.add(u);
    }
  });

  return Array.from(found);
}

// ---------------------------------------------------
// Heavy fingerprinting detection
// ---------------------------------------------------
async function detectFingerprinting() {
  const flags = new Set();

  try {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx.textBaseline = "top";
    ctx.font = "16px Arial";
    ctx.fillText("fp_test", 2, 2);
    canvas.toDataURL();
    flags.add("canvas");
  } catch {}

  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) flags.add("audio");
  } catch {}

  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl") || c.getContext("experimental-webgl");
    if (gl) flags.add("webgl");
  } catch {}

  try {
    if (navigator.connection && navigator.connection.type === "cellular") {
      flags.add("webrtc");
    }
  } catch {}

  return Array.from(flags);
}

// ---------------------------------------------------
// Detect JS Injection (ads, malware)
// ---------------------------------------------------
function installJSInjectionHooks() {
  ["eval", "Function"].forEach(fn => {
    try {
      const original = window[fn];
      window[fn] = function () {
        safeSendMessage({ type: "js_injection", fn });
        return original.apply(this, arguments);
      };
    } catch {}
  });

  const dw = document.write;
  document.write = function (html) {
    safeSendMessage({ type: "js_injection", fn: "document.write" });
    return dw.call(document, html);
  };
}

installJSInjectionHooks();

// ---------------------------------------------------
// Safe sendMessage wrapper (prevents extension-context crash)
// ---------------------------------------------------
function safeSendMessage(msg) {
  try {
    if (!chrome.runtime?.id) return;
    chrome.runtime.sendMessage(msg, () => {
      void chrome.runtime.lastError;
    });
  } catch {}
}



function scanIframesContinuously() {
  setInterval(() => {
    try {
      if (!chrome.runtime?.id) return;

      const frames = [...document.querySelectorAll("iframe[src]")]
        .map(f => f.src);

      safeSendMessage({
        type: "iframe_sources",
        frames
      });

    } catch (e) {
      console.warn("iframe scan error:", e);
    }
  }, 1500);
}

scanIframesContinuously();

// ---------------------------------------------------
// MAIN SCAN
// ---------------------------------------------------
(async function runScan() {
  try {
    const trackers = detectScriptTrackers();
    const iframeTrackers = detectIframeTrackers();
    const pixels = detectPixelImages();
    const fingerprint_flags = await detectFingerprinting();

    const payload = {
      domain: location.hostname,
      cookies_count: getCookieCount(),
      trackers: Array.from(new Set([...trackers, ...iframeTrackers])),
      pixels,
      fingerprint_flags,
      permissions: {}
    };

    try {
      if (navigator.permissions?.query) {
        const g = await navigator.permissions.query({ name: "geolocation" });
        payload.permissions.geolocation = g.state;
      }
    } catch {}

    try {
      payload.permissions.notifications = Notification.permission;
    } catch {}

    safeSendMessage({ type: "scan_request", data: payload });

  } catch (err) {
    console.error("runScan error:", err);
  }
})();
