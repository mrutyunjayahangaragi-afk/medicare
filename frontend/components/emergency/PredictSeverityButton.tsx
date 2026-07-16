"use client";

import { Loader2, Sparkles } from "lucide-react";

interface PredictSeverityButtonProps {
  /** Whether the form has enough data to predict */
  canPredict: boolean;
  isPredicting: boolean;
  onClick: () => void;
}

export default function PredictSeverityButton({
  canPredict,
  isPredicting,
  onClick,
}: PredictSeverityButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!canPredict || isPredicting}
      aria-label="Predict severity using ML model"
      aria-busy={isPredicting}
      className={[
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400",
        canPredict && !isPredicting
          ? "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 cursor-pointer"
          : "bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed",
      ].join(" ")}
    >
      {isPredicting ? (
        <>
          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
          Predicting…
        </>
      ) : (
        <>
          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
          Suggest Severity
        </>
      )}
    </button>
  );
}
