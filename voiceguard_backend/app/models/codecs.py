import torch
import torchaudio
from app.config import settings

class VoiceGuardCodecs:
    """
    Simulates PSTN/cellular degradation: 8kHz resampling & Mu-Law (G.711) transform.
    """
    def __init__(self):
        self.resampler_down = torchaudio.transforms.Resample(16000, 8000)
        self.resampler_up = torchaudio.transforms.Resample(8000, 16000)
        self.mulaw = torchaudio.transforms.MuLawEncoding()

    def apply_pstn_pipeline(self, audio: torch.Tensor) -> torch.Tensor:
        """
        Applies 16k -> 8k -> MuLaw -> 8k -> 16k pipeline.
        """
        # audio shape [samples]
        x = audio.unsqueeze(0) # [1, samples]

        # 1. Downsample to 8kHz
        x = self.resampler_down(x)

        # 2. Mu-Law Encoding (Simulate G.711)
        # Note: MuLawEncoding output is usually uint8. We cast back for the pipeline.
        x_encoded = self.mulaw(x)
        x_decoded = x_encoded.float() / 255.0 # Rough approximation of reconstruction

        # 3. Upsample back to 16kHz
        x = self.resampler_up(x_decoded)

        return x.squeeze(0)

codec_engine = VoiceGuardCodecs()
