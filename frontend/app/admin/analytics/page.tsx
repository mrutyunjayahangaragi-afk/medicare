import { createClient } from "@/lib/supabase/server";

export default async function AdminAnalyticsPage() {
  const supabase = await createClient();

  // Get emergency type distribution
  const { data: typeDistribution } = await supabase
    .from("emergency_requests")
    .select("emergency_type")
    .not("emergency_type", "is", null);

  // Get severity distribution
  const { data: severityDistribution } = await supabase
    .from("emergency_requests")
    .select("severity")
    .not("severity", "is", null);

  // Get status distribution
  const { data: statusDistribution } = await supabase
    .from("emergency_requests")
    .select("status")
    .not("status", "is", null);

  // Calculate distributions
  const typeCounts = typeDistribution?.reduce((acc, req) => {
    acc[req.emergency_type] = (acc[req.emergency_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const severityCounts = severityDistribution?.reduce((acc, req) => {
    acc[req.severity] = (acc[req.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const statusCounts = statusDistribution?.reduce((acc, req) => {
    acc[req.status] = (acc[req.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const totalRequests = typeDistribution?.length || 0;
  const completedRequests = statusCounts["completed"] || 0;
  const completionRate = totalRequests > 0 ? (completedRequests / totalRequests * 100).toFixed(1) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
        <p className="text-slate-600">Platform performance and usage metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <p className="text-sm text-slate-500 mb-1">Total Requests</p>
          <p className="text-2xl font-bold text-slate-900">{totalRequests}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <p className="text-sm text-slate-500 mb-1">Completion Rate</p>
          <p className="text-2xl font-bold text-slate-900">{completionRate}%</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <p className="text-sm text-slate-500 mb-1">Completed</p>
          <p className="text-2xl font-bold text-slate-900">{completedRequests}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <p className="text-sm text-slate-500 mb-1">Active</p>
          <p className="text-2xl font-bold text-slate-900">{statusCounts["accepted"] || 0 + statusCounts["in_progress"] || 0 + statusCounts["arrived"] || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Emergency Type Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Emergency Types</h2>
          <div className="space-y-3">
            {Object.entries(typeCounts).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-sm text-slate-600 capitalize">{type}</span>
                <span className="text-sm font-medium text-slate-900">{count}</span>
              </div>
            ))}
            {Object.keys(typeCounts).length === 0 && (
              <p className="text-sm text-slate-500">No data available</p>
            )}
          </div>
        </div>

        {/* Severity Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Severity Distribution</h2>
          <div className="space-y-3">
            {Object.entries(severityCounts).map(([severity, count]) => (
              <div key={severity} className="flex items-center justify-between">
                <span className="text-sm text-slate-600 capitalize">{severity}</span>
                <span className="text-sm font-medium text-slate-900">{count}</span>
              </div>
            ))}
            {Object.keys(severityCounts).length === 0 && (
              <p className="text-sm text-slate-500">No data available</p>
            )}
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Status Distribution</h2>
          <div className="space-y-3">
            {Object.entries(statusCounts).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-sm text-slate-600 capitalize">{status}</span>
                <span className="text-sm font-medium text-slate-900">{count}</span>
              </div>
            ))}
            {Object.keys(statusCounts).length === 0 && (
              <p className="text-sm text-slate-500">No data available</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">AI and ML Usage</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-500 mb-1">AI Assistant Usage</p>
            <p className="text-xl font-bold text-slate-900">Coming Soon</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-500 mb-1">ML Predictions</p>
            <p className="text-xl font-bold text-slate-900">Coming Soon</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-500 mb-1">Recommendations</p>
            <p className="text-xl font-bold text-slate-900">Coming Soon</p>
          </div>
        </div>
      </div>
    </div>
  );
}
