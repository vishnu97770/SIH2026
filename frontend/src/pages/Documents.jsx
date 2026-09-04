import { useRef, useState } from "react";
import { apiJson } from "../api/client";
import { recentDocuments as docFallback } from "../data/mockData";
import { Icon } from "../components/Icon";

const statusStyles = {
  Processed: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Processing: "bg-amber-50 text-amber-700 ring-amber-200",
  "Needs Review": "bg-amber-50 text-amber-700 ring-amber-200",
};

const ACCEPT = ".pdf,.csv,.xlsx,.xls";

export function Documents() {
  const [docs, setDocs] = useState(docFallback);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const fileInput = useRef(null);

  const handleFiles = async (files) => {
    setError("");
    setSuccess("");
    const file = files[0];
    if (!file) return;

    const ext = "." + (file.name.split(".").pop() || "").toLowerCase();
    if (![".pdf", ".csv", ".xlsx", ".xls"].includes(ext)) {
      setError("Unsupported file type. Please upload a PDF, CSV, or Excel file.");
      return;
    }

    const form = new FormData();
    form.append("file", file);

    try {
      const res = await apiJson("/documents/upload", "POST", undefined, { method: "POST", body: form });
      setDocs((d) => [res.document, ...d]);
      setSuccess(res.message || `${file.name} uploaded successfully.`);
    } catch (err) {
      setError(err.message || "Upload failed.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-stone-900">Documents</h2>
        <p className="mt-1 text-sm text-stone-500">
          Manage and explore uploaded mining documents, inspection reports, and geological records.
        </p>
      </div>

      <div
        onClick={() => fileInput.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          dragOver ? "border-amber-400 bg-amber-50" : "border-stone-300 bg-[#fffaf1] hover:border-amber-300 hover:bg-stone-50"
        }`}
      >
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-6 w-6">
            <path d="M12 5v9m-4-4l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 15v3a2 2 0 002 2h10a2 2 0 002-2v-3" strokeLinecap="round" />
          </svg>
        </div>
        <p className="text-sm font-medium text-stone-700">Upload a document</p>
        <p className="mt-1 text-xs text-stone-400">Drop a PDF, CSV, or Excel file here, or click to browse</p>
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
      )}

      <div className="rounded-xl border border-stone-200 bg-[#fffaf1] shadow-sm">
        <div className="border-b border-stone-200 px-5 py-3">
          <h3 className="text-sm font-semibold text-stone-800">Uploaded documents</h3>
        </div>
        <div className="divide-y divide-stone-100">
          {docs.map((doc) => (
            <DocRow key={doc.id || doc.name} doc={doc} onOpen={setSelectedDoc} />
          ))}
        </div>
      </div>
      {selectedDoc && <DocumentViewer doc={selectedDoc} onClose={() => setSelectedDoc(null)} />}
    </div>
  );
}

function DocRow({ doc, onOpen }) {
  const statusCls = statusStyles[doc.status] ?? "bg-stone-50 text-stone-600 ring-stone-200";
  const metaText = doc.pages != null ? `${doc.pages} pages` : doc.records != null ? `${doc.records} records` : "";

  return (
    <button
      type="button"
      onClick={() => onOpen(doc)}
      className="flex w-full items-center gap-4 px-5 py-3 text-left last:rounded-b-xl hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-amber-500"
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-stone-100 text-stone-500">
        <Icon name={doc.type === "Spreadsheet" || doc.type === "Production" ? "table" : "file-text"} size={17} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-stone-800">{doc.name}</div>
        <div className="text-xs text-stone-400">
          {doc.type} · {metaText} · {doc.date}
        </div>
      </div>
      <span className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${statusCls}`}>{doc.status}</span>
      <span className="text-xs font-medium text-amber-600">View</span>
    </button>
  );
}

function DocumentViewer({ doc, onClose }) {
  const isSheet = doc.type === "Spreadsheet" || doc.type === "Production";
  const extractedText = isSheet
    ? "Extracted production records: 2021 — 98K; 2022 — 109K; 2023 — 119K; 2024 — 87K; 2025 — 121K."
    : doc.name.includes("Inspection")
      ? "Inspection finding: production disruption and operational constraints were recorded during 2024. The evidence supports a temporary decline rather than a long-term production collapse."
      : "Geological report summary: Mine X geological observations, strata information, reserve indicators, and operationally relevant findings extracted for search and analysis.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/40 p-4" onMouseDown={onClose}>
      <div className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-[#fffaf1] shadow-2xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-4">
          <div>
            <div className="text-sm font-semibold text-stone-900">{doc.name}</div>
            <div className="mt-1 text-xs text-stone-500">{doc.type} · {doc.date} · {doc.status}</div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-1.5 text-sm text-stone-500 hover:bg-stone-100">Close</button>
        </div>
        <div className="grid gap-4 overflow-y-auto p-5 md:grid-cols-3">
          <div className="rounded-xl border border-stone-200 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-stone-400">Metadata</div>
            <div className="mt-3 space-y-2 text-sm text-stone-700">
              <div><span className="text-stone-400">Type:</span> {doc.type}</div>
              <div><span className="text-stone-400">Pages/records:</span> {doc.pages ?? doc.records ?? "—"}</div>
              <div><span className="text-stone-400">Uploaded:</span> {doc.date}</div>
              <div><span className="text-stone-400">Status:</span> {doc.status}</div>
            </div>
          </div>
          <div className="md:col-span-2 space-y-4">
            <div className="rounded-xl border border-stone-200 p-4">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-wide text-stone-400">Intelligence pipeline</div>
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-700">READY FOR RAG</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px]">
                {["Upload", "OCR / Extract", "Chunk", "Index", "Retrieve", "Ground"].map((step) => (
                  <div key={step} className="rounded-lg border border-emerald-200 bg-emerald-50 px-2 py-2 font-semibold text-emerald-700">✓ {step}</div>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-stone-500">
                <div><span className="font-semibold text-stone-700">Text blocks:</span> {doc.extraction?.textBlocks ?? (isSheet ? 24 : 128)}</div>
                <div><span className="font-semibold text-stone-700">Tables:</span> {doc.extraction?.tables ?? (isSheet ? 1 : 4)}</div>
                <div><span className="font-semibold text-stone-700">Metadata:</span> {doc.extraction?.metadataFields ?? 8} fields</div>
              </div>
            </div>
            <div className="rounded-xl border border-stone-200 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-stone-400">Extracted content / evidence</div>
            <p className="mt-3 text-sm leading-6 text-stone-700">{extractedText}</p>
            <div className="mt-4 rounded-lg bg-stone-50 p-3 text-xs text-stone-500">
              Indexed evidence • Source: {doc.name} • Grounding readiness: High
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
