import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api/client";
import { ChartCard } from "../components/ChartCard";
import { Icon } from "../components/Icon";
import { KpiCard } from "../components/KpiCard";
import { formatNumber, formatPercent } from "../utils/format";

const EMPTY_FILTERS = {
  year: "",
  mine: "",
  mineral: "",
  state: "",
  district: "",
};

export function Production() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [meta, setMeta] = useState({ years: [], mines: [], minerals: [], states: [], districts: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [kpis, setKpis] = useState(null);
  const [production, setProduction] = useState(null);
  const [anomalies, setAnomalies] = useState(null);
  const [forecast, setForecast] = useState(null);

  const load = async (nextFilters = filters) => {
    setLoading(true);
    setError("");
    try {
      const session = await api.session();
      const query = Object.fromEntries(
        Object.entries(nextFilters).filter(([, value]) => value !== "" && value != null)
      );
      const [kp, prod, anom, fc] = await Promise.all([
        api.kpis(query),
        api.production(query),
        api.anomalies(query),
        api.forecast({ ...query, horizon: 3 }),
      ]);
      setMeta(session.filters || meta);
      setKpis(kp);
      setProduction(prod);
      setAnomalies(anom);
      setForecast(fc);
    } catch (err) {
      setError(err.message || "Could not load production analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const trend = production?.historical || [];
  const targetRows = trend.filter((row) => row.target != null);
  const topMines = production?.production_by_mine || [];
  const anomalyRows = anomalies?.anomalies || [];
  const forecastRows = forecast?.forecast || [];

  const forecastSeries = useMemo(() => {
    const hist = trend.map((row) => ({ year: row.year, actual: row.production }));
    const future = forecastRows.map((row) => ({
      year: row.year,
      predicted: row.predicted_production,
      lower: row.lower_bound,
      upper: row.upper_bound,
    }));
    return [...hist, ...future];
  }, [forecastRows, trend]);

  const primaryAnomaly = anomalies?.primary;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-stone-200 bg-gradient-to-r from-stone-950 via-stone-900 to-amber-950 p-6 text-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-amber-100">
              <Icon name="production" className="h-4 w-4" />
              Production Intelligence
            </div>
            <h2 className="mt-4 text-3xl font-semibold">Operational trend analysis</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-300">
              Inspect annual production, targets, anomalies, and forecast output. Use the filters to
              update the analysis without leaving the page.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => load(filters)}
              className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-400"
            >
              Refresh
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  await api.retrainModels();
                  await load(filters);
                } catch (err) {
                  setError(err.message || "Could not retrain the model.");
                }
              }}
              className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Retrain Forecast Model
            </button>
          </div>
        </div>
        {error && <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-50">{error}</div>}
      </div>

      <div className="rounded-2xl border border-stone-200 bg-[#fffaf1] p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-5">
          <SelectField label="Year" value={filters.year} onChange={(value) => setFilters((f) => ({ ...f, year: value }))} options={meta.years} />
          <SelectField label="Mine" value={filters.mine} onChange={(value) => setFilters((f) => ({ ...f, mine: value }))} options={meta.mines} />
          <SelectField label="Mineral" value={filters.mineral} onChange={(value) => setFilters((f) => ({ ...f, mineral: value }))} options={meta.minerals} />
          <SelectField label="State" value={filters.state} onChange={(value) => setFilters((f) => ({ ...f, state: value }))} options={meta.states} />
          <SelectField label="District" value={filters.district} onChange={(value) => setFilters((f) => ({ ...f, district: value }))} options={meta.districts} />
        </div>
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={() => load(filters)}
            className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-500"
          >
            Apply Filters
          </button>
          <button
            type="button"
            onClick={() => {
              setFilters(EMPTY_FILTERS);
              load(EMPTY_FILTERS);
            }}
            className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
          >
            Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Production"
          value={formatNumber(kpis?.total_production)}
          unit="t"
          icon={<Icon name="production" />}
          accent="amber"
          footer="Filtered dataset"
        />
        <KpiCard
          label="Growth"
          value={formatPercent(kpis?.growth_pct)}
          icon={<Icon name="trend" />}
          accent={kpis?.growth_pct >= 0 ? "green" : "red"}
          footer="Compared to previous year"
        />
        <KpiCard
          label="Anomalies"
          value={formatNumber(kpis?.anomaly_count)}
          icon={<Icon name="orange" />}
          accent="red"
          footer="Statistical outliers"
        />
        <KpiCard
          label="Forecast Model"
          value={forecast?.model || "Pending"}
          icon={<Icon name="target" />}
          accent="violet"
          footer={forecast?.metrics?.mae != null ? `MAE ${forecast.metrics.mae}` : "No model yet"}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Production Trend" action={<span className="text-xs text-stone-400">Historical data</span>}>
          <ChartBox loading={loading} empty={!trend.length}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="prodTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7dfd4" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 12, fill: "#6b5c4b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#6b5c4b" }} axisLine={false} tickLine={false} width={56} />
                <Tooltip formatter={(value) => formatNumber(value)} contentStyle={{ borderRadius: 12, border: "1px solid #e7dfd4" }} />
                <Area type="monotone" dataKey="production" stroke="#d97706" strokeWidth={2} fill="url(#prodTrend)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartBox>
        </ChartCard>

        <ChartCard title="Actual vs Target" action={<span className="text-xs text-stone-400">Target rows only</span>}>
          <ChartBox loading={loading} empty={!targetRows.length}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={targetRows}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7dfd4" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 12, fill: "#6b5c4b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#6b5c4b" }} axisLine={false} tickLine={false} width={56} />
                <Tooltip formatter={(value) => formatNumber(value)} contentStyle={{ borderRadius: 12, border: "1px solid #e7dfd4" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="target" name="Target" fill="#9a7b4f" radius={[6, 6, 0, 0]} />
                <Bar dataKey="actual" name="Actual" fill="#d97706" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartBox>
        </ChartCard>

        <ChartCard title="Forecast" className="xl:col-span-2" action={<span className="text-xs text-stone-400">{forecast?.model || "No model"}</span>}>
          <ChartBox loading={loading} empty={!forecastRows.length}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={forecastSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7dfd4" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 12, fill: "#6b5c4b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#6b5c4b" }} axisLine={false} tickLine={false} width={56} />
                <Tooltip formatter={(value) => formatNumber(value)} contentStyle={{ borderRadius: 12, border: "1px solid #e7dfd4" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area dataKey="upper" name="Upper bound" stroke="none" fill="#f5d28a" fillOpacity={0.35} />
                <Area dataKey="lower" name="Lower bound" stroke="none" fill="#f5d28a" fillOpacity={0.15} />
                <Line type="monotone" dataKey="actual" name="Historical" stroke="#a16207" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                <Line type="monotone" dataKey="predicted" name="Forecast" stroke="#d97706" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartBox>
          {forecast?.metrics && (
            <div className="mt-3 rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs text-stone-500">
              MAE {forecast.metrics.mae ?? "N/A"} | RMSE {forecast.metrics.rmse ?? "N/A"} | MAPE {forecast.metrics.mape ?? "N/A"}
            </div>
          )}
        </ChartCard>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Top Mines">
          <ChartBox loading={loading} empty={!topMines.length}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topMines} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7dfd4" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#6b5c4b" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="mine" tick={{ fontSize: 11, fill: "#6b5c4b" }} width={110} axisLine={false} tickLine={false} />
                <Tooltip formatter={(value) => formatNumber(value)} contentStyle={{ borderRadius: 12, border: "1px solid #e7dfd4" }} />
                <Bar dataKey="production" fill="#0f766e" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartBox>
        </ChartCard>

        <ChartCard title="Anomaly Highlights" action={<span className="text-xs text-stone-400">{anomalyRows.length} flagged</span>}>
          <div className="space-y-3">
            {anomalyRows.length ? (
              anomalyRows.map((item) => (
                <div key={item.year} className="rounded-xl border border-stone-200 bg-white px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-semibold text-stone-800">{item.year}</div>
                      <div className="mt-1 text-xs text-stone-500">{item.reason}</div>
                    </div>
                    <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                      {item.severity}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">
                No anomalies were detected for the selected filter combination.
              </div>
            )}
          </div>
          {primaryAnomaly && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4">
              <div className="text-sm font-semibold text-red-800">Primary anomaly</div>
              <div className="mt-2 text-sm text-red-700">{primaryAnomaly.reason}</div>
              <div className="mt-3 text-xs text-red-700">
                Actual {formatNumber(primaryAnomaly.actual)} | Expected {formatNumber(primaryAnomaly.expected)} | Deviation {formatPercent(primaryAnomaly.deviation_pct)}
              </div>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label className="space-y-1.5">
      <span className="block text-xs font-semibold uppercase tracking-wide text-stone-400">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
      >
        <option value="">All</option>
        {options?.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ChartBox({ loading, empty, children }) {
  if (loading) {
    return <div className="flex h-[300px] items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50 text-sm text-stone-500">Loading production data...</div>;
  }
  if (empty) {
    return <div className="flex h-[300px] items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50 text-sm text-stone-500">No data available.</div>;
  }
  return <div className="h-[300px]">{children}</div>;
}

