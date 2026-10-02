import React from 'react';
import { Search, PlusCircle, CheckCircle2, HeartHandshake, FileText, Activity } from 'lucide-react';

export default function RecipientSummaryStats({ stats }) {
  const statItems = [
    {
      title: 'Active Requests',
      value: stats?.activeRequests || 0,
      subtext: 'Pending donor responses',
      icon: Activity,
      iconBg: 'bg-blue-50 text-blue-600',
      badge: 'Live',
    },
    {
      title: 'Donors Responded',
      value: stats?.donorsResponded || 0,
      subtext: 'Accepted & ready to donate',
      icon: HeartHandshake,
      iconBg: 'bg-emerald-50 text-emerald-600',
      badge: 'Unlocked',
    },
    {
      title: 'Fulfilled Requests',
      value: stats?.fulfilledCount || 0,
      subtext: 'Successfully completed',
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50 text-emerald-700',
      badge: 'Complete',
    },
    {
      title: 'Total Requests Created',
      value: stats?.totalRequests || 0,
      subtext: 'All-time history',
      icon: FileText,
      iconBg: 'bg-slate-100 text-slate-700',
      badge: 'Total',
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