import { useState } from "react";
import { api } from "../api/client";
import { ChartCard } from "../components/ChartCard";
import { Icon } from "../components/Icon";
import { formatNumber, formatPercent } from "../utils/format";

export function Reports() {
  const [mine, setMine] = useState("");
  const [reportType, setReportType] = useState("Mining Production Intelligence Report");
  const [report, setReport] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    setGenerating(true);
    setError("");
    try {
      setReport(await api.generateReport({ mine: mine || null, report_type: reportType }));
    } catch (err) {
      setError(err.message || "Could not generate the report.");
    } finally {
      setGenerating(false);
    }
  };

  const downloadPdf = async () => {
    setDownloading(true);
    setError("");
    try {
      const blob = await api.downloadReportPdf({ mine: mine || undefined, report_type: reportType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "mine_intelligence_report.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "Could not download the PDF.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-stone-200 bg-gradient-to-r from-stone-950 via-stone-900 to-amber-950 p-6 text-white">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-amber-100">
          <Icon name="reports" className="h-4 w-4" />
          Intelligence reports
        </div>
        <h2 className="mt-4 text-3xl font-semibold">Analytical report generation</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-300">
          The report uses computed KPIs, anomaly findings, and forecast output. Groq can add
          narrative explanation, but it never invents the underlying numbers.
        </p>
        {error && <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-50">{error}</div>}
      </div>

      <div className="rounded-2xl border border-stone-200 bg-[#fffaf1] p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Mine">
            <input
              value={mine}
              onChange={(e) => setMine(e.target.value)}
              placeholder="Optional mine filter"
              className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
            />
          </Field>
          <Field label="Report type">
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
            >
              <option value="Mining Production Intelligence Report">Mining Production Intelligence Report</option>
            </select>
          </Field>
          <div className="flex items-end gap-3">
            <button
              type="button"
              onClick={generate}
              disabled={generating}
              className="flex-1 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:opacity-50"
            >
              {generating ? "Generating..." : "Generate Report"}
            </button>
            <button
              type="button"
              onClick={downloadPdf}
              disabled={downloading}
              className="flex-1 rounded-xl border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:opacity-50"
            >
              {downloading ? "Preparing..." : "Download PDF"}
            </button>
          </div>
        </div>
      </div>

      {report ? (
        <div className="space-y-4">
          <ChartCard
            title={report.title}
            action={<span className="text-xs text-stone-400">Generated {new Date(report.generated_at).toLocaleString()}</span>}
          >
            <p className="text-sm leading-6 text-stone-600">{report.executive_summary}</p>
          </ChartCard>

          <div className="grid gap-4 md:grid-cols-3">
            <ReportMetric label="Quality score" value={`${report.dataset_overview?.quality_score ?? "N/A"} / 100`} />
            <ReportMetric label="Anomalies" value={formatNumber(report.kpis?.anomaly_count)} />
            <ReportMetric label="Latest production" value={formatNumber(report.kpis?.latest_production)} />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <ReportListCard title="Major Insights" items={report.major_insights || []} />
            <ReportListCard title="Risk Indicators" items={report.risk_indicators || []} tone="red" />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <ChartCard title="Forecast">
              <div className="space-y-2">
                {(report.forecast?.forecast || []).map((row) => (
                  <div key={row.year} className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3">
                    <div>
                      <div className="text-sm font-semibold text-stone-800">{row.year}</div>
                      <div className="text-xs text-stone-500">
                        {formatNumber(row.lower_bound)} - {formatNumber(row.upper_bound)}
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-stone-800">{formatNumber(row.predicted_production)}</div>
                  </div>
                ))}
              </div>
            </ChartCard>

            <ChartCard title="Recommendations">
              <div className="space-y-2">
                {(report.recommendations || []).map((item, index) => (
                  <div key={index} className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-700">
                    {item}
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-stone-200 bg-stone-50 px-4 py-3 text-xs text-stone-500">
                AI narrative is grounded in the dataset and calculated metrics.
              </div>
            </ChartCard>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-stone-200 bg-stone-50 px-4 py-10 text-center text-sm text-stone-500">
          Generate a report to preview the full intelligence summary.
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="space-y-1.5">
      <span className="block text-sm font-medium text-stone-700">{label}</span>
      {children}
    </label>
  );
}

function ReportMetric({ label, value }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-[#fffaf1] p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-stone-400">{label}</div>
      <div className="mt-2 text-xl font-semibold text-stone-900">{value}</div>
    </div>
  );
}

function ReportListCard({ title, items, tone = "amber" }) {
  const toneClass = tone === "red" ? "text-red-700" : "text-stone-700";
  return (
    <ChartCard title={title}>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className={`rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm leading-6 ${toneClass}`}>
            {item}
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

