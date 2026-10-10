"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, Eye, Trash2, Loader2, ChevronDown, ChevronRight, FileText, FlaskConical, Search, X } from "lucide-react";
import type { ClientRow } from "@/lib/supabase/types";
import type { ScanSummary } from "@/lib/db";

type ClientWithScans = ClientRow & {
  scan_count: number;
  scan_dates: string[];
  scans: ScanSummary[];
};

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${parseInt(m, 10)}/${parseInt(d, 10)}/${y}`;
}

function ScanHistoryRow({
  scan,
  clientId,
  baselineId,
  isLatest,
  isSingle,
}: {
  scan: ScanSummary;
  clientId: string;
  baselineId: string;
  isLatest: boolean;
  isSingle: boolean;
}) {
  const href = isSingle
    ? `/dashboard?client=${clientId}&compare=${scan.id}`
    : `/dashboard?client=${clientId}&baseline=${baselineId}&compare=${scan.id}`;

  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-[var(--solae-border-subtle)] last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <FileText className="w-3.5 h-3.5 text-[var(--solae-text-faint)] shrink-0" />
        <div>
          <span className="text-sm text-[var(--solae-text)]">{fmtDate(scan.scan_date)}</span>
          {isLatest && (
            <span className="ml-2 text-[10px] tracking-wider uppercase text-gold border border-[var(--solae-gold-dim)] px-1.5 py-0.5 rounded">
              Latest
            </span>
          )}
          {scan.notes && (
            <p className="text-xs text-[var(--solae-text-faint)] mt-0.5 truncate max-w-xs">
              {scan.notes}
            </p>
          )}
        </div>
      </div>
      <Link
        href={href}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-[var(--solae-border)] text-[var(--solae-text-muted)] hover:border-[var(--solae-gold-dim)] hover:text-gold transition-colors text-xs whitespace-nowrap shrink-0"
      >
        <Eye className="w-3 h-3" />
        View Report
      </Link>
    </div>
  );
}

export default function ClientsPage() {
  const [clients, setClients] = useState<ClientWithScans[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const visibleClients =
    clients && q
      ? clients.filter((c) =>
          [c.name, (c as { email?: string | null }).email, (c as { phone?: string | null }).phone]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(q)),
        )
      : clients;

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/clients");
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as { clients: ClientWithScans[] };
        setClients(data.clients);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function deleteClient(id: string, name: string) {
    if (!confirm(`Delete ${name} and all their scans? This cannot be undone.`))
      return;
    const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
    if (res.ok) {
      setClients((cs) => cs?.filter((c) => c.id !== id) ?? null);
    } else {
      alert("Failed to delete");
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Users className="w-6 h-6 text-gold" />
        <h1 className="font-display text-3xl text-gold">Client History</h1>
      </div>

      {clients && clients.length > 0 && (
        <div className="sticky top-[var(--header-h,81px)] z-10 -mx-1 px-1 pt-1 pb-4 mb-2 bg-[var(--solae-bg)]">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--solae-text-faint)] pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${clients.length} clients by name, email or phone`}
              aria-label="Search clients"
              autoComplete="off"
              className="w-full pl-10 pr-10 py-3 rounded-lg bg-[var(--solae-bg-card)] border border-[var(--solae-border)] text-[var(--solae-text)] placeholder:text-[var(--solae-text-faint)] text-sm focus:outline-none focus:border-[var(--solae-gold-dim)] [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded text-[var(--solae-text-faint)] hover:text-gold"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {q && (
            <div className="text-xs text-[var(--solae-text-faint)] mt-2">
              {visibleClients?.length ?? 0} of {clients.length} clients
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="bg-[var(--solae-bg-card)] border border-[var(--solae-status-red)]/40 rounded-xl p-4 mb-4 text-[var(--solae-text-muted)] text-sm">
          Could not load clients: {error}
        </div>
      )}

      {clients === null && !error && (
        <div className="flex items-center gap-2 text-[var(--solae-text-muted)] text-sm py-12 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading...
        </div>
      )}

      {clients && clients.length === 0 && (
        <div className="bg-[var(--solae-bg-card)] border border-[var(--solae-border)] rounded-xl p-12 text-center">
          <div className="text-[var(--solae-text-muted)] mb-4">
            No clients yet. Upload a Wellness Scan PDF to get started.
          </div>
          <Link
            href="/import"
            className="inline-block px-5 py-2 rounded-md bg-[var(--solae-gold)] text-[var(--solae-bg)] text-sm font-medium hover:bg-[var(--solae-gold-light)] transition-colors"
          >
            Import Scan →
          </Link>
        </div>
      )}

      {visibleClients && clients && clients.length > 0 && visibleClients.length === 0 && (
        <div className="text-center text-sm text-[var(--solae-text-muted)] py-12">
          No clients match &ldquo;{query}&rdquo;.
        </div>
      )}

      {visibleClients && visibleClients.length > 0 && (
        <div className="flex flex-col gap-3">
          {visibleClients.map((client) => {
            const isExpanded = expanded.has(client.id);
            const sortedScans = [...client.scans].sort((a, b) =>
              a.scan_date.localeCompare(b.scan_date),
            );
            const baselineId = sortedScans[0]?.id ?? "";
            const latestId = sortedScans[sortedScans.length - 1]?.id ?? "";
            const isSingle = sortedScans.length < 2;

            return (
              <div
                key={client.id}
                className="bg-[var(--solae-bg-card)] border border-[var(--solae-border)] rounded-xl overflow-hidden"
              >
                {/* Client row */}
                <div className="p-6 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="font-display text-2xl text-[var(--solae-text)] mb-1">
                      {client.name}
                    </h2>
                    <div className="text-[var(--solae-text-muted)] text-sm mb-1">
                      Age {client.age ?? "—"} <span className="mx-1">·</span>{" "}
                      {client.scan_count}{" "}
                      {client.scan_count === 1 ? "scan" : "scans"}
                    </div>
                    {sortedScans.length > 0 && (
                      <div className="text-[var(--solae-text-faint)] text-xs">
                        {sortedScans.map((s) => fmtDate(s.scan_date)).join(" → ")}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Latest report — quick access */}
                    <Link
                      href={
                        isSingle
                          ? `/dashboard?client=${client.id}`
                          : `/dashboard?client=${client.id}&baseline=${baselineId}&compare=${latestId}`
                      }
                      className="flex items-center gap-2 px-4 py-2 rounded-md border border-[var(--solae-gold-dim)] text-gold hover:bg-[var(--solae-gold)]/10 transition-colors text-sm"
                    >
                      <Eye className="w-4 h-4" />
                      View Latest
                    </Link>

                    {/* Supplement assessment shortcut */}
                    <Link
                      href={`/supplements?client=${client.id}`}
                      className="flex items-center gap-2 px-4 py-2 rounded-md border border-[var(--solae-border)] text-[var(--solae-text-muted)] hover:border-[var(--solae-gold-dim)] hover:text-gold transition-colors text-sm"
                    >
                      <FlaskConical className="w-4 h-4" />
                      Assess Supplement
                    </Link>

                    {/* Expand scan history */}
                    {sortedScans.length > 1 && (
                      <button
                        onClick={() => toggleExpand(client.id)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-md border border-[var(--solae-border)] text-[var(--solae-text-muted)] hover:border-[var(--solae-border-subtle)] transition-colors text-sm"
                        aria-label={isExpanded ? "Hide scan history" : "Show scan history"}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        History
                      </button>
                    )}

                    <button
                      onClick={() => deleteClient(client.id, client.name)}
                      className="flex items-center justify-center w-9 h-9 rounded-md border border-[var(--solae-status-red)]/30 text-[var(--solae-status-red)] hover:bg-[var(--solae-status-red)]/10 transition-colors"
                      aria-label={`Delete ${client.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Scan history (expanded) */}
                {isExpanded && sortedScans.length > 1 && (
                  <div className="px-6 pb-4 border-t border-[var(--solae-border-subtle)]">
                    <div className="text-[10px] tracking-widest uppercase text-[var(--solae-text-faint)] py-3">
                      All Reports — baseline always Scan 1
                    </div>
                    {sortedScans.map((scan) => (
                      <ScanHistoryRow
                        key={scan.id}
                        scan={scan}
                        clientId={client.id}
                        baselineId={baselineId}
                        isLatest={scan.id === latestId}
                        isSingle={isSingle}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
