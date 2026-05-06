// Temporary localStorage-backed scan storage for Phase 1B.
// Phase 1C swaps this implementation for Supabase without changing the API.

import type { ParsedScan } from "@/lib/parser/parseScan";

const CURRENT_SCAN_KEY = "solae:current-scan";

export function saveCurrentScan(scan: ParsedScan): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CURRENT_SCAN_KEY, JSON.stringify(scan));
}

export function getCurrentScan(): ParsedScan | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(CURRENT_SCAN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as ParsedScan;
  } catch {
    return null;
  }
}

export function clearCurrentScan(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(CURRENT_SCAN_KEY);
}
