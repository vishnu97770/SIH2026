import { useEffect, useState } from "react";
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
import { districtsForState, loadStoredFilters, minesForState, saveStoredFilters } from "../utils/filterStorage";
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
  const [filters, setFilters] = useState(() => loadStoredFilters("shared_mine_filters", EMPTY_FILTERS));
  const [meta, setMeta] = useState({ years: [], mines: [], minerals: [], states: [], districts: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [kpis, setKpis] = useState(null);
  const [production, setProduction] = useState(null);

  useEffect(() => {
    saveStoredFilters("shared_mine_filters", filters);
  }, [filters]);

  const load = async (nextFilters = filters) => {
    setLoading(true);
    setError("");
    try {
      const session = await api.session();
      const query = Object.fromEntries(
        Object.entries(nextFilters).filter(([, value]) => value !== "" && value != null)
      );
      const [kp, prod] = await Promise.all([api.kpis(query), api.production(query)]);
      setMeta(session.filters || meta);
      setKpis(kp);
      setProduction(prod);
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
  const topMinerals = production?.production_by_mineral || [];
  const topStates = production?.production_by_state || [];
  const topDistricts = production?.production_by_district || [];
  const topPerformer = topMines[0];

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
              Inspect annual production, targets, and multi-dimensional breakdowns by mine,
              mineral, state, and district. Use the filters to update the analysis without leaving
              the page.
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
          </div>
        </div>
        {error && <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-50">{error}</div>}
      </div>

      <div className="rounded-2xl border border-stone-200 bg-[#fffaf1] p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-5">
          <SelectField label="Year" value={filters.year} onChange={(value) => setFilters((f) => ({ ...f, year: value }))} options={meta.years} />
          <SelectField label="Mine" value={filters.mine} onChange={(value) => setFilters((f) => ({ ...f, mine: value }))} options={minesForState(meta, filters.state)} />
          <SelectField label="Mineral" value={filters.mineral} onChange={(value) => setFilters((f) => ({ ...f, mineral: value }))} options={meta.minerals} />
          <SelectField label="State" value={filters.state} onChange={(value) => setFilters((f) => ({ ...f, state: value, mine: "", district: "" }))} options={meta.states} />
          <SelectField label="District" value={filters.district} onChange={(value) => setFilters((f) => ({ ...f, district: value }))} options={districtsForState(meta, filters.state)} />
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
          label="Top Performer"
          value={topPerformer ? topPerformer.mine : "N/A"}
          icon={<Icon name="target" />}
          accent="violet"
          footer={topPerformer ? `${formatNumber(topPerformer.production)} t produced` : "No data yet"}
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
      </div>

      {filters.mine && filters.mineral && filters.state && filters.district ? (
        <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">
          Every breakdown is filtered down to a single value, so there's nothing left to compare.
          Clear a filter above to see a breakdown chart again.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {!filters.mine && (
            <BreakdownChart title="Production by Mine" data={topMines} dataKey="mine" loading={loading} color="#0f766e" />
          )}
          {!filters.mineral && (
            <BreakdownChart title="Production by Mineral" data={topMinerals} dataKey="mineral" loading={loading} color="#b45309" />
          )}
          {!filters.state && (
            <BreakdownChart title="Production by State" data={topStates} dataKey="state" loading={loading} color="#7c3aed" />
          )}
          {!filters.district && (
            <BreakdownChart title="Production by District" data={topDistricts} dataKey="district" loading={loading} color="#0369a1" />
          )}
        </div>
      )}
    </div>
  );
}

function shortenLabel(value) {
  if (typeof value !== "string") return value;
  const match = value.match(/\(([^)]+)\)\s*$/);
  if (match) return match[1];
  return value.length > 16 ? `${value.slice(0, 15)}...` : value;
}

function BreakdownChart({ title, data, dataKey, loading, color }) {
  return (
    <ChartCard title={title}>
      <ChartBox loading={loading} empty={!data.length}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 10, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e7dfd4" horizontal={false} />
            <XAxis type="number" tick={{ fontSize: 11, fill: "#6b5c4b" }} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey={dataKey}
              tickFormatter={shortenLabel}
              tick={{ fontSize: 11, fill: "#6b5c4b" }}
              width={90}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(value) => formatNumber(value)}
              labelFormatter={(label) => label}
              contentStyle={{ borderRadius: 12, border: "1px solid #e7dfd4" }}
            />
            <Bar dataKey="production" fill={color} radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartBox>
    </ChartCard>
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
