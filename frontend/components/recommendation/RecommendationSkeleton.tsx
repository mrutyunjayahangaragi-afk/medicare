"use client";

export default function RecommendationSkeleton() {
  return (
    <section aria-label="Loading recommendations" aria-busy="true">
      <div className="flex items-center gap-2 mb-4">
        <div className="h-5 w-5 bg-slate-200 rounded animate-pulse" />
        <div className="h-5 w-48 bg-slate-200 rounded animate-pulse" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="bg-white border border-slate-100 rounded-2xl p-5 space-y-3 animate-pulse"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-200 rounded-xl" />
              <div className="space-y-1.5 flex-1">
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-1/2" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="h-8 bg-slate-100 rounded-lg" />
              <div className="h-8 bg-slate-100 rounded-lg" />
            </div>
            <div className="h-9 bg-slate-100 rounded-xl" />
          </div>
        ))}
      </div>
    </section>
  );
}
