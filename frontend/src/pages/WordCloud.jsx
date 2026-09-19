import { useEffect, useState } from "react";
import { api } from "../api/client";
import { ChartCard } from "../components/ChartCard";
import { Icon } from "../components/Icon";
import { formatNumber } from "../utils/format";

// Fixed topic -> color order. Matches the backend's TOPIC_KEYWORDS order
// exactly and is validated for categorical CVD separation - never reorder
// or recolor a single topic without re-checking that adjacency.
const TOPIC_STYLES = {
  production: { label: "Production & Output", text: "text-amber-600", dot: "bg-amber-600", chip: "border-amber-200 bg-amber-50 text-amber-800" },
  target: { label: "Targets & Achievement", text: "text-sky-600", dot: "bg-sky-600", chip: "border-sky-200 bg-sky-50 text-sky-800" },
  anomaly: { label: "Anomalies & Deviations", text: "text-emerald-600", dot: "bg-emerald-600", chip: "border-emerald-200 bg-emerald-50 text-emerald-800" },
  forecast: { label: "Forecast & Projections", text: "text-violet-600", dot: "bg-violet-600", chip: "border-violet-200 bg-violet-50 text-violet-800" },
  geography: { label: "Geography & Regional Spread", text: "text-teal-600", dot: "bg-teal-600", chip: "border-teal-200 bg-teal-50 text-teal-800" },
  mineral: { label: "Minerals & Commodities", text: "text-rose-600", dot: "bg-rose-600", chip: "border-rose-200 bg-rose-50 text-rose-800" },
};
const OTHER_STYLE = { label: "Other terms", text: "text-stone-500", dot: "bg-stone-400", chip: "border-stone-200 bg-stone-50 text-stone-600" };

function styleFor(topic) {
  return TOPIC_STYLES[topic] || OTHER_STYLE;
}

function fontSizePx(weight) {
  // sqrt scale so one dominant term doesn't visually swamp the rest.
  return Math.round(13 + Math.sqrt(Math.max(weight, 0)) * 30);
}

export function WordCloud() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const res = await api.wordcloud();
        if (!cancelled) setData(res);
      } catch (err) {
        if (!cancelled) setError(err.message || "Could not load word cloud insights.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-stone-200 bg-gradient-to-r from-stone-950 via-stone-900 to-amber-950 p-6 text-white">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-amber-100">
          <Icon name="cloud" className="h-4 w-4" />
          Word Cloud & Topic Identification
        </div>
        <h2 className="mt-4 text-3xl font-semibold">What this session is actually about</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-300">
          Term frequency and topic weighting computed from the active dataset's mines, minerals,
          states and districts; the sample knowledge-base documents; and the questions asked in
          this assistant session - the same signal a recurring-inquiry log would surface.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {loading ? (
        <LoadingBox />
      ) : !data?.has_data ? (
        <EmptyState />
      ) : (
        <>
          <div className="grid gap-4 xl:grid-cols-[1.3fr,0.9fr]">
            <ChartCard
              title="Term frequency"
              action={<span className="text-xs text-stone-400">{data.words.length} terms</span>}
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2">
                {data.words.map((word) => {
                  const style = styleFor(word.topic);
                  return (
                    <span
                      key={word.text}
                      title={`${word.text} - ${formatNumber(word.count)} mentions${word.topic ? ` - ${styleFor(word.topic).label}` : ""}`}
                      className={`font-semibold leading-none ${style.text}`}
                      style={{ fontSize: `${fontSizePx(word.weight)}px` }}
                    >
                      {word.text}
                    </span>
                  );
                })}
              </div>

              <details className="mt-4 border-t border-stone-200 pt-3">
                <summary className="cursor-pointer text-xs font-semibold text-stone-500 hover:text-stone-700">
                  View as table
                </summary>
                <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-stone-200">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 bg-stone-50 text-stone-500">
                      <tr>
                        <th className="px-3 py-2 font-semibold">Term</th>
                        <th className="px-3 py-2 font-semibold">Topic</th>
                        <th className="px-3 py-2 font-semibold text-right">Mentions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.words.map((word) => (
                        <tr key={word.text} className="border-t border-stone-100">
                          <td className="px-3 py-1.5 text-stone-700">{word.text}</td>
                          <td className="px-3 py-1.5 text-stone-500">{styleFor(word.topic).label}</td>
                          <td className="px-3 py-1.5 text-right text-stone-700">{formatNumber(word.count)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </ChartCard>

            <ChartCard title="Identified topics" action={<span className="text-xs text-stone-400">by share of mentions</span>}>
              <div className="space-y-3">
                {data.topics.map((topic) => {
                  const style = styleFor(topic.topic);
                  return (
                    <div key={topic.topic} className="rounded-2xl border border-stone-200 bg-white p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-sm font-semibold text-stone-800">
                          <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
                          {style.label}
                        </div>
                        <span className="text-xs font-semibold text-stone-500">{Math.round(topic.share * 100)}%</span>
                      </div>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-stone-100">
                        <div className={`h-full rounded-full ${style.dot}`} style={{ width: `${Math.max(topic.share * 100, 2)}%` }} />
                      </div>
                      {topic.keywords.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {topic.keywords.map((kw) => (
                            <span key={kw} className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${style.chip}`}>
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ChartCard>
          </div>

          <ChartCard title="Sources behind this analysis">
            <div className="grid gap-3 sm:grid-cols-3">
              <SourceStat label="Dataset entities" value={data.sources.dataset_terms} hint="Mines, minerals, states, districts" />
              <SourceStat label="Document terms" value={data.sources.document_terms} hint="Sample knowledge-base passages" />
              <SourceStat label="Inquiry terms" value={data.sources.inquiry_terms} hint="Questions asked in this chat session" />
            </div>
          </ChartCard>
        </>
      )}
    </div>
  );
}

function SourceStat({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
      <div className="text-xs font-semibold uppercase tracking-wide text-stone-400">{label}</div>
      <div className="mt-1 text-xl font-bold text-stone-800">{formatNumber(value)}</div>
      <div className="mt-0.5 text-xs text-stone-500">{hint}</div>
    </div>
  );
}

function LoadingBox() {
  return (
    <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-16 text-center text-sm text-stone-500">
      Loading term frequency and topics...
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-6 py-16 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
        <Icon name="cloud" className="h-6 w-6" />
      </div>
      <div className="text-sm font-semibold text-stone-800">Nothing to analyze yet</div>
      <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-stone-500">
        Upload a dataset (or load the demo dataset) and ask the AI Mining Assistant a few
        questions - this page mines both for recurring terms and topics.
      </p>
    </div>
  );
}
