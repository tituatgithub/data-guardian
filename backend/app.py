from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict, Optional
from fastapi.middleware.cors import CORSMiddleware
import scoring

app = FastAPI(title="Data Guardian API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ScanRequest(BaseModel):
    domain: str
    trackers: List[str] = []
    cookies_count: int = 0
    permissions: Dict[str, str] = {}
    pixels: List[str] = []
    fingerprint_flags: List[str] = []

class ScanResponse(BaseModel):
    domain: str
    score: int
    band: str
    reasons: List[str]
    suggestions: List[str]

@app.post("/score", response_model=ScanResponse)
def score(req: ScanRequest):
    score_val, reasons = scoring.compute_score(
        req.trackers,
        req.cookies_count,
        req.permissions,
        pixels=req.pixels,
        fingerprint_flags=req.fingerprint_flags
    )
    suggestions = scoring.suggest_actions(reasons)
    band = scoring.score_band(score_val)
    return ScanResponse(domain=req.domain, score=score_val, band=band,
                        reasons=reasons, suggestions=suggestions)

@app.get("/health")
def health():
    return {"status":"ok"}
