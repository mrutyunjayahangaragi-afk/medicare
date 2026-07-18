"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-6 bg-slate-50/50">
        <div className="w-full max-w-md">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-red-700">
              Dashboard failed to load
            </h2>
            <p className="mt-2 text-sm text-red-600">
              {error.message || "An unexpected error occurred while loading your dashboard."}
            </p>
            <button
              onClick={reset}
              className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-white font-medium hover:bg-red-700 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
