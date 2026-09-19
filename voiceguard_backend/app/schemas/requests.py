from pydantic import BaseModel, Field
from typing import Optional, List

class PCMRequest(BaseModel):
    audio_base64: str = Field(..., description="Base64 encoded 16-bit PCM audio")
    dtype: str = Field(default="int16", description="int16 | float32")
    sample_rate: int = Field(default=16000)
    label: Optional[str] = None

class ContextRequest(BaseModel):
    transaction_amount: float = Field(default=0.0)
    new_beneficiary: bool = Field(default=False)
    urgency_indicator: float = Field(default=0.0, description="NLP derived urgency [0,1]")
    user_id: Optional[str] = None

class FileAnalyzeRequest(BaseModel):
    context: Optional[ContextRequest] = None
