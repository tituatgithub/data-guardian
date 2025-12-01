from typing import List, Dict, Tuple

# trackers severity mapping (examples)
TRACKER_SEVERITY = {
    "doubleclick": 4,
    "adservice": 4,
    "adnxs": 4,
    "criteo": 4,
    "pubmatic": 3,
    "taboola": 3,
    "outbrain": 3,
    "google-analytics": 1,
    "analytics": 1,
    "snowplow": 1,
    "quantserve": 1,
    "scorecardresearch": 1,
    "redirect-ad": 5
}

def compute_score(trackers: List[str], cookies_count: int, permissions: Dict, pixels: List[str]=None, fingerprint_flags: List[str]=None) -> Tuple[int, List[str]]:
    if pixels is None: pixels = []
    if fingerprint_flags is None: fingerprint_flags = []

    reasons = []
    score = 0

    # trackers
    for t in trackers:
        key = t.lower()
        sev = 1
        for k,v in TRACKER_SEVERITY.items():
            if k in key:
                sev = v
                break
        score += sev
        reasons.append(f"Tracker detected: {t} (severity {sev})")

    # pixels
    pixel_count = len(pixels)
    score += pixel_count * 1
    if pixel_count > 5:
        reasons.append(f"Multiple pixel/beacon endpoints detected: {pixel_count}")

    # cookies (simple)
    cookie_points = min(cookies_count // 10, 10)
    score += cookie_points
    if cookies_count > 50:
        reasons.append(f"High cookie count: {cookies_count}")

    # fingerprint flags
    for f in fingerprint_flags:
        score += 2
        reasons.append(f"Fingerprinting technique detected: {f}")

    # permissions
    for p, state in (permissions or {}).items():
        if state == "granted":
            score += 5
            reasons.append(f"Permission used: {p}")

    return score, reasons

def score_band(score: int) -> str:
    if score < 5:
        return "low"
    if score < 12:
        return "medium"
    return "high"

def suggest_actions(reasons: List[str]) -> List[str]:
    out = []
    for r in reasons:
        if "cookie" in r.lower():
            out.append("Clear cookies or enable strict cookie blocking.")
        elif "tracker" in r.lower():
            out.append("Block trackers using privacy settings or use uBlock / Privacy Badger.")
        elif "permission used" in r.lower():
            out.append("Revoke unnecessary permissions in browser settings.")
        elif "fingerprinting" in r.lower():
            out.append("Enable anti-fingerprinting protections or use a private browsing session.")
        else:
            out.append("Review privacy settings for this site.")
    return list(dict.fromkeys(out))
