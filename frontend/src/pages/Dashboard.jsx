import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { kpiData, productionData, recentDocuments, recentAnomalies, quickActions } from "../data/mockData";
import { KpiCard } from "../components/KpiCard";
import { ChartCard } from "../components/ChartCard";
import { DocumentCard } from "../components/DocumentCard";
import { AnomalyCard } from "../components/AnomalyCard";
import { AnomalyModal } from "../components/AnomalyModal";
import { QuickActionCard } from "../components/QuickActionCard";
import { Icon } from "../components/Icon";

const fmt = (v) => Number(v).toLocaleString();

const recentActivity = [
  { id: 1, text: "Mine X Geological Report processed", time: "2 h ago", kind: "doc" },
  { id: 2, text: "2024 production anomaly flagged (High)", time: "5 h ago", kind: "anomaly" },
  { id: 3, text: "Mine Intelligence Report generated", time: "1 d ago", kind: "report" },
  { id: 4, text: "Forecast for 2026–2028 updated", time: "2 d ago", kind: "forecast" },
];

const kindStyles = {
  doc: "bg-amber-100 text-amber-700",
  anomaly: "bg-red-100 text-red-700",
  report: "bg-orange-100 text-orange-700",
  forecast: "bg-amber-100 text-amber-700",
};

export function Dashboard() {
  const [selectedAnomaly, setSelectedAnomaly] = useState(null);

  const trendData = productionData.years.map((y, i) => ({
    year: String(y),
    production: productionData.actual[i],
  }));

  const targetData = productionData.years.map((y, i) => ({
    year: String(y),
    target: productionData.target[i],
    actual: productionData.actual[i],
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-stone-900">Mining Intelligence Dashboard</h2>
        <p className="mt-1 text-sm text-stone-500">
          AI-powered mining &amp; geological intelligence — monitor operations, discover insights, and make evidence-backed decisions.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Documents" value={kpiData.totalDocuments} icon={<Icon name="documents" />} accent="blue" footer="Across all connected mines" />
        <KpiCard label="Processed Documents" value={kpiData.processedDocuments} icon={<Icon name="file" />} accent="green" footer={`${Math.round((kpiData.processedDocuments / kpiData.totalDocuments) * 100)}% processing complete`} />
        <KpiCard label="Production Anomalies" value={kpiData.productionAnomalies} icon={<Icon name="orange" />} accent="red" footer="2 flagged as high priority" />
        <KpiCard label="Forecast Available" value="2026–2028" icon={<Icon name="trend" />} accent="amber" footer="Mine X production outlook" />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <ChartCard title="Production Trend" action={<span className="text-xs text-stone-400">Mine X · tonnes/yr</span>}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="prodDash" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#c8872d" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#c8872d" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e6dccd" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 12, fill: "#756a5d" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#756a5d" }} axisLine={false} tickLine={false} width={55} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v) => `${fmt(v)} tonnes`} contentStyle={{ borderRadius: 8, border: "1px solid #e6dccd", fontSize: 12 }} />
                <Area type="monotone" dataKey="production" stroke="#c8872d" strokeWidth={2} fill="url(#prodDash)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Target vs Actual" action={<span className="text-xs text-stone-400">tonnes/yr</span>}>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={targetData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }} barGap={4}>
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

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <ChartCard title="Recent Documents" className="xl:col-span-1">
          <div className="space-y-2">
            {recentDocuments.slice(0, 3).map((doc) => (
              <DocumentCard key={doc.id} doc={doc} />
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Recent Activity" className="xl:col-span-1">
          <div className="space-y-3">
            {recentActivity.map((a) => (
              <div key={a.id} className="flex items-center gap-3">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${kindStyles[a.kind]}`}>
                  {a.kind === "doc" ? "D" : a.kind === "anomaly" ? "!" : a.kind === "report" ? "R" : "F"}
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm text-stone-700">{a.text}</div>
                  <div className="text-xs text-stone-400">{a.time}</div>
                </div>
              </div>
            ))}
          </div>
        </ChartCard>

        <ChartCard title="Quick Actions" className="xl:col-span-1">
          <div className="flex flex-col gap-3">
            {quickActions.map((a) => (
              <QuickActionCard key={a.id} {...a} />
            ))}
          </div>
        </ChartCard>
      </div>

      {selectedAnomaly && (
        <AnomalyModal anomaly={selectedAnomaly} onClose={() => setSelectedAnomaly(null)} />
      )}
    </div>
  );
}
