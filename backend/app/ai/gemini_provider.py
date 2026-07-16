import asyncio
import time

from google import genai
from google.genai import types
from google.genai.errors import APIError

from app.ai.base import AIProvider
from app.ai.exceptions import ProviderUnavailableError, SafetyPolicyViolationError
from app.ai.output_parser import parse_and_validate_output
from app.core.config import get_settings
from app.schemas.assistant import AssistantGenerationRequest, AssistantGenerationResult, AssistantStructuredResponse


class GeminiProvider(AIProvider):
    def __init__(self) -> None:
        settings = get_settings()
        if not settings.gemini_api_key:
            raise ValueError("GEMINI_API_KEY is not configured.")
        
        # We set http_options timeout inside the client
        self.client = genai.Client(api_key=settings.gemini_api_key)
        self.model = settings.gemini_model

    async def generate(self, request: AssistantGenerationRequest) -> AssistantGenerationResult:
        start_time = time.time()
        
        # Convert messages to Gemini format
        contents = []
        for msg in request.messages:
            # Gemini expects roles to be "user" or "model"
            role = "user" if msg["role"] == "user" else "model"
            contents.append(
                types.Content(
                    role=role,
                    parts=[types.Part.from_text(text=msg["content"])]
                )
            )

        config = types.GenerateContentConfig(
            system_instruction=request.system_instruction,
            temperature=request.temperature,
            response_mime_type="application/json",
            # Add structured schema if supported, but asking for JSON and giving schema in prompt also works.
            # Using Pydantic schema in response_schema
            response_schema=AssistantStructuredResponse.model_json_schema()
        )

        try:
            # Generate response asynchronously
            # If the library doesn't expose async natively on models, we run in thread pool
            # google-genai 2.11.0 supports async via client.aio.models.generate_content
            response = await self.client.aio.models.generate_content(
                model=self.model,
                contents=contents,
                config=config,
            )
            
            # Check for safety blocks
            if response.candidates and response.candidates[0].finish_reason == "SAFETY":
                raise SafetyPolicyViolationError("Gemini blocked the response due to safety filters.")
                
            raw_text = response.text
            if not raw_text:
                raise ProviderUnavailableError("Gemini returned an empty response.")
                
            # Parse output
            structured = parse_and_validate_output(raw_text)
            
            latency = int((time.time() - start_time) * 1000)
            
            # Estimate characters as proxy for tokens if metadata missing
            in_chars = sum(len(m["content"]) for m in request.messages) + len(request.system_instruction)
            out_chars = len(raw_text)
            
            return AssistantGenerationResult(
                provider="gemini",
                model=self.model,
                structured_response=structured,
                input_characters=in_chars,
                output_characters=out_chars,
                latency_ms=latency
            )
            
        except APIError as e:
            raise ProviderUnavailableError(f"Gemini API error: {str(e)}")
        except asyncio.TimeoutError:
            raise ProviderUnavailableError("Gemini request timed out.")
        except SafetyPolicyViolationError:
            raise
        except Exception as e:
            # Wrap unexpected errors
            if "safety" in str(e).lower() or "block" in str(e).lower():
                raise SafetyPolicyViolationError(f"Safety violation: {str(e)}")
            raise ProviderUnavailableError(f"Unexpected provider error: {str(e)}")
