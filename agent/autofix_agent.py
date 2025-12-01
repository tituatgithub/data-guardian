import requests
import re
import sys
import argparse
from pathlib import Path

# ---------------------------------------------
# Blocklist sources (clean + reliable)
# ---------------------------------------------
SOURCES = [
    # EasyPrivacy (official)
    "https://easylist-downloads.adblockplus.org/easyprivacy.txt",

    # Disconnect tracking protection (JSON)
    "https://raw.githubusercontent.com/disconnectme/disconnect-tracking-protection/master/services.json"
]

OUTFILE = Path("extension/blocklist.txt")


# ---------------------------------------------
# Helpers
# ---------------------------------------------
DOMAIN_REGEX = re.compile(
    r"(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}"
)


def extract_domains_from_text(text):
    """Extract domain-like strings from plaintext blocklists."""
    found = set()

    for line in text.splitlines():
        line = line.strip()

        # skip comments and empty lines
        if not line or line.startswith("!") or line.startswith("#"):
            continue

        # Extract domain-like parts
        matches = DOMAIN_REGEX.findall(line)
        for m in matches:
            found.add(m.lower())

    return found


def extract_domains_from_disconnect_json(data):
    """Extract domains from Disconnect JSON format."""
    found = set()

    for category, services in data.items():
        if not isinstance(services, dict):
            continue

        for svc, meta in services.items():
            domains = meta.get("domains", [])
            for d in domains:
                if DOMAIN_REGEX.fullmatch(d):
                    found.add(d.lower())

    return found


def fetch_list(url):
    print(f"Fetching {url}")
    r = requests.get(url, timeout=20)
    r.raise_for_status()

    # JSON source (Disconnect)
    if url.endswith(".json"):
        try:
            data = r.json()
            return extract_domains_from_disconnect_json(data)
        except Exception as e:
            print("Failed to parse JSON:", e)
            return set()

    # Text source (EasyPrivacy)
    text = r.text
    return extract_domains_from_text(text)


def merge_blocklists(sources):
    all_domains = set()

    for url in sources:
        items = fetch_list(url)
        all_domains |= items

    # Remove very short junk strings
    cleaned = {d for d in all_domains if len(d) > 3}

    return sorted(cleaned)


# ---------------------------------------------
# MAIN
# ---------------------------------------------
def main(args):
    print(f"AutoFix Agent starting (dry-run={args.dry_run})")

    merged = merge_blocklists(SOURCES)
    print("Final cleaned domains:", len(merged))

    if args.dry_run:
        print("--- First 50 entries (preview) ---")
        for d in merged[:50]:
            print(d)
        return 0

    # Write to file
    OUTFILE.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTFILE, "w", encoding="utf-8") as f:
        for d in merged:
            f.write(d + "\n")

    print(f"✔ blocklist.txt updated successfully ({len(merged)} domains)")
    return 0


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    sys.exit(main(args))
