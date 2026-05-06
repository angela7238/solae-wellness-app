// Adapts a ParsedScan (single-scan, from PDF upload) into the ScanComparison shape
// the dashboard expects. In single-scan mode we set baseline = current so the cards render,
// and zero out comparison-only fields. Phase 2 swaps this for a real two-scan compare.

import type { ParsedScan } from "@/lib/parser/parseScan";
import type { ScanComparison, SystemSummary } from "@/lib/types";
import { detectPhase } from "@/lib/parser/phaseDetector";

export function fromParsedScan(parsed: ParsedScan): ScanComparison {
  const systems: SystemSummary[] = parsed.systems.map((s) => ({
    name: s.name,
    baseline: s.percentNormal,
    current: s.percentNormal,
    change: 0,
    status: s.status,
    improved: false,
    movedToGreen: false,
  }));

  // Areas needing attention: markers most-out-of-range (negative deviation included)
  const allOutOfRange = parsed.systems
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

  const phase = detectPhase(parsed.systems);

  const overallScore =
    parsed.totalMarkers > 0
      ? (parsed.markersInRange / parsed.totalMarkers) * 100
      : 0;

  const greenCount = parsed.systems.filter((s) => s.status === "green").length;

  return {
    client: {
      id: `client-${parsed.client.name.toLowerCase().replace(/\s+/g, "-")}`,
      name: parsed.client.name,
      age: parsed.client.age,
      sex: parsed.client.sex,
      currentSolaeStack: { detox: [], repair: [], restore: [], nourish: [] },
      nonSolaeSupplements: {
        omega3: false,
        berberine: false,
        cinnamon: false,
        glutathione: false,
        multivitamin: false,
        other: "",
      },
      scans: [],
    },
    baseline: {
      id: "single",
      clientId: "single",
      date: parsed.scanDate,
      markers: [],
      systems: [],
    },
    compare: {
      id: "single",
      clientId: "single",
      date: parsed.scanDate,
      markers: [],
      systems: [],
    },
    // Single-scan: no improvement %, but show overall wellness score in its place
    overallImprovement: overallScore,
    startingBodyAge: parsed.client.age,
    currentBodyAge: parsed.client.age,
    yearsRecovered: 0,
    systemsImproved: greenCount,
    systemsTotal: parsed.systems.length,
    systemsMovedToGreen: 0,
    currentGreenCount: greenCount,
    markersMovedIntoRange: 0,
    totalMarkers: parsed.totalMarkers,
    currentMarkersInRange: parsed.markersInRange,
    currentPhase: phase.primary,
    secondaryPhase: phase.secondary,
    systems,
    standouts: [],
    needsAttention: allOutOfRange,
    topImproved: [],
  };
}

/** True if this comparison was built from a single scan (no real baseline). */
export function isSingleScan(c: ScanComparison): boolean {
  return c.baseline.id === "single" && c.compare.id === "single";
}
