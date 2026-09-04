import { useEffect, useState } from "react";
import { apiJson } from "../api/client";
import { anomaliesFallback } from "../data/mockData";
import { Icon } from "../components/Icon";

export function Anomalies() {
  const [data, setData] = useState(anomaliesFallback);
  useEffect(() => { apiJson("/anomalies").then(setData).catch(() => {}); }, []);
  const high = data.anomalies.filter((a) => a.severity === "High").length;
  return (
    <div className="space-y-6">
      <div><h2 className="text-2xl font-semibold text-stone-900">Anomaly Detection</h2><p className="mt-1 text-sm text-stone-500">Automatically flag unusual production changes and investigate their evidence.</p></div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Signals detected" value={data.anomalies.length} />
        <Metric label="High severity" value={high} />
        <Metric label="Primary anomaly" value={data.primary.year} />
      </div>
      <div className="rounded-xl border border-red-200 bg-red-50 p-5">
        <div className="flex items-start gap-3"><div className="rounded-lg bg-red-100 p-2 text-red-700"><Icon name="orange" /></div><div><div className="text-sm font-semibold text-red-900">{data.primary.title}</div><div className="mt-1 text-2xl font-bold text-red-800">{data.primary.change}</div><p className="mt-2 text-sm leading-6 text-red-700">{data.primary.explanation}</p></div></div>
      </div>
      <div className="rounded-xl border border-stone-200 bg-[#fffaf1] shadow-sm"><div className="border-b border-stone-200 px-5 py-4"><h3 className="font-semibold text-stone-800">Detected signals</h3></div><div className="divide-y divide-stone-100">{data.anomalies.map((a) => <div key={a.year} className="flex items-center justify-between px-5 py-4"><div><div className="font-medium text-stone-800">{a.year} · {a.changePct > 0 ? "+" : ""}{a.changePct}%</div><div className="text-xs text-stone-400">Annual production change vs prior year</div></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${a.severity === "High" ? "bg-red-50 text-red-700 ring-1 ring-red-200" : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"}`}>{a.severity}</span></div>)}</div></div>
      <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-xs text-stone-500"><b>How it works:</b> the prototype compares historical production changes and statistical deviation to prioritize unusual years for investigation.</div>
    </div>
  );
}
function Metric({label,value}) { return <div className="rounded-xl border border-stone-200 bg-[#fffaf1] p-5"><div className="text-xs font-semibold uppercase tracking-wide text-stone-400">{label}</div><div className="mt-2 text-2xl font-bold text-stone-900">{value}</div></div>; }
