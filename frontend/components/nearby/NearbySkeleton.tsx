/**
 * NearbySkeleton — loading placeholder for the nearby services list.
 */
export default function NearbySkeleton() {
  return (
    <div
      className="space-y-3"
      role="status"
      aria-label="Loading nearby services"
      aria-busy="true"
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-slate-100 p-4 animate-pulse"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-200 flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="flex justify-between">
                <div className="h-3.5 bg-slate-200 rounded w-2/3" />
                <div className="h-3 bg-slate-200 rounded w-12" />
              </div>
              <div className="h-2.5 bg-slate-100 rounded w-1/4" />
              <div className="h-2.5 bg-slate-100 rounded w-full" />
              <div className="h-2.5 bg-slate-100 rounded w-4/5" />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <div className="flex-1 h-8 bg-slate-200 rounded-xl" />
            <div className="flex-1 h-8 bg-slate-100 rounded-xl" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading nearby services, please wait…</span>
    </div>
  );
}
