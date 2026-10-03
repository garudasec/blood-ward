import React from "react";
import { Droplet, Activity, CheckCircle2, HeartHandshake } from "lucide-react";

export default function DonorSummaryStats({ stats }) {
  const statItems = [
    {
      title: "Nearby Active Requests",
      value: stats?.nearbyActiveCount || 0,
      subtext: "Within 10 km radius",
      icon: Activity,
      iconBg: "bg-red-500/10 text-red-600 dark:text-red-400",
      badge: "Real-time",
    },
    {
      title: "Accepted Requests",
      value: stats?.acceptedCount || 0,
      subtext: "In coordination stage",
      icon: HeartHandshake,
      iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      badge: "Active",
    },
    {
      title: "Donations Completed",
      value: stats?.completedDonations || 0,
      subtext: "Lives impacted",
      icon: CheckCircle2,
      iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      badge: "Total",
    },
    {
      title: "Donor Readiness",
      value: stats?.responseRate || "100%",
      subtext: "Quick response rate",
      icon: Droplet,
      iconBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      badge: "Verified",
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
