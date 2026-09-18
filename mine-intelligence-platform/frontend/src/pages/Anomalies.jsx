import { useEffect, useState } from "react";
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

export function Anomalies() {
  const [filters, setFilters] = useState(() => loadStoredFilters("shared_mine_filters", EMPTY_FILTERS));
  const [meta, setMeta] = useState({ years: [], mines: [], minerals: [], states: [], districts: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [anomalies, setAnomalies] = useState(null);
  const [explanation, setExplanation] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

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
      setMeta(session.filters || meta);
      setAnomalies(await api.anomalies(query));
    } catch (err) {
      setError(err.message || "Could not load anomalies.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const primary = anomalies?.primary;
  const rows = anomalies?.anomalies || [];

  const explain = async () => {
    if (!primary) return;
    setAiLoading(true);
    setExplanation("");
    try {
      // Describe the currently applied filters as plain text (not JSON) so the
      // assistant's own entity matching picks up the same mine/state/district
      // this page is filtered to - and deliberately avoid mentioning the
      // specific year, since a bare 4-digit number gets misread as a year
      // filter, narrowing the data to one row where anomaly detection can't
      // run at all (it needs multiple years to know what's "expected").
      const filterPhrase = Object.entries(filters)
        .filter(([key, value]) => value && key !== "year")
        .map(([key, value]) => `${key} ${value}`)
        .join(" and ");
      const prompt = filterPhrase
        ? `Explain the most significant production anomaly for ${filterPhrase}, using the computed anomaly evidence.`
        : "Explain the most significant production anomaly across all records, using the computed anomaly evidence.";
      const res = await api.askAssistant(prompt);
      setExplanation(res.answer);
    } catch (err) {
      setExplanation(err.message || "Could not generate an explanation.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-stone-200 bg-gradient-to-r from-stone-950 via-stone-900 to-amber-950 p-6 text-white">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-amber-100">
          <Icon name="orange" className="h-4 w-4" />
          Anomaly detection
        </div>
        <h2 className="mt-4 text-3xl font-semibold">Statistical anomaly timeline</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-300">
          Anomalies are derived from historical behavior and expected production, not fixed
          thresholds. Filter below to check a specific mine, mineral, state, or district instead
          of the combined total.
        </p>
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiCard label="Signals" value={formatNumber(rows.length)} icon={<Icon name="orange" />} accent="red" footer="Flagged years" />
        <KpiCard label="High/Critical" value={formatNumber(rows.filter((row) => ["HIGH", "CRITICAL"].includes(row.severity)).length)} icon={<Icon name="target" />} accent="amber" footer="Most important" />
        <KpiCard label="Primary deviation" value={formatPercent(primary?.deviation_pct)} icon={<Icon name="trend" />} accent={primary?.deviation_pct < 0 ? "red" : "green"} footer="Versus expected" />
      </div>

      {primary && (
        <div className="rounded-3xl border border-red-200 bg-red-50 p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold text-red-800">Primary anomaly</div>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-red-700 ring-1 ring-red-200">
                  {primary.severity}
                </span>
              </div>
              <div className="mt-3 text-3xl font-bold text-red-800">{formatPercent(primary.deviation_pct)}</div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-red-700">{primary.reason}</p>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-red-700">
                <Tag>Actual {formatNumber(primary.actual)}</Tag>
                <Tag>Expected {formatNumber(primary.expected)}</Tag>
                <Tag>Previous {formatNumber(primary.previous_year)}</Tag>
                <Tag>YoY {formatPercent(primary.yoy_change_pct)}</Tag>
                {primary.target_deviation_pct != null && <Tag>Target {formatPercent(primary.target_deviation_pct)}</Tag>}
              </div>
            </div>
            <button
              type="button"
              onClick={explain}
              disabled={aiLoading}
              className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
            >
              {aiLoading ? "Explaining..." : "Explain with AI"}
            </button>
          </div>
          {explanation && (
            <div className="mt-4 rounded-2xl border border-red-200 bg-white/70 p-4 text-sm leading-6 text-red-800">
              {explanation}
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Detected Years" action={<span className="text-xs text-stone-400">Sorted by severity</span>}>
          <div className="space-y-3">
            {loading ? (
              <LoadingState />
            ) : rows.length ? (
              rows.map((row) => (
                <div key={row.year} className="rounded-2xl border border-stone-200 bg-[#fffaf1] px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-stone-800">
                        {row.year} | {row.severity}
                      </div>
                      <div className="mt-1 text-xs text-stone-500">{row.reason}</div>
                    </div>
                    <div className="text-right text-sm text-stone-700">
                      <div>{formatPercent(row.deviation_pct)}</div>
                      <div className="text-xs text-stone-400">score {row.anomaly_score}</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState message="No years exceeded the statistical anomaly threshold for the current filters. This means production stayed close to what the model expected - see the year-by-year comparison on the right for the full picture." />
            )}
          </div>
        </ChartCard>

        <ChartCard title="Anomaly Timeline" action={<span className="text-xs text-stone-400">Expected vs actual</span>}>
          <div className="space-y-3">
            {loading ? (
              <LoadingState />
            ) : anomalies?.timeline?.length ? (
              anomalies.timeline.map((row) => (
                <div key={row.year} className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-stone-800">{row.year}</div>
                      <div className="mt-1 text-xs text-stone-500">
                        Actual {formatNumber(row.actual)} | Expected {formatNumber(row.expected)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-stone-800">{row.severity}</div>
                      <div className="text-xs text-stone-500">{formatPercent(row.deviation_pct)}</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <EmptyState message="Upload a dataset to calculate anomaly scores." />
            )}
          </div>
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

function Tag({ children }) {
  return <span className="rounded-full bg-white px-2.5 py-1 font-medium text-red-700 ring-1 ring-red-200">{children}</span>;
}

function LoadingState() {
  return <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">Detecting anomalies...</div>;
}

function EmptyState({ message }) {
  return <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">{message}</div>;
}
