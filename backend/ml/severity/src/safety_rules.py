"""
ml/severity/src/safety_rules.py
Deterministic safety override engine — version safety-v1.

Rules ONLY RAISE severity, never lower it.
This ensures ML cannot under-triage life-threatening presentations.

Integer rank ordering:  low=0  medium=1  high=2  critical=3
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

# ── Severity rank ─────────────────────────────────────────────────────────

SEVERITY_RANK: dict[str, int] = {
    "low": 0,
    "medium": 1,
    "high": 2,
    "critical": 3,
}

RANK_SEVERITY: dict[int, str] = {v: k for k, v in SEVERITY_RANK.items()}


@dataclass
class SafetyOverrideResult:
    final_severity: str
    override_applied: bool
    override_reason: str | None


# ── Rule definitions — version safety-v1 ─────────────────────────────────
# Each entry: (condition_fn, minimum_severity, human_reason)
# condition_fn receives a dict of normalised indicator values.

def _rules() -> list[tuple[Any, str, str]]:
    return [
        # ── Critical floor rules ────────────────────────────────────────
        (
            lambda i: bool(i.get("severe_breathing_difficulty")),
            "critical",
            "Severe breathing difficulty detected — immediate life threat.",
        ),
        (
            lambda i: (
                bool(i.get("conscious"))  # True = person IS unconscious
                and bool(i.get("breathing_difficulty"))
            ),
            "critical",
            "Unconscious with breathing difficulty — critical combination.",
        ),
        (
            lambda i: i.get("bleeding_level") == "severe",
            "critical",
            "Severe bleeding — uncontrolled haemorrhage risk.",
        ),
        (
            lambda i: i.get("burn_level") == "severe",
            "critical",
            "Severe burns — major tissue damage or airway involvement.",
        ),
        (
            lambda i: (
                bool(i.get("major_accident"))
                and bool(i.get("conscious"))  # True = person IS unconscious
            ),
            "critical",
            "Major accident with loss of consciousness — critical trauma.",
        ),
        (
            lambda i: (
                bool(i.get("allergic_reaction"))
                and bool(i.get("severe_breathing_difficulty"))
            ),
            "critical",
            "Allergic reaction with severe breathing difficulty — anaphylaxis risk.",
        ),
        # ── High floor rules ─────────────────────────────────────────────
        (
            lambda i: bool(i.get("stroke_signs")),
            "high",
            "Stroke signs present — time-sensitive neurological emergency.",
        ),
        (
            lambda i: bool(i.get("seizure")),
            "high",
            "Seizure reported — requires urgent medical assessment.",
        ),
        (
            lambda i: bool(i.get("chest_pain")),
            "high",
            "Chest pain — possible cardiac event.",
        ),
        (
            lambda i: bool(i.get("major_accident")),
            "high",
            "Major accident — high injury probability.",
        ),
        (
            lambda i: bool(i.get("violence_risk")),
            "high",
            "Violence risk — personal safety concern.",
        ),
        (
            lambda i: bool(i.get("pregnancy_emergency")),
            "high",
            "Pregnancy emergency — maternal and foetal risk.",
        ),
        (
            lambda i: i.get("burn_level") == "moderate",
            "high",
            "Moderate burns — significant tissue damage.",
        ),
    ]


def apply_safety_rules(
    ml_severity: str,
    indicators: dict[str, Any],
) -> SafetyOverrideResult:
    """Apply deterministic safety overrides to the ML-predicted severity.

    Returns a SafetyOverrideResult with:
      - final_severity  — the guaranteed-safe severity (≥ ml_severity)
      - override_applied — True if any rule raised the severity
      - override_reason  — human-readable reason for the first triggered override
    """
    current_rank = SEVERITY_RANK.get(ml_severity, 0)
    floor_rank = current_rank
    floor_reason: str | None = None

    for condition_fn, minimum_sev, reason in _rules():
        min_rank = SEVERITY_RANK[minimum_sev]
        if min_rank > floor_rank:
            try:
                if condition_fn(indicators):
                    floor_rank = min_rank
                    floor_reason = reason
            except Exception:
                pass  # Malformed indicator value — skip rule safely

    final_severity = RANK_SEVERITY[floor_rank]
    override_applied = floor_rank > current_rank

    return SafetyOverrideResult(
        final_severity=final_severity,
        override_applied=override_applied,
        override_reason=floor_reason if override_applied else None,
    )
