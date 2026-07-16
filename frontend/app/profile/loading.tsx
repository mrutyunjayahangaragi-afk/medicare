export default function ProfileLoading() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Navbar skeleton */}
      <div className="flex items-center justify-between px-5 sm:px-8 py-4 bg-white border-b border-slate-100 shadow-sm flex-shrink-0 min-h-[68px]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-200 rounded-xl animate-pulse lg:hidden" />
          <div className="space-y-1.5">
            <div className="h-3 w-28 bg-slate-200 rounded animate-pulse" />
            <div className="h-5 w-44 bg-slate-200 rounded animate-pulse" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-slate-200 rounded-xl animate-pulse" />
          <div className="w-9 h-9 bg-slate-200 rounded-xl animate-pulse" />
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-8">
        {/* Back link */}
        <div className="h-4 w-36 bg-slate-200 rounded animate-pulse mb-5" />
        {/* Heading */}
        <div className="h-7 w-32 bg-slate-200 rounded animate-pulse mb-6" />

        <div className="max-w-2xl space-y-6">
          {/* Avatar card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="w-24 h-24 rounded-2xl bg-slate-200 animate-pulse flex-shrink-0" />
            <div className="space-y-2 flex-1 w-full">
              <div className="h-5 w-36 bg-slate-200 rounded animate-pulse" />
              <div className="h-4 w-48 bg-slate-200 rounded animate-pulse" />
              <div className="h-6 w-16 bg-slate-200 rounded-full animate-pulse" />
            </div>
          </div>

          {/* Form card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="h-4 w-40 bg-slate-200 rounded animate-pulse" />
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-1.5">
                <div className="h-3 w-24 bg-slate-200 rounded animate-pulse" />
                <div className="h-11 bg-slate-100 rounded-xl animate-pulse" />
              </div>
            ))}
            <div className="h-11 bg-slate-200 rounded-xl animate-pulse mt-2" />
          </div>
        </div>
      </main>
    </div>
  );
}
