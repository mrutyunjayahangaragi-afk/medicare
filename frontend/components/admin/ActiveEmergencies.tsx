import Link from "next/link";
import { AlertTriangle, MapPin } from "lucide-react";

interface Emergency {
  id: string;
  emergency_type: string;
  severity: string;
  location_label: string | null;
  created_at: string;
  profiles: {
    full_name: string | null;
  };
}

interface ActiveEmergenciesProps {
  emergencies: Emergency[];
}

export default function ActiveEmergencies({ emergencies }: ActiveEmergenciesProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <h2 className="text-lg font-semibold text-slate-900">Active Critical Emergencies</h2>
        </div>
        <Link
          href="/admin/requests"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          View All
        </Link>
      </div>
      
      <div className="divide-y divide-slate-100">
        {emergencies.length === 0 ? (
          <div className="px-6 py-8 text-center text-slate-500">
            No active critical emergencies
          </div>
        ) : (
          emergencies.map((emergency) => (
            <div key={emergency.id} className="px-6 py-4 hover:bg-slate-50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                      Critical
                    </span>
                    <span className="text-sm text-slate-500">
                      {new Date(emergency.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="font-medium text-slate-900 capitalize">
                    {emergency.emergency_type}
                  </p>
                  <div className="flex items-center gap-1 text-sm text-slate-600 mt-1">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{emergency.location_label || "Unknown location"}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Reported by: {emergency.profiles.full_name || "Unknown"}
                  </p>
                </div>
                <Link
                  href={`/admin/requests/${emergency.id}`}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
                >
                  View
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
