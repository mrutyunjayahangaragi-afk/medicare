interface HospitalStatsProps {
  stats: {
    today_requests: number;
    pending_requests: number;
    accepted_requests: number;
    in_progress_requests: number;
    completed_requests: number;
    available_beds: number;
    occupied_beds: number;
    available_ambulances: number;
    busy_ambulances: number;
    available_doctors: number;
    available_nurses: number;
    critical_cases: number;
  };
}

export default function HospitalStats({ stats }: HospitalStatsProps) {
  const statCards = [
    {
      label: "Today's Requests",
      value: stats.today_requests,
      color: "bg-blue-500",
    },
    {
      label: "Pending Requests",
      value: stats.pending_requests,
      color: "bg-yellow-500",
    },
    {
      label: "In Progress",
      value: stats.in_progress_requests,
      color: "bg-orange-500",
    },
    {
      label: "Completed",
      value: stats.completed_requests,
      color: "bg-green-500",
    },
    {
      label: "Available Beds",
      value: stats.available_beds,
      color: "bg-indigo-500",
    },
    {
      label: "Available Doctors",
      value: stats.available_doctors,
      color: "bg-purple-500",
    },
    {
      label: "Available Ambulances",
      value: stats.available_ambulances,
      color: "bg-cyan-500",
    },
    {
      label: "Critical Cases",
      value: stats.critical_cases,
      color: "bg-red-500",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statCards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-lg shadow-sm p-6 border border-slate-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">{card.label}</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">
                {card.value}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-full ${card.color} opacity-20`} />
          </div>
        </div>
      ))}
    </div>
  );
}
