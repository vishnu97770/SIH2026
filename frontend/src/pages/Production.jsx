import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { apiJson } from "../api/client";
import {
  productionData as pdFallback,
  anomaliesFallback,
  forecastFallback,
  productionKPIs as kpiFallback,
} from "../data/mockData";
import { KpiCard } from "../components/KpiCard";
import { ChartCard } from "../components/ChartCard";
import { Icon } from "../components/Icon";

const fmt = (v) => Number(v).toLocaleString();

export function Production() {
  const [pd, setPd] = useState(pdFallback);
  const [kpis, setKpis] = useState(kpiFallback);
  const [anom, setAnom] = useState(anomaliesFallback);
  const [forecast, setForecast] = useState(forecastFallback);
  const [loaded, setLoaded] = useState(false);
  const [showAnomaly, setShowAnomaly] = useState(false);

  useEffect(() => {
    let alive = true;
    Promise.allSettled([
      apiJson("/production"),
      apiJson("/production/kpis"),
      apiJson("/anomalies"),
      apiJson("/forecast"),
    ]).then(([pr, kp, an, fc]) => {
      if (!alive) return;
      if (pr.status === "fulfilled") setPd(pr.value);
      if (kp.status === "fulfilled") setKpis(kp.value);
      if (an.status === "fulfilled") setAnom(an.value);
      if (fc.status === "fulfilled") setForecast(fc.value);
      setLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const trendData = pd.years.map((y, i) => ({ year: String(y), actual: pd.actual[i], target: pd.target[i] }));

  const forecastSeries = [];
  trendData.forEach((d) =>
    forecastSeries.push({ year: d.year, actual: d.actual, type: "actual" })
  );
  forecast.years.forEach((y, i) =>
    forecastSeries.push({
      year: String(y),
      forecast: forecast.values[i],
      lower: forecast.lower[i],
      upper: forecast.upper[i],
      type: "forecast",
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-stone-900">Production Intelligence</h2>
        <p className="mt-1 text-sm text-stone-500">
          Analyze production trends, anomalies and forecasts for Mine X.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Current Production"
          value={fmt(kpis.currentProduction)}
          unit="t"
          icon={<Icon name="production" />}
          accent="blue"
          footer={`${kpis.currentYear} annual`}
        />
        <KpiCard
          label="Target"
          value={fmt(kpis.target)}
          unit="t"
          icon={<Icon name="target" />}
          accent="slate"
          footer="2025 annual target"
        />
        <KpiCard
          label="Change %"
          value={`${kpis.changePct > 0 ? "+" : ""}${kpis.changePct}%`}
          icon={<Icon name="trend" />}
          accent="green"
          footer="vs previous year"
        />
        <KpiCard
          label="Anomalies"
          value={kpis.anomalies}
          icon={<Icon name="orange" />}
          accent="red"
          footer="high/medium severity"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title="Production Trend"
          action={<span className="text-xs text-stone-400">Mine X · tonnes/yr</span>}
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="trend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c8872d" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#c8872d" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6dccd" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 12, fill: "#756a5d" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#756a5d" }} axisLine={false} tickLine={false} width={55} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => `${fmt(v)} tonnes`} contentStyle={{ borderRadius: 8, border: "1px solid #e6dccd", fontSize: 12 }} />
                <ReferenceLine y={87000} stroke="#ef4444" strokeDasharray="4 4" />
                <Area type="monotone" dataKey="actual" name="Actual" stroke="#c8872d" strokeWidth={2} fill="url(#trend)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Actual vs Target"
          action={<span className="text-xs text-stone-400">tonnes/yr</span>}
        >
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6dccd" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 12, fill: "#756a5d" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#756a5d" }} axisLine={false} tickLine={false} width={55} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ borderRadius: 8, border: "1px solid #e6dccd", fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="target" name="Target" fill="#a89a86" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" name="Actual" fill="#b86b2a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard
          title="Forecast"
          action={<span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-amber-200">Prototype Forecast</span>}
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={forecastSeries} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6dccd" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 12, fill: "#756a5d" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#756a5d" }} axisLine={false} tickLine={false} width={55} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(v, name) => [fmt(v), name]}
                  contentStyle={{ borderRadius: 8, border: "1px solid #e6dccd", fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area dataKey="upper" name="Upper" stroke="none" fill="#e6c48a" fillOpacity={0.4} />
                <Area dataKey="lower" name="Lower" stroke="none" fill="#e6c48a" fillOpacity={0.4} />
                <Line type="monotone" dataKey="actual" name="Actual" stroke="#c8872d" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                <Line type="monotone" dataKey="forecast" name="Forecast" stroke="#f59e0b" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-xs text-stone-400">{forecast.note}</div>
        </ChartCard>

        <ChartCard title="Detected Anomalies" action={<span className="text-xs text-stone-400">{loaded ? "From demo data" : "Demo fallback"}</span>}>
          <div className="space-y-3">
            {anom.anomalies.map((a, i) => {
              const severityCls =
                a.severity === "High"
                  ? "bg-red-50 text-red-700 ring-red-200"
                  : a.severity === "Medium"
                  ? "bg-amber-50 text-amber-700 ring-amber-200"
                  : "bg-stone-50 text-stone-600 ring-stone-200";
              return (
                <div key={i} className="flex items-center justify-between rounded-lg border border-stone-200 p-3">
                  <div>
                    <div className="text-sm font-medium text-stone-800">
                      {a.year} · {a.changePct > 0 ? "+" : ""}{a.changePct}%
                    </div>
                    <div className="text-xs text-stone-400">Annual change vs prior year</div>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${severityCls}`}>
                    {a.severity}
                  </span>
                </div>
              );
            })}
          </div>
        </ChartCard>
      </div>

      <div className="flex flex-col gap-4 rounded-xl border border-red-200 bg-red-50 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-red-800">
            <Icon name="orange" className="h-4 w-4" />
            Production anomaly detected
          </div>
          <p className="mt-1 max-w-xl text-sm text-red-700">
            {anom.primary.explanation}
          </p>
        </div>
        <button
          onClick={() => setShowAnomaly(true)}
          className="shrink-0 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
        >
          View Evidence
        </button>
      </div>

      {showAnomaly && <AnomalyEvidence anom={anom.primary} onClose={() => setShowAnomaly(false)} />}
    </div>
  );
}

function AnomalyEvidence({ anom, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg rounded-xl bg-[#fffaf1] p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-stone-900">Anomaly Evidence</h3>
              <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-200">{anom.severity}</span>
            </div>
            <p className="text-sm text-stone-500">{anom.title} · {anom.year}</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100" aria-label="Close">×</button>
        </div>
        <div className="rounded-lg border border-stone-200 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-stone-400">Source</div>
          <div className="mt-1 text-sm font-medium text-stone-800">{anom.documentRef} · p.27</div>
          <p className="mt-2 text-sm leading-relaxed text-stone-600">
            "Routine inspection observed significant production disruption caused by unplanned shaft
            maintenance between April and September 2024. Equipment downtime for the conveyor system
            totalled 41 days."
          </p>
        </div>
        <p className="mt-4 text-xs text-stone-400">Demo/sample document — not an official government record.</p>
        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700">Close</button>
        </div>
      </div>
    </div>
  );
}
