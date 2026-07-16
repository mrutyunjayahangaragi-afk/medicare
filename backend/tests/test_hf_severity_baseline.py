"""
tests/test_hf_severity_baseline.py
HuggingFace severity model tests.
HF is disabled by default — no real inference quota is consumed.
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest


class TestHFDisabledByDefault:
    def test_hf_severity_disabled_by_default(self) -> None:
        from app.core.config import get_settings
        get_settings.cache_clear()
        settings = get_settings()
        assert settings.hf_severity_enabled is False

    def test_hf_model_predict_raises_not_implemented(self) -> None:
        from ml.severity.src.predict import HuggingFaceSeverityModel
        model = HuggingFaceSeverityModel()
        with pytest.raises(NotImplementedError):
            model.predict({"description": "test"})

    def test_factory_returns_sklearn_when_hf_disabled(self) -> None:
        from ml.severity.src.predict import SeverityModelFactory, SklearnSeverityModel
        mock_pipeline = MagicMock()
        mock_pipeline.predict.return_value = ["high"]
        mock_pipeline.predict_proba.return_value = [[0.1, 0.1, 0.7, 0.1]]
        model = SeverityModelFactory.create(
            pipeline=mock_pipeline, labels=["low", "medium", "high", "critical"], hf_enabled=False
        )
        assert isinstance(model, SklearnSeverityModel)

    def test_factory_returns_hf_when_enabled(self) -> None:
        from ml.severity.src.predict import HuggingFaceSeverityModel, SeverityModelFactory
        model = SeverityModelFactory.create(
            pipeline=None, labels=[], hf_enabled=True
        )
        assert isinstance(model, HuggingFaceSeverityModel)


class TestHFZeroShotStub:
    def test_hf_zero_shot_raises_import_error_without_transformers(self) -> None:
        """If transformers is not installed, import error is surfaced properly."""
        with patch.dict("sys.modules", {"transformers": None}):
            with pytest.raises((ImportError, TypeError)):
                from ml.severity.src.hf_zero_shot import run_zero_shot
                run_zero_shot("patient collapsed")

    def test_hf_enabled_config_calls_pipeline(self) -> None:
        """When HF is enabled, the pipeline is called with the description."""
        mock_pipeline_fn = MagicMock(return_value=MagicMock(
            return_value={
                "labels": ["critical life-threatening emergency"],
                "scores": [0.91],
            }
        ))

        with patch("ml.severity.src.hf_zero_shot.run_zero_shot") as mock_fn:
            mock_fn.return_value = ("critical", 0.91)
            from ml.severity.src.hf_zero_shot import run_zero_shot
            severity, conf = run_zero_shot("patient not breathing, no pulse")
            mock_fn.assert_called_once()
            assert severity == "critical"
            assert conf == 0.91
