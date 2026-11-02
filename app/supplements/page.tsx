"use client";

import { useState } from "react";
import { Layers, ChevronDown, Pill } from "lucide-react";
import { CLIENT_STACKS, productSupports } from "@/lib/clientStacks";

export default function ClientStacksPage() {
  const [open, setOpen] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Layers className="w-6 h-6 text-gold" />
        <h1 className="font-display text-3xl text-gold">Client Requested Stacks</h1>
      </div>
      <p className="text-[var(--solae-text-muted)] text-sm mb-1 max-w-2xl">
        Starting-point Vital Health stacks organized by what clients ask for.
        Pick a goal, review the suggested products, and customize per client on
        their plan.
      </p>
      <p className="text-[var(--solae-text-faint)] text-xs mb-8 max-w-2xl">
        Wellness support only — not intended to diagnose, treat, or cure any
        condition. Follow current product labels for serving directions.
      </p>

      {/* Stack cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CLIENT_STACKS.map((stack) => {
          const isOpen = open.has(stack.id);
          return (
            <div
              key={stack.id}
              className="bg-[var(--solae-bg-card)] border border-[var(--solae-border)] rounded-xl overflow-hidden self-start"
            >
              <button
                onClick={() => toggle(stack.id)}
                className="w-full text-left px-5 py-4 flex items-start justify-between gap-3 hover:bg-[var(--solae-gold)]/5 transition-colors"
              >
                <div>
                  <div className="font-display text-xl text-[var(--solae-text)]">
                    {stack.goal}
                  </div>
                  <div className="text-[var(--solae-text-muted)] text-xs italic mt-1">
                    {stack.request}
                  </div>
                </div>
                <ChevronDown
                  className={`w-5 h-5 text-[var(--solae-text-faint)] shrink-0 mt-1 transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isOpen && (
                <div className="px-5 pb-5">
                  <div className="text-[var(--solae-text-faint)] text-xs leading-relaxed mb-4 pb-3 border-b border-[var(--solae-border-subtle)]">
                    {stack.supports}
                  </div>
                  <ul className="flex flex-col gap-3">
                    {stack.products.map((name) => (
                      <li key={name} className="flex items-start gap-3">
                        <Pill className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                        <div>
                          <div className="text-sm text-[var(--solae-text)] font-medium">
                            {name}
                          </div>
                          <div className="text-[var(--solae-text-faint)] text-xs leading-snug">
                            {productSupports(name)}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
