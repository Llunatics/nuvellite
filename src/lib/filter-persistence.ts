/**
 * Filter / scroll persistence helpers (Round 2, Block 6).
 *
 * Catalog-style views keep their filter state in the URL query string (via
 * history.replaceState, so the Back button and shared links keep working)
 * and their pagination + scroll offset in sessionStorage under
 * `nuv_state:<pathname>`, so returning from a detail page restores the
 * exact browsing position instead of resetting to the top.
 */

export interface PersistedViewState {
  visibleCount?: number;
  scrollY?: number;
}

function storageKey(pathname: string): string {
  return `nuv_state:${pathname}`;
}

export function loadPersistedViewState(pathname: string): PersistedViewState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey(pathname));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedViewState;
    return typeof parsed === 'object' && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

export function savePersistedViewState(pathname: string, state: PersistedViewState): void {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(storageKey(pathname), JSON.stringify(state));
  } catch {
    // sessionStorage unavailable (private mode / quota) — persistence is optional.
  }
}

/** Replace the current URL query string without a server round-trip. */
export function syncUrlQuery(params: URLSearchParams): void {
  if (typeof window === 'undefined') return;
  const qs = params.toString();
  const next = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
  window.history.replaceState(null, '', next);
}
