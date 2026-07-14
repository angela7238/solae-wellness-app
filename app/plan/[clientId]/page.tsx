"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Loader2,
  Printer,
  ArrowLeft,
  Sparkles,
  ListChecks,
  CheckCircle2,
  Pill,
  Sun,
  Coffee,
  Moon,
  TrendingUp,
  ShieldAlert,
} from "lucide-react";
import { buildComparison } from "@/lib/compare";
import { fromParsedScan } from "@/lib/adapters";
import { buildRecommendations } from "@/lib/recommendations";
import type { PlanRecommendation } from "@/lib/recommendations";
import type { ScanComparison } from "@/lib/types";
import type { ClientRow, ScanRow } from "@/lib/supabase/types";

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${parseInt(m, 10)}/${parseInt(d, 10)}/${y}`;
}

function PlanInner() {
  const params = useParams<{ clientId: string }>();
  const searchParams = useSearchParams();
  const clientId = params.clientId;
  const baselineParam = searchParams.get("baseline");
  const compareParam = searchParams.get("compare");

  const [comparison, setComparison] = useState<ScanComparison | null>(null);
  const [recommendation, setRecommendation] =
    useState<PlanRecommendation | null>(null);
  const [client, setClient] = useState<ClientRow | null>(null);
  const [scanDate, setScanDate] = useState<string>("");
  const [scanNotes, setScanNotes] = useState<string>("");
  const [compareScanId, setCompareScanId] = useState<string>("");
  const [coachNotes, setCoachNotes] = useState<string>("");
  const [notesSaveState, setNotesSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [productsGiven, setProductsGiven] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch(`/api/clients/${clientId}`);
        if (!res.ok) throw new Error(`Failed to load client (${res.status})`);
        const data = (await res.json()) as {
          client: ClientRow;
          scans: ScanRow[];
        };
        if (cancelled) return;

        if (data.scans.length === 0) {
          setError(
            "No scans uploaded for this client yet. Upload a scan first.",
          );
          setLoaded(true);
          return;
        }

        setClient(data.client);

        const sortedScans = [...data.scans].sort((a, b) =>
          a.scan_date.localeCompare(b.scan_date),
        );
        const baselineScan =
          (baselineParam &&
            sortedScans.find((s) => s.id === baselineParam)) ||
          sortedScans[0];
        const compareScan =
          (compareParam && sortedScans.find((s) => s.id === compareParam)) ||
          sortedScans[sortedScans.length - 1];

        setScanDate(compareScan.scan_date);
        setScanNotes(compareScan.notes ?? "");
        setCompareScanId(compareScan.id);
        setCoachNotes(compareScan.coach_notes ?? "");
        setProductsGiven(compareScan.products_given ?? []);

        const sc =
          baselineScan.id === compareScan.id
            ? fromParsedScan(baselineScan.parsed_data)
            : buildComparison(
                data.client,
                baselineScan.parsed_data,
                compareScan.parsed_data,
              );
        setComparison(sc);
        setRecommendation(buildRecommendations(sc));
        setLoaded(true);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : String(e));
          setLoaded(true);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [clientId, baselineParam, compareParam]);

  async function saveCoachNotes(value: string) {
    if (!compareScanId) return;
    setNotesSaveState("saving");
    try {
      await fetch(`/api/scans/${compareScanId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coach_notes: value }),
      });
      setNotesSaveState("saved");
      setTimeout(() => setNotesSaveState("idle"), 2000);
    } catch {
      setNotesSaveState("idle");
    }
  }

  function toggleProductGiven(product: string) {
    if (!compareScanId) return;
    setProductsGiven((prev) => {
      const next = prev.includes(product)
        ? prev.filter((p) => p !== product)
        : [...prev, product];
      // Persist to this visit's scan (fire-and-forget, like coach notes).
      void fetch(`/api/scans/${compareScanId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products_given: next }),
      });
      return next;
    });
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center gap-2 text-[var(--solae-text-muted)] text-sm py-20">
        <Loader2 className="w-4 h-4 animate-spin" />
        Generating 30-day plan...
      </div>
    );
  }

  if (error || !comparison || !recommendation || !client) {
    return (
      <div className="bg-[var(--solae-bg-card)] border border-[var(--solae-status-red)]/40 rounded-xl p-6">
        <div className="text-[var(--solae-status-red)] text-sm font-medium mb-1">
          Could not generate plan
        </div>
        <div className="text-[var(--solae-text-muted)] text-sm">
          {error ?? "Unknown error"}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Action bar */}
      <div className="flex items-center justify-between gap-4 mb-6 no-print">
        <Link
          href={`/dashboard?client=${clientId}`}
          className="flex items-center gap-2 text-[var(--solae-text-muted)] hover:text-[var(--solae-text)] text-sm transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to dashboard
        </Link>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2 rounded-md border border-[var(--solae-gold-dim)] text-gold hover:bg-[var(--solae-gold)]/10 transition-colors text-sm"
        >
          <Printer className="w-4 h-4" />
          Print Plan
        </button>
      </div>

      {/* Header */}
      <header className="mb-8 pb-6 border-b border-[var(--solae-border-subtle)]">
        <div className="text-[var(--solae-text-faint)] text-xs tracking-widest uppercase mb-2">
          Solae 30-Day Wellness Plan
        </div>
        <h1 className="font-display text-5xl text-[var(--solae-text)] leading-none mb-2">
          {comparison.client.name}
        </h1>
        <div className="text-[var(--solae-text-muted)] text-sm">
          Age {comparison.client.age} · Based on scan from {fmtDate(scanDate)}
        </div>
      </header>

      {/* Phase rationale */}
      <Section icon={<Sparkles className="w-6 h-6 text-gold" />} title="Your Current Phase">
        <div className="bg-[var(--solae-bg-card)] border border-[var(--solae-border)] rounded-xl p-6">
          <div className="flex items-baseline gap-3 mb-3 flex-wrap">
            <div className="font-display text-3xl text-gold capitalize">
              {comparison.currentPhase}
            </div>
            {comparison.secondaryPhase && (
              <div className="text-[var(--solae-text-muted)] text-sm">
                with supportive {comparison.secondaryPhase} phase
              </div>
            )}
          </div>
          <p className="text-[var(--solae-text)] leading-relaxed">
            {recommendation.phaseRationale}
          </p>
        </div>
      </Section>

      {/* Top priorities */}
      <Section
        icon={<ListChecks className="w-6 h-6 text-gold" />}
        title="Top Priorities From Your Scan"
      >
        <ol className="flex flex-col gap-2">
          {recommendation.topPriorities.map((p, i) => (
            <li
              key={i}
              className="bg-[var(--solae-bg-card)] border border-[var(--solae-border-subtle)] rounded-lg px-4 py-3 flex items-baseline gap-3"
            >
              <span className="text-gold font-display text-lg w-6 shrink-0">
                {i + 1}.
              </span>
              <span className="text-[var(--solae-text)] text-sm">{p}</span>
            </li>
          ))}
        </ol>
      </Section>

      {/* Continue current */}
      {recommendation.continueCurrentSupplements.length > 0 && (
        <Section
          icon={<CheckCircle2 className="w-6 h-6 text-gold" />}
          title="Continue What's Already Working"
        >
          <div className="bg-[var(--solae-bg-card)] border border-[var(--solae-border-subtle)] rounded-lg p-5">
            <p className="text-[var(--solae-text-muted)] text-sm mb-3">
              You&rsquo;re already taking these — keep going. The Solae stack
              below is designed to complement (not duplicate) what you have.
            </p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {recommendation.continueCurrentSupplements.map((s) => (
                <li
                  key={s}
                  className="flex items-center gap-2 text-[var(--solae-text)] text-sm"
                >
                  <CheckCircle2 className="w-4 h-4 text-[var(--solae-status-green)] shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </Section>
      )}

      {/* Recommended core stack */}
      <Section
        icon={<Pill className="w-6 h-6 text-gold" />}
        title="Recommended Solae Stack"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {recommendation.coreProducts.map((p) => (
            <ProductCard
              key={p.name}
              product={p.name}
              role="Core"
              why={p.why}
              given={productsGiven.includes(p.name)}
              onToggle={() => toggleProductGiven(p.name)}
            />
          ))}
        </div>
      </Section>

      {/* Targeted, scan-specific support */}
      {recommendation.targetedProducts.length > 0 && (
        <Section
          icon={<Pill className="w-6 h-6 text-gold" />}
          title="Targeted Support"
        >
          <div className="text-[var(--solae-text-faint)] text-xs mb-3">
            Based on this scan — deficiency- and hormone-specific support beyond
            the core stack.
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {recommendation.targetedProducts.map((p) => (
              <ProductCard
                key={p.name}
                product={p.name}
                role="Targeted"
                why={p.why}
                given={productsGiven.includes(p.name)}
                onToggle={() => toggleProductGiven(p.name)}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Optional add-ons */}
      {recommendation.optionalProducts.length > 0 && (
        <Section
          icon={<Pill className="w-6 h-6 text-gold-dim" />}
          title="Optional Add-Ons"
        >
          <div className="text-[var(--solae-text-faint)] text-xs mb-3">
            Add these if symptoms or goals call for them — not required, but
            helpful supportive layers.
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {recommendation.optionalProducts.map((p) => (
              <ProductCard
                key={p.name}
                product={p.name}
                role="Optional"
                why={p.why}
                given={productsGiven.includes(p.name)}
                onToggle={() => toggleProductGiven(p.name)}
              />
            ))}
          </div>
        </Section>
      )}

      {/* Daily routine */}
      <Section
        icon={<Sun className="w-6 h-6 text-gold" />}
        title="30-Day Daily Routine"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <RoutineCard
            icon={<Sun className="w-5 h-5" />}
            time="Morning"
            text={recommendation.dailyRoutine.morning}
          />
          <RoutineCard
            icon={<Coffee className="w-5 h-5" />}
            time="Afternoon"
            text={recommendation.dailyRoutine.afternoon}
          />
          <RoutineCard
            icon={<Moon className="w-5 h-5" />}
            time="Evening"
            text={recommendation.dailyRoutine.evening}
          />
        </div>
      </Section>

      {/* Expected results */}
      <Section
        icon={<TrendingUp className="w-6 h-6 text-gold" />}
        title="What to Expect Over 30 Days"
      >
        <ul className="flex flex-col gap-2">
          {recommendation.expectedResults.map((r, i) => (
            <li
              key={i}
              className="bg-[var(--solae-bg-card)] border border-[var(--solae-border-subtle)] rounded-lg px-4 py-3 flex items-baseline gap-3"
            >
              <span className="w-2 h-2 rounded-full bg-[var(--solae-gold)] shrink-0 translate-y-1" />
              <span className="text-[var(--solae-text)] text-sm">{r}</span>
            </li>
          ))}
        </ul>
      </Section>

      {/* Coach notes */}
      <Section
        icon={<ListChecks className="w-6 h-6 text-gold" />}
        title="Coach Notes"
      >
        <div className="relative">
          <textarea
            className="w-full bg-[var(--solae-bg-card)] border border-[var(--solae-border-subtle)] rounded-lg p-5 min-h-32 text-sm text-[var(--solae-text)] resize-y focus:outline-none focus:border-[var(--solae-gold-dim)] print:hidden"
            placeholder="Type your coach notes for this client here…"
            value={coachNotes}
            onChange={(e) => setCoachNotes(e.target.value)}
            onBlur={(e) => void saveCoachNotes(e.target.value)}
          />
          {notesSaveState !== "idle" && (
            <div className="absolute bottom-3 right-3 text-[10px] text-[var(--solae-text-faint)] print:hidden">
              {notesSaveState === "saving" ? "Saving…" : "Saved ✓"}
            </div>
          )}
          <div className="hidden print:block whitespace-pre-wrap text-sm text-[var(--solae-text)] bg-[var(--solae-bg-card)] border border-[var(--solae-border-subtle)] rounded-lg p-5 min-h-32">
            {coachNotes || ""}
          </div>
        </div>
      </Section>

      {/* Disclaimer */}
      <Section
        icon={<ShieldAlert className="w-6 h-6 text-gold-dim" />}
        title="Important"
      >
        <div className="bg-[var(--solae-bg-card)] border border-[var(--solae-border-subtle)] rounded-lg p-5 text-[var(--solae-text-muted)] text-xs leading-relaxed">
          {recommendation.disclaimer}
        </div>
      </Section>
    </div>
  );
}

export default function PlanPage() {
  return (
    <Suspense>
      <PlanInner />
    </Suspense>
  );
}

/* ---------------- helpers ---------------- */

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        {icon}
        <h2 className="font-display text-2xl text-gold">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function ProductCard({
  product,
  role,
  why,
  given,
  onToggle,
}: {
  product: string;
  role: string;
  why: string;
  given: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`bg-[var(--solae-bg-card)] border rounded-lg p-5 transition-colors ${
        given
          ? "border-[var(--solae-status-green)]/50"
          : "border-[var(--solae-gold-dim)]/40"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h3 className="font-display text-xl text-[var(--solae-text)]">
            {product}
          </h3>
          <span className="text-[var(--solae-gold-light)] text-xs uppercase tracking-widest">
            {role}
          </span>
        </div>
        {/* "Given" checkbox — records what the client actually received this
            visit. Rendered as a label+checkbox so it survives print (buttons
            are hidden in print CSS). */}
        <label className="flex items-center gap-2 shrink-0 cursor-pointer text-xs text-[var(--solae-text-muted)] select-none">
          <input
            type="checkbox"
            checked={given}
            onChange={onToggle}
            className="w-4 h-4 accent-[var(--solae-status-green)]"
          />
          <span className={given ? "text-[var(--solae-status-green)]" : ""}>
            {given ? "Given ✓" : "Given?"}
          </span>
        </label>
      </div>
      <p className="text-[var(--solae-text-muted)] text-sm leading-relaxed">
        {why}
      </p>
    </div>
  );
}

function RoutineCard({
  icon,
  time,
  text,
}: {
  icon: React.ReactNode;
  time: string;
  text: string;
}) {
  return (
    <div className="bg-[var(--solae-bg-card)] border border-[var(--solae-border-subtle)] rounded-lg p-5">
      <div className="flex items-center gap-2 text-gold mb-3">
        {icon}
        <span className="font-display text-lg">{time}</span>
      </div>
      <p className="text-[var(--solae-text)] text-sm leading-relaxed">{text}</p>
    </div>
  );
}
