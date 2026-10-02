import React from 'react';

export default function BloodGroupBadge({ group, size = 'md' }) {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs font-semibold',
    md: 'px-2.5 py-1 text-sm font-bold',
    lg: 'px-3.5 py-1.5 text-base font-extrabold',
  };

  return (
    <span
      className={`inline-flex items-center justify-center rounded-lg bg-red-100 text-red-700 border border-red-200/80 shadow-xs ${
        sizeClasses[size] || sizeClasses.md
      }`}
    >
      <span className="mr-1 text-red-500">🩸</span>
      {group || 'N/A'}
    </span>
  );
}