const severityStyles = {
  High: "bg-red-50 text-red-700 ring-red-200",
  Medium: "bg-amber-50 text-amber-700 ring-amber-200",
  Low: "bg-amber-50 text-amber-700 ring-amber-200",
};

export function AnomalyCard({ anomaly, onClick }) {
  const severityCls = severityStyles[anomaly.severity] ?? "bg-stone-50 text-stone-600 ring-stone-200";

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-lg border border-stone-200 p-3 text-left transition-colors hover:bg-stone-50"
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-stone-800">{anomaly.title}</div>
        <div className="text-xs text-stone-400">
          {anomaly.year} · {anomaly.change}
        </div>
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${severityCls}`}>
        {anomaly.severity}
      </span>
    </button>
  );
}
