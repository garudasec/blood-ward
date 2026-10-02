import React from 'react';
import { Droplet, Activity, CheckCircle2, HeartHandshake, MapPin } from 'lucide-react';

export default function DonorSummaryStats({ stats }) {
  const statItems = [
    {
      title: 'Nearby Active Requests',
      value: stats?.nearbyActiveCount || 0,
      subtext: 'Within 10 km radius',
      icon: Activity,
      iconBg: 'bg-red-50 text-red-600',
      badge: 'Real-time',
    },
    {
      title: 'Accepted Requests',
      value: stats?.acceptedCount || 0,
      subtext: 'In coordination stage',
      icon: HeartHandshake,
      iconBg: 'bg-amber-50 text-amber-600',
      badge: 'Active',
    },
    {
      title: 'Donations Completed',
      value: stats?.completedDonations || 0,
      subtext: 'Lives impacted',
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50 text-emerald-600',
      badge: 'Total',
    },
    {
      title: 'Donor Readiness',
      value: stats?.responseRate || '100%',
      subtext: 'Quick response rate',
      icon: Droplet,
      iconBg: 'bg-blue-50 text-blue-600',
      badge: 'Verified',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {statItems.map((item, idx) => {
        const Icon = item.icon;
        return (
          <div
            key={idx}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className={`p-2.5 rounded-xl ${item.iconBg}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                {item.badge}
              </span>
            </div>

            <div>
              <div className="text-2xl font-black text-slate-900 tracking-tight">{item.value}</div>
              <div className="text-xs font-bold text-slate-800">{item.title}</div>
              <div className="text-[11px] text-slate-500">{item.subtext}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}