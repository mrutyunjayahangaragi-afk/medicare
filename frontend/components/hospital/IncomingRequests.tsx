import { Clock, MapPin, User, Phone } from "lucide-react";

interface IncomingRequestsProps {
  requests: any[];
}

export default function IncomingRequests({ requests }: IncomingRequestsProps) {
  if (!requests || requests.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6 border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">Incoming Requests</h2>
        <p className="text-slate-600 mt-1">No pending emergency requests</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200">
      <div className="p-6 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">Incoming Requests</h2>
        <p className="text-slate-600 mt-1">
          {requests.length} pending emergency request{requests.length !== 1 ? "s" : ""}
        </p>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {requests.map((request) => (
            <div
              key={request.id}
              className="border border-slate-200 rounded-lg p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        request.severity === "critical"
                          ? "bg-red-100 text-red-800"
                          : request.severity === "high"
                          ? "bg-orange-100 text-orange-800"
                          : "bg-slate-100 text-slate-800"
                      }`}
                    >
                      {request.severity.toUpperCase()}
                    </span>
                    <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {request.emergency_type}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-2">
                    {request.description}
                  </p>
                </div>
                <div className="flex gap-2 ml-4">
                  <button className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">
                    Accept
                  </button>
                  <button className="px-3 py-1.5 text-sm font-medium border border-slate-300 rounded hover:bg-slate-50 transition-colors">
                    View
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-slate-600">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{new Date(request.created_at).toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  <span className="truncate max-w-[200px]">
                    {request.manual_address ||
                      `${request.latitude?.toFixed(4)}, ${request.longitude?.toFixed(4)}`}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-slate-600 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  <span>{request.contact_number}</span>
                </div>
                {request.assigned_responder_id && (
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    <span>Responder assigned</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
