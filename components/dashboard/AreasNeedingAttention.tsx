import { AlertTriangle } from "lucide-react";

export function AreasNeedingAttention({
  items,
}: {
  items: { name: string; system: string; value: number }[];
}) {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <AlertTriangle className="w-6 h-6 text-gold" />
        <h2 className="font-display text-2xl text-gold">Areas Still Needing Attention</h2>
      </div>
      <div className="flex flex-col gap-2">
        {items.map((m) => (
          <div
            key={m.name}
            className="bg-[var(--solae-bg-card)] border border-[var(--solae-border-subtle)] rounded-lg px-4 py-3 flex items-center gap-3"
          >
            <div className="w-2 h-2 rounded-full bg-[var(--solae-status-red)] shrink-0" />
            <span className="text-[var(--solae-text)] text-sm">{m.name}</span>
            <span className="text-[var(--solae-text-faint)] text-xs">
              {m.system}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
