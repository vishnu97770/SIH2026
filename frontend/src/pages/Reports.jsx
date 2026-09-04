import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { apiJson } from "../api/client";
import { Icon } from "../components/Icon";

export function Reports() {
  const [mine, setMine] = useState("Mine X");
  const [reportType, setReportType] = useState("Mine Intelligence Report");
  const [report, setReport] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  const generate = async () => {
    setGenerating(true);
    setError("");
    try {
      const res = await apiJson("/report", "POST", { mine, report_type: reportType });
      setReport(res);
    } catch (err) {
      setError(err.message || "Could not generate the report.");
    } finally {
      setGenerating(false);
    }
  };

  const downloadPdf = async () => {
    setDownloading(true);
    try {
      const blob = await apiJson("/report/pdf", "GET");
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "mine_intelligence_report.pdf";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message || "Could not download the PDF.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-stone-900">Automated Mine Intelligence Report</h2>
        <p className="mt-1 text-sm text-stone-500">
          Combine production analysis, anomalies, forecast and AI insights into a structured report.
        </p>
      </div>

      <div className="rounded-xl border border-stone-200 bg-[#fffaf1] p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Mine">
            <select
              value={mine}
              onChange={(e) => setMine(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
            >
              <option>Mine X</option>
              <option disabled>Zamania (demo)</option>
              <option disabled>North Block (demo)</option>
            </select>
          </Field>

          <Field label="Report type">
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
            >
              <option>Mine Intelligence Report</option>
            </select>
          </Field>

          <div className="flex items-end">
            <button
              onClick={generate}
              disabled={generating}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {generating ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  Generating...
                </>
              ) : (
                <>
                  <Icon name="reports" className="h-4 w-4" />
                  Generate Report
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      {report && (
        <ReportPreview
          report={report}
          downloading={downloading}
          onDownload={downloadPdf}
        />
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-stone-700">{label}</label>
      {children}
    </div>
  );
}

function ReportPreview({ report, downloading, onDownload }) {
  const prod = report.production;
  const prodChartData = prod.years.map((y, i) => ({
    year: String(y),
    actual: prod.actual[i],
    target: prod.target[i],
  }));
  const fc = report.forecast;

  return (
    <div className="rounded-xl border border-stone-200 bg-[#fffaf1] shadow-sm">
      <div className="flex items-center justify-between border-b border-stone-200 px-6 py-4">
        <div>
          <h3 className="text-sm font-semibold text-stone-800">{report.title}</h3>
          <p className="text-xs text-stone-400">{report.reportType} · Generated {report.generatedAt}</p>
        </div>
        <button
          onClick={onDownload}
          disabled={downloading}
          className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:opacity-60"
        >
          {downloading ? "Preparing..." : "Download PDF"}
        </button>
      </div>

      <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
        <Section n="1" title="Executive Summary">
          <p className="text-sm leading-relaxed text-stone-600">{report.executive_summary}</p>
        </Section>

        <Section n="2" title="Mine Overview">
          <div className="grid grid-cols-3 gap-4">
            <OverviewStat label="Mine" value={report.mine_overview.mine} />
            <OverviewStat label="Type" value={report.mine_overview.type} />
            <OverviewStat label="Reserves" value={report.mine_overview.reserves} />
          </div>
        </Section>

        <Section n="3" title="Production Performance">
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={prodChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6dccd" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 12, fill: "#756a5d" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#756a5d" }} axisLine={false} tickLine={false} width={55} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e6dccd", fontSize: 12 }} />
                <Bar dataKey="target" name="Target" fill="#a89a86" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" name="Actual" fill="#b86b2a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Section>

        <Section n="4" title="Detected Anomalies">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="text-sm font-semibold text-red-800">{report.primary_anomaly.title}</div>
            <p className="mt-1 text-sm text-red-700">{report.primary_anomaly.explanation}</p>
          </div>
        </Section>

        <Section n="5" title="Production Forecast">
          <div className="grid grid-cols-3 gap-4">
            {fc.years.map((y, i) => (
              <div key={y} className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-center">
                <div className="text-xs font-medium uppercase tracking-wide text-amber-600">{y}</div>
                <div className="mt-1 text-lg font-semibold text-stone-900">{Number(fc.values[i]).toLocaleString()} t</div>
                <div className="text-xs text-stone-400">
                  {Number(fc.lower[i]).toLocaleString()} – {Number(fc.upper[i]).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-stone-400">{fc.note}</p>
        </Section>

        <Section n="6" title="AI Insights">
          <p className="text-sm leading-relaxed text-stone-600">{report.ai_insights}</p>
        </Section>

        <Section n="7" title="Evidence & References">
          <ul className="space-y-1.5">
            {report.citations.map((c, i) => (
              <li key={i} className="flex items-center gap-2 text-sm text-stone-600">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-50 text-xs font-medium text-amber-700">
                  {i + 1}
                </span>
                {c.document} · p.{c.page}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-stone-400">
            Demo/sample report generated for the hackathon prototype. Not official government data.
          </p>
        </Section>
      </div>
    </div>
  );
}

function Section({ n, title, children }) {
  return (
    <section>
      <h4 className="mb-3 border-b border-stone-100 pb-2 text-sm font-semibold text-stone-800">
        {n}. {title}
      </h4>
      {children}
    </section>
  );
}

function OverviewStat({ label, value }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-stone-400">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-stone-800">{value}</div>
    </div>
  );
}
