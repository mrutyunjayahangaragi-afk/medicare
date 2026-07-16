import json
from pydantic import ValidationError

from app.schemas.assistant import AssistantStructuredResponse, AssistantIntent, AssistantUrgency
from app.ai.exceptions import OutputParsingError

ALLOWED_ASSISTANT_ROUTES = {
    "/dashboard/emergency",
    "/dashboard/requests",
    "/dashboard/nearby",
    "/dashboard/contacts",
    "/dashboard/profile",
    "/dashboard/settings",
    "/dashboard/messages",
    "/dashboard/notifications",
}


def parse_and_validate_output(raw_json: str) -> AssistantStructuredResponse:
    """Parses raw JSON from the provider and validates it against our schema and safety rules."""
    try:
        # Some providers might wrap json in markdown blocks, let's strip it if necessary
        clean_json = raw_json.strip()
        if clean_json.startswith("```json"):
            clean_json = clean_json[7:]
        if clean_json.endswith("```"):
            clean_json = clean_json[:-3]
            
        data = json.loads(clean_json.strip())
        response = AssistantStructuredResponse.model_validate(data)
        
        # Enforce route allowlist
        if response.suggested_route and response.suggested_route not in ALLOWED_ASSISTANT_ROUTES:
            response.suggested_route = None
            
        return response
    except (json.JSONDecodeError, ValidationError) as e:
        raise OutputParsingError(f"Failed to parse provider output: {str(e)}")


def get_parsing_fallback() -> AssistantStructuredResponse:
    """Deterministic fallback when the provider returns invalid JSON or fails parsing."""
    return AssistantStructuredResponse(
        intent=AssistantIntent.unknown,
        urgency=AssistantUrgency.moderate,
        answer=(
            "I'm unable to provide a reliable answer right now. Please use the emergency request "
            "option or contact a qualified professional if this is urgent."
        ),
        actions=[],
        suggested_route="/dashboard/emergency",
        should_show_sos=True,
        needs_professional_help=True,
        disclaimer="This assistant provides general information and does not replace professional medical care."
    )
