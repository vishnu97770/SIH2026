export async function api(path, options = {}) {
  const res = await fetch(`/api${path}`, options);
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body.detail) detail = body.detail;
    } catch {
      /* ignore non-JSON error bodies */
    }
    throw new Error(detail);
  }
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  return res.blob();
}

export async function apiJson(path, method = "GET", body, extra = {}) {
  const options = { ...extra, method };
  if (body !== undefined) {
    options.headers = { "Content-Type": "application/json", ...extra.headers };
    options.body = JSON.stringify(body);
  }
  return api(path, options);
}
