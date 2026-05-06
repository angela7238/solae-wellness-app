"use client";

import { useState, useRef, useCallback } from "react";
import { Loader2, Check, PenLine } from "lucide-react";

interface Props {
  scanId: string;
  initialNotes: string;
}

type SaveState = "idle" | "saving" | "saved" | "error";

export function ScanNotes({ scanId, initialNotes }: Props) {
  const [text, setText] = useState(initialNotes);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const lastSaved = useRef(initialNotes);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(
    async (value: string) => {
      if (value === lastSaved.current) return;
      setSaveState("saving");
      try {
        const res = await fetch(`/api/scans/${scanId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: value }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        lastSaved.current = value;
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 2500);
      } catch {
        setSaveState("error");
      }
    },
    [scanId],
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
    setSaveState("idle");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(e.target.value), 1200);
  };

  const handleBlur = () => {
    if (timer.current) clearTimeout(timer.current);
    void save(text);
  };

  return (
    <div className="bg-[var(--solae-bg-card)] border border-[var(--solae-border)] rounded-xl overflow-hidden mb-6 print:border-[var(--solae-border-subtle)]">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--solae-border)]">
        <div className="flex items-center gap-2">
          <PenLine className="w-4 h-4 text-gold" />
          <span className="font-brand text-xs tracking-widest uppercase text-gold">
            Session Notes
          </span>
        </div>
        <div className="text-xs text-[var(--solae-text-faint)] flex items-center gap-1.5 h-5">
          {saveState === "saving" && (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Saving…
            </>
          )}
          {saveState === "saved" && (
            <>
              <Check className="w-3 h-3 text-[#22c55e]" />
              <span className="text-[#22c55e]">Saved</span>
            </>
          )}
          {saveState === "error" && (
            <span className="text-[#ef4444]">Save failed — try again</span>
          )}
          {saveState === "idle" && text !== lastSaved.current && (
            <span>Unsaved changes</span>
          )}
        </div>
      </div>

      {/* Textarea */}
      <textarea
        value={text}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="Add notes about this session — what was discussed, client feedback, protocol adjustments, goals for next scan…"
        rows={5}
        className="w-full bg-transparent px-5 py-4 text-sm text-[var(--solae-text)] placeholder:text-[var(--solae-text-faint)] resize-none focus:outline-none leading-relaxed print:resize-none"
      />

      {/* Print: show notes as plain text instead of textarea */}
      <style>{`
        @media print {
          textarea { display: none; }
        }
      `}</style>
      {text && (
        <div className="hidden print:block px-5 pb-4 text-sm text-[var(--solae-text)] leading-relaxed whitespace-pre-wrap">
          {text}
        </div>
      )}
    </div>
  );
}
