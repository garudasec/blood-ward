import React from "react";

export default function StatusBadge({ status, urgency }) {
  const getStatusStyles = () => {
    if (urgency === "Emergency") {
      return "bg-red-600 text-white animate-pulse font-bold shadow-xs";
    }

    switch (status) {
      case "Created":
      case "Active":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30";
      case "Donor Accepted":
      case "In Progress":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30";
      case "Fulfilled":
      case "Completed":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
      case "Cancelled":
      case "Expired":
        return "bg-theme-subtle text-theme-secondary border-theme";
      default:
        return "bg-theme-subtle text-theme-secondary border-theme";
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full border ${getStatusStyles()}`}
    >
      {urgency === "Emergency" && <span className="mr-1">🚨</span>}
      {status || urgency || "Normal"}
    </span>
  );
}
