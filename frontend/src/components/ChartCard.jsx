export function ChartCard({ title, action, children, className = "" }) {
  return (
    <div className={`rounded-xl border border-stone-200 bg-[#fffaf1] p-5 shadow-sm ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-stone-800">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}
