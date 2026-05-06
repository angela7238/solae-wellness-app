import { Star, Trophy } from "lucide-react";
import type { StandoutMarker } from "@/lib/types";

const medalColors = [
  "text-[#fbbf24]", // gold
  "text-[#9ca3af]", // silver
  "text-[#cd7f32]", // bronze
  "text-[#3b82f6]", // 4
  "text-[#fbbf24]", // 5
];

export function StandoutImprovements({ items }: { items: StandoutMarker[] }) {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <Star className="w-6 h-6 text-gold" />
        <h2 className="font-display text-2xl text-gold">Standout Improvements</h2>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {items.map((m) => (
          <div
            key={m.name}
            className="bg-[var(--solae-bg-card)] border border-[var(--solae-border)] rounded-lg p-4 flex items-start gap-3"
          >
            <Star className="w-5 h-5 text-[var(--solae-gold-dim)] shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-baseline gap-3 flex-wrap mb-1">
                <h3 className="font-display text-lg text-[var(--solae-text)]">
                  {m.name}
                </h3>
                <span className="text-[var(--solae-status-green)] text-sm font-semibold">
                  +{m.changePercent.toFixed(1)}%
                </span>
              </div>
              <div className="text-[var(--solae-text-faint)] text-xs uppercase tracking-wide mb-2">
                {m.system}
              </div>
              <div className="text-[var(--solae-text-muted)] text-sm italic leading-relaxed">
                {m.narrative}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function TopImproved({ items }: { items: StandoutMarker[] }) {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <Trophy className="w-6 h-6 text-gold" />
        <h2 className="font-display text-2xl text-gold">Top 5 Most Improved Markers</h2>
      </div>
      <div className="flex flex-col gap-3">
        {items.slice(0, 5).map((m, i) => (
          <div
            key={m.name}
            className="bg-[var(--solae-bg-card)] border border-[var(--solae-border)] rounded-lg p-4 flex items-start gap-4"
          >
            <div className={`text-2xl ${medalColors[i] ?? "text-gold"}`}>
              {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "⭐"}
            </div>
            <div className="flex-1">
              <div className="flex items-baseline gap-3 flex-wrap mb-1">
                <h3 className="font-display text-lg text-[var(--solae-text)]">
                  {m.name}
                </h3>
                <span className="text-[var(--solae-status-green)] text-sm font-semibold">
                  +{m.changePercent.toFixed(1)}%
                </span>
              </div>
              <div className="text-[var(--solae-text-faint)] text-xs uppercase tracking-wide mb-1">
                {m.system}
              </div>
              <div className="text-[var(--solae-text-muted)] text-sm italic">
                {m.narrative}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
