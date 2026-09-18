import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
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
import { KpiCard } from "../components/KpiCard";
import { Icon } from "../components/Icon";
import { formatNumber, formatPercent } from "../utils/format";

const EMPTY_FILTERS = {
  year: "",
  mine: "",
  mineral: "",
  state: "",
  district: "",
};

const initialState = {
  loading: true,
  error: "",
  message: "",
  session: null,
  filtersMeta: { years: [], mines: [], minerals: [], states: [], districts: [] },
  kpis: null,
  production: null,
  anomalies: null,
  forecast: null,
  documents: [],
};

export function Dashboard() {
  const [state, setState] = useState(initialState);
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  const loadDashboard = async (nextFilters = filters) => {
    setState((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const session = await api.session();
      const query = Object.fromEntries(
        Object.entries(nextFilters).filter(([, value]) => value !== "" && value != null)
      );
      const [kpis, production, anomalies, forecast, documents] = await Promise.all([
        api.kpis(query),
        api.production(query),
        api.anomalies(query),
        api.forecast({ ...query, horizon: 3 }),
        api.documents().catch(() => ({ documents: [] })),
      ]);

      setState((prev) => ({
        ...prev,
        loading: false,
        session,
        filtersMeta: session?.filters || prev.filtersMeta,
        kpis,
        production,
        anomalies,
        forecast,
        documents: documents?.documents || [],
      }));

      if (!session?.session?.has_data) {
        setState((prev) => ({
          ...prev,
          message: "Upload a CSV/XLSX production dataset to activate the analytics dashboard — or upload any other mining document to add it to the knowledge base.",
        }));
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err.message || "Failed to load dashboard data.",
      }));
    }
  };

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyFilters = () => loadDashboard(filters);
  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    loadDashboard(EMPTY_FILTERS);
  };

  const quality = state.session?.quality || {};
  const prod = state.production || { historical: [] };
  const yearlyTrend = prod.historical || [];
  const forecastRows = state.forecast?.forecast || [];
  const anomalyRows = state.anomalies?.anomalies || [];
  const topMineRows = prod.production_by_mine || [];
  const topMineralRows = prod.production_by_mineral || [];

  const targetTrend = useMemo(
    () =>
      yearlyTrend
        .filter((row) => row.target != null)
        .map((row) => ({
          year: row.year,
          actual: row.production,
          target: row.target,
          achievement: row.target ? (row.production / row.target) * 100 : null,
        })),
    [yearlyTrend]
  );

  return (
    <div className="space-y-6">
      {state.message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {state.message}
        </div>
      )}
      {state.error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div className="rounded-2xl border border-stone-200 bg-[#fffaf1] p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-5">
          <SelectField label="Year" value={filters.year} onChange={(value) => setFilters((f) => ({ ...f, year: value }))} options={state.filtersMeta.years} />
          <SelectField label="Mine" value={filters.mine} onChange={(value) => setFilters((f) => ({ ...f, mine: value }))} options={state.filtersMeta.mines} />
          <SelectField label="Mineral" value={filters.mineral} onChange={(value) => setFilters((f) => ({ ...f, mineral: value }))} options={state.filtersMeta.minerals} />
          <SelectField label="State" value={filters.state} onChange={(value) => setFilters((f) => ({ ...f, state: value }))} options={state.filtersMeta.states} />
          <SelectField label="District" value={filters.district} onChange={(value) => setFilters((f) => ({ ...f, district: value }))} options={state.filtersMeta.districts} />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={applyFilters}
            className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-500"
          >
            Apply Filters
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-50"
          >
            Clear Filters
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Total Production"
          value={formatNumber(state.kpis?.total_production)}
          unit="t"
          icon={<Icon name="production" />}
          accent="amber"
          footer="All filtered records"
        />
        <KpiCard
          label="Latest Production"
          value={formatNumber(state.kpis?.latest_production)}
          unit="t"
          icon={<Icon name="trend" />}
          accent="green"
          footer={`Year ${state.kpis?.latest_year ?? "N/A"}`}
        />
        <KpiCard
          label="Growth"
          value={formatPercent(state.kpis?.growth_pct)}
          icon={<Icon name="dashboard" />}
          accent={state.kpis?.growth_pct >= 0 ? "green" : "red"}
          footer="Year over year"
        />
        <KpiCard
          label="Target Achievement"
          value={formatPercent(state.kpis?.target_achievement_pct)}
          icon={<Icon name="target" />}
          accent="slate"
          footer={state.kpis?.target_achievement_pct == null ? "No target data" : "Actual vs target"}
        />
        <KpiCard
          label="Anomalies"
          value={formatNumber(state.kpis?.anomaly_count)}
          icon={<Icon name="orange" />}
          accent="red"
          footer="Statistically flagged"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          title="Production Trend"
          action={<span className="text-xs text-stone-400">Historical output</span>}
        >
          <ChartShell loading={state.loading} empty={!yearlyTrend.length}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={yearlyTrend}>
                <defs>
                  <linearGradient id="dashboardTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#d97706" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#d97706" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7dfd4" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 12, fill: "#6b5c4b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#6b5c4b" }} axisLine={false} tickLine={false} width={56} />
                <Tooltip formatter={(value) => formatNumber(value)} contentStyle={{ borderRadius: 12, border: "1px solid #e7dfd4" }} />
                <Area type="monotone" dataKey="production" stroke="#d97706" strokeWidth={2} fill="url(#dashboardTrend)" />
              </AreaChart>
            </ResponsiveContainer>
          </ChartShell>
        </ChartCard>

        <ChartCard
          title="Target vs Actual"
          action={<span className="text-xs text-stone-400">If target exists</span>}
        >
          <ChartShell loading={state.loading} empty={!targetTrend.length}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={targetTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7dfd4" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 12, fill: "#6b5c4b" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#6b5c4b" }} axisLine={false} tickLine={false} width={56} />
                <Tooltip formatter={(value) => formatNumber(value)} contentStyle={{ borderRadius: 12, border: "1px solid #e7dfd4" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="target" name="Target" fill="#9a7b4f" radius={[6, 6, 0, 0]} />
                <Bar dataKey="actual" name="Actual" fill="#d97706" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartShell>
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
        className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm outline-none ring-0 transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
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

function Metric({ label, value }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3">
      <span className="text-sm text-stone-500">{label}</span>
      <span className="text-sm font-semibold text-stone-800">{value}</span>
    </div>
  );
}

function ChartShell({ loading, empty, children }) {
  if (loading) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50 text-sm text-stone-500">
        Loading analysis...
      </div>
    );
  }

  if (empty) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-2xl border border-dashed border-stone-200 bg-stone-50 text-sm text-stone-500">
        No data available for this view.
      </div>
    );
  }

  return <div className="h-[320px]">{children}</div>;
}

function EmptyState({ message }) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">
      {message}
    </div>
  );
}
