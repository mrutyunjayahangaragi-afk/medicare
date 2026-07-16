class AssistantError(Exception):
    """Base class for all assistant-related errors."""
    pass


class ProviderUnavailableError(AssistantError):
    """Raised when the configured provider is unreachable or times out."""
    pass


class ProviderRateLimitError(AssistantError):
    """Raised when the provider rate limits our requests."""
    pass


class SafetyPolicyViolationError(AssistantError):
    """Raised when the provider refuses to generate due to safety filters."""
    pass


class OutputParsingError(AssistantError):
    """Raised when the provider's output cannot be parsed into the required schema."""
    pass
