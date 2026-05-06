"use client";

import { useState } from "react";
import { LayoutGrid, Search } from "lucide-react";
import type { SystemSummary } from "@/lib/types";
import { SystemCard } from "./SystemCard";

export function SystemsGrid({
  systems,
  singleScan,
}: {
  systems: SystemSummary[];
  singleScan?: boolean;
}) {
  const [query, setQuery] = useState("");

  const filtered = systems.filter((s) =>
    s.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <LayoutGrid className="w-6 h-6 text-gold" />
        <h2 className="font-display text-2xl text-gold">Systems At A Glance</h2>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--solae-text-faint)]" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search systems..."
          className="w-full bg-[var(--solae-bg-card)] border border-[var(--solae-border)] rounded-md pl-10 pr-4 py-2 text-sm text-[var(--solae-text)] placeholder:text-[var(--solae-text-faint)] focus:outline-none focus:border-[var(--solae-gold-dim)]"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((system) => (
          <SystemCard
            key={system.name}
            system={system}
            singleScan={singleScan}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-[var(--solae-text-faint)] text-sm py-8 text-center">
          No systems match &ldquo;{query}&rdquo;
        </div>
      )}
    </section>
  );
}
