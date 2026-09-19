import torch
import numpy as np
from app.config import settings

class AudioRingBuffer:
    """
    In-memory ring buffer for real-time PCM audio streams.
    Avoids disk I/O by managing a bytearray and converting directly to tensors.
    """
    def __init__(self):
        self.buffer = bytearray()
        self.window_bytes = settings.WINDOW_BYTES
        self.hop_bytes = settings.WINDOW_HOP_BYTES

    def append(self, data: bytes):
        """Append raw bytes from WebSocket stream."""
        self.buffer.extend(data)

    def get_window(self) -> torch.Tensor | None:
        """
        Extracts a window of size WINDOW_BYTES if available.
        Shifts the buffer forward by WINDOW_HOP_BYTES.
        Returns a torch.FloatTensor normalized to [-1.0, 1.0].
        """
        if len(self.buffer) < self.window_bytes:
            return None

        # Extract the window
        window_data = self.buffer[:self.window_bytes]

        # Shift buffer by hop size (50% overlap)
        del self.buffer[:self.hop_bytes]

        # Convert raw 16-bit PCM bytes to float32
        # PCM 16-bit is little-endian usually
        audio_np = np.frombuffer(window_data, dtype=np.int16).astype(np.float32)
        # Normalize to [-1.0, 1.0]
        audio_np /= 32768.0

        return torch.from_numpy(audio_np).float()

    def clear(self):
        self.buffer.clear()
