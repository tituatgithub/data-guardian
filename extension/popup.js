// popup.js — Hybrid Mode (Local → HF → Modal → Local-Fallback)

const SCAN_PREFIX = "scan:";

// ---- Backend URLs ----
const LOCAL_BACKEND = "http://127.0.0.1:8000/score";
const HF_BACKEND = "https://mcp-1st-birthday--data-guardian.hf.space/score";
const CLOUD_BACKEND = "https://dp8187770--data-guardian-backend-fastapi-app.modal.run/score";

// ---- UI Helpers ----
function scoreToBand(score) {
  if (score < 5) return { band: "LOW", cls: "low" };
  if (score < 12) return { band: "MEDIUM", cls: "medium" };
  return { band: "HIGH", cls: "high" };
}

function setRiskUI(score) {
  const band = scoreToBand(score);
  const status = document.getElementById("status");
  status.innerText = `Risk: ${band.band}\nScore: ${score}`;
  status.className = `band ${band.cls}`;
}

function renderSuggestions(suggestions) {
  const ul = document.getElementById("suggestions");
  ul.innerHTML = "";
  if (!suggestions || suggestions.length === 0) {
    ul.innerHTML = "<li>No immediate actions</li>";
    return;
  }
  suggestions.forEach(s => {
    const li = document.createElement("li");
    li.textContent = s;
    ul.appendChild(li);
  });
}

// ---- Local Scoring Logic (fallback) ----
function computeLocalScore(scan) {
  let score = 0;

  // trackers
  (scan.trackers || []).forEach(t => {
    if (/doubleclick|adservice|adnxs|criteo|pubmatic|taboola|outbrain/.test(t))
      score += 3;
    else if (/analytics|google-analytics|snowplow|quantserve/.test(t))
      score += 1;
    else score += 1;
  });

  // pixels
  score += (scan.pixels || []).length;

  // cookies
  score += Math.min(Math.floor((scan.cookies_count || 0) / 10), 10);

  // fingerprint flags
  (scan.fingerprint_flags || []).forEach(() => (score += 2));

  // permissions
  for (const v of Object.values(scan.permissions || {})) {
    if (v === "granted") score += 5;
  }

  return score;
}

// ---- Backend Communication ----
async function tryBackend(url, payload) {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error("Backend error");
    return await res.json();
  } catch (err) {
    return null; // fail silently → fallback
  }
}

// ---- Main Logic ----
async function loadForActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.url) {
      document.getElementById("status").innerText = "No active tab";
      return;
    }

    const domain = new URL(tab.url).hostname;
    const key = SCAN_PREFIX + domain;

    document.getElementById("domain").innerText = `Domain: ${domain}`;

    const res = await chrome.storage.local.get(key);
    const scan = res[key];

    if (!scan) {
      document.getElementById("status").innerText = "No scan found.";
      return;
    }

    document.getElementById("counts").innerText =
      `Requests: ${scan.requests_count || 0} | Cookies: ${scan.cookies_count || 0} | Pixels: ${(scan.pixels || []).length}`;

    document.getElementById("trackersList").innerHTML =
      (scan.trackers || []).length
        ? scan.trackers.map(t => `<div>• ${t}</div>`).join("")
        : "None";

    document.getElementById("fingerprint").innerText =
      (scan.fingerprint_flags || []).join(", ") || "None";

    const payload = {
      domain,
      trackers: scan.trackers || [],
      cookies_count: scan.cookies_count || 0,
      permissions: scan.permissions || {},
      pixels: scan.pixels || [],
      fingerprint_flags: scan.fingerprint_flags || []
    };

    //------------------------------------------
    // 🚀 HYBRID BACKEND PIPELINE
    //------------------------------------------

    // 1) LOCAL backend
    let result = await tryBackend(LOCAL_BACKEND, payload);

    // 2) HuggingFace backend
    if (!result) result = await tryBackend(HF_BACKEND, payload);

    // 3) Modal backend
    if (!result) result = await tryBackend(CLOUD_BACKEND, payload);

    // 4) Local fallback
    if (!result) {
      const fallbackScore = computeLocalScore(scan);
      setRiskUI(fallbackScore);

      renderSuggestions([
        "Backend offline — using local scoring.",
        ...((scan.trackers || []).length ? ["Tracker activity detected."] : []),
        ...((scan.pixels || []).length ? ["Pixel tracking detected."] : []),
        ...((scan.fingerprint_flags || []).length ? ["Fingerprinting detected."] : [])
      ]);

      return;
    }

    // Backend success
    setRiskUI(result.score);
    renderSuggestions(result.suggestions || []);

  } catch (err) {
    console.error("Popup load error:", err);
    document.getElementById("status").innerText = "Error loading scan.";
  }
}

document.addEventListener("DOMContentLoaded", loadForActiveTab);
