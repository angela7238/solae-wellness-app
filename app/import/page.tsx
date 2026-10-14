"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, RotateCw } from "lucide-react";
import type { ParsedScan } from "@/lib/parser/parseScan";

interface ParseResponse extends ParsedScan {
  _meta: {
    clientId: string;
    clientCreated: boolean;
    scanId: string;
    scanNumber: number;
    totalScans: number;
    guideWarning?: string;
  };
}

type Status =
  | { kind: "idle" }
  | { kind: "uploading"; fileName: string }
  | { kind: "parsing"; fileName: string }
  | { kind: "success"; fileName: string; result: ParseResponse }
  | { kind: "error"; message: string };

export default function ImportScanPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setStatus({ kind: "error", message: "Please drop a PDF file." });
      return;
    }
    setStatus({ kind: "uploading", fileName: file.name });

    const formData = new FormData();
    formData.append("pdf", file);

    setStatus({ kind: "parsing", fileName: file.name });
    try {
      const res = await fetch("/api/parse-scan", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const text = await res.text();
        let parsed: { error?: string; detail?: string } = {};
        try {
          parsed = JSON.parse(text);
        } catch {
          // Non-JSON response (e.g. Netlify function crashed before our handler ran).
          // Surface the raw body so we can see what the platform actually returned.
          throw new Error(
            `HTTP ${res.status} — non-JSON response: ${text.slice(0, 400) || "(empty body)"}`,
          );
        }
        const main = parsed.error || `Parse failed (HTTP ${res.status})`;
        throw new Error(parsed.detail ? `${main} — ${parsed.detail}` : main);
      }
      const result = (await res.json()) as ParseResponse;
      setStatus({ kind: "success", fileName: file.name, result });
    } catch (e) {
      setStatus({
        kind: "error",
        message: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  function viewDashboard() {
    if (status.kind !== "success") return;
    router.push(`/dashboard?client=${status.result._meta.clientId}`);
  }

  function reset() {
    setStatus({ kind: "idle" });
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Upload className="w-6 h-6 text-gold" />
        <h1 className="font-display text-3xl text-gold">Import New Scan</h1>
      </div>

      {/* Dropzone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          const file = e.dataTransfer.files[0];
          if (file) void handleFile(file);
        }}
        onClick={() => inputRef.current?.click()}
        className={`bg-[var(--solae-bg-card)] border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors mb-6 ${
          dragOver
            ? "border-[var(--solae-gold)] bg-[var(--solae-gold)]/5"
            : "border-[var(--solae-border)] hover:border-[var(--solae-gold-dim)]"
        }`}
      >
        <FileText className="w-12 h-12 text-gold mx-auto mb-4" />
        <h2 className="font-display text-2xl text-[var(--solae-text)] mb-2">
          Drop a Wellness Scan PDF here
        </h2>
        <p className="text-[var(--solae-text-muted)] text-sm max-w-md mx-auto">
          Or click to choose a file. Direct PDF upload — no copy-paste workflow.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
      </div>

      {/* Status panels */}
      {(status.kind === "uploading" || status.kind === "parsing") && (
        <div className="bg-[var(--solae-bg-card)] border border-[var(--solae-border)] rounded-xl p-6 flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-gold animate-spin" />
          <div>
            <div className="text-[var(--solae-text)] text-sm">
              {status.kind === "uploading"
                ? "Uploading"
                : "Parsing 41 systems..."}
            </div>
            <div className="text-[var(--solae-text-faint)] text-xs">
              {status.fileName}
            </div>
          </div>
        </div>
      )}

      {status.kind === "error" && (
        <div className="bg-[var(--solae-bg-card)] border border-[var(--solae-status-red)]/40 rounded-xl p-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[var(--solae-status-red)] shrink-0 mt-0.5" />
          <div>
            <div className="text-[var(--solae-text)] text-sm font-medium mb-1">
              Parse error
            </div>
            <div className="text-[var(--solae-text-muted)] text-sm">
              {status.message}
            </div>
          </div>
        </div>
      )}

      {status.kind === "success" && (
        <SuccessPanel
          result={status.result}
          onView={viewDashboard}
          onReset={reset}
        />
      )}
    </div>
  );
}

function SuccessPanel({
  result,
  onView,
  onReset,
}: {
  result: ParseResponse;
  onView: () => void;
  onReset: () => void;
}) {
  const dot = (status: string) =>
    status === "green"
      ? "bg-[var(--solae-status-green)]"
      : status === "blue"
        ? "bg-[var(--solae-status-blue)]"
        : status === "yellow"
          ? "bg-[var(--solae-status-yellow)]"
          : "bg-[var(--solae-status-red)]";

  return (
    <div className="bg-[var(--solae-bg-card)] border border-[var(--solae-status-green)]/40 rounded-xl p-6">
      <div className="flex items-start gap-3 mb-5">
        <CheckCircle2 className="w-6 h-6 text-[var(--solae-status-green)] shrink-0 mt-0.5" />
        <div className="flex-1">
          <div className="flex items-baseline gap-3 flex-wrap">
            <div className="font-display text-2xl text-[var(--solae-text)]">
              {result.client.name}
            </div>
            <div className="bg-[var(--solae-gold)]/10 border border-[var(--solae-gold-dim)]/40 text-gold-light text-xs px-3 py-1 rounded-full">
              {result._meta.clientCreated
                ? "New client"
                : `Scan #${result._meta.scanNumber} of ${result._meta.totalScans}`}
            </div>
          </div>
          <div className="text-[var(--solae-text-muted)] text-sm mt-1">
            Age {result.client.age} · Scan date {result.scanDateLocale}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <Stat label="Systems parsed" value={`${result.systems.length} / 41`} />
        <Stat label="Markers extracted" value={`${result.totalMarkers}`} />
        <Stat
          label="Markers in range"
          value={`${result.markersInRange} (${Math.round(
            (result.markersInRange / Math.max(result.totalMarkers, 1)) * 100,
          )}%)`}
        />
      </div>

      <div className="mb-6 text-sm">
        {result._meta.guideWarning && <p role="status">{result._meta.guideWarning}</p>}
        <a href="/guide" className="text-gold underline">Review with Solae Guide →</a>
      </div>

      <div className="text-[var(--solae-text-muted)] text-xs uppercase tracking-widest mb-3">
        Per-system summary
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-6 max-h-72 overflow-y-auto pr-2">
        {result.systems.map((s) => (
          <div
            key={s.name}
            className="flex items-center gap-3 bg-[var(--solae-bg-card-hover)] border border-[var(--solae-border-subtle)] rounded-md px-3 py-2"
          >
            <div className={`w-2 h-2 rounded-full ${dot(s.status)} shrink-0`} />
            <span className="text-[var(--solae-text)] text-sm flex-1 truncate">
              {s.name}
            </span>
            <span className="text-[var(--solae-text-faint)] text-xs">
              {s.markers.length} markers
            </span>
            <span className="text-gold text-sm font-semibold w-14 text-right">
              {s.percentNormal.toFixed(0)}%
            </span>
          </div>
        ))}
      </div>

      <div className="flex justify-between gap-3">
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-4 py-2.5 rounded-md border border-[var(--solae-border)] text-[var(--solae-text-muted)] hover:text-[var(--solae-text)] hover:bg-[var(--solae-bg-card-hover)] transition-colors text-sm"
        >
          <RotateCw className="w-4 h-4" />
          Upload another
        </button>
        <button
          onClick={onView}
          className="flex items-center gap-2 px-6 py-2.5 rounded-md bg-[var(--solae-gold)] text-[var(--solae-bg)] font-medium hover:bg-[var(--solae-gold-light)] transition-colors text-sm"
        >
          {result._meta.totalScans > 1 ? "View Journey →" : "View Dashboard →"}
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[var(--solae-bg-card-hover)] border border-[var(--solae-border-subtle)] rounded-md p-3">
      <div className="text-[var(--solae-text-faint)] text-xs uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="font-display text-xl text-gold">{value}</div>
    </div>
  );
}
