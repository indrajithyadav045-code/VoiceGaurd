import uuid
import hashlib
import time
from typing import Dict, Any

class AlertService:
    """
    3-tier triage dispatch: Agent HUD, Supervisor bridge, Fraud Ops SMS.
    """
    def __init__(self):
        self.fraud_ops_desk = "+91-FRAUD-OPS-DESK"

    def dispatch(self, risk_data: Dict[str, Any], event_metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Formulates alert payloads based on risk tier.
        """
        tier = risk_data["tier"]
        event_id = str(uuid.uuid4())
        timestamp = time.time()

        # Create tamper-evident hash
        payload_str = f"{event_id}|{timestamp}|{risk_data['risk_score']}"
        event_hash = hashlib.sha256(payload_str.encode()).hexdigest()

        alerts = []

        if tier == "MEDIUM":
            alerts.append({
                "target": "AGENT_HUD",
                "action": "POPUP_VERBAL_CHALLENGE",
                "message": "Risk Medium: Please perform manual identity verification."
            })

        elif tier == "CRITICAL":
            # Tier 2: Supervisor Bridge
            alerts.append({
                "target": "SUPERVISOR_BRIDGE",
                "action": "IN_APP_INTERCEPT",
                "message": "CRITICAL RISK: Supervisor intervention required immediately."
            })
            # Tier 3: Fraud Ops SMS
            alerts.append({
                "target": "FRAUD_OPS_SMS",
                "phone": self.fraud_ops_desk,
                "action": "TRANSACTION_FREEZE",
                "message": f"ALERT: Event {event_id} | Score: {risk_data['risk_score']}% | Hash: {event_hash[:8]}"
            })

        return {
            "event_id": event_id,
            "event_hash": event_hash,
            "dispatched_alerts": alerts,
            "status": "DISPATCHED" if alerts else "NO_ACTION"
        }

alert_service = AlertService()
