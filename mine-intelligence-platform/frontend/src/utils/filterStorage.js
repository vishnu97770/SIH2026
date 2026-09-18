// Filters are remembered per page (via sessionStorage) so navigating away and
// back keeps the last selection, until the user changes it again. Cleared
// when the browser tab closes.

export function loadStoredFilters(key, fallback) {
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return { ...fallback, ...parsed };
  } catch {
    return fallback;
  }
}

export function saveStoredFilters(key, filters) {
  try {
    window.sessionStorage.setItem(key, JSON.stringify(filters));
  } catch {
    // Ignore storage errors (e.g. private browsing with storage disabled).
  }
}

// Only show districts (or mines) that actually belong to the selected state.
// With no state selected, fall back to every value in the dataset.
export function districtsForState(meta, state) {
  if (!state) return meta?.districts || [];
  return meta?.districts_by_state?.[state] || [];
}

export function minesForState(meta, state) {
  if (!state) return meta?.mines || [];
  return meta?.mines_by_state?.[state] || [];
}
