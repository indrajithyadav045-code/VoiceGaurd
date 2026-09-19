import numpy as np
import torch
from typing import Dict, List, Tuple

class VoiceGuardDiagnostics:
    """
    Performs physical signal forensics on raw audio tensors.
    """
    @staticmethod
    def calculate_snr(audio: torch.Tensor) -> float:
        """
        Estimates Signal-to-Noise Ratio using power spectral density.
        """
        signal_power = torch.mean(audio**2)
        # Estimate noise from the quietest 10% of the signal
        sorted_audio, _ = torch.sort(torch.abs(audio))
        noise_power = torch.mean(sorted_audio[:int(len(sorted_audio)*0.1)]**2)

        if noise_power == 0: return 100.0
        return 10.0 * torch.log10(signal_power / noise_power).item()

    @staticmethod
    def calculate_zcr(audio: torch.Tensor) -> float:
        """
        Zero Crossing Rate: average sign transitions per second.
        """
        # Count where sign changes
        crossings = torch.sum((audio[:-1] * audio[1:]) < 0).item()
        sample_rate = 16000
        return (crossings / len(audio)) * sample_rate

    @staticmethod
    def spectral_metrics(audio: torch.Tensor) -> Tuple[float, float]:
        """
        Calculates Spectral Centroid and Spectral Flatness.
        """
        # FFT
        fft = torch.abs(torch.fft.rfft(audio))
        freqs = torch.fft.rfftfreq(len(audio), 1/16000)

        # Centroid: sum(f * mag) / sum(mag)
        centroid = torch.sum(freqs * fft) / (torch.sum(fft) + 1e-12)

        # Flatness: Geometric Mean / Arithmetic Mean
        geom_mean = torch.exp(torch.mean(torch.log(fft + 1e-12)))
        arith_mean = torch.mean(fft)
        flatness = (geom_mean / (arith_mean + 1e-12)).item()

        return centroid.item(), flatness

    @staticmethod
    def clipping_ratio(audio: torch.Tensor) -> float:
        """
        Proportion of samples hitting absolute value >= 0.99.
        """
        clipped = torch.sum(torch.abs(audio) >= 0.99).item()
        return (clipped / len(audio)) * 100.0

    def run_forensics(self, audio: torch.Tensor) -> Dict:
        """
        Executes all diagnostics and generates anomaly tags.
        """
        snr = self.calculate_snr(audio)
        zcr = self.calculate_zcr(audio)
        centroid, flatness = self.spectral_metrics(audio)
        clipping = self.clipping_ratio(audio)

        tags = []
        if clipping > 1.0: tags.append("HIGH_SIGNAL_CLIPPING")
        if flatness > 0.5: tags.append("ABNORMAL_UPPER_BAND_ENERGY")
        if flatness < 0.01: tags.append("SYNTHETIC_OVER_SMOOTHING")

        return {
            "snr": snr,
            "zcr": zcr,
            "spectral_centroid": centroid,
            "spectral_flatness": flatness,
            "clipping_ratio": clipping,
            "forensic_tags": tags
        }

diagnostics = VoiceGuardDiagnostics()
