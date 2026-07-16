export default function DashboardLoading() {
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
          <div className="hidden sm:block w-20 h-9 bg-slate-200 rounded-xl animate-pulse" />
          <div className="w-9 h-9 bg-slate-200 rounded-xl animate-pulse" />
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 lg:pb-8 space-y-6">
        {/* Welcome card skeleton */}
        <div className="h-36 sm:h-40 bg-slate-200 rounded-2xl animate-pulse" />

        {/* Stats skeleton */}
        <div>
          <div className="h-4 w-20 bg-slate-200 rounded animate-pulse mb-3" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white border border-slate-100 rounded-2xl p-5 flex items-start gap-4 shadow-sm">
                <div className="w-11 h-11 bg-slate-200 rounded-xl animate-pulse flex-shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-6 w-12 bg-slate-200 rounded animate-pulse" />
                  <div className="h-3 w-20 bg-slate-200 rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick actions skeleton */}
        <div>
          <div className="h-4 w-28 bg-slate-200 rounded animate-pulse mb-3" />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {[...Array(7)].map((_, i) => (
              <div key={i} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm min-h-[100px] animate-pulse">
                <div className="w-10 h-10 bg-slate-200 rounded-xl mb-3" />
                <div className="h-3 w-20 bg-slate-200 rounded mb-1.5" />
                <div className="h-3 w-16 bg-slate-200 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Alerts + activity skeletons */}
        <div className="h-44 bg-white border border-slate-100 rounded-2xl shadow-sm animate-pulse" />
        <div className="h-44 bg-white border border-slate-100 rounded-2xl shadow-sm animate-pulse" />
      </main>
    </div>
  );
}
