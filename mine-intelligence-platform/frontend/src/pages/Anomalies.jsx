import { useEffect, useState } from "react";
import { api } from "../api/client";
import { ChartCard } from "../components/ChartCard";
import { Icon } from "../components/Icon";
import { KpiCard } from "../components/KpiCard";
import { formatNumber, formatPercent } from "../utils/format";

export function Anomalies() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [anomalies, setAnomalies] = useState(null);
  const [explanation, setExplanation] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      setAnomalies(await api.anomalies());
    } catch (err) {
      setError(err.message || "Could not load anomalies.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const primary = anomalies?.primary;
  const rows = anomalies?.anomalies || [];

  const explain = async () => {
    if (!primary) return;
    setAiLoading(true);
    setExplanation("");
    try {
      const prompt = `Explain this anomaly using only the computed context: ${JSON.stringify(primary)}`;
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
          thresholds.
        </p>
        {error && <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-50">{error}</div>}
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
              <EmptyState message="No anomalies were detected for the current dataset." />
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

function Tag({ children }) {
  return <span className="rounded-full bg-white px-2.5 py-1 font-medium text-red-700 ring-1 ring-red-200">{children}</span>;
}

function LoadingState() {
  return <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">Detecting anomalies...</div>;
}

function EmptyState({ message }) {
  return <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">{message}</div>;
}

