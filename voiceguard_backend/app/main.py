import io
import asyncio
import time
import torch  # Fix: was missing — torch.mean() and torch.from_numpy() used below
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.core.device import device
from app.core.audio import AudioRingBuffer
from app.models.loader import loader
from app.models.inference import inference_engine
from app.models.diagnostics import diagnostics
from app.models.codecs import codec_engine
from app.services.speaker import speaker_service
from app.services.risk_engine import risk_engine
from app.services.alert_service import alert_service
from app.schemas.requests import ContextRequest
from app.schemas.responses import AnalysisResponse, HealthResponse, ForensicReport  # Fix: ForensicReport was used in analyze_file but not imported

app = FastAPI(title="VoiceGuard Production Backend", version=settings.APP_VERSION)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    # Load the model into memory at startup
    loader.load()

@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(
        status="healthy",
        device=str(device),
        model_repo=settings.MODEL_REPOSITORY,
        version=settings.APP_VERSION
    )

@app.post("/api/v1/analyze-file")
async def analyze_file(
    file: UploadFile = File(...),
    transaction_amount: float = Form(0.0),
    new_beneficiary: bool = Form(False),
    urgency: float = Form(0.0),
    user_id: str = Form("unknown")
):
    """
    Complete file-based forensic analysis.
    """
    try:
        # 1. Ingest via BytesIO
        content = await file.read()
        audio_bytes = io.BytesIO(content)

        # Use torchaudio to load for file support
        import torchaudio
        waveform, sample_rate = torchaudio.load(audio_bytes)

        # Resample to 16kHz
        if sample_rate != settings.SAMPLE_RATE:
            resampler = torchaudio.transforms.Resample(sample_rate, settings.SAMPLE_RATE)
            waveform = resampler(waveform)

        # Mono conversion
        if waveform.shape[0] > 1:
            waveform = torch.mean(waveform, dim=0, keepdim=True)

        audio_tensor = waveform.squeeze(0)

        # 2. Full Diagnostics
        forensics = diagnostics.run_forensics(audio_tensor)

        # 3. PSTN Resilience Delta
        # Run inference on original vs simulated PSTN
        pstn_audio = codec_engine.apply_pstn_pipeline(audio_tensor)

        t_start = time.time()
        res_orig = inference_engine.predict(audio_tensor)
        res_pstn = inference_engine.predict(pstn_audio)
        inference_ms = round((time.time() - t_start) * 1000, 1)

        # We use the more conservative (higher) threat score for the final risk
        final_p_synth = max(res_orig["p_synth"], res_pstn["p_synth"])
        final_attribution = res_orig["attribution"]
        final_conf = res_orig["confidence"]
        final_emb = res_orig["embedding"]

        # 4. Speaker Verification
        s_speaker = speaker_service.verify(user_id, torch.from_numpy(final_emb).to(device))

        # 5. Dynamic Risk Scoring
        # Map context to risk factors
        s_context = 0.5
        if new_beneficiary: s_context += 0.3
        if transaction_amount > 10000: s_context += 0.2

        risk_data = risk_engine.compute_score(
            p_synth=final_p_synth,
            s_speaker=s_speaker,
            p_replay=0.1, # Default replay risk if not calculated
            s_context=min(1.0, s_context),
            s_behavior=urgency
        )

        # 6. Alert Dispatch
        alert_data = alert_service.dispatch(
            risk_data,
            {"user_id": user_id, "filename": file.filename}
        )

        return AnalysisResponse(
            p_synth=final_p_synth,
            attribution=final_attribution,
            confidence=final_conf,
            forensics=ForensicReport(**forensics),
            risk_score=risk_data["risk_score"],
            tier=risk_data["tier"],
            kill_switch_active=risk_data["kill_switch_active"],
            alerts=alert_data["dispatched_alerts"],
            event_id=alert_data["event_id"],
            inference_ms=inference_ms
        )

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Analysis failed: {str(e)}")

@app.websocket("/ws/stream")
async def websocket_endpoint(websocket: WebSocket):
    """
    Real-time PCM streaming analysis via sliding windows.
    """
    await websocket.accept()
    ring_buffer = AudioRingBuffer()
    current_context = {"urgency": 0.0, "user_id": "unknown"}

    try:
        while True:
            message = await websocket.receive()

            if "bytes" in message:
                # Append raw PCM bytes
                ring_buffer.append(message["bytes"])

                # Try to extract a window
                audio_tensor = ring_buffer.get_window()
                if audio_tensor is not None:
                    # Perform inference
                    res = inference_engine.predict(audio_tensor)

                    # DEBUG: Print the results to the console to see if they change
                    print(f"[STREAM] P_Synth: {res['p_synth']:.4f} | Attr: {res['attribution']}")

                    # Risk calculation
                    p_synth = res["p_synth"]
                    risk_score = p_synth * 100.0
                    tier = "CRITICAL" if risk_score >= 75 else ("MEDIUM" if risk_score >= 30 else "LOW")

                    # Dispatch alerts if critical
                    alerts = []
                    if tier == "CRITICAL":
                        alert_res = alert_service.dispatch(
                            {"tier": tier, "risk_score": risk_score},
                            {"stream": True}
                        )
                        alerts = alert_res["dispatched_alerts"]

                    await websocket.send_json({
                        "p_synth": p_synth,
                        "attribution": res["attribution"],
                        "confidence": res["confidence"],
                        "risk_score": round(risk_score, 2),
                        "tier": tier,
                        "kill_switch_active": risk_score >= 75,
                        "alerts": alerts
                    })


            elif "text" in message:
                # Handle context updates
                import json
                try:
                    data = json.loads(message["text"])
                    if data.get("cmd") == "UPDATE_CONTEXT":
                        current_context.update(data.get("params", {}))
                except:
                    pass

    except WebSocketDisconnect:
        print("WebSocket client disconnected.")
    except Exception as e:
        print(f"WebSocket error: {e}")
        await websocket.close()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.HOST, port=settings.PORT)
