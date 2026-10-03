import React from "react";
import { CheckCircle2, HeartHandshake, FileText, Activity } from "lucide-react";

export default function RecipientSummaryStats({ stats }) {
  const statItems = [
    {
      title: "Active Requests",
      value: stats?.activeRequests || 0,
      subtext: "Pending donor responses",
      icon: Activity,
      iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      badge: "Live",
    },
    {
      title: "Donors Responded",
      value: stats?.donorsResponded || 0,
      subtext: "Accepted & ready to donate",
      icon: HeartHandshake,
      iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      badge: "Unlocked",
    },
    {
      title: "Fulfilled Requests",
      value: stats?.fulfilledCount || 0,
      subtext: "Successfully completed",
      icon: CheckCircle2,
      iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      badge: "Complete",
    },
    {
      title: "Total Requests Created",
      value: stats?.totalRequests || 0,
      subtext: "All-time history",
      icon: FileText,
      iconBg: "bg-theme-subtle text-theme-secondary",
      badge: "Total",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
