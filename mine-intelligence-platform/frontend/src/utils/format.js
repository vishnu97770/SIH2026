const numberFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 2,
});

export function formatNumber(value) {
  if (value == null || Number.isNaN(Number(value))) return "N/A";
  return numberFormatter.format(Number(value));
}

export function formatPercent(value) {
  if (value == null || Number.isNaN(Number(value))) return "N/A";
  const num = Number(value);
  return `${num > 0 ? "+" : ""}${num.toFixed(2)}%`;
}

export function formatDateTime(value) {
  if (!value) return "N/A";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

