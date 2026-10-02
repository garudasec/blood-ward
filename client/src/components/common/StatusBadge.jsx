import React from 'react';

export default function StatusBadge({ status, urgency }) {
  const getStatusStyles = () => {
    if (urgency === 'Emergency') {
      return 'bg-red-600 text-white animate-pulse font-bold shadow-sm';
    }

    switch (status) {
      case 'Created':
      case 'Active':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Donor Accepted':
      case 'In Progress':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Fulfilled':
      case 'Completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Cancelled':
      case 'Expired':
        return 'bg-slate-100 text-slate-600 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full border ${getStatusStyles()}`}
    >
      {urgency === 'Emergency' && <span className="mr-1">🚨</span>}
      {status || urgency || 'Normal'}
    </span>
  );
}