// Practitioner-selected alternative products.
//
// IMPORTANT — these are practitioner-selected OPTIONS, never automatic clinical
// substitutions. The app surfaces a suggestion; the practitioner decides. It does
// not diagnose, does not claim treatment failure, and does not auto-switch.
// Quantum analyzer values are wellness-tracking data, not diagnostic lab results.

import type { ScanRow } from "@/lib/supabase/types";

export interface ProductAlternative {
  /** The primary product this metadata is for. */
  primaryProduct: string;
  primaryCategory: string;
  secondaryCategories: string[];
  /** Practitioner-approved alternatives to consider (NOT equivalents). */
  approvedAlternatives: string[];
  /** Minimum trial period before a limited-response note is reasonable (days). */
  minTrialDays: number;
  /** Scan system names to watch (case-insensitive substring match). */
  targetSystems: string[];
  targetMarkers: string[];
  /** Minimum % improvement from baseline considered "meaningful". */
  responseThresholdPct: number;
  contraindicationNotes: string;
  /** Always-shown practitioner guidance when the primary is recommended. */
  optionNote: string;
}

// Activate ONLY confirmed relationships. Add more one category at a time after
// reviewing official product info and agreeing on the support pathway.
export const PRODUCT_ALTERNATIVES: ProductAlternative[] = [
  {
    primaryProduct: "V-Itaren",
    primaryCategory: "Kidney / fluid-balance support",
    secondaryCategories: [],
    approvedAlternatives: ["V-Asculax"],
    minTrialDays: 30,
    targetSystems: ["Kidney"],
    targetMarkers: [],
    responseThresholdPct: 5,
    contraindicationNotes:
      "Review medications and contraindications before any change. Quantum analyzer values are wellness-tracking data, not diagnostic lab results.",
    optionNote:
      "Consider V-Asculax when V-Itaren has been used consistently and the target kidney/fluid-balance markers are not showing meaningful improvement.",
  },
];

export const LIMITED_RESPONSE_MSG =
  "Limited response detected for the current support approach. Review adherence, dosage, hydration, medications, and other factors. Consider an approved alternative product.";

export const PERSISTENT_RESPONSE_MSG =
  "Persistent non-response — practitioner review recommended.";

/** ~5–6 months of consistent use with no meaningful movement → persistent. */
const PERSISTENT_DAYS = 150;

export type ResponseLevel = "option" | "limited" | "persistent";

export function metaForProduct(
  productName: string,
): ProductAlternative | undefined {
  return PRODUCT_ALTERNATIVES.find((m) => m.primaryProduct === productName);
}

/** Target-system % for a scan, or null if that system isn't present. */
function targetSystemPct(scan: ScanRow, meta: ProductAlternative): number | null {
  const sys = scan.parsed_data.systems.find((s) =>
    meta.targetSystems.some((t) =>
      s.name.toLowerCase().includes(t.toLowerCase()),
    ),
  );
  return sys ? sys.percentNormal : null;
}

/**
 * Evaluate the practitioner-alternative level from the client's scan history.
 * Returns "option" (base practitioner note — always safe to show) unless the
 * confirmed "limited response" rule is met, then "limited" or "persistent".
 * Escalation requires products_given history (≥2 consecutive "Given" visits),
 * so existing clients stay at "option" until the coach checks boxes over time.
 */
export function evaluateResponse(
  meta: ProductAlternative,
  scans: ScanRow[],
): ResponseLevel {
  if (scans.length < 2) return "option";
  const sorted = [...scans].sort((a, b) =>
    a.scan_date.localeCompare(b.scan_date),
  );

  // Count most-recent consecutive visits where the primary was marked Given.
  let consecutiveGiven = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if ((sorted[i].products_given ?? []).includes(meta.primaryProduct)) {
      consecutiveGiven++;
    } else {
      break;
    }
  }
  if (consecutiveGiven < 2) return "option";

  const runStart = sorted[sorted.length - consecutiveGiven];
  const latest = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
  const daysOnProduct =
    (Date.parse(latest.scan_date) - Date.parse(runStart.scan_date)) /
    86_400_000;
  if (daysOnProduct < meta.minTrialDays) return "option";

  const baselinePct = targetSystemPct(sorted[0], meta);
  const latestPct = targetSystemPct(latest, meta);
  const prevPct = targetSystemPct(prev, meta);
  if (latestPct == null) return "option";

  // Below optimal (yellow/red) is < 70% normal (matches statusFromPercent).
  const stillLow = latestPct < 70;
  const lowImprovement =
    baselinePct != null && latestPct - baselinePct < meta.responseThresholdPct;
  const flatOrWorse = prevPct != null && latestPct - prevPct <= 0;

  if (!(stillLow || lowImprovement || flatOrWorse)) return "option";
  return daysOnProduct >= PERSISTENT_DAYS ? "persistent" : "limited";
}
