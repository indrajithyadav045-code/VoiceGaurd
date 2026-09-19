from pydantic_settings import BaseSettings
from typing import Dict

class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "VoiceGuard"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Model Configuration
    MODEL_REPOSITORY: str = "indrajit4533/voiceguard"
    SAMPLE_RATE: int = 16000
    WINDOW_DURATION_SEC: float = 1.5
    # 16000 * 1.5 = 24000 samples.
    # 16-bit PCM = 2 bytes per sample.
    WINDOW_SAMPLES: int = 24000
    WINDOW_BYTES: int = 48000
    WINDOW_HOP_BYTES: int = 24000  # 50% overlap

    # Risk Engine Thresholds
    KILL_SWITCH_CUTOFF: float = 75.0

    # AM-Softmax Hyperparameters
    AM_SOFTMAX_S: float = 30.0
    AM_SOFTMAX_M: float = 0.35
    AM_SOFTMAX_T: float = 1.2

    # Weight Factors for composite risk score
    WEIGHTS: Dict[str, float] = {
        "w_synth": 0.35,
        "w_speaker": 0.25,
        "w_replay": 0.15,
        "w_context": 0.15,
        "w_behavior": 0.10
    }

    # API Settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
