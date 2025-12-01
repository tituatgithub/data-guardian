from scoring import compute_score, score_band

def test_empty():
    sc, reasons = compute_score([], 0, {})
    assert sc == 0
    assert score_band(sc) == "low"

def test_high_cookie_gives_medium_band():
    # 100 cookies = 10 points → band = medium
    sc, reasons = compute_score([], 100, {})
    assert sc == 10
    assert score_band(sc) == "medium"

def test_tracker_severity():
    # "doubleclick" has severity 4
    sc, reasons = compute_score(["doubleclick"], 0, {})
    assert sc >= 4
    assert score_band(sc) in ["low", "medium"]

def test_pixels_affect_score():
    sc, reasons = compute_score(
        trackers=[],
        cookies_count=0,
        permissions={},
        pixels=["https://test.com/pixel.gif"],
        fingerprint_flags=[]
    )
    assert sc >= 1
    assert any("pixel" in r.lower() or "beacon" in r.lower() for r in reasons)

def test_fingerprinting_affects_score():
    sc, reasons = compute_score(
        trackers=[],
        cookies_count=0,
        permissions={},
        pixels=[],
        fingerprint_flags=["canvas", "audio"]
    )
    assert sc >= 4  # 2 pts each
    assert any("Fingerprinting technique detected" in r for r in reasons)

def test_permissions_affect_score():
    sc, reasons = compute_score(
        trackers=[],
        cookies_count=0,
        permissions={"geolocation": "granted"},
        pixels=[],
        fingerprint_flags=[]
    )
    assert sc >= 5
    assert any("Permission used" in r for r in reasons)
