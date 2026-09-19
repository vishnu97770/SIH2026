import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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

const FRIENDLY_MODEL_NAMES = {
  linear_trend: "Straight-line trend",
  moving_average: "Moving average",
  seasonal_naive: "Seasonal pattern",
};

function friendlyModelName(model) {
  if (!model) return "Pending";
  return FRIENDLY_MODEL_NAMES[model] || model;
}

function ForecastTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const find = (key) => payload.find((p) => p.dataKey === key)?.value;
  const actual = find("actual");
  const predicted = find("predicted");

  return (
    <div className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-xs shadow-sm">
      <div className="mb-1 font-semibold text-stone-800">{label}</div>
      {actual != null && <div className="text-stone-600">Actual production: {formatNumber(actual)} t</div>}
      {predicted != null && <div className="text-amber-700">Predicted production: {formatNumber(predicted)} t</div>}
    </div>
  );
}

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
    }));
    return [...historical, ...future];
  }, [forecast]);

  const forecastRows = forecast?.forecast || [];
  const mae = forecast?.metrics?.mae;
  const rmse = forecast?.metrics?.rmse;
  const errorRangeText =
    mae != null && rmse != null ? `${formatNumber(Math.min(mae, rmse))} - ${formatNumber(Math.max(mae, rmse))} t` : "N/A";

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-stone-200 bg-gradient-to-r from-stone-950 via-stone-900 to-amber-950 p-6 text-white">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-amber-100">
              <Icon name="trend" className="h-4 w-4" />
              Forecasting
            </div>
            <h2 className="mt-4 text-3xl font-semibold">What to expect in the coming years</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-300">
              Based on the production pattern in your uploaded data, here's what the model expects
              next - along with how far off it's typically been in the past.
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

      <div className="grid gap-4 sm:grid-cols-3">
        {loading ? (
          <div className="col-span-3 rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">
            Generating forecast...
          </div>
        ) : forecastRows.length ? (
          forecastRows.map((row) => (
            <div key={row.year} className="rounded-2xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-amber-700">{row.year} Forecast</div>
              <div className="mt-2 text-3xl font-bold text-stone-900">{formatNumber(row.predicted_production)} t</div>
              <div className="mt-1 text-xs text-stone-500">
                Likely range: {formatNumber(row.lower_bound)} - {formatNumber(row.upper_bound)} t
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-3 rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">
            No forecast available yet.
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-stone-200 bg-[#fffaf1] p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="space-y-1.5">
            <span className="block text-xs font-semibold uppercase tracking-wide text-stone-400">How many years ahead?</span>
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <KpiCard label="Forecast Method" value={friendlyModelName(forecast?.model)} icon={<Icon name="target" />} accent="violet" footer="How the prediction is calculated" />
        <KpiCard label="Typical Error" value={errorRangeText} icon={<Icon name="production" />} accent="amber" footer="How far off past predictions have usually been" />
      </div>

      <ChartCard title="Actual vs. Predicted Production" action={<span className="text-xs text-stone-400">By year</span>}>
        <ChartBox loading={loading} empty={!series.length}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7dfd4" vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 12, fill: "#6b5c4b" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "#6b5c4b" }} axisLine={false} tickLine={false} width={56} />
              <Tooltip content={<ForecastTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="actual" name="What actually happened" fill="#a16207" radius={[6, 6, 0, 0]} />
              <Bar dataKey="predicted" name="What we expect" fill="#d97706" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartBox>
        <p className="mt-3 text-xs text-stone-400">
          Lighter bars are estimates, not real numbers yet - see the "likely range" on each forecast
          card above for how much they could vary.
        </p>
      </ChartCard>
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
