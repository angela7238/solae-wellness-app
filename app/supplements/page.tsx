"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FlaskConical, Upload, Loader2, ChevronDown } from "lucide-react";
import type { ClientRow } from "@/lib/supabase/types";
import type { SupplementEvaluationRow } from "@/lib/supabase/types";
import { EvaluationCard } from "@/components/supplements/EvaluationCard";

// ─── Image upload area ────────────────────────────────────────────────────────

function ImageUpload({
  onImage,
  preview,
}: {
  onImage: (base64: string, mediaType: string) => void;
  preview: string | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      const [header, data] = result.split(",");
      const rawType = header.split(":")[1].split(";")[0];
      const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      const mediaType = allowed.includes(rawType) ? rawType : "image/jpeg";
      onImage(data, mediaType);
    };
    reader.readAsDataURL(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) handleFile(file);
  }

  return (
    <div
      className="relative border-2 border-dashed border-[var(--solae-border)] rounded-xl overflow-hidden cursor-pointer hover:border-[var(--solae-gold-dim)] transition-colors"
      style={{ minHeight: 200 }}
      onClick={() => inputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {preview ? (
        <div className="flex flex-col items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`data:image/jpeg;base64,${preview.slice(0, 20)}...`}
            alt=""
            className="hidden"
          />
          <div className="w-full h-48 bg-[var(--solae-bg)] flex items-center justify-center">
            <div className="text-[var(--solae-text-faint)] text-sm">
              ✓ Image loaded — tap to replace
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-3 py-12 px-6 text-center">
          <Upload className="w-8 h-8 text-[var(--solae-text-faint)]" />
          <div>
            <div className="text-[var(--solae-text)] text-sm font-medium">
              Tap to upload or drag a photo here
            </div>
            <div className="text-[var(--solae-text-faint)] text-xs mt-1">
              Supplement Facts panel, Other Ingredients, or full label
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function SupplementsInner() {
  const searchParams = useSearchParams();
  const preselectedClientId = searchParams.get("client");

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [selectedClientId, setSelectedClientId] = useState(preselectedClientId ?? "");
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState("image/jpeg");
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [latestResult, setLatestResult] = useState<SupplementEvaluationRow | null>(null);
  const [history, setHistory] = useState<SupplementEvaluationRow[]>([]);
  const [historyLoaded, setHistoryLoaded] = useState(false);

  // Load client list
  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/clients");
        if (!res.ok) return;
        const data = (await res.json()) as { clients: ClientRow[] };
        setClients(data.clients);
      } catch {}
    })();
  }, []);

  // Load history when client changes
  useEffect(() => {
    if (!selectedClientId) { setHistory([]); setHistoryLoaded(false); return; }
    setHistoryLoaded(false);
    void (async () => {
      try {
        const res = await fetch(`/api/clients/${selectedClientId}/supplements`);
        if (!res.ok) return;
        const data = (await res.json()) as { evaluations: SupplementEvaluationRow[] };
        setHistory(data.evaluations);
        setHistoryLoaded(true);
      } catch {}
    })();
  }, [selectedClientId]);

  async function handleEvaluate() {
    if (!selectedClientId || !imageBase64) return;
    setEvaluating(true);
    setError(null);
    setLatestResult(null);
    try {
      const res = await fetch("/api/supplements/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: selectedClientId, imageBase64, mediaType }),
      });
      const data = await res.json() as { evaluation?: SupplementEvaluationRow["evaluation"]; id?: string; error?: string };
      if (!res.ok || data.error) throw new Error(data.error ?? "Evaluation failed");

      const newRow: SupplementEvaluationRow = {
        id: data.id ?? crypto.randomUUID(),
        client_id: selectedClientId,
        product_name: data.evaluation?.product_name ?? null,
        brand_name: null,
        evaluation: data.evaluation!,
        created_at: new Date().toISOString(),
      };
      setLatestResult(newRow);
      setHistory((prev) => [newRow, ...prev]);
      setImageBase64(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setEvaluating(false);
    }
  }

  function handleDelete(id: string) {
    if (!confirm("Remove this evaluation?")) return;
    setHistory((prev) => prev.filter((r) => r.id !== id));
    if (latestResult?.id === id) setLatestResult(null);
    void fetch(`/api/clients/${selectedClientId}/supplements`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ evaluationId: id }),
    });
  }

  const selectedClient = clients.find((c) => c.id === selectedClientId);
  const canEvaluate = selectedClientId && imageBase64 && !evaluating;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-8">
        <FlaskConical className="w-6 h-6 text-gold" />
        <div>
          <h1 className="font-display text-3xl text-gold">Supplement Assessment</h1>
          <p className="text-[var(--solae-text-faint)] text-xs mt-0.5">
            This tool evaluates whether a formula is clean, transparent, absorbable, and likely to support the intended wellness goal.
          </p>
        </div>
      </div>

      {/* New evaluation form */}
      <div className="bg-[var(--solae-bg-card)] border border-[var(--solae-border)] rounded-xl overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-[var(--solae-border)]">
          <div className="font-brand text-xs tracking-widest uppercase text-gold">
            New Evaluation
          </div>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">
          {/* Client selector */}
          <div>
            <label className="block text-[10px] tracking-widest uppercase text-[var(--solae-text-faint)] mb-2">
              Client
            </label>
            <div className="relative">
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full bg-[var(--solae-bg)] border border-[var(--solae-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--solae-text)] appearance-none focus:outline-none focus:border-[var(--solae-gold-dim)] pr-9"
              >
                <option value="">Select a client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--solae-text-faint)] pointer-events-none" />
            </div>
          </div>

          {/* Image upload */}
          <div>
            <label className="block text-[10px] tracking-widest uppercase text-[var(--solae-text-faint)] mb-2">
              Label Photo
            </label>
            <ImageUpload
              preview={imageBase64}
              onImage={(b64, mt) => { setImageBase64(b64); setMediaType(mt); }}
            />
          </div>

          {/* Error */}
          {error && (
            <div className="text-sm text-[#ef4444] bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.25)] rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          {/* Evaluate button */}
          <button
            onClick={handleEvaluate}
            disabled={!canEvaluate}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: canEvaluate ? "var(--solae-gold)" : "var(--solae-border)",
              color: canEvaluate ? "var(--solae-bg)" : "var(--solae-text-faint)",
            }}
          >
            {evaluating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Evaluating formula…
              </>
            ) : (
              <>
                <FlaskConical className="w-4 h-4" />
                Evaluate Formula
              </>
            )}
          </button>
        </div>
      </div>

      {/* Latest result */}
      {latestResult && (
        <div className="mb-8">
          <div className="text-[10px] tracking-widest uppercase text-[var(--solae-text-faint)] mb-3">
            Result
          </div>
          <EvaluationCard row={latestResult} onDelete={handleDelete} />
        </div>
      )}

      {/* History */}
      {selectedClientId && historyLoaded && history.length > 0 && (
        <div>
          <div className="text-[10px] tracking-widest uppercase text-[var(--solae-text-faint)] mb-3">
            {selectedClient?.name ?? "Client"} — Past Evaluations
          </div>
          <div className="flex flex-col gap-4">
            {history
              .filter((r) => r.id !== latestResult?.id)
              .map((row) => (
                <EvaluationCard key={row.id} row={row} onDelete={handleDelete} expanded={false} />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SupplementsPage() {
  return (
    <Suspense>
      <SupplementsInner />
    </Suspense>
  );
}
