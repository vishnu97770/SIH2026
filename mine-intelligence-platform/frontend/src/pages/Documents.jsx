import { useEffect, useRef, useState } from "react";
import { api, validateDatasetFile } from "../api/client";
import { ChartCard } from "../components/ChartCard";
import { Icon } from "../components/Icon";
import { formatDateTime, formatNumber } from "../utils/format";

const DOCUMENT_EXTENSIONS = new Set(["pdf", "png", "jpg", "jpeg"]);

function validateDocumentFile(file) {
  if (!file) return "Choose a PDF, PNG, or JPG document to upload.";
  const extension = file.name?.split(".").pop()?.toLowerCase();
  if (!DOCUMENT_EXTENSIONS.has(extension)) {
    return "Unsupported file type. Upload a PDF, PNG, or JPG document.";
  }
  if (file.size > 25 * 1024 * 1024) {
    return "File is too large. The maximum upload size is 25 MB.";
  }
  return "";
}

export function Documents() {
  const [docs, setDocs] = useState([]);
  const [tesseractAvailable, setTesseractAvailable] = useState(true);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const inputRef = useRef(null);
  const docInputRef = useRef(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [docsPack, sessionPack] = await Promise.all([api.documents(), api.session()]);
      setDocs(docsPack.documents || []);
      setTesseractAvailable(docsPack.tesseract_available !== false);
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

  const uploadDocument = async (file) => {
    if (!file) return;
    const validationError = validateDocumentFile(file);
    if (validationError) {
      setError(validationError);
      setMessage("");
      return;
    }
    setUploadingDoc(true);
    setError("");
    setMessage("");
    try {
      const result = await api.uploadDocument(file);
      setMessage(result.message || `${file.name} processed.`);
      await load();
    } catch (err) {
      setError(err.message || "Document processing failed.");
    } finally {
      setUploadingDoc(false);
    }
  };

  const deleteDocument = async (id) => {
    if (!window.confirm("Remove this document and its extracted content?")) return;
    setError("");
    setMessage("");
    try {
      const result = await api.removeDocument(id);
      setMessage(result.message || "Document removed.");
      await load();
    } catch (err) {
      setError(err.message || "Could not remove the document.");
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

      <div className="rounded-3xl border border-stone-200 bg-[#fffaf1] p-6 shadow-sm">
        <div className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs text-stone-500">
          <Icon name="file" className="h-4 w-4 text-amber-600" />
          Document ingestion
        </div>
        <h3 className="mt-3 text-lg font-semibold text-stone-800">Upload geological, inspection, or other reports</h3>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-stone-500">
          PDF, PNG, or JPG. Text is extracted directly from digital PDFs; scanned pages fall back to
          OCR when it's available on this server. Extracted passages become searchable, citable
          evidence for the AI Mining Assistant and the word cloud/topic module.
        </p>
        {!tesseractAvailable && (
          <p className="mt-2 max-w-2xl rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            OCR (tesseract) is not installed on this server, so scanned/image-only pages won't
            extract text - only digital, selectable-text PDFs will be readable. Run{" "}
            <code className="rounded bg-white px-1 py-0.5">sudo apt-get install tesseract-ocr</code> on
            the backend host to enable it.
          </p>
        )}
        <div className="mt-4">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-stone-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-stone-700">
            {uploadingDoc ? "Processing..." : "Upload Document"}
            <input
              ref={docInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              className="hidden"
              onChange={(e) => uploadDocument(e.target.files?.[0])}
            />
          </label>
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
              {docs.map((doc) => {
                const isRealDocument = doc.chunks !== undefined;
                return (
                  <div key={doc.id} className="rounded-2xl border border-stone-200 bg-white px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-stone-800">{doc.name}</div>
                        <div className="mt-1 text-xs text-stone-500">
                          {doc.type} | {doc.date || "N/A"} |{" "}
                          {isRealDocument
                            ? `${formatNumber(doc.pages)} page(s), ${formatNumber(doc.chunks)} passage(s)`
                            : `${doc.records ?? "N/A"} records`}
                        </div>
                        {isRealDocument && doc.ocr_used_pages > 0 && (
                          <div className="mt-1 text-[11px] text-emerald-600">{doc.ocr_used_pages} page(s) read via OCR</div>
                        )}
                        {isRealDocument && doc.ocr_unavailable_pages > 0 && (
                          <div className="mt-1 text-[11px] text-amber-600">
                            {doc.ocr_unavailable_pages} scanned page(s) could not be read (OCR unavailable)
                          </div>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            doc.status === "Processed" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {doc.status}
                        </span>
                        {isRealDocument && (
                          <button
                            type="button"
                            onClick={() => deleteDocument(doc.id)}
                            className="rounded-lg p-1.5 text-stone-400 transition hover:bg-red-50 hover:text-red-600"
                            aria-label={`Remove ${doc.name}`}
                          >
                            <Icon name="close" className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
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

