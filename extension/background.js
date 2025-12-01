// background.js — Data Guardian (stable, optimized)
const BLOCKLIST_KEY = "dg:blocklist_v1";
const SCAN_PREFIX = "scan:";

// per-tab memory
const pageAggregates = {};

// ---- safe storage helpers ----
function storageSet(obj) {
  try {
    chrome.storage.local.set(obj);
  } catch (e) {
    console.warn("[DG] storageSet error:", e);
  }
}

function storageGet(key, cb) {
  try {
    chrome.storage.local.get(key, (res) => {
      if (chrome.runtime.lastError) {
        console.warn("[DG] storageGet runtime error:", chrome.runtime.lastError);
        cb(null);
      } else {
        cb(res);
      }
    });
  } catch (e) {
    console.warn("[DG] storageGet exception:", e);
    cb(null);
  }
}

// ---- load blocklist.txt into storage and memory ----
let inMemoryBlocklist = [];

async function loadBundledBlocklist() {
  try {
    const resp = await fetch(chrome.runtime.getURL("blocklist.txt"));
    const txt = await resp.text();
    const lines = txt
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith("#"));

    inMemoryBlocklist = lines; // keep fast in-memory copy

    const payload = {};
    payload[BLOCKLIST_KEY] = lines;
    storageSet(payload);

    console.log("[DG] Blocklist loaded:", lines.length);
  } catch (e) {
    console.warn("[DG] Could not load blocklist:", e);
  }
}

loadBundledBlocklist();

// domain helper
function domainFromUrl(url) {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

// store aggregated scan result
function saveAggregate(key, agg) {
  try {
    const payload = {};
    payload[key] = {
      domain: agg.domain || null,
      trackers: Array.from(agg.trackers || []),
      pixels: Array.from(agg.pixels || []),
      requests_count: (agg.requests || []).length || 0,
      fingerprint_flags: Array.from(agg.fingerprintFlags || []),
      cookies_count: agg.cookies_count || 0,
      permissions: agg.permissions || {}
    };
    storageSet(payload);
  } catch (e) {
    console.warn("[DG] saveAggregate error:", e);
  }
}

// ---- fast match using in-memory blocklist ----
function matchBlocklist(url) {
  if (!url || !inMemoryBlocklist || inMemoryBlocklist.length === 0) return [];
  const low = url.toLowerCase();
  const found = [];
  // iterate until small cap to avoid pathological cases
  for (let i = 0; i < inMemoryBlocklist.length; ++i) {
    const p = inMemoryBlocklist[i];
    if (!p) continue;
    if (low.includes(p)) {
      found.push(p);
      if (found.length > 20) break;
    }
  }
  return found;
}

// ---- webRequest listeners ----
chrome.webRequest.onCompleted.addListener((details) => {
  try {
    const { url, tabId, type } = details;
    if (typeof tabId !== "number" || tabId < 0) return;

    const domain = domainFromUrl(url);

    if (!pageAggregates[tabId]) {
      pageAggregates[tabId] = {
        domain: domain,
        trackers: new Set(),
        pixels: new Set(),
        requests: [],
        fingerprintFlags: new Set(),
        cookies_count: 0,
        permissions: {}
      };
    }

    const agg = pageAggregates[tabId];
    if (!agg.domain && domain) agg.domain = domain;

    // Use in-memory blocklist for speed; fallback to storage if not loaded
    let matches = [];
    if (inMemoryBlocklist && inMemoryBlocklist.length > 0) {
      matches = matchBlocklist(url);
    } else {
      // fallback: read from storage synchronously via callback and update there
      storageGet(BLOCKLIST_KEY, (res) => {
        try {
          const list = (res && res[BLOCKLIST_KEY]) || [];
          const lower = (url || "").toLowerCase();
          for (const p of list) {
            if (!p) continue;
            if (lower.includes(p)) agg.trackers.add(p);
          }
          // pixels
          if (/\/pixel|\/track|\/collect|\/beacon|\.gif($|\?)/i.test(url)) {
            agg.pixels.add(url);
          }
          agg.requests.push({ url, type });
          const key = SCAN_PREFIX + (agg.domain || `tab${tabId}`);
          saveAggregate(key, agg);
        } catch (e) {
          console.warn("[DG] fallback blocklist match/update error:", e);
        }
      });
      return;
    }

    // record matches
    matches.forEach(m => agg.trackers.add(m));

    // pixel heuristics
    if (/\/pixel|\/track|\/collect|\/beacon|\.gif($|\?)/i.test(url)) {
      agg.pixels.add(url);
    }

    agg.requests.push({ url, type });

    const key = SCAN_PREFIX + (agg.domain || `tab${tabId}`);
    saveAggregate(key, agg);

  } catch (e) {
    console.error("[DG] webRequest onCompleted error:", e);
  }
}, { urls: ["<all_urls>"] });

// quick redirect/ad-spam patterns
chrome.webRequest.onBeforeRequest.addListener((details) => {
  try {
    const { url, tabId } = details;
    if (typeof tabId !== "number" || tabId < 0) return;
    if (!pageAggregates[tabId]) return;

    if (/redir|click|clk|adservice|adserver|adclick|adv/i.test(url)) {
      pageAggregates[tabId].trackers.add("redirect-ad");
    }
  } catch (e) {
    console.warn("[DG] onBeforeRequest error:", e);
  }
}, { urls: ["<all_urls>"] });

// ---- handle messages ----
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  try {
    const pageUrl = sender && (sender.url || (sender.tab && sender.tab.url));
    const domain = domainFromUrl(pageUrl);
    const key = SCAN_PREFIX + (domain || (msg && msg.data && msg.data.domain) || `tab${sender && sender.tab ? sender.tab.id : "x"}`);

    if (msg && msg.type === "scan_request") {
      // merge with existing
      storageGet(key, (res) => {
        try {
          const prev = (res && res[key]) || {};
          const merged = {
            domain: domain || (msg.data.domain || prev.domain),
            trackers: Array.from(new Set([...(prev.trackers || []), ...(msg.data.trackers || [])])),
            pixels: Array.from(new Set([...(prev.pixels || []), ...(msg.data.pixels || [])])),
            fingerprint_flags: Array.from(new Set([...(prev.fingerprint_flags || []), ...(msg.data.fingerprint_flags || [])])),
            cookies_count: msg.data.cookies_count || prev.cookies_count || 0,
            permissions: Object.assign({}, prev.permissions || {}, msg.data.permissions || {}),
            requests_count: prev.requests_count || 0
          };
          const payload = {};
          payload[key] = merged;
          storageSet(payload);
          sendResponse({ ok: true });
        } catch (e) {
          console.warn("[DG] scan_request merge error:", e);
          sendResponse({ ok: false, error: String(e) });
        }
      });
      return true; // async
    }

    if (msg && msg.type === "permission_status") {
      storageGet(key, (res) => {
        try {
          const cur = (res && res[key]) || {};
          cur.permissions = cur.permissions || {};
          cur.permissions[msg.permission] = msg.state;
          const payload = {};
          payload[key] = cur;
          storageSet(payload);
          sendResponse({ ok: true });
        } catch (e) {
          console.warn("[DG] permission_status error:", e);
          sendResponse({ ok: false, error: String(e) });
        }
      });
      return true;
    }

    // unknown message types
    sendResponse({ ok: false, error: "unknown message type" });
  } catch (e) {
    console.error("[DG] background message handler error:", e);
    try { sendResponse({ ok: false, error: String(e) }); } catch (err) {}
  }
  return true;
});

// cleanup
chrome.tabs.onRemoved.addListener((tabId) => {
  try { delete pageAggregates[tabId]; } catch (e) {}
});

// periodic blocklist refresh
chrome.alarms.create("refresh_blocklist", { periodInMinutes: 360 });
chrome.alarms.onAlarm.addListener((a) => {
  if (a && a.name === "refresh_blocklist") loadBundledBlocklist();
});

console.log("[DG] Background worker ready");
