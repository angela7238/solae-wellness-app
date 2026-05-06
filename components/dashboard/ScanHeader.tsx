"use client";

import Link from "next/link";
import { Printer, FileText } from "lucide-react";

interface ScanOption {
  id: string;
  date: string; // ISO YYYY-MM-DD
}

interface Props {
  clientName: string;
  age: number;
  baselineDate: string;
  compareDate: string;
  singleScan?: boolean;
  scans?: ScanOption[];
  baselineId?: string;
  compareId?: string;
  onBaselineChange?: (id: string) => void;
  onCompareChange?: (id: string) => void;
  /** When provided, the "30-Day Plan" button links to /plan/[clientId]. */
  clientId?: string;
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  // Display as M/D/YYYY in client locale
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${parseInt(m, 10)}/${parseInt(d, 10)}/${y}`;
}

export function ScanHeader({
  clientName,
  age,
  baselineDate,
  compareDate,
  singleScan,
  scans,
  baselineId,
  compareId,
  onBaselineChange,
  onCompareChange,
  clientId,
}: Props) {
  return (
    <div className="flex items-end justify-between flex-wrap gap-6 mb-8">
      <div>
        <h1 className="font-display text-5xl text-[var(--solae-text)] leading-none mb-2">
          {clientName}
        </h1>
        <div className="text-[var(--solae-text-muted)] text-sm">
          Age {age} <span className="mx-2">·</span>{" "}
          {singleScan
            ? "Wellness Scan Dashboard"
            : "Wellness Scan Comparative Dashboard"}
        </div>
      </div>

      <div className="flex items-center gap-6 flex-wrap">
        {singleScan ? (
          <div className="flex items-center gap-3">
            <span className="text-[var(--solae-text-faint)] text-xs tracking-widest uppercase">
              Scan Date
            </span>
            <span className="bg-[var(--solae-bg-card)] border border-[var(--solae-border)] rounded-md px-3 py-2 text-sm text-[var(--solae-text)]">
              {compareDate}
            </span>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <span className="text-[var(--solae-text-faint)] text-xs tracking-widest uppercase">
                Baseline
              </span>
              {scans && onBaselineChange ? (
                <select
                  value={baselineId ?? ""}
                  onChange={(e) => onBaselineChange(e.target.value)}
                  className="bg-[var(--solae-bg-card)] border border-[var(--solae-border)] rounded-md px-3 py-2 text-sm text-[var(--solae-text)]"
                >
                  {scans.map((s) => (
                    <option key={s.id} value={s.id}>
                      {fmtDate(s.date)}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="bg-[var(--solae-bg-card)] border border-[var(--solae-border)] rounded-md px-3 py-2 text-sm text-[var(--solae-text)]">
                  {baselineDate}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[var(--solae-text-faint)] text-xs tracking-widest uppercase">
                Compare
              </span>
              {scans && onCompareChange ? (
                <select
                  value={compareId ?? ""}
                  onChange={(e) => onCompareChange(e.target.value)}
                  className="bg-[var(--solae-bg-card)] border border-[var(--solae-border)] rounded-md px-3 py-2 text-sm text-[var(--solae-text)]"
                >
                  {scans.map((s) => (
                    <option key={s.id} value={s.id}>
                      {fmtDate(s.date)}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="bg-[var(--solae-bg-card)] border border-[var(--solae-border)] rounded-md px-3 py-2 text-sm text-[var(--solae-text)]">
                  {compareDate}
                </span>
              )}
            </div>
          </>
        )}
        {clientId && (
          <Link
            href={`/plan/${clientId}${
              baselineId && compareId
                ? `?baseline=${baselineId}&compare=${compareId}`
                : ""
            }`}
            className="flex items-center gap-2 px-4 py-2 rounded-md bg-[var(--solae-gold)] text-[var(--solae-bg)] font-medium hover:bg-[var(--solae-gold-light)] transition-colors text-sm"
          >
            <FileText className="w-4 h-4" />
            30-Day Plan
          </Link>
        )}
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-md border border-[var(--solae-gold-dim)] text-gold hover:bg-[var(--solae-gold)]/10 transition-colors text-sm"
        >
          <Printer className="w-4 h-4" />
          Print Report
        </button>
      </div>
    </div>
  );
}
