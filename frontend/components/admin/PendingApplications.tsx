import Link from "next/link";
import { Clock, FileText } from "lucide-react";

interface Application {
  id: string;
  application_type: string;
  organization_name: string | null;
  created_at: string;
  profiles: {
    full_name: string | null;
    email: string | null;
  };
}

interface PendingApplicationsProps {
  applications: Application[];
}

export default function PendingApplications({ applications }: PendingApplicationsProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-amber-600" />
          <h2 className="text-lg font-semibold text-slate-900">Pending Applications</h2>
        </div>
        <Link
          href="/admin/applications"
          className="text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          View All
        </Link>
      </div>
      
      <div className="divide-y divide-slate-100">
        {applications.length === 0 ? (
          <div className="px-6 py-8 text-center text-slate-500">
            No pending applications
          </div>
        ) : (
          applications.map((app) => (
            <div key={app.id} className="px-6 py-4 hover:bg-slate-50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                      {app.application_type === "hospital" ? "Hospital" : "Responder"}
                    </span>
                    <span className="text-sm text-slate-500">
                      {new Date(app.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="font-medium text-slate-900 truncate">
                    {app.profiles?.full_name || "Unknown"}
                  </p>
                  <p className="text-sm text-slate-600 truncate">
                    {app.organization_name || "No organization"}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {app.profiles?.email || "No email"}
                  </p>
                </div>
                <Link
                  href={`/admin/applications/${app.id}`}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium whitespace-nowrap"
                >
                  Review
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
