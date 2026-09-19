export function KpiCard({ label, value, unit, icon, accent = "blue", footer }) {
  const ring = {
    blue: "bg-amber-50 text-amber-600",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-emerald-50 text-emerald-600",
    red: "bg-rose-50 text-rose-600",
    violet: "bg-orange-50 text-orange-600",
    slate: "bg-stone-100 text-stone-600",
  };

  return (
    <div className="rounded-xl border border-stone-200 bg-[#fffaf1] p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-semibold text-stone-900">{value}</span>
            {unit && <span className="text-sm text-stone-400">{unit}</span>}
          </div>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${ring[accent]}`}>
          {icon}
        </div>
      </div>
      {footer && <div className="mt-3 text-xs text-stone-400">{footer}</div>}
    </div>
  );
}
