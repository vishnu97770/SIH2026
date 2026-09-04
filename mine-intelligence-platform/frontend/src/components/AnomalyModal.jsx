import { Icon } from "./Icon";

export function AnomalyModal({ anomaly, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-xl bg-[#fffaf1] p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-stone-900">Anomaly Detail</h3>
              <span className="rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-red-200">
                {anomaly.severity}
              </span>
            </div>
            <p className="text-sm text-stone-500">{anomaly.title}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <dl className="grid grid-cols-2 gap-4">
          <Info label="Metric" value={anomaly.metric} />
          <Info label="Year" value={anomaly.year} />
          <Info label="Percentage Change" value={anomaly.change} accent />
          <Info label="Source Document" value={anomaly.documentRef} />
        </dl>

        <div className="mt-4">
          <div className="text-xs font-medium uppercase tracking-wide text-stone-400">Explanation</div>
          <p className="mt-1 text-sm text-stone-600">{anomaly.explanation}</p>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50">
            View Evidence
          </button>
          <button
            onClick={onClose}
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-stone-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, accent }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-stone-400">{label}</div>
      <div className={`mt-0.5 text-sm font-medium ${accent ? "text-red-600" : "text-stone-800"}`}>
        {value}
      </div>
    </div>
  );
}
