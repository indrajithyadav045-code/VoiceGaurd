from app.config import settings
from typing import Dict, Any

class RiskEngine:
    """
    Dynamic multi-modal risk scoring (0-100) & 75% Kill-Switch trigger.
    """
    def __init__(self):
        self.weights = settings.WEIGHTS
        self.cutoff = settings.KILL_SWITCH_CUTOFF

    def compute_score(self,
                     p_synth: float,
                     s_speaker: float,
                     p_replay: float,
                     s_context: float,
                     s_behavior: float) -> Dict[str, Any]:
        """
        Score = 100 * (w_synth * P_synth + w_speaker * (1 - S_speaker) +
                       w_replay * P_replay + w_context * S_context + w_behavior * S_behavior)
        """
        # Weights from config
        w = self.weights

        composite_score = 100 * (
            w["w_synth"] * p_synth +
            w["w_speaker"] * (1.0 - s_speaker) +
            w["w_replay"] * p_replay +
            w["w_context"] * s_context +
            w["w_behavior"] * s_behavior
        )

        composite_score = max(0.0, min(100.0, composite_score))

        # Evaluate Kill-Switch
        kill_switch_active = (composite_score >= self.cutoff) or (p_synth >= 0.75)

        # Map Tiers
        tier = "LOW"
        if composite_score > 70 or kill_switch_active:
            tier = "CRITICAL"
        elif composite_score > 30:
            tier = "MEDIUM"

        return {
            "risk_score": round(composite_score, 2),
            "tier": tier,
            "kill_switch_active": kill_switch_active,
            "breakdown": {
                "synthetic_component": w["w_synth"] * p_synth,
                "speaker_component": w["w_speaker"] * (1.0 - s_speaker),
                "replay_component": w["w_replay"] * p_replay,
                "context_component": w["w_context"] * s_context,
                "behavior_component": w["w_behavior"] * s_behavior,
            }
        }

risk_engine = RiskEngine()
