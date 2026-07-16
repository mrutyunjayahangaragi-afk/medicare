"use client";

import { motion } from "framer-motion";
import { X, CheckCircle2, Sparkles, AlertTriangle } from "lucide-react";
import PredictionConfidence from "./PredictionConfidence";
import SafetyOverrideAlert from "./SafetyOverrideAlert";
import type { SeverityLevel } from "@/types/database";
import type { SeverityPredictionResponse } from "@/types/database";

const SEVERITY_STYLES: Record<SeverityLevel, { badge: string; label: string }> = {
  low:      { badge: "bg-green-100 text-green-800 border-green-200",  label: "Low"      },
  medium:   { badge: "bg-yellow-100 text-yellow-800 border-yellow-200", label: "Medium" },
  high:     { badge: "bg-orange-100 text-orange-800 border-orange-200", label: "High"   },
  critical: { badge: "bg-red-100 text-red-800 border-red-200",        label: "Critical" },
};

interface SeverityPredictionCardProps {
  prediction: SeverityPredictionResponse;
  onAccept: (severity: SeverityLevel) => void;
  onDismiss: () => void;
}

export default function SeverityPredictionCard({
  prediction,
  onAccept,
  onDismiss,
}: SeverityPredictionCardProps) {
  const sev = prediction.predicted_severity as SeverityLevel;
  const style = SEVERITY_STYLES[sev] ?? SEVERITY_STYLES.medium;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      role="region"
      aria-label="Severity prediction result"
      className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 space-y-3"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-500 flex-shrink-0" aria-hidden="true" />
          <span className="text-sm font-bold text-slate-800">ML Suggestion</span>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          aria-label="Dismiss severity suggestion"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* Predicted severity badge */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-500 font-medium">Suggested:</span>
        <span
          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${style.badge}`}
        >
          {style.label}
        </span>
        {prediction.low_confidence && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full border border-amber-200">
            <AlertTriangle className="w-2.5 h-2.5" aria-hidden="true" />
            Low confidence
          </span>
        )}
      </div>

      {/* Safety override */}
      {prediction.safety_override_applied && prediction.safety_override_reason && (
        <SafetyOverrideAlert reason={prediction.safety_override_reason} />
      )}

      {/* Confidence bar */}
      {prediction.confidence !== null && prediction.confidence !== undefined && (
        <PredictionConfidence
          confidence={prediction.confidence}
          lowConfidence={prediction.low_confidence}
        />
      )}

      {/* Key factors */}
      {prediction.important_factors.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
            Key factors
          </p>
          <ul className="space-y-1">
            {prediction.important_factors.map((factor, i) => (
              <li key={i} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="w-1 h-1 rounded-full bg-blue-400 flex-shrink-0" aria-hidden="true" />
                {factor}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-[10px] text-slate-400 leading-relaxed">{prediction.disclaimer}</p>

      {/* CTA buttons */}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => onAccept(sev)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors"
        >
          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
          Use {style.label}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="flex-1 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
        >
          Keep My Selection
        </button>
      </div>
    </motion.div>
  );
}
