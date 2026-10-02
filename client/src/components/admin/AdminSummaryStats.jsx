import React from 'react';
import { Users, UserCheck, AlertTriangle, FileText, CheckCircle2, ShieldCheck, Activity } from 'lucide-react';

export default function AdminSummaryStats({ stats }) {
  const statItems = [
    {
      title: 'Total Registered Donors',
      value: stats?.totalDonors || 0,
      subtext: 'Verified profiles',
      icon: Users,
      iconBg: 'bg-red-50 text-red-600',
      badge: 'Donors',
    },
    {
      title: 'Active Available Donors',
      value: stats?.activeAvailableDonors || 0,
      subtext: 'Visible in search now',
      icon: UserCheck,
      iconBg: 'bg-emerald-50 text-emerald-600',
      badge: 'Ready',
    },
    {
      title: 'Total Registered Recipients',
      value: stats?.totalRecipients || 0,
      subtext: 'Patient accounts',
      icon: Users,
      iconBg: 'bg-blue-50 text-blue-600',
      badge: 'Recipients',
    },
    {
      title: 'Emergency Requests',
      value: stats?.emergencyRequests || 0,
      subtext: 'Priority live broadcasts',
      icon: AlertTriangle,
      iconBg: 'bg-rose-50 text-rose-600',
      badge: 'Urgent',
    },
    {
      title: 'Active Requests',
      value: stats?.activeRequests || 0,
      subtext: 'Pending donor fulfillment',
      icon: Activity,
      iconBg: 'bg-amber-50 text-amber-600',
      badge: 'Live',
    },
    {
      title: 'Fulfilled Requests',
      value: stats?.fulfilledRequests || 0,
      subtext: 'Successful donations',
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50 text-emerald-700',
      badge: 'Completed',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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