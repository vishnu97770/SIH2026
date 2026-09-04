const API_PREFIX = import.meta.env.VITE_API_PREFIX || "/api";
const DATASET_EXTENSIONS = new Set(["csv", "xlsx", "xls"]);
const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export function validateDatasetFile(file) {
  if (!file) return "Choose a CSV or Excel dataset to upload.";

  const extension = file.name?.split(".").pop()?.toLowerCase();
  if (!DATASET_EXTENSIONS.has(extension)) {
    return "Unsupported file type. Upload a CSV, XLSX, or XLS production dataset.";
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return "File is too large. The maximum upload size is 25 MB.";
  }
  return "";
}

async function request(path, options = {}) {
  const res = await fetch(`${API_PREFIX}${path}`, options);
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      try {
        detail = await res.text();
      } catch {
        /* ignore */
      }
    }
    throw new Error(detail);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  return res.blob();
}

export function buildQuery(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value == null) return;
    if (Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== "" && item != null) search.append(key, item);
      });
      return;
    }
    if (value !== "") {
      search.set(key, value);
    }
  });
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function apiGet(path, params = {}, extra = {}) {
  return request(`${path}${buildQuery(params)}`, { method: "GET", ...extra });
}

export function apiJson(path, method = "GET", body, extra = {}) {
  const options = { method, ...extra };
  if (body !== undefined) {
    if (body instanceof FormData) {
      options.body = body;
    } else {
      options.headers = { "Content-Type": "application/json", ...(extra.headers || {}) };
      options.body = JSON.stringify(body);
    }
  }
  return request(path, options);
}

export const api = {
  health: () => apiGet("/health"),
  session: () => apiGet("/session"),
  filters: () => apiGet("/filters"),
  quality: () => apiGet("/quality"),
  kpis: (params) => apiGet("/kpis", params),
  production: (params) => apiGet("/production", params),
  anomalies: (params) => apiGet("/anomalies", params),
  forecast: (params) => apiGet("/forecast", params),
  askAssistant: (question) => apiJson("/ask", "POST", { question }),
  generateReport: (payload) => apiJson("/report", "POST", payload),
  downloadReportPdf: (params) => apiGet("/report/pdf", params),
  uploadDataset: (file) => {
    const form = new FormData();
    form.append("file", file);
    return apiJson("/upload", "POST", form);
  },
  uploadDocument: (file) => {
    const form = new FormData();
    form.append("file", file);
    return apiJson("/documents/upload", "POST", form);
  },
  loadDemoDataset: () => apiJson("/demo/load", "POST"),
  retrainModels: () => apiJson("/train-models", "POST"),
  suggestions: () => apiGet("/assistant/suggestions"),
  documents: () => apiGet("/documents"),
};

export { request };

