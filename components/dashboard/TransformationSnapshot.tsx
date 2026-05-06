"use client";

import type { ParsedScan, ParsedMarker } from "@/lib/parser/parseScan";

// ─── Types ────────────────────────────────────────────────────────────────────

type StatusLabel = "LOW" | "NORMAL" | "HIGH";

interface MarkerRow {
  name: string;
  baseValue: number | null;
  baseStatus: StatusLabel | null;
  curValue: number;
  curStatus: StatusLabel;
  rangeMin: number;
  rangeMax: number;
  pctChange: number | null;
  /** true = moved toward or into normal range */
  improved: boolean | null;
  movedToNormal: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStatus(value: number, min: number, max: number): StatusLabel {
  if (value < min) return "LOW";
  if (value > max) return "HIGH";
  return "NORMAL";
}

function movedTowardNormal(
  baseValue: number,
  curValue: number,
  min: number,
  max: number,
): boolean {
  const center = (min + max) / 2;
  return Math.abs(curValue - center) < Math.abs(baseValue - center);
}

function buildMarkerRows(
  baseline: ParsedScan | null,
  compare: ParsedScan,
  systemName: string,
): MarkerRow[] {
  const curSys = compare.systems.find((s) => s.name === systemName);
  if (!curSys) return [];

  const baseMap = new Map<string, ParsedMarker>();
  if (baseline) {
    const baseSys = baseline.systems.find((s) => s.name === systemName);
    if (baseSys) {
      for (const m of baseSys.markers) baseMap.set(m.name, m);
    }
  }

  return curSys.markers.map((cur) => {
    const base = baseMap.get(cur.name) ?? null;
    const curStatus = getStatus(cur.value, cur.rangeMin, cur.rangeMax);

    if (!base) {
      return {
        name: cur.name,
        baseValue: null,
        baseStatus: null,
        curValue: cur.value,
        curStatus,
        rangeMin: cur.rangeMin,
        rangeMax: cur.rangeMax,
        pctChange: null,
        improved: null,
        movedToNormal: false,
      };
    }

    const baseStatus = getStatus(base.value, base.rangeMin, base.rangeMax);
    const rawChange = base.value !== 0 ? ((cur.value - base.value) / Math.abs(base.value)) * 100 : 0;
    const improved = movedTowardNormal(base.value, cur.value, cur.rangeMin, cur.rangeMax);
    const movedToNormal = baseStatus !== "NORMAL" && curStatus === "NORMAL";

    return {
      name: cur.name,
      baseValue: base.value,
      baseStatus,
      curValue: cur.value,
      curStatus,
      rangeMin: cur.rangeMin,
      rangeMax: cur.rangeMax,
      pctChange: Math.abs(rawChange),
      improved,
      movedToNormal,
    };
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const STATUS_COLORS: Record<StatusLabel, { text: string; bg: string; border: string }> = {
  NORMAL: {
    text: "#d4a24c",
    bg: "rgba(212,162,76,0.10)",
    border: "rgba(212,162,76,0.30)",
  },
  LOW: {
    text: "#3b82f6",
    bg: "rgba(59,130,246,0.10)",
    border: "rgba(59,130,246,0.28)",
  },
  HIGH: {
    text: "#ef4444",
    bg: "rgba(239,68,68,0.10)",
    border: "rgba(239,68,68,0.28)",
  },
};

function StatusPill({ label }: { label: StatusLabel }) {
  const c = STATUS_COLORS[label];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wider uppercase"
      style={{ color: c.text, background: c.bg, border: `1px solid ${c.border}` }}
    >
      {label}
    </span>
  );
}

function ImprovementBadge({
  pctChange,
  improved,
  movedToNormal,
}: {
  pctChange: number;
  improved: boolean;
  movedToNormal: boolean;
}) {
  const color = movedToNormal ? "#22c55e" : improved ? "#d4a24c" : "#9ca0aa";
  const pctStr = `${pctChange.toFixed(1)}%`;
  const label = movedToNormal
    ? `↑ ${pctStr} · In Range`
    : improved
      ? `↑ ${pctStr} improved`
      : `${pctStr} change`;

  return (
    <span className="text-xs font-medium whitespace-nowrap" style={{ color }}>
      {label}
    </span>
  );
}

function formatValue(value: number): string {
  // Show up to 3 significant decimals; trim trailing zeros
  if (value >= 100) return value.toFixed(1);
  if (value >= 10) return value.toFixed(2);
  return value.toFixed(3).replace(/\.?0+$/, "") || "0";
}

// Single marker comparison row
function MarkerCompareRow({ row, showBaseline }: { row: MarkerRow; showBaseline: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-[var(--solae-border-subtle)] last:border-0">
      {/* Marker name */}
      <div className="text-sm text-[var(--solae-text)] min-w-0 flex-1 truncate">
        {row.name}
      </div>

      {/* Value comparison */}
      <div className="flex items-center gap-2 shrink-0">
        {showBaseline && row.baseValue !== null && row.baseStatus ? (
          <>
            <span className="text-sm text-[var(--solae-text-muted)] tabular-nums">
              {formatValue(row.baseValue)}
            </span>
            <StatusPill label={row.baseStatus} />
            <span className="text-[var(--solae-text-faint)] text-sm">→</span>
          </>
        ) : null}
        <span className="text-sm text-[var(--solae-text)] tabular-nums font-medium">
          {formatValue(row.curValue)}
        </span>
        <StatusPill label={row.curStatus} />
      </div>

      {/* Improvement badge */}
      {showBaseline && row.pctChange !== null && row.improved !== null && (
        <div className="shrink-0 w-28 text-right">
          <ImprovementBadge
            pctChange={row.pctChange}
            improved={row.improved}
            movedToNormal={row.movedToNormal}
          />
        </div>
      )}
    </div>
  );
}

// Liver Function section — all 5 markers, always full detail
function LiverSection({
  rows,
  showBaseline,
}: {
  rows: MarkerRow[];
  showBaseline: boolean;
}) {
  if (rows.length === 0) return null;
  const movedCount = rows.filter((r) => r.movedToNormal).length;
  const improvedCount = rows.filter((r) => r.improved && !r.movedToNormal).length;

  return (
    <div className="bg-[var(--solae-bg-card)] border border-[var(--solae-border)] rounded-xl overflow-hidden">
      {/* Section header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--solae-border)]">
        <div>
          <div className="font-brand text-xs tracking-widest uppercase text-gold">
            Liver & Metabolic Function
          </div>
          <div className="text-[var(--solae-text-faint)] text-xs mt-0.5">
            Energy · Detox · Fat Processing
          </div>
        </div>
        {showBaseline && (movedCount > 0 || improvedCount > 0) && (
          <div className="text-right">
            {movedCount > 0 && (
              <div className="text-xs text-[#22c55e] font-medium">
                {movedCount} moved to normal
              </div>
            )}
            {improvedCount > 0 && (
              <div className="text-xs text-gold">
                {improvedCount} improving
              </div>
            )}
          </div>
        )}
      </div>

      {/* Column headers (comparison mode only) */}
      {showBaseline && (
        <div className="flex items-center justify-between gap-3 px-5 py-2 bg-[var(--solae-bg)] border-b border-[var(--solae-border-subtle)]">
          <div className="text-[10px] tracking-widest uppercase text-[var(--solae-text-faint)]">
            Marker
          </div>
          <div className="flex items-center gap-8 text-[10px] tracking-widest uppercase text-[var(--solae-text-faint)] shrink-0">
            <span>Before → After</span>
            <span className="w-28 text-right">Change</span>
          </div>
        </div>
      )}

      {/* Rows */}
      <div className="px-5">
        {rows.map((row) => (
          <MarkerCompareRow key={row.name} row={row} showBaseline={showBaseline} />
        ))}
      </div>
    </div>
  );
}

// Supplement section (Vitamins / Trace Elements / Amino Acids) — focused on movers
function SupplementSection({
  title,
  subtitle,
  rows,
  showBaseline,
}: {
  title: string;
  subtitle: string;
  rows: MarkerRow[];
  showBaseline: boolean;
}) {
  if (rows.length === 0) return null;

  // Sort: moved to normal first, then still improving, then the rest
  const sorted = [...rows].sort((a, b) => {
    if (a.movedToNormal !== b.movedToNormal) return a.movedToNormal ? -1 : 1;
    if ((a.improved ?? false) !== (b.improved ?? false)) return (a.improved ?? false) ? -1 : 1;
    // Within each group, sort by pctChange descending
    return (b.pctChange ?? 0) - (a.pctChange ?? 0);
  });

  // When comparing: only show markers that were out of range in baseline OR are currently out of range
  // (hides all the "normal → normal" ones that didn't need attention)
  const visible = showBaseline
    ? sorted.filter((r) => r.baseStatus !== "NORMAL" || r.curStatus !== "NORMAL")
    : sorted.filter((r) => r.curStatus !== "NORMAL");

  const movedCount = rows.filter((r) => r.movedToNormal).length;
  const totalOutOfRange = rows.filter((r) => r.curStatus !== "NORMAL").length;
  const alreadyNormal = rows.length - (showBaseline ? rows.filter((r) => r.baseStatus !== "NORMAL" || r.curStatus !== "NORMAL").length : totalOutOfRange);

  return (
    <div className="bg-[var(--solae-bg-card)] border border-[var(--solae-border)] rounded-xl overflow-hidden">
      {/* Section header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--solae-border)]">
        <div>
          <div className="font-brand text-xs tracking-widest uppercase text-gold">
            {title}
          </div>
          <div className="text-[var(--solae-text-faint)] text-xs mt-0.5">{subtitle}</div>
        </div>
        {showBaseline ? (
          <div className="text-right">
            {movedCount > 0 && (
              <div className="text-xs text-[#22c55e] font-medium">
                {movedCount} moved to normal
              </div>
            )}
            {alreadyNormal > 0 && (
              <div className="text-xs text-[var(--solae-text-faint)]">
                {alreadyNormal} already in range
              </div>
            )}
          </div>
        ) : (
          totalOutOfRange === 0 ? (
            <div className="text-xs text-[#22c55e] font-medium">All in normal range</div>
          ) : (
            <div className="text-xs text-[var(--solae-text-faint)]">
              {rows.length - totalOutOfRange} of {rows.length} in range
            </div>
          )
        )}
      </div>

      {visible.length === 0 ? (
        <div className="px-5 py-4 text-sm text-[var(--solae-text-faint)] italic">
          All markers held steady in normal range.
        </div>
      ) : (
        <div className="px-5">
          {visible.map((row) => (
            <MarkerCompareRow key={row.name} row={row} showBaseline={showBaseline} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

interface Props {
  baseline: ParsedScan | null;
  compare: ParsedScan;
  baselineDate: string;
  compareDate: string;
}

export function TransformationSnapshot({
  baseline,
  compare,
  baselineDate,
  compareDate,
}: Props) {
  const showBaseline = baseline !== null;

  const liverRows = buildMarkerRows(baseline, compare, "Liver Function");
  const vitaminRows = buildMarkerRows(baseline, compare, "Vitamin");
  const mineralRows = buildMarkerRows(baseline, compare, "Trace Element");
  const aminoRows = buildMarkerRows(baseline, compare, "Amino Acid");

  const hasAnyData =
    liverRows.length > 0 ||
    vitaminRows.length > 0 ||
    mineralRows.length > 0 ||
    aminoRows.length > 0;

  if (!hasAnyData) return null;

  return (
    <div className="mb-6">
      {/* Header */}
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <h2 className="font-brand text-sm tracking-widest uppercase text-gold">
            {showBaseline ? "Are Your Supplements Working?" : "Current Supplement Markers"}
          </h2>
          {showBaseline && (
            <div className="text-[var(--solae-text-faint)] text-xs mt-1">
              {baselineDate} → {compareDate}
            </div>
          )}
        </div>
        {!showBaseline && (
          <div className="text-[var(--solae-text-faint)] text-xs">
            Add a follow-up scan to see what changed.
          </div>
        )}
      </div>

      {/* Sections */}
      <div className="flex flex-col gap-4">
        <LiverSection rows={liverRows} showBaseline={showBaseline} />
        <SupplementSection
          title="Vitamins"
          subtitle="A · B1 · B2 · B3 · B6 · B12 · C · D3 · E · K"
          rows={vitaminRows}
          showBaseline={showBaseline}
        />
        <SupplementSection
          title="Trace Minerals"
          subtitle="Zinc · Magnesium · Selenium · Calcium · Iron + more"
          rows={mineralRows}
          showBaseline={showBaseline}
        />
        <SupplementSection
          title="Amino Acids"
          subtitle="Essential amino acid profile"
          rows={aminoRows}
          showBaseline={showBaseline}
        />
      </div>
    </div>
  );
}
