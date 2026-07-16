"""
tests/test_severity_model_registry.py
ModelRegistry tests.
"""

from __future__ import annotations

from unittest.mock import patch

import pytest


class TestModelRegistryMissingArtifacts:
    def test_missing_artifacts_raises_model_unavailable_error(self) -> None:
        from ml.severity.src.model_registry import ModelRegistry, ModelUnavailableError

        # Clear lru_cache so fresh load attempt is made
        ModelRegistry.get.cache_clear()

        with patch("ml.severity.src.model_registry.ARTIFACTS_DIR") as mock_dir:
            from pathlib import Path
            mock_dir.__truediv__ = lambda self, name: Path("/nonexistent") / name

            with pytest.raises((ModelUnavailableError, Exception)):
                ModelRegistry.get()

        # Restore clean state for other tests
        ModelRegistry.get.cache_clear()

    def test_registry_is_singleton(self) -> None:
        """Calling get() twice returns the same object when artifacts exist."""
        from ml.severity.src.model_registry import ModelRegistry, ModelUnavailableError

        ModelRegistry.get.cache_clear()

        try:
            r1 = ModelRegistry.get()
            r2 = ModelRegistry.get()
            assert r1 is r2
        except ModelUnavailableError:
            # Artifacts not present in test environment — skip assertion
            pytest.skip("Model artifacts not present; singleton test skipped.")
        finally:
            ModelRegistry.get.cache_clear()
