// Multi-scan comparison math. Takes baseline + compare ParsedScans and produces
// the ScanComparison shape the dashboard expects, with all the real numbers
// (system changes, standouts, top improved, areas needing attention, etc.).

import type {
  ParsedScan,
  ParsedSystem,
  ParsedMarker,
} from "@/lib/parser/parseScan";
import type {
  ScanComparison,
  StandoutMarker,
  SystemSummary,
  Phase,
} from "@/lib/types";
import type { ClientRow } from "@/lib/supabase/types";
import { detectPhase } from "@/lib/parser/phaseDetector";

/** Narrative templates for standout markers. Keyed by system, fall back to generic. */
const NARRATIVE_BY_SYSTEM: Record<string, string> = {
  "Cardiovascular and Cerebrovascular":
    "Your blood vessels are working better — important for long-term cardiovascular health.",
  "Liver Function":
    "Your liver is processing more efficiently — a major win for metabolic health.",
  "Kidney Function":
    "Your kidneys are filtering more effectively — drainage is improving.",
  "Heavy Metal":
    "Toxic load is reducing — your detox pathways are responding.",
  "Blood Sugar":
    "Glucose handling is stabilizing — metabolism is rebalancing.",
  "Bone Mineral Density":
    "Stronger, denser bones — reduced fracture risk.",
  "Gastrointestinal Function":
    "Your digestion is moving more efficiently.",
};

const GENERIC_NARRATIVE =
  "This marker is trending toward optimal — your body is responding to support.";

function narrativeFor(system: string): string {
  return NARRATIVE_BY_SYSTEM[system] ?? GENERIC_NARRATIVE;
}

function statusFromPercent(p: number): SystemSummary["status"] {
  if (p >= 90) return "green";
  if (p >= 70) return "blue";
  if (p >= 40) return "yellow";
  return "red";
}

/** Build a name → marker map for fast lookup across scans. */
function indexMarkers(system: ParsedSystem): Map<string, ParsedMarker> {
  const map = new Map<string, ParsedMarker>();
  for (const m of system.markers) map.set(m.name, m);
  return map;
}

/** Compute how much closer to optimal a marker got, as a percent.
 *  Uses distance from the *center* of the normal range as the "optimal" target.
 *  - 100% = marker landed exactly at center (perfect)
 *  - 50%  = closed half the gap to center
 *  - 0%   = no change in distance
 *  - negative = got worse (further from center) */
function markerImprovement(
  base: ParsedMarker | undefined,
  cur: ParsedMarker,
): number {
  if (!base) return 0;
  const baseCenter = (base.rangeMin + base.rangeMax) / 2;
  const curCenter = (cur.rangeMin + cur.rangeMax) / 2;
  const baseDist = Math.abs(base.value - baseCenter);
  const curDist = Math.abs(cur.value - curCenter);
  if (baseDist === 0 && curDist === 0) return 0;
  if (baseDist === 0) {
    // Was perfect; any drift is a regression
    const span = base.rangeMax - base.rangeMin || 1;
    return -(curDist / span) * 100;
  }
  // Improvement = % of original gap to center that closed
  const improvement = ((baseDist - curDist) / baseDist) * 100;
  // Cap regressions at -100 to keep the UI sane
  return Math.max(improvement, -100);
}

export function buildComparison(
  client: ClientRow,
  baseline: ParsedScan,
  compare: ParsedScan,
): ScanComparison {
  // Build per-system summaries from compare scan, with baseline % from baseline scan
  const baselineByName = new Map<string, ParsedSystem>();
  for (const s of baseline.systems) baselineByName.set(s.name, s);

  const systems: SystemSummary[] = [];
  let systemsImproved = 0;
  let movedToGreen = 0;
  let currentGreenCount = 0;

  for (const cur of compare.systems) {
    const base = baselineByName.get(cur.name);
    const baseline = base ? base.percentNormal : cur.percentNormal;
    const change = cur.percentNormal - baseline;
    const status = statusFromPercent(cur.percentNormal);
    const wasGreen = base ? base.percentNormal >= 90 : cur.percentNormal >= 90;
    const nowGreen = cur.percentNormal >= 90;
    const improved = change >= 5;
    if (improved) systemsImproved++;
    if (!wasGreen && nowGreen) movedToGreen++;
    if (nowGreen) currentGreenCount++;

    systems.push({
      name: cur.name,
      baseline,
      current: cur.percentNormal,
      change,
      status,
      improved,
      movedToGreen: !wasGreen && nowGreen,
    });
  }

  // Standouts + Top Improved: walk every marker pairing, rank by improvement
  type MarkerCompare = {
    name: string;
    system: string;
    improvementPercent: number;
    nowInRange: boolean;
    wasInRange: boolean;
  };
  const allMarkerCompares: MarkerCompare[] = [];
  let markersMovedIntoRange = 0;
  for (const cur of compare.systems) {
    const base = baselineByName.get(cur.name);
    const baseMap = base ? indexMarkers(base) : new Map<string, ParsedMarker>();
    for (const m of cur.markers) {
      const baseMarker = baseMap.get(m.name);
      const improvement = markerImprovement(baseMarker, m);
      const wasInRange = baseMarker?.inRange ?? m.inRange;
      if (baseMarker && !baseMarker.inRange && m.inRange) {
        markersMovedIntoRange++;
      }
      allMarkerCompares.push({
        name: m.name,
        system: cur.name,
        improvementPercent: improvement,
        nowInRange: m.inRange,
        wasInRange,
      });
    }
  }

  const sortedByImprovement = [...allMarkerCompares].sort(
    (a, b) => b.improvementPercent - a.improvementPercent,
  );

  const standouts: StandoutMarker[] = sortedByImprovement
    .filter((m) => m.improvementPercent > 5)
    .slice(0, 16)
    .map((m) => ({
      name: m.name,
      system: m.system,
      changePercent: Math.min(m.improvementPercent, 100),
      narrative: narrativeFor(m.system),
    }));

  const topImproved: StandoutMarker[] = standouts.slice(0, 5);

  // Areas needing attention: markers still out of range in compare scan, ranked by deviation
  const needsAttention = compare.systems
    .flatMap((s) =>
      s.markers
        .filter((m) => !m.inRange)
        .map((m) => ({
          name: m.name,
          system: s.name,
          value: m.value,
          severity: Math.abs(m.deviation),
        })),
    )
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 30);

  // Overall improvement = delta of overall wellness score (% markers in range)
  // between baseline and compare scans. Matches the Copilot dashboard's metric.
  const baselineOverall =
    baseline.totalMarkers > 0
      ? (baseline.markersInRange / baseline.totalMarkers) * 100
      : 0;
  const compareOverall =
    compare.totalMarkers > 0
      ? (compare.markersInRange / compare.totalMarkers) * 100
      : 0;
  const overallImprovement = compareOverall - baselineOverall;

  // Functional body age — derived from overall improvement.
  // Empirical fit to original Copilot dashboard: ~+8% improvement → 4 years recovered.
  const yearsRecovered = Math.max(0, Math.round(overallImprovement / 2));
  const chronAge = client.age ?? 0;
  const startingBodyAge = chronAge;
  const currentBodyAge = Math.max(0, chronAge - yearsRecovered);

  // Phase detection from current state
  const phase = detectPhase(compare.systems);

  return {
    client: {
      id: client.id,
      name: client.name,
      age: client.age ?? 0,
      sex: client.sex ?? undefined,
      currentSolaeStack: (client.current_solae_stack ?? {
        detox: [],
        repair: [],
        restore: [],
        nourish: [],
      }) as ScanComparison["client"]["currentSolaeStack"],
      nonSolaeSupplements: (client.non_solae_supplements ?? {
        omega3: false,
        berberine: false,
        cinnamon: false,
        glutathione: false,
        multivitamin: false,
        other: "",
      }) as ScanComparison["client"]["nonSolaeSupplements"],
      goals: client.goals ?? undefined,
      notes: client.notes ?? undefined,
      scans: [],
    },
    baseline: {
      id: "baseline",
      clientId: client.id,
      date: baseline.scanDate,
      markers: [],
      systems: [],
    },
    compare: {
      id: "compare",
      clientId: client.id,
      date: compare.scanDate,
      markers: [],
      systems: [],
    },
    overallImprovement,
    startingBodyAge,
    currentBodyAge,
    yearsRecovered,
    systemsImproved,
    systemsTotal: systems.length,
    systemsMovedToGreen: movedToGreen,
    currentGreenCount,
    markersMovedIntoRange,
    totalMarkers: compare.totalMarkers,
    currentMarkersInRange: compare.markersInRange,
    currentPhase: phase.primary as Phase,
    secondaryPhase: phase.secondary as Phase | undefined,
    systems,
    standouts,
    needsAttention,
    topImproved,
  };
}
