import { ArrowUp, ArrowRight, ArrowDown, Circle } from "lucide-react";
import type { SystemSummary } from "@/lib/types";

const statusColor: Record<SystemSummary["status"], string> = {
  green: "#22c55e",
  yellow: "#eab308",
  blue: "#3b82f6",
  red: "#ef4444",
};

const statusGlowRGBA: Record<SystemSummary["status"], string> = {
  green: "rgba(34, 197, 94, 0.18)",
  yellow: "rgba(234, 179, 8, 0.18)",
  blue: "rgba(59, 130, 246, 0.22)",
  red: "rgba(239, 68, 68, 0.22)",
};

export function SystemCard({
  system,
  singleScan,
}: {
  system: SystemSummary;
  singleScan?: boolean;
}) {
  const Arrow =
    system.change > 0 ? ArrowUp : system.change < 0 ? ArrowDown : ArrowRight;
  const arrowColor =
    system.change > 0
      ? statusColor.green
      : system.change < 0
        ? statusColor.red
        : "#9ca0aa";

  const color = statusColor[system.status];
  const glow = statusGlowRGBA[system.status];

  return (
    <div
      className="bg-[var(--solae-bg-card)] rounded-lg p-4 flex flex-col gap-3 hover:bg-[var(--solae-bg-card-hover)] transition-colors"
      style={{
        border: `2px solid ${color}`,
        boxShadow: `inset 0 0 0 1px ${glow}, 0 0 16px -4px ${glow}`,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="font-display text-lg leading-tight text-[var(--solae-text)]">
          {system.name}
        </div>
        {singleScan ? (
          <Circle
            className="w-4 h-4 shrink-0 mt-1 fill-current"
            style={{ color }}
          />
        ) : (
          <Arrow
            className="w-4 h-4 shrink-0 mt-1"
            style={{ color: arrowColor }}
          />
        )}
      </div>

      {singleScan ? (
        <div className="flex items-baseline gap-2 text-sm">
          <span className="font-semibold text-2xl" style={{ color }}>
            {system.current.toFixed(1)}%
          </span>
          <span className="text-[var(--solae-text-faint)] text-xs">
            in range
          </span>
        </div>
      ) : (
        <div className="flex items-baseline gap-2 text-sm">
          <span style={{ color, opacity: 0.65 }}>
            {system.baseline.toFixed(1)}%
          </span>
          <span className="text-[var(--solae-text-faint)]">→</span>
          <span className="font-semibold" style={{ color }}>
            {system.current.toFixed(1)}%
          </span>
        </div>
      )}

      <div className="relative h-1.5 bg-[var(--solae-border-subtle)] rounded-full overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full rounded-full transition-all"
          style={{
            width: `${Math.min(system.current, 100)}%`,
            background: color,
            boxShadow: `0 0 8px ${color}88`,
          }}
        />
      </div>

      {!singleScan && (
        <div
          className="text-xs self-end font-medium"
          style={{
            color:
              system.change > 0
                ? statusColor.green
                : system.change < 0
                  ? statusColor.red
                  : "#9ca0aa",
          }}
        >
          {system.change > 0 && "+"}
          {system.change.toFixed(1)}%
        </div>
      )}
    </div>
  );
}
