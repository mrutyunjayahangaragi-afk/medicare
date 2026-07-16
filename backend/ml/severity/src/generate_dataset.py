"""
ml/severity/src/generate_dataset.py
Generates a synthetic 1 200-row training dataset for the severity prediction model.

IMPORTANT:
  SYNTHETIC_DATA = True
  These examples are template-based, hand-reviewed illustrations.
  They carry NO clinical validity and must not be used for real medical decisions.
  A qualified reviewer must inspect the CSV before training on production data.

Usage:
  python ml/severity/src/generate_dataset.py
  python ml/severity/src/generate_dataset.py --output path/to/output.csv
"""

from __future__ import annotations

SYNTHETIC_DATA = True  # Must always be True — never set to False

import argparse
import random
from pathlib import Path

# ── Templates ─────────────────────────────────────────────────────────────

_TEMPLATES: list[dict] = [
    # ── LOW severity ───────────────────────────────────────────────────────
    {
        "severity": "low", "emergency_type": "medical",
        "description": "Minor cut on finger while cooking. Small amount of bleeding, alert and responsive.",
        "age_group": "adult", "conscious": True, "breathing_difficulty": False,
        "severe_breathing_difficulty": False, "bleeding_level": "minor",
        "burn_level": "none", "chest_pain": False, "seizure": False,
        "stroke_signs": False, "allergic_reaction": False,
        "pregnancy_emergency": False, "major_accident": False, "violence_risk": False,
    },
    {
        "severity": "low", "emergency_type": "other",
        "description": "Mild headache for a few hours, no fever or vomiting.",
        "age_group": "adult", "conscious": True, "breathing_difficulty": False,
        "severe_breathing_difficulty": False, "bleeding_level": "none",
        "burn_level": "none", "chest_pain": False, "seizure": False,
        "stroke_signs": False, "allergic_reaction": False,
        "pregnancy_emergency": False, "major_accident": False, "violence_risk": False,
    },
    {
        "severity": "low", "emergency_type": "medical",
        "description": "Twisted ankle during a walk. Mild swelling but able to stand.",
        "age_group": "adult", "conscious": True, "breathing_difficulty": False,
        "severe_breathing_difficulty": False, "bleeding_level": "none",
        "burn_level": "none", "chest_pain": False, "seizure": False,
        "stroke_signs": False, "allergic_reaction": False,
        "pregnancy_emergency": False, "major_accident": False, "violence_risk": False,
    },
    {
        "severity": "low", "emergency_type": "other",
        "description": "Mild nausea after eating. No vomiting, fully conscious.",
        "age_group": "senior", "conscious": True, "breathing_difficulty": False,
        "severe_breathing_difficulty": False, "bleeding_level": "none",
        "burn_level": "none", "chest_pain": False, "seizure": False,
        "stroke_signs": False, "allergic_reaction": False,
        "pregnancy_emergency": False, "major_accident": False, "violence_risk": False,
    },
    # ── MEDIUM severity ────────────────────────────────────────────────────
    {
        "severity": "medium", "emergency_type": "medical",
        "description": "High fever 40°C for two days, unable to reduce with medication.",
        "age_group": "child", "conscious": True, "breathing_difficulty": False,
        "severe_breathing_difficulty": False, "bleeding_level": "none",
        "burn_level": "none", "chest_pain": False, "seizure": False,
        "stroke_signs": False, "allergic_reaction": False,
        "pregnancy_emergency": False, "major_accident": False, "violence_risk": False,
    },
    {
        "severity": "medium", "emergency_type": "accident",
        "description": "Minor vehicle collision, driver has neck pain and is alert.",
        "age_group": "adult", "conscious": True, "breathing_difficulty": False,
        "severe_breathing_difficulty": False, "bleeding_level": "minor",
        "burn_level": "none", "chest_pain": False, "seizure": False,
        "stroke_signs": False, "allergic_reaction": False,
        "pregnancy_emergency": False, "major_accident": False, "violence_risk": False,
    },
    {
        "severity": "medium", "emergency_type": "fire",
        "description": "Small kitchen fire extinguished. Minor smoke inhalation, coughing.",
        "age_group": "adult", "conscious": True, "breathing_difficulty": True,
        "severe_breathing_difficulty": False, "bleeding_level": "none",
        "burn_level": "minor", "chest_pain": False, "seizure": False,
        "stroke_signs": False, "allergic_reaction": False,
        "pregnancy_emergency": False, "major_accident": False, "violence_risk": False,
    },
    {
        "severity": "medium", "emergency_type": "elder_care",
        "description": "Elderly person fell from bed. Complains of hip pain, conscious.",
        "age_group": "senior", "conscious": True, "breathing_difficulty": False,
        "severe_breathing_difficulty": False, "bleeding_level": "none",
        "burn_level": "none", "chest_pain": False, "seizure": False,
        "stroke_signs": False, "allergic_reaction": False,
        "pregnancy_emergency": False, "major_accident": False, "violence_risk": False,
    },
    # ── HIGH severity ──────────────────────────────────────────────────────
    {
        "severity": "high", "emergency_type": "medical",
        "description": "Patient reporting severe chest pain radiating to left arm. Conscious but distressed.",
        "age_group": "senior", "conscious": True, "breathing_difficulty": True,
        "severe_breathing_difficulty": False, "bleeding_level": "none",
        "burn_level": "none", "chest_pain": True, "seizure": False,
        "stroke_signs": False, "allergic_reaction": False,
        "pregnancy_emergency": False, "major_accident": False, "violence_risk": False,
    },
    {
        "severity": "high", "emergency_type": "accident",
        "description": "Major motorcycle accident, rider conscious but pinned under vehicle. Suspected fractures.",
        "age_group": "adult", "conscious": True, "breathing_difficulty": False,
        "severe_breathing_difficulty": False, "bleeding_level": "moderate",
        "burn_level": "none", "chest_pain": False, "seizure": False,
        "stroke_signs": False, "allergic_reaction": False,
        "pregnancy_emergency": False, "major_accident": True, "violence_risk": False,
    },
    {
        "severity": "high", "emergency_type": "medical",
        "description": "Sudden onset facial drooping, slurred speech, arm weakness — possible stroke.",
        "age_group": "senior", "conscious": True, "breathing_difficulty": False,
        "severe_breathing_difficulty": False, "bleeding_level": "none",
        "burn_level": "none", "chest_pain": False, "seizure": False,
        "stroke_signs": True, "allergic_reaction": False,
        "pregnancy_emergency": False, "major_accident": False, "violence_risk": False,
    },
    {
        "severity": "high", "emergency_type": "medical",
        "description": "Seizure episode lasting 3 minutes. Patient now confused but breathing.",
        "age_group": "adult", "conscious": True, "breathing_difficulty": False,
        "severe_breathing_difficulty": False, "bleeding_level": "none",
        "burn_level": "none", "chest_pain": False, "seizure": True,
        "stroke_signs": False, "allergic_reaction": False,
        "pregnancy_emergency": False, "major_accident": False, "violence_risk": False,
    },
    {
        "severity": "high", "emergency_type": "fire",
        "description": "Moderate burns on both arms from gas explosion. In pain, conscious.",
        "age_group": "adult", "conscious": True, "breathing_difficulty": False,
        "severe_breathing_difficulty": False, "bleeding_level": "none",
        "burn_level": "moderate", "chest_pain": False, "seizure": False,
        "stroke_signs": False, "allergic_reaction": False,
        "pregnancy_emergency": False, "major_accident": False, "violence_risk": False,
    },
    # ── CRITICAL severity ──────────────────────────────────────────────────
    {
        "severity": "critical", "emergency_type": "medical",
        "description": "Person collapsed, not breathing, no pulse. Bystander performing CPR.",
        "age_group": "adult", "conscious": False, "breathing_difficulty": True,
        "severe_breathing_difficulty": True, "bleeding_level": "none",
        "burn_level": "none", "chest_pain": False, "seizure": False,
        "stroke_signs": False, "allergic_reaction": False,
        "pregnancy_emergency": False, "major_accident": False, "violence_risk": False,
    },
    {
        "severity": "critical", "emergency_type": "accident",
        "description": "Severe head trauma from high-speed collision, unconscious, heavy bleeding.",
        "age_group": "adult", "conscious": False, "breathing_difficulty": True,
        "severe_breathing_difficulty": True, "bleeding_level": "severe",
        "burn_level": "none", "chest_pain": False, "seizure": False,
        "stroke_signs": False, "allergic_reaction": False,
        "pregnancy_emergency": False, "major_accident": True, "violence_risk": False,
    },
    {
        "severity": "critical", "emergency_type": "fire",
        "description": "Full body severe burns, patient unconscious, severe breathing difficulty.",
        "age_group": "adult", "conscious": False, "breathing_difficulty": True,
        "severe_breathing_difficulty": True, "bleeding_level": "none",
        "burn_level": "severe", "chest_pain": False, "seizure": False,
        "stroke_signs": False, "allergic_reaction": False,
        "pregnancy_emergency": False, "major_accident": False, "violence_risk": False,
    },
    {
        "severity": "critical", "emergency_type": "medical",
        "description": "Allergic reaction with throat swelling, severe difficulty breathing, near fainting.",
        "age_group": "adult", "conscious": True, "breathing_difficulty": True,
        "severe_breathing_difficulty": True, "bleeding_level": "none",
        "burn_level": "none", "chest_pain": False, "seizure": False,
        "stroke_signs": False, "allergic_reaction": True,
        "pregnancy_emergency": False, "major_accident": False, "violence_risk": False,
    },
]

# ── Variations to expand templates to 1 200 rows ─────────────────────────

_LOW_VARIATIONS = [
    "Minor bruise on knee after a fall. Alert.",
    "Slight dizziness after standing up quickly. No other symptoms.",
    "Small burn from steam on hand. Mild redness.",
    "Mild sore throat, no fever, able to eat normally.",
    "Insect bite with local redness. No swelling of lips or throat.",
]

_MEDIUM_VARIATIONS = [
    "Patient with moderate abdominal pain for 4 hours, no bleeding, conscious.",
    "Deep laceration requiring stitches. Bleeding controlled with pressure.",
    "Moderate smoke inhalation, coughing, slightly short of breath but conscious.",
    "Broken wrist from a fall. In pain but stable, no bleeding.",
    "Diabetic patient with blood sugar 350, weak but responsive.",
]

_HIGH_VARIATIONS = [
    "Severe abdominal pain radiating to back, possible internal bleeding.",
    "Major fall from scaffold, conscious, possible spinal injury.",
    "Adult male, sudden weakness in arm and leg, slurred speech.",
    "Pregnancy with heavy bleeding at 30 weeks, conscious.",
    "Knife wound to shoulder, bleeding controlled but significant.",
]

_CRITICAL_VARIATIONS = [
    "Person submerged in water, rescued, not breathing, pale.",
    "Gunshot wound to chest, unconscious, critical blood loss.",
    "Electrocution victim unresponsive, severe burns at contact points.",
    "Newborn not breathing after delivery, emergency resuscitation needed.",
    "Drug overdose, completely unresponsive, laboured breathing.",
]


def _make_row(template: dict, description_override: str | None = None) -> dict:
    row = template.copy()
    if description_override:
        row["description"] = description_override
    # Add minor noise to boolean fields for variety
    if random.random() < 0.05:
        noise_field = random.choice(["breathing_difficulty"])
        row[noise_field] = not row[noise_field]
    return row


def generate_dataset(n_target: int = 1200, seed: int = 42) -> list[dict]:
    """Generate n_target synthetic rows.

    Distribution target:
        low: 20%  medium: 30%  high: 30%  critical: 20%
    """
    random.seed(seed)
    rows: list[dict] = []

    severity_templates = {sev: [t for t in _TEMPLATES if t["severity"] == sev] for sev in ["low", "medium", "high", "critical"]}
    severity_variations = {
        "low": _LOW_VARIATIONS,
        "medium": _MEDIUM_VARIATIONS,
        "high": _HIGH_VARIATIONS,
        "critical": _CRITICAL_VARIATIONS,
    }
    target_counts = {
        "low": int(n_target * 0.20),
        "medium": int(n_target * 0.30),
        "high": int(n_target * 0.30),
        "critical": int(n_target * 0.20),
    }

    for severity, count in target_counts.items():
        templates = severity_templates[severity]
        variations = severity_variations[severity]
        all_descriptions = [t["description"] for t in templates] + variations

        for i in range(count):
            base = random.choice(templates)
            desc = random.choice(all_descriptions)
            # Append minor variation suffix occasionally
            if random.random() < 0.3:
                suffix = random.choice([
                    " Situation ongoing.", " Requesting immediate assistance.",
                    " Family member is calling for help.", " Scene is safe.",
                    " Unclear history.",
                ])
                desc = desc.rstrip(".") + "." + suffix
            rows.append(_make_row(base, desc))

    random.shuffle(rows)
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate synthetic severity dataset")
    parser.add_argument(
        "--output",
        default=str(Path(__file__).parent.parent / "data" / "raw" / "synthetic_severity_v1.csv"),
    )
    parser.add_argument("--n", type=int, default=1200)
    args = parser.parse_args()

    import csv
    rows = generate_dataset(args.n)
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)

    fieldnames = [
        "description", "severity", "emergency_type", "age_group",
        "conscious", "breathing_difficulty", "severe_breathing_difficulty",
        "bleeding_level", "chest_pain", "seizure", "stroke_signs",
        "burn_level", "allergic_reaction", "pregnancy_emergency",
        "major_accident", "violence_risk",
    ]

    with open(out, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({k: row.get(k, "") for k in fieldnames})

    print(f"Generated {len(rows)} rows → {out}")
    from collections import Counter
    dist = Counter(r["severity"] for r in rows)
    for sev in ["low", "medium", "high", "critical"]:
        print(f"  {sev}: {dist[sev]}")


if __name__ == "__main__":
    main()
