from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class ForensicReport(BaseModel):
    snr: float
    zcr: float
    spectral_centroid: float
    spectral_flatness: float
    clipping_ratio: float
    forensic_tags: List[str]

class AnalysisResponse(BaseModel):
    p_synth: float
    attribution: str
    confidence: float
    forensics: ForensicReport
    risk_score: float
    tier: str
    kill_switch_active: bool
    # Fix: was List[str] but alert_service.dispatch() returns List[Dict] — caused Pydantic
    # validation error on EVERY request, making risk_score never reach the frontend
    alerts: List[Dict[str, Any]]
    event_id: str
    inference_ms: Optional[float] = None  # Added: frontend reads this for latency display

class HealthResponse(BaseModel):
    status: str
    device: str
    model_repo: str
    version: str
