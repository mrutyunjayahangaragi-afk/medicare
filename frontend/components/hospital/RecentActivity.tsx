import { Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

export default function RecentActivity() {
  const activities = [
    {
      id: 1,
      type: "request_accepted",
      message: "Emergency request #1234 accepted",
      time: "5 minutes ago",
      icon: CheckCircle,
      color: "text-green-600",
    },
    {
      id: 2,
      type: "ambulance_dispatched",
      message: "Ambulance dispatched to patient",
      time: "15 minutes ago",
      icon: AlertCircle,
      color: "text-blue-600",
    },
    {
      id: 3,
      type: "request_completed",
      message: "Treatment completed for request #1230",
      time: "1 hour ago",
      icon: CheckCircle,
      color: "text-green-600",
    },
    {
      id: 4,
      type: "request_rejected",
      message: "Request #1228 rejected (capacity)",
      time: "2 hours ago",
      icon: XCircle,
      color: "text-red-600",
    },
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200">
      <div className="p-6 border-b border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
      </div>
      <div className="p-6">
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = activity.icon;
            return (
              <div key={activity.id} className="flex items-start gap-3">
                <div className={`mt-0.5 ${activity.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-900">{activity.message}</p>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {activity.time}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
