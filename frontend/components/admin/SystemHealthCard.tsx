import { CheckCircle, AlertCircle, XCircle } from "lucide-react";

interface SystemStatus {
  name: string;
  status: "healthy" | "degraded" | "unavailable";
}

const systems: SystemStatus[] = [
  { name: "Frontend", status: "healthy" },
  { name: "FastAPI", status: "healthy" },
  { name: "Database", status: "healthy" },
  { name: "Realtime", status: "healthy" },
  { name: "AI Assistant", status: "healthy" },
  { name: "ML Model", status: "healthy" },
];

const statusConfig = {
  healthy: {
    icon: CheckCircle,
    color: "text-green-600 bg-green-50 border-green-200",
    label: "Healthy",
  },
  degraded: {
    icon: AlertCircle,
    color: "text-amber-600 bg-amber-50 border-amber-200",
    label: "Degraded",
  },
  unavailable: {
    icon: XCircle,
    color: "text-red-600 bg-red-50 border-red-200",
    label: "Unavailable",
  },
};

export default function SystemHealthCard() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
      <div className="px-6 py-4 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">System Health</h2>
      </div>
      
      <div className="p-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {systems.map((system) => {
            const config = statusConfig[system.status];
            const Icon = config.icon;
            
            return (
              <div
                key={system.name}
                className="flex flex-col items-center p-4 rounded-lg border border-slate-200"
              >
                <div className={`w-10 h-10 rounded-full border ${config.color} flex items-center justify-center mb-2`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className="text-sm font-medium text-slate-900">{system.name}</p>
                <p className="text-xs text-slate-500">{config.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
