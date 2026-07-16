from abc import ABC, abstractmethod

from app.schemas.assistant import AssistantGenerationRequest, AssistantGenerationResult


class AIProvider(ABC):
    @abstractmethod
    async def generate(self, request: AssistantGenerationRequest) -> AssistantGenerationResult:
        raise NotImplementedError
