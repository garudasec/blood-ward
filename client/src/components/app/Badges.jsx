// BloodGroupBadge.jsx
export function BloodGroupBadge({ group, size = "md" }) {
  return (
    <div className={`blood-badge ${size === "sm" ? "sm" : size === "lg" ? "lg" : ""}`} aria-label={`Blood group ${group}`}>
      {group}
    </div>
  );
}

// UrgencyBadge.jsx
export function UrgencyBadge({ urgency }) {
  const cls = `urgency-${urgency}`;
  const labels = { normal: "Normal", high: "High", emergency: "Emergency" };
  const icons  = { normal: "●", high: "▲", emergency: "⚠" };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold ${cls}`} aria-label={`Urgency: ${labels[urgency]}`}>
      <span aria-hidden="true">{icons[urgency]}</span>
      {labels[urgency]}
    </span>
  );
}

// StatusBadge.jsx
export function StatusBadge({ status }) {
  const MAP = {
    created:        { label: "Created",        bg: "rgba(107,114,128,.12)", color: "#9ca3af" },
    active:         { label: "Active",         bg: "rgba(59,130,246,.12)",  color: "#60a5fa" },
    donor_accepted: { label: "Donor Accepted", bg: "rgba(139,92,246,.12)", color: "#a78bfa" },
    in_progress:    { label: "In Progress",    bg: "rgba(245,158,11,.12)", color: "#fbbf24" },
    fulfilled:      { label: "Fulfilled",      bg: "rgba(16,185,129,.12)", color: "#34d399" },
    completed:      { label: "Completed",      bg: "rgba(34,197,94,.12)",  color: "#4ade80" },
    cancelled:      { label: "Cancelled",      bg: "rgba(239,68,68,.12)",  color: "#f87171" },
    expired:        { label: "Expired",        bg: "rgba(107,114,128,.08)", color: "#6b7280" },
    accepted:       { label: "Accepted",       bg: "rgba(16,185,129,.12)", color: "#34d399" },
    declined:       { label: "Declined",       bg: "rgba(239,68,68,.12)",  color: "#f87171" },
    pending:        { label: "Pending",        bg: "rgba(245,158,11,.12)", color: "#fbbf24" },
  };
  const c = MAP[status] || { label: status, bg: "rgba(255,255,255,.06)", color: "rgba(255,255,255,.5)" };
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold"
      style={{ background: c.bg, color: c.color, border: `1px solid ${c.color}25` }}>
      {c.label}
    </span>
  );
}

// AvailabilityBadge.jsx
export function AvailabilityBadge({ available }) {
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
      available
        ? "bg-green-400/10 text-green-400 border border-green-400/20"
        : "bg-white/05 text-white/40 border border-white/10"
    }`} aria-label={available ? "Available to donate" : "Not available"}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${available ? "bg-green-400 animate-pulse" : "bg-white/30"}`} aria-hidden="true" />
      {available ? "Available" : "Unavailable"}
    </span>
  );
}
