import type { Phase } from "@/lib/types";

const phases: { key: Phase; label: string }[] = [
  { key: "detox", label: "Detox" },
  { key: "repair", label: "Repair" },
  { key: "restore", label: "Restore" },
  { key: "nourish", label: "Nourish" },
];

const phaseLabel: Record<Phase, string> = {
  detox: "Detox",
  repair: "Repair",
  restore: "Restore",
  nourish: "Nourish",
};

interface Props {
  current: Phase;
  secondary?: Phase;
}

export function HealingPhase({ current, secondary }: Props) {
  const currentIdx = phases.findIndex((p) => p.key === current);

  return (
    <div className="bg-[var(--solae-bg-card)] border border-[var(--solae-border)] rounded-xl p-8 mb-8">
      <div className="text-[var(--solae-text-faint)] text-xs tracking-widest uppercase text-center mb-8">
        Healing Phase
      </div>

      <div className="flex items-center justify-between max-w-3xl mx-auto px-2">
        {phases.map((phase, i) => {
          const isCurrent = phase.key === current;
          const isSecondary = phase.key === secondary;
          const isPast = i < currentIdx;
          const isActive = isCurrent || isSecondary;

          return (
            <div key={phase.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex flex-col items-center">
                <div
                  className={`w-5 h-5 rounded-full border-2 transition-all ${
                    isCurrent
                      ? "bg-[var(--solae-gold)] border-[var(--solae-gold)]"
                      : isSecondary
                        ? "bg-[var(--solae-gold-dim)] border-[var(--solae-gold-dim)]"
                        : isPast
                          ? "border-[var(--solae-gold-dim)] bg-[var(--solae-gold-dim)]/30"
                          : "border-[var(--solae-border)] bg-transparent"
                  }`}
                />
                <div
                  className={`mt-3 text-sm tracking-wider ${
                    isActive
                      ? "text-gold"
                      : isPast
                        ? "text-[var(--solae-text-muted)]"
                        : "text-[var(--solae-text-faint)]"
                  }`}
                >
                  {phase.label}
                </div>
              </div>
              {i < phases.length - 1 && (
                <div
                  className={`flex-1 h-px mx-3 mt-[-22px] ${
                    isPast || isCurrent
                      ? "bg-[var(--solae-gold-dim)]"
                      : "bg-[var(--solae-border)]"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="text-center mt-7">
        <div className="text-gold-light text-base font-medium">
          Current: {phaseLabel[current]} Phase
          {secondary && (
            <span className="text-[var(--solae-text-muted)] text-sm ml-2">
              · supportive secondary: {phaseLabel[secondary]}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
