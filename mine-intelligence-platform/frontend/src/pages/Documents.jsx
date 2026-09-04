import { useEffect, useRef, useState } from "react";
import { api, validateDatasetFile } from "../api/client";
import { ChartCard } from "../components/ChartCard";
import { Icon } from "../components/Icon";
import { formatDateTime, formatNumber } from "../utils/format";

export function Documents() {
  const [docs, setDocs] = useState([]);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const inputRef = useRef(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [docsPack, sessionPack] = await Promise.all([api.documents(), api.session()]);
      setDocs(docsPack.documents || []);
      setSession(sessionPack.session);
    } catch (err) {
      setError(err.message || "Could not load documents.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const upload = async (file) => {
    if (!file) return;
    const validationError = validateDatasetFile(file);
    if (validationError) {
      setError(validationError);
      setMessage("");
      return;
    }
    setUploading(true);
    setError("");
    setMessage("");
    try {
      await api.uploadDataset(file);
      setMessage(`${file.name} uploaded successfully.`);
      await load();
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-stone-200 bg-gradient-to-r from-stone-950 via-stone-900 to-amber-950 p-6 text-white">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-amber-100">
          <Icon name="documents" className="h-4 w-4" />
          Dataset session
        </div>
        <h2 className="mt-4 text-3xl font-semibold">Upload and manage analysis sessions</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-300">
          Upload a production dataset in CSV, XLSX, or XLS format. The backend will validate,
          clean, analyze, and persist the active session.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-400">
            {uploading ? "Uploading..." : "Upload Dataset"}
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => upload(e.target.files?.[0])}
            />
          </label>
          <button
            type="button"
            onClick={async () => {
              setUploading(true);
              try {
                await api.loadDemoDataset();
                setMessage("Demo dataset loaded.");
                await load();
              } catch (err) {
                setError(err.message || "Could not load demo dataset.");
              } finally {
                setUploading(false);
              }
            }}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Load Demo Dataset
          </button>
          <button type="button" onClick={async () => {
            if (!window.confirm("Remove the active dataset and all of its analysis results?")) return;
            setUploading(true); setError(""); setMessage("");
            try { const result = await api.removeDataset(); setMessage(result.message || "Dataset removed."); await load(); }
            catch (err) { setError(err.message || "Could not remove the dataset."); }
            finally { setUploading(false); }
          }} disabled={uploading || !session?.has_data} className="rounded-xl border border-red-300/40 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-100 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40">
            Remove Dataset
          </button>
        </div>
      </div>

      {message && <Notice tone="green">{message}</Notice>}
      {error && <Notice tone="red">{error}</Notice>}

      <div className="grid gap-4 xl:grid-cols-[0.8fr,1.2fr]">
        <ChartCard title="Active session">
          {loading ? (
            <LoadingBox />
          ) : session?.has_data ? (
            <div className="space-y-3">
              <SessionRow label="Source file" value={session.source_name || "N/A"} />
              <SessionRow label="Uploaded at" value={formatDateTime(session.uploaded_at)} />
              <SessionRow label="Rows" value={formatNumber(session.row_count)} />
              <SessionRow label="Columns" value={formatNumber(session.columns?.length)} />
              <SessionRow label="Quality score" value={`${session.quality?.quality_score ?? "N/A"} / 100`} />
              <SessionRow label="Year range" value={session.quality?.year_range?.join(" - ") || "N/A"} />
            </div>
          ) : (
            <EmptyState message="No dataset is currently loaded." />
          )}
        </ChartCard>

        <ChartCard title="Uploaded documents" action={<span className="text-xs text-stone-400">{docs.length} items</span>}>
          {loading ? (
            <LoadingBox />
          ) : docs.length ? (
            <div className="space-y-3">
              {docs.map((doc) => (
                <div key={doc.id} className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-stone-800">{doc.name}</div>
                      <div className="mt-1 text-xs text-stone-500">
                        {doc.type} | {doc.date || "N/A"} | {doc.records ?? "N/A"} records
                      </div>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      {doc.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="Uploaded datasets will appear here after validation." />
          )}
        </ChartCard>
      </div>
    </div>
  );
}

function SessionRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-stone-200 bg-[#fffaf1] px-4 py-3">
      <span className="text-sm text-stone-500">{label}</span>
      <span className="text-sm font-semibold text-stone-800">{value}</span>
    </div>
  );
}

function LoadingBox() {
  return <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-10 text-center text-sm text-stone-500">Loading...</div>;
}

function EmptyState({ message }) {
  return <div className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">{message}</div>;
}

function Notice({ tone, children }) {
  const styles = tone === "green" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700";
  return <div className={`rounded-2xl border px-4 py-3 text-sm ${styles}`}>{children}</div>;
}

