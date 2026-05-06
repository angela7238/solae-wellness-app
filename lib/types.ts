// Solae Wellness Scan domain types

export type Phase = "detox" | "repair" | "restore" | "nourish";

export type SystemStatus = "green" | "yellow" | "blue" | "red";

export interface Marker {
  name: string;
  system: string;
  value: number;
  rangeMin: number;
  rangeMax: number;
  /** improvement percentage vs baseline scan, if compared */
  changePercent?: number;
}

export interface SystemSummary {
  name: string;
  /** Baseline percentage (from earlier scan) */
  baseline: number;
  /** Current percentage (this scan) */
  current: number;
  /** % improvement (current - baseline) */
  change: number;
  /** Color status of CURRENT value */
  status: SystemStatus;
  /** Whether this system improved 5%+ */
  improved: boolean;
  /** Whether moved into green during this period */
  movedToGreen: boolean;
}

export interface Scan {
  id: string;
  clientId: string;
  date: string; // ISO
  /** Raw extracted markers, unlimited count (~346 typical) */
  markers: Marker[];
  /** Per-system summary computed from markers */
  systems: SystemSummary[];
  /** Overall improvement % vs baseline (compared scan only) */
  overallImprovement?: number;
  /** Functional body age */
  functionalBodyAge?: number;
}

export interface Client {
  id: string;
  name: string;
  age: number;
  /** Biological sex from the scan PDF — used to gate sex-specific UI like the
   *  Women's Health radar/timeline axis. "Female" | "Male" | undefined. */
  sex?: string;
  email?: string;
  // Phase-organized lists of Solae products this client is currently taking
  currentSolaeStack: {
    detox: string[];
    repair: string[];
    restore: string[];
    nourish: string[];
  };
  // Generic non-Solae supplements (for duplication logic)
  nonSolaeSupplements: {
    omega3: boolean;
    berberine: boolean;
    cinnamon: boolean;
    glutathione: boolean;
    multivitamin: boolean;
    other: string;
  };
  goals?: string;
  notes?: string;
  scans: Scan[];
}

export interface StandoutMarker {
  name: string;
  system: string;
  changePercent: number;
  narrative: string; // "Your blood vessels are becoming more flexible..."
}

export interface ScanComparison {
  client: Client;
  baseline: Scan;
  compare: Scan;
  overallImprovement: number;
  startingBodyAge: number;
  currentBodyAge: number;
  yearsRecovered: number;
  systemsImproved: number;
  systemsTotal: number;
  systemsMovedToGreen: number;
  /** Count of systems currently in green status in the compare scan */
  currentGreenCount: number;
  /** Individual markers (one per "graph" in the scan) that went from out-of-range
   *  in baseline → in-range in compare. The visceral improvement metric. */
  markersMovedIntoRange: number;
  /** Total markers across all systems in the compare scan (denominator) */
  totalMarkers: number;
  /** Markers currently in normal range in the compare scan */
  currentMarkersInRange: number;
  currentPhase: Phase;
  secondaryPhase?: Phase;
  systems: SystemSummary[];
  standouts: StandoutMarker[];
  needsAttention: { name: string; system: string; value: number }[];
  topImproved: StandoutMarker[];
}
