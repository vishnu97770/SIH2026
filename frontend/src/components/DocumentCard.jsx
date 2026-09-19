import { Icon } from "./Icon";

const statusStyles = {
  Processed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Processing: "bg-amber-50 text-amber-700 ring-amber-200",
  "Needs Review": "bg-amber-50 text-amber-700 ring-amber-200",
};

export function DocumentCard({ doc }) {
  const statusCls = statusStyles[doc.status] ?? "bg-stone-50 text-stone-600 ring-stone-200";

  return (
    <div className="flex items-center gap-3 rounded-lg border border-stone-200 p-3 transition-colors hover:bg-stone-50">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-50 text-rose-600">
        <Icon name="file" className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-stone-800">{doc.name}</div>
        <div className="text-xs text-stone-400">
          {doc.type} · {doc.date}
        </div>
      </div>
      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${statusCls}`}>
        {doc.status}
      </span>
    </div>
  );
}
