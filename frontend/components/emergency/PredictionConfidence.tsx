"use client";

interface PredictionConfidenceProps {
  confidence: number; // 0–1
  lowConfidence: boolean;
}

const LEVELS = [
  { min: 0,    max: 0.5,  label: "Low",    bar: "bg-red-400",    text: "text-red-600"    },
  { min: 0.5,  max: 0.65, label: "Fair",   bar: "bg-amber-400",  text: "text-amber-600"  },
  { min: 0.65, max: 0.8,  label: "Good",   bar: "bg-yellow-400", text: "text-yellow-600" },
  { min: 0.8,  max: 1.01, label: "Strong", bar: "bg-emerald-500", text: "text-emerald-600" },
];

export default function PredictionConfidence({
  confidence,
  lowConfidence,
}: PredictionConfidenceProps) {
  const pct = Math.round(confidence * 100);
  const level = LEVELS.find((l) => confidence >= l.min && confidence < l.max) ?? LEVELS[0];

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500 font-medium">Confidence</span>
        <span className={`font-bold tabular-nums ${level.text}`}>
          {pct}%
          {lowConfidence && (
            <span className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full">
              LOW
            </span>
          )}
        </span>
      </div>
      <div
        className="h-2 w-full bg-slate-100 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Prediction confidence: ${pct}%`}
      >
        <div
          className={`h-full rounded-full transition-all duration-500 ${level.bar}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[10px] text-slate-400">{level.label} confidence</p>
    </div>
  );
}
