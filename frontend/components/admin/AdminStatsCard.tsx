import { Users, Shield, Building2, AlertTriangle, FileText, CheckCircle, Activity, Ban } from "lucide-react";

interface AdminStatsCardProps {
  title: string;
  value: number;
  icon: "users" | "shield" | "building" | "alert" | "file" | "check" | "activity" | "ban";
  color: "blue" | "green" | "purple" | "red" | "amber" | "slate";
}

const iconMap = {
  users: Users,
  shield: Shield,
  building: Building2,
  alert: AlertTriangle,
  file: FileText,
  check: CheckCircle,
  activity: Activity,
  ban: Ban,
};

const colorMap = {
  blue: "bg-blue-50 text-blue-600 border-blue-200",
  green: "bg-green-50 text-green-600 border-green-200",
  purple: "bg-purple-50 text-purple-600 border-purple-200",
  red: "bg-red-50 text-red-600 border-red-200",
  amber: "bg-amber-50 text-amber-600 border-amber-200",
  slate: "bg-slate-50 text-slate-600 border-slate-200",
};

export default function AdminStatsCard({ title, value, icon, color }: AdminStatsCardProps) {
  const Icon = iconMap[icon];
  const colorClasses = colorMap[color];

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-lg border ${colorClasses} flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-sm text-slate-600 mt-1">{title}</p>
      </div>
    </div>
  );
}
