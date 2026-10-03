import React from "react";
import { Users, UserCheck, AlertTriangle, CheckCircle2, Activity } from "lucide-react";

export default function AdminSummaryStats({ stats }) {
  const statItems = [
    {
      title: "Total Registered Donors",
      value: stats?.totalDonors || 0,
      subtext: "Verified profiles",
      icon: Users,
      iconBg: "bg-red-500/10 text-red-600 dark:text-red-400",
      badge: "Donors",
    },
    {
      title: "Active Available Donors",
      value: stats?.activeAvailableDonors || 0,
      subtext: "Visible in search now",
      icon: UserCheck,
      iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      badge: "Ready",
    },
    {
      title: "Total Registered Recipients",
      value: stats?.totalRecipients || 0,
      subtext: "Patient accounts",
      icon: Users,
      iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      badge: "Recipients",
    },
    {
      title: "Emergency Requests",
      value: stats?.emergencyRequests || 0,
      subtext: "Priority live broadcasts",
      icon: AlertTriangle,
      iconBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
      badge: "Urgent",
    },
    {
      title: "Active Requests",
      value: stats?.activeRequests || 0,
      subtext: "Pending donor fulfillment",
      icon: Activity,
      iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      badge: "Live",
    },
    {
      title: "Fulfilled Requests",
      value: stats?.fulfilledRequests || 0,
      subtext: "Successful donations",
      icon: CheckCircle2,
      iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      badge: "Completed",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {statItems.map((item, idx) => {
        const Icon = item.icon;
        return (
          <div
            key={idx}
            className="bg-theme-card p-5 rounded-2xl border border-theme shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className={`p-2.5 rounded-xl ${item.iconBg}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-theme-muted bg-theme-subtle px-2 py-0.5 rounded-md border border-theme">
                {item.badge}
              </span>
            </div>

            <div>
              <div className="text-2xl font-black text-theme-primary tracking-tight">{item.value}</div>
              <div className="text-xs font-bold text-theme-primary">{item.title}</div>
              <div className="text-[11px] text-theme-muted">{item.subtext}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
