from typing import Literal

from pydantic import BaseModel

from app.schemas.assistant import AssistantIntent, AssistantStructuredResponse, AssistantUrgency


class SafetyAssessment(BaseModel):
    immediate_risk: bool
    prohibited_medical_request: bool
    prompt_injection_detected: bool
    category: str


# Deterministic keyword lists for immediate risk
IMMEDIATE_RISK_KEYWORDS = [
    "bleed", "breathing", "breathe", "can't breathe", "choking", "chest pain",
    "unconscious", "stroke", "seizure", "burn", "poison", "heart attack", "shoot", "gun", "knife", "stabbing",
    "suicide", "kill myself"
]

PROHIBITED_MEDICAL_KEYWORDS = [
    "dosage", "dose", "mg", "pill", "prescribe", "prescription", "diagnose", "diagnosis", "what disease"
]

PROMPT_INJECTION_KEYWORDS = [
    "ignore previous instructions", "system prompt", "reveal", "bypass"
]


def assess_safety(text: str) -> SafetyAssessment:
    """Deterministic preprocessor to evaluate text for safety risks."""
    text_lower = text.lower()
    
    immediate_risk = any(kw in text_lower for kw in IMMEDIATE_RISK_KEYWORDS)
    prohibited_medical = any(kw in text_lower for kw in PROHIBITED_MEDICAL_KEYWORDS)
    prompt_injection = any(kw in text_lower for kw in PROMPT_INJECTION_KEYWORDS)
    
    if immediate_risk:
        category = "immediate_risk"
    elif prompt_injection:
        category = "prompt_injection"
    elif prohibited_medical:
        category = "prohibited_medical"
    else:
        category = "safe"
        
    return SafetyAssessment(
        immediate_risk=immediate_risk,
        prohibited_medical_request=prohibited_medical,
        prompt_injection_detected=prompt_injection,
        category=category
    )


def get_critical_fallback() -> AssistantStructuredResponse:
    """Returns a deterministic response for immediate life-threatening situations."""
    return AssistantStructuredResponse(
        intent=AssistantIntent.emergency_guidance,
        urgency=AssistantUrgency.critical,
        answer=(
            "This sounds like a critical medical emergency. Please call your local emergency services immediately "
            "and submit an SOS request through the application. Do not wait for an AI response."
        ),
        actions=[
            "Call local emergency services (e.g., 911, 112).",
            "Use the SOS button to alert nearby responders if possible.",
            "Stay as calm as possible and do not attempt treatments you are not trained for."
        ],
        suggested_route="/dashboard/emergency",
        should_show_sos=True,
        needs_professional_help=True,
        disclaimer="This assistant provides general information and does not replace professional medical care."
    )
