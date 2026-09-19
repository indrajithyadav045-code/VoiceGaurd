import torch
import torch.nn.functional as F
from typing import List

class SpeakerVerifier:
    """
    Handles 256-dim L2-normalized vector similarity against enrolled profiles.
    """
    def __init__(self):
        # Mock database of enrolled profiles { "user_id": embedding_tensor }
        self.profiles = {}

    def enroll(self, user_id: str, embedding: torch.Tensor):
        """Enroll a speaker embedding."""
        norm_emb = F.normalize(embedding, p=2, dim=0)
        self.profiles[user_id] = norm_emb

    def verify(self, user_id: str, current_embedding: torch.Tensor) -> float:
        """
        Calculates Cosine Similarity against enrolled profile.
        Returns score in range [0, 1].
        """
        if user_id not in self.profiles:
            return 0.5 # Neutral score if not enrolled

        target = self.profiles[user_id]
        current = F.normalize(current_embedding, p=2, dim=0)

        similarity = torch.dot(target, current).item()
        return max(0.0, min(1.0, similarity))

speaker_service = SpeakerVerifier()
