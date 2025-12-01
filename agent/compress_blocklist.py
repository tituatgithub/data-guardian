# agent/compress_blocklist.py
import requests
import re
import json
from collections import Counter

EASYPRIVACY = "https://easylist-downloads.adblockplus.org/easyprivacy.txt"
DISCONNECT = "https://raw.githubusercontent.com/disconnectme/disconnect-tracking-protection/master/services.json"

def fetch(url):
    print("Fetching:", url)
    r = requests.get(url, timeout=15)
    r.raise_for_status()
    return r.text

def extract_domains_easyprivacy(text):
    domains = []
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith(("!", "[", "@@", "#")):
            continue

        # ||tracker.com^
        m = re.findall(r"\|\|([a-zA-Z0-9.-]+\.[a-z]{2,})", line)
        domains.extend(m)

        # pixel-like patterns
        if any(x in line.lower() for x in ["pixel", "track", "collect", ".gif", ".js"]):
            domains.append(line)

    return domains

# ---------- FIXED FUNCTION ----------
def extract_domains_disconnect(text):
    data = json.loads(text)
    output = []

    for category, entries in data.items():

        # Case 1: {"google": {"domains": [...]}}
        if isinstance(entries, dict):
            for service, meta in entries.items():
                if isinstance(meta, dict) and "domains" in meta:
                    output.extend(meta["domains"])

        # Case 2: [{"name":"xyz", "domains":[...]}]
        elif isinstance(entries, list):
            for item in entries:
                if isinstance(item, dict) and "domains" in item:
                    output.extend(item["domains"])

    return output
# ------------------------------------

def hybrid_compress():
    ep_raw = fetch(EASYPRIVACY)
    dc_raw = fetch(DISCONNECT)

    ep_domains = extract_domains_easyprivacy(ep_raw)
    dc_domains = extract_domains_disconnect(dc_raw)

    combined = ep_domains + dc_domains
    print("Raw extracted:", len(combined))

    # frequency count
    c = Counter(combined)

    # 2000 top tracker domains
    top_trackers = [d for d, _ in c.most_common(2000)]

    # 2000 pixel/js patterns
    pixel_patterns = [d for d in combined if any(x in str(d).lower() for x in ["pixel", "track", "collect", ".gif"])]
    pixel_patterns = list(set(pixel_patterns))[:2000]

    # 1000 js patterns
    js_patterns = [d for d in combined if ".js" in str(d).lower()]
    js_patterns = list(set(js_patterns))[:1000]

    final = top_trackers + pixel_patterns + js_patterns
    final = list(dict.fromkeys(final))

    print("Final hybrid size:", len(final))

    with open("extension/blocklist.txt", "w", encoding="utf-8") as f:
        for item in final:
            f.write(item + "\n")

    print("✔ Hybrid blocklist.txt updated.")

if __name__ == "__main__":
    hybrid_compress()
