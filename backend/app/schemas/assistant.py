from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class AssistantIntent(str, Enum):
    emergency_guidance = "emergency_guidance"
    first_aid_information = "first_aid_information"
    application_help = "application_help"
    nearby_services_help = "nearby_services_help"
    request_status_help = "request_status_help"
    responder_tracking_help = "responder_tracking_help"
    profile_help = "profile_help"
    general_health_information = "general_health_information"
    unsafe_medical_request = "unsafe_medical_request"
    self_harm_or_violence = "self_harm_or_violence"
    unknown = "unknown"


class AssistantUrgency(str, Enum):
    routine = "routine"
    moderate = "moderate"
    urgent = "urgent"
    critical = "critical"


class AssistantStructuredResponse(BaseModel):
    intent: AssistantIntent
    urgency: AssistantUrgency
    answer: str
    actions: list[str]
    suggested_route: str | None = None
    should_show_sos: bool = False
    needs_professional_help: bool = False
    disclaimer: str


class AssistantChatRequest(BaseModel):
    message: str = Field(..., min_length=2, max_length=4000)
    conversation_id: UUID | None = None
    request_id: UUID | None = None
    include_request_context: bool = False
    language: str | None = None

    model_config = ConfigDict(extra="forbid")


class AssistantChatResponse(BaseModel):
    conversation_id: UUID
    message_id: UUID
    provider: str  # gemini | huggingface | fallback | deterministic
    model: str | None
    intent: AssistantIntent
    urgency: AssistantUrgency
    answer: str
    actions: list[str]
    suggested_route: str | None
    should_show_sos: bool
    needs_professional_help: bool
    disclaimer: str
    created_at: datetime


class AssistantGenerationRequest(BaseModel):
    system_instruction: str
    messages: list[dict[str, str]]  # list of {"role": "user"|"assistant", "content": "..."}
    timeout: int
    temperature: float


class AssistantGenerationResult(BaseModel):
    provider: str
    model: str | None
    structured_response: AssistantStructuredResponse
    input_characters: int = 0
    output_characters: int = 0
    latency_ms: int = 0
