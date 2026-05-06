"use client";

import type { SupplementEvaluation, SupplementEvaluationRow } from "@/lib/supabase/types";

// ─── Score helpers ────────────────────────────────────────────────────────────

function scoreLabel(score: number): string {
  if (score >= 9) return "Excellent";
  if (score >= 8) return "Strong";
  if (score >= 7) return "Good";
  if (score >= 6) return "Average";
  if (score >= 5) return "Weak";
  return "Poor";
}

function scoreColor(score: number): string {
  if (score >= 8) return "#22c55e";
  if (score >= 6.5) return "#d4a24c";
  if (score >= 5) return "#eab308";
  return "#ef4444";
}

function ScoreRing({ score, label }: { score: number; label: string }) {
  const color = scoreColor(score);
  const pct = (score / 10) * 100;
  const circumference = 2 * Math.PI * 28;
  const dash = (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-20 h-20 flex items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 64 64" width="80" height="80">
          <circle cx="32" cy="32" r="28" fill="none" stroke="var(--solae-border)" strokeWidth="4" />
          <circle
            cx="32" cy="32" r="28" fill="none"
            stroke={color} strokeWidth="4"
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
          />
        </svg>
        <span className="font-display text-xl" style={{ color }}>{score.toFixed(1)}</span>
      </div>
      <div className="text-center">
        <div className="text-[10px] tracking-widest uppercase text-[var(--solae-text-faint)]">{label}</div>
        <div className="text-xs font-medium mt-0.5" style={{ color }}>{scoreLabel(score)}</div>
      </div>
    </div>
  );
}

// ─── Flag list ────────────────────────────────────────────────────────────────

const FLAG_STYLES = {
  red: { dot: "#ef4444", bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.25)", label: "Worth Noting" },
  yellow: { dot: "#eab308", bg: "rgba(234,179,8,0.08)", border: "rgba(234,179,8,0.25)", label: "Transparency Note" },
  green: { dot: "#22c55e", bg: "rgba(34,197,94,0.08)", border: "rgba(34,197,94,0.25)", label: "Quality Highlight" },
} as const;

function FlagSection({
  tier,
  items,
}: {
  tier: "red" | "yellow" | "green";
  items: string[];
}) {
  if (items.length === 0) return null;
  const s = FLAG_STYLES[tier];
  return (
    <div className="rounded-lg p-3" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
      <div className="text-[10px] tracking-widest uppercase mb-2 font-semibold" style={{ color: s.dot }}>
        {s.label}
      </div>
      <ul className="flex flex-col gap-1.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-[var(--solae-text)]">
            <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.dot }} />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Recommendation badge ─────────────────────────────────────────────────────

function RecommendationBadge({ use }: { use: "yes" | "no" | "conditional" }) {
  const config = {
    yes: { label: "Formula Supports Goal", color: "#22c55e", bg: "rgba(34,197,94,0.10)", border: "rgba(34,197,94,0.30)" },
    conditional: { label: "Review Before Using", color: "#d4a24c", bg: "rgba(212,162,76,0.10)", border: "rgba(212,162,76,0.30)" },
    no: { label: "Significant Quality Concerns", color: "#ef4444", bg: "rgba(239,68,68,0.10)", border: "rgba(239,68,68,0.30)" },
  }[use];

  return (
    <span
      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold tracking-wide"
      style={{ color: config.color, background: config.bg, border: `1px solid ${config.border}` }}
    >
      {config.label}
    </span>
  );
}

// ─── Main card ────────────────────────────────────────────────────────────────

interface Props {
  row: SupplementEvaluationRow;
  onDelete?: (id: string) => void;
  expanded?: boolean;
}

export function EvaluationCard({ row, onDelete, expanded = true }: Props) {
  const e: SupplementEvaluation = row.evaluation;
  const date = new Date(row.created_at).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });

  return (
    <div className="bg-[var(--solae-bg-card)] border border-[var(--solae-border)] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-[var(--solae-border)] flex items-start justify-between gap-4">
        <div>
          <div className="font-brand text-xs tracking-widest uppercase text-gold mb-1">
            Formula Assessment
          </div>
          <h3 className="font-display text-2xl text-[var(--solae-text)]">
            {e.product_name || "Unknown Product"}
          </h3>
          {e.product_type && (
            <div className="text-[var(--solae-text-faint)] text-sm mt-0.5">{e.product_type}</div>
          )}
          <div className="text-[var(--solae-text-faint)] text-xs mt-2">{date}</div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <RecommendationBadge use={e.recommendation.use} />
          {onDelete && (
            <button
              onClick={() => onDelete(row.id)}
              className="text-[var(--solae-text-faint)] hover:text-[#ef4444] transition-colors text-xs"
              aria-label="Delete evaluation"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div className="px-6 py-5 flex flex-col gap-6">
          {/* Score rings */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 justify-items-center">
            <ScoreRing score={e.purity_score} label="Purity" />
            <ScoreRing score={e.effectiveness_score} label="Effectiveness" />
            <ScoreRing score={e.bioavailability_score} label="Bioavailability" />
            <ScoreRing score={e.clean_label_score} label="Clean Label" />
          </div>

          {/* Overall score bar */}
          <div className="bg-[var(--solae-bg)] rounded-lg px-5 py-4 flex items-center gap-4">
            <div className="text-[var(--solae-text-faint)] text-xs tracking-widest uppercase whitespace-nowrap">
              Overall Formula Score
            </div>
            <div className="flex-1 h-2 bg-[var(--solae-border)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(e.overall_score / 10) * 100}%`,
                  background: scoreColor(e.overall_score),
                }}
              />
            </div>
            <div
              className="font-display text-2xl shrink-0"
              style={{ color: scoreColor(e.overall_score) }}
            >
              {e.overall_score.toFixed(1)}
              <span className="text-sm text-[var(--solae-text-faint)] ml-1">/ 10</span>
            </div>
          </div>

          {/* Plain English summary */}
          {e.plain_english_summary && (
            <div className="bg-[var(--solae-bg)] rounded-lg p-4">
              <div className="text-[10px] tracking-widest uppercase text-gold mb-2">
                Client Summary
              </div>
              <p className="text-sm text-[var(--solae-text)] leading-relaxed">
                {e.plain_english_summary}
              </p>
            </div>
          )}

          {/* Ingredient flags */}
          {(e.ingredient_flags.red.length > 0 ||
            e.ingredient_flags.yellow.length > 0 ||
            e.ingredient_flags.green.length > 0) && (
            <div className="flex flex-col gap-3">
              <div className="text-[10px] tracking-widest uppercase text-[var(--solae-text-faint)]">
                Ingredient Review
              </div>
              <FlagSection tier="red" items={e.ingredient_flags.red} />
              <FlagSection tier="yellow" items={e.ingredient_flags.yellow} />
              <FlagSection tier="green" items={e.ingredient_flags.green} />
            </div>
          )}

          {/* Top strengths + concerns */}
          {(e.top_strengths.length > 0 || e.top_concerns.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {e.top_strengths.length > 0 && (
                <div>
                  <div className="text-[10px] tracking-widest uppercase text-[#22c55e] mb-2">
                    Formula Strengths
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {e.top_strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-[var(--solae-text)]">
                        <span className="text-[#22c55e] mt-0.5">✓</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {e.top_concerns.length > 0 && (
                <div>
                  <div className="text-[10px] tracking-widest uppercase text-[var(--solae-text-faint)] mb-2">
                    Worth Discussing
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {e.top_concerns.map((c, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-[var(--solae-text)]">
                        <span className="text-[var(--solae-text-faint)] mt-0.5">·</span>
                        {c}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Practitioner notes */}
          {e.practitioner_summary && (
            <div className="border border-[var(--solae-border)] rounded-lg p-4">
              <div className="text-[10px] tracking-widest uppercase text-gold mb-2">
                Practitioner Notes
              </div>
              <p className="text-sm text-[var(--solae-text-muted)] leading-relaxed">
                {e.practitioner_summary}
              </p>
            </div>
          )}

          {/* Recommendation detail */}
          {(e.recommendation.best_for.length > 0 ||
            e.recommendation.avoid_or_caution_if.length > 0 ||
            e.recommendation.better_alternative_strategy) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {e.recommendation.best_for.length > 0 && (
                <div>
                  <div className="text-[10px] tracking-widest uppercase text-[var(--solae-text-faint)] mb-2">
                    Best Suited For
                  </div>
                  <ul className="flex flex-col gap-1">
                    {e.recommendation.best_for.map((b, i) => (
                      <li key={i} className="text-sm text-[var(--solae-text)]">· {b}</li>
                    ))}
                  </ul>
                </div>
              )}
              {e.recommendation.avoid_or_caution_if.length > 0 && (
                <div>
                  <div className="text-[10px] tracking-widest uppercase text-[var(--solae-text-faint)] mb-2">
                    Use With Caution If
                  </div>
                  <ul className="flex flex-col gap-1">
                    {e.recommendation.avoid_or_caution_if.map((a, i) => (
                      <li key={i} className="text-sm text-[var(--solae-text)]">· {a}</li>
                    ))}
                  </ul>
                </div>
              )}
              {e.recommendation.better_alternative_strategy && (
                <div className="md:col-span-2">
                  <div className="text-[10px] tracking-widest uppercase text-[var(--solae-text-faint)] mb-1">
                    Higher-Quality Approach
                  </div>
                  <p className="text-sm text-[var(--solae-text-muted)] italic">
                    {e.recommendation.better_alternative_strategy}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
