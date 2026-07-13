/** Verbiage scales with magnitude so a 0.3% scan doesn't show "5–10%" copy. */
function improvementHeader(pct: number): string {
  if (pct >= 15) return "Strong response. Real shifts across the body.";
  if (pct >= 5) return "Significant early response. Your body is actively recalibrating.";
  if (pct >= 1) return "Subtle but real shifts are underway.";
  if (pct >= 0) return "Holding steady — any improvement is valuable.";
  return "Slight regression — let's reassess the routine.";
}

function improvementSubtext(pct: number): string {
  if (pct >= 15)
    return "Substantial recalibration is underway across hundreds of biological markers.";
  if (pct >= 5)
    return "Even 5–10% improvement represents meaningful shifts across hundreds of biological markers.";
  if (pct >= 1)
    return "Small percentages reflect real movement across hundreds of biological markers — every step matters.";
  if (pct >= 0)
    return "The body holds ground before it leaps. Any improvement is valuable.";
  return "A dip can signal stress, illness, or that protocols need adjustment.";
}

import type { ReactNode } from "react";

/** Previous-scan → latest-scan deltas, surfaced as a "since last scan" line
 *  under each hero number. Null when there's no distinct previous scan. */
export interface SinceLastStats {
  /** Formatted date of the previous scan, e.g. "6/12/2026". */
  previousDate: string;
  daysBetween: number;
  overallImprovement: number;
  yearsRecovered: number;
  systemsMovedToGreen: number;
  markersMovedIntoRange: number;
}

/** Small divided footer block used to show the "since last scan" delta. */
function SinceLastBlock({
  sinceLast,
  children,
}: {
  sinceLast: SinceLastStats;
  children: ReactNode;
}) {
  return (
    <div className="mt-5 pt-4 border-t border-[var(--solae-border)] w-full text-center">
      <div className="text-[var(--solae-text-faint)] text-[10px] tracking-widest uppercase mb-1.5">
        Since last scan · {sinceLast.previousDate} ({sinceLast.daysBetween}d)
      </div>
      {children}
    </div>
  );
}

interface Props {
  overallImprovement: number;
  startingBodyAge: number;
  currentBodyAge: number;
  yearsRecovered: number;
  systemsImproved: number;
  systemsTotal: number;
  systemsMovedToGreen: number;
  currentGreenCount: number;
  markersMovedIntoRange: number;
  totalMarkers: number;
  currentMarkersInRange: number;
  /** True for first/single-scan view: relabel cards to show current state, not change. */
  singleScan?: boolean;
  /** Optional previous-scan → latest deltas. Null when no distinct previous scan exists. */
  sinceLast?: SinceLastStats | null;
}

export function HeroStats({
  overallImprovement,
  startingBodyAge,
  currentBodyAge,
  yearsRecovered,
  systemsImproved,
  systemsTotal,
  systemsMovedToGreen,
  currentGreenCount,
  markersMovedIntoRange,
  totalMarkers,
  currentMarkersInRange,
  singleScan,
  sinceLast,
}: Props) {
  // Suppress unused-warning for the system-level current count — we keep the
  // value in the data model in case a later iteration wants to surface it.
  void currentGreenCount;
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-6">
      {/* Overall Improvement / Wellness Score */}
      <div className="bg-[var(--solae-bg-card)] border border-[var(--solae-border)] rounded-xl p-8 flex flex-col items-center text-center">
        <div className="text-[var(--solae-text-faint)] text-xs tracking-widest uppercase mb-6">
          {singleScan ? "Wellness Score" : "Overall Improvement"}
        </div>
        <div className="relative w-44 h-44 mb-5 flex items-center justify-center">
          <svg
            className="absolute inset-0 -rotate-90"
            viewBox="0 0 100 100"
            width="100%"
            height="100%"
          >
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="var(--solae-border)"
              strokeWidth="3"
            />
            <circle
              cx="50"
              cy="50"
              r="42"
              fill="none"
              stroke="var(--solae-gold)"
              strokeWidth="3"
              strokeDasharray={`${(overallImprovement / 100) * 264} 264`}
              strokeLinecap="round"
            />
          </svg>
          <div className="font-display text-5xl text-gold">
            {singleScan ? "" : "+"}
            {overallImprovement.toFixed(1)}%
          </div>
        </div>
        <div className="font-display italic text-base text-[var(--solae-text-muted)] mb-3">
          {singleScan
            ? "Baseline established. Ready to begin tracking."
            : improvementHeader(overallImprovement)}
        </div>
        <div className="text-[var(--solae-text-faint)] text-xs leading-relaxed max-w-xs">
          {singleScan
            ? "Score = % of all biological markers in normal range across this scan."
            : improvementSubtext(overallImprovement)}
        </div>
        {!singleScan && sinceLast && (
          <SinceLastBlock sinceLast={sinceLast}>
            <div
              className={`font-display text-2xl ${
                sinceLast.overallImprovement > 0
                  ? "text-[var(--solae-status-green)]"
                  : sinceLast.overallImprovement < 0
                    ? "text-[var(--solae-status-red)]"
                    : "text-[var(--solae-text-muted)]"
              }`}
            >
              {sinceLast.overallImprovement >= 0 ? "+" : ""}
              {sinceLast.overallImprovement.toFixed(1)}%
            </div>
          </SinceLastBlock>
        )}
      </div>

      {/* Functional Body Age / Current Age */}
      <div className="bg-[var(--solae-bg-card)] border border-[var(--solae-border)] rounded-xl p-8 flex flex-col items-center text-center">
        <div className="text-[var(--solae-text-faint)] text-xs tracking-widest uppercase mb-10">
          {singleScan ? "Chronological Age" : "Functional Body Age"}
        </div>
        {singleScan ? (
          <div className="text-center mb-6">
            <div className="font-display text-6xl text-gold-light">
              {currentBodyAge}
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-8 mb-6">
              <div className="text-center">
                <div className="text-[var(--solae-text-faint)] text-xs mb-2">Starting</div>
                <div className="font-display text-4xl text-[var(--solae-text-faint)] line-through decoration-1 decoration-[var(--solae-text-faint)]/40">
                  {startingBodyAge}
                </div>
              </div>
              <div className="text-gold text-2xl">→</div>
              <div className="text-center">
                <div className="text-[var(--solae-text-faint)] text-xs mb-2">Current</div>
                <div className="font-display text-5xl text-gold-light">
                  {currentBodyAge}
                </div>
              </div>
            </div>
            <div className="bg-[var(--solae-status-green)]/10 border border-[var(--solae-status-green)]/30 text-[var(--solae-status-green)] text-sm px-4 py-1.5 rounded-full">
              Years Recovered:{" "}
              <span className="font-semibold">{yearsRecovered}</span>
            </div>
          </>
        )}
        {!singleScan && sinceLast && (
          <SinceLastBlock sinceLast={sinceLast}>
            <div className="text-sm">
              {sinceLast.overallImprovement < 0 ? (
                <span className="text-[var(--solae-status-red)]">
                  Slight dip this cycle
                </span>
              ) : sinceLast.yearsRecovered > 0 ? (
                <span className="text-[var(--solae-status-green)]">
                  <span className="font-semibold">{sinceLast.yearsRecovered}</span>{" "}
                  yr{sinceLast.yearsRecovered === 1 ? "" : "s"} recovered
                </span>
              ) : (
                <span className="text-[var(--solae-text-muted)]">Holding steady</span>
              )}
            </div>
          </SinceLastBlock>
        )}
        {singleScan && (
          <div className="text-[var(--solae-text-faint)] text-xs mt-4 max-w-xs">
            Functional body age tracking unlocks once you have a follow-up scan to compare against.
          </div>
        )}
      </div>

      {/* Systems Improved / Systems In Range */}
      <div className="bg-[var(--solae-bg-card)] border border-[var(--solae-border)] rounded-xl p-8 flex flex-col items-center text-center">
        <div className="text-[var(--solae-text-faint)] text-xs tracking-widest uppercase mb-10">
          {singleScan ? "Systems In Range" : "Systems Improved"}
        </div>
        <div className="font-display text-6xl text-gold mb-3 flex items-baseline gap-3">
          {systemsImproved}{" "}
          <span className="text-3xl text-[var(--solae-text-muted)]">of</span>{" "}
          {systemsTotal}
        </div>
        <div className="text-[var(--solae-text)] text-sm mb-5">
          {singleScan ? "Systems in healthy range" : "Systems Improved"}
        </div>
        {!singleScan && (
          <div className="flex flex-col items-center gap-2">
            <div className="bg-[var(--solae-status-green)]/10 border border-[var(--solae-status-green)]/30 text-[var(--solae-status-green)] text-sm px-4 py-1.5 rounded-full">
              <span className="font-semibold">{systemsMovedToGreen}</span> systems moved to green
            </div>
            <div className="bg-[var(--solae-status-green)]/10 border border-[var(--solae-status-green)]/30 text-[var(--solae-status-green)] text-sm px-4 py-1.5 rounded-full">
              <span className="font-semibold">{markersMovedIntoRange}</span> markers moved into range
            </div>
            <div className="text-[var(--solae-text-faint)] text-xs mt-1">
              {currentMarkersInRange} of {totalMarkers} markers currently in range
            </div>
          </div>
        )}
        {!singleScan && sinceLast && (
          <SinceLastBlock sinceLast={sinceLast}>
            {sinceLast.systemsMovedToGreen > 0 || sinceLast.markersMovedIntoRange > 0 ? (
              <div className="text-sm text-[var(--solae-status-green)]">
                <span className="font-semibold">+{sinceLast.systemsMovedToGreen}</span>{" "}
                to green ·{" "}
                <span className="font-semibold">+{sinceLast.markersMovedIntoRange}</span>{" "}
                markers into range
              </div>
            ) : (
              <div className="text-sm text-[var(--solae-text-muted)]">
                No new systems to green this cycle
              </div>
            )}
          </SinceLastBlock>
        )}
        {singleScan && (
          <div className="flex flex-col items-center gap-2">
            <div className="bg-[var(--solae-status-green)]/10 border border-[var(--solae-status-green)]/30 text-[var(--solae-status-green)] text-sm px-4 py-1.5 rounded-full">
              <span className="font-semibold">{currentMarkersInRange}</span> of {totalMarkers} markers in normal range
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
