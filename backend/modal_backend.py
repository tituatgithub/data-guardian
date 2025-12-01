# backend/modal_backend.py

import modal
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import scoring

# -------------------------------------------------
# FASTAPI APP
# -------------------------------------------------
api = FastAPI(title="Data Guardian Cloud API")

api.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Pydantic Models ----------
class ScanRequest(BaseModel):
    domain: str
    trackers: list = []
    cookies_count: int = 0
    permissions: dict = {}
    pixels: list = []
    fingerprint_flags: list = []


class ScanResponse(BaseModel):
    domain: str
    score: int
    band: str
    reasons: list
    suggestions: list


# ---------- API ROUTES ----------
@api.post("/score", response_model=ScanResponse)
def score(req: ScanRequest):
    score_val, reasons = scoring.compute_score(
        req.trackers,
        req.cookies_count,
        req.permissions,
        pixels=req.pixels,
        fingerprint_flags=req.fingerprint_flags,
    )

    suggestions = scoring.suggest_actions(reasons)
    band = scoring.score_band(score_val)

    return ScanResponse(
        domain=req.domain,
        score=score_val,
        band=band,
        reasons=reasons,
        suggestions=suggestions
    )


@api.get("/health")
def health():
    return {"status": "ok"}


# -------------------------------------------------
# MODAL DEPLOYMENT LAYER  (CLOUD HOSTING)
# -------------------------------------------------
app = modal.App("data_guardian_backend")

image = (
    modal.Image.debian_slim()
    .pip_install("fastapi", "uvicorn", "pydantic")
)


# IMPORTANT: Correct decorator order:
# 1) @modal.asgi_app
# 2) @app.function
@app.function(image=image, timeout=600, min_containers=1)
@modal.asgi_app()
def fastapi_app():
    return api
