import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
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
import { formatNumber } from "../utils/format";

export function Forecast() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [forecast, setForecast] = useState(null);
  const [filters, setFilters] = useState({ horizon: 3 });

  const load = async (next = filters) => {
    setLoading(true);
    setError("");
    try {
      setForecast(await api.forecast(next));
    } catch (err) {
      setError(err.message || "Could not load forecast.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const series = useMemo(() => {
    const historical = (forecast?.historical || []).map((row) => ({
      year: row.year,
      actual: row.production,
    }));
    const future = (forecast?.forecast || []).map((row) => ({
      year: row.year,
      predicted: row.predicted_production,
      lower: row.lower_bound,
      upper: row.upper_bound,
    }));
    return [...historical, ...future];
  }, [forecast]);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-stone-200 bg-gradient-to-r from-stone-950 via-stone-900 to-amber-950 p-6 text-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-amber-100">
              <Icon name="trend" className="h-4 w-4" />
              Forecasting
            </div>
            <h2 className="mt-4 text-3xl font-semibold">Model-based production forecast</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-300">
              The backend trains a saved time-series model and serves the forecast with confidence
              bounds. Retraining uses the current uploaded dataset.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => load(filters)}
              className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-400"
            >
              Refresh Forecast
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
              Retrain
            </button>
          </div>
        </div>
        {error && <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-50">{error}</div>}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Model" value={forecast?.model || "Pending"} icon={<Icon name="target" />} accent="violet" footer="Best validated model" />
        <KpiCard label="MAE" value={forecast?.metrics?.mae ?? "N/A"} icon={<Icon name="production" />} accent="amber" footer="Validation error" />
        <KpiCard label="RMSE" value={forecast?.metrics?.rmse ?? "N/A"} icon={<Icon name="trend" />} accent="green" footer="Validation error" />
      </div>

      <div className="rounded-2xl border border-stone-200 bg-[#fffaf1] p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1.5">
            <span className="block text-xs font-semibold uppercase tracking-wide text-stone-400">Horizon</span>
            <select
              value={filters.horizon}
              onChange={(e) => setFilters((f) => ({ ...f, horizon: Number(e.target.value) }))}
              className="rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
            >
              {[1, 2, 3, 4, 5, 6].map((value) => (
                <option key={value} value={value}>
                  {value} year{value > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => load(filters)}
            className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-500"
          >
            Apply
          </button>
        </div>
      </div>

      <ChartCard title="Forecast with Confidence Interval" action={<span className="text-xs text-stone-400">Historical + forecast</span>}>
        <ChartBox loading={loading} empty={!series.length}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={series}>
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
      </ChartCard>

      <div className="grid gap-4 sm:grid-cols-3">
        {(forecast?.forecast || []).map((row) => (
          <div key={row.year} className="rounded-2xl border border-stone-200 bg-[#fffaf1] p-4 shadow-sm">
            <div className="text-xs font-semibold uppercase tracking-wide text-stone-400">{row.year} forecast</div>
            <div className="mt-2 text-2xl font-bold text-stone-900">{formatNumber(row.predicted_production)}</div>
            <div className="mt-1 text-xs text-stone-400">
              {formatNumber(row.lower_bound)} - {formatNumber(row.upper_bound)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChartBox({ loading, empty, children }) {
  if (loading) {
    return <div className="flex h-[360px] items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50 text-sm text-stone-500">Generating forecast...</div>;
  }
  if (empty) {
    return <div className="flex h-[360px] items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50 text-sm text-stone-500">No forecast available yet.</div>;
  }
  return <div className="h-[360px]">{children}</div>;
}

