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
  Layers,
} from "lucide-react";
import { buildComparison } from "@/lib/compare";
import { fromParsedScan } from "@/lib/adapters";
import { buildRecommendations } from "@/lib/recommendations";
import type { PlanRecommendation } from "@/lib/recommendations";
import type { ScanComparison } from "@/lib/types";
import type { ClientRow, ScanRow } from "@/lib/supabase/types";
import {
  metaForProduct,
  evaluateResponse,
  LIMITED_RESPONSE_MSG,
  PERSISTENT_RESPONSE_MSG,
  type ResponseLevel,
} from "@/lib/alternatives";
import {
  CLIENT_STACKS,
  EATING_PATTERNS,
  HORMONAL_STAGES,
  EXERCISE_STATUSES,
  DEFAULT_PROFILE,
  suggestProducts,
  type WellnessProfile,
  type EatingPattern,
  type HormonalStage,
  type ExerciseStatus,
} from "@/lib/clientStacks";

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
  const [scans, setScans] = useState<ScanRow[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<string>("");
  const [profile, setProfile] = useState<WellnessProfile>(DEFAULT_PROFILE);
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
        setScans(data.scans);

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
        setSelectedGoal(compareScan.stack_selection?.goal ?? "");
        setProfile(
          (data.client.wellness_profile as WellnessProfile | null) ??
            DEFAULT_PROFILE,
        );

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

  function saveStackSelection(goal: string) {
    if (!compareScanId) return;
    void fetch(`/api/scans/${compareScanId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stack_selection: goal ? { goal } : null }),
    });
  }

  // Profile saves to the CLIENT (set once, carries across visits).
  function updateProfile(patch: Partial<WellnessProfile>) {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      void fetch(`/api/clients/${clientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wellness_profile: next }),
      });
      return next;
    });
  }

  // Practitioner-selected alternative note for a product, if one is configured.
  function altNoteFor(productName: string): AltNote | null {
    const meta = metaForProduct(productName);
    if (!meta) return null;
    const level = evaluateResponse(meta, scans);
    const message =
      level === "persistent"
        ? `${PERSISTENT_RESPONSE_MSG} ${meta.optionNote}`
        : level === "limited"
          ? LIMITED_RESPONSE_MSG
          : meta.optionNote;
    return {
      level,
      message,
      alternatives: meta.approvedAlternatives,
      contraindication: meta.contraindicationNotes,
    };
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

  const suggestion = selectedGoal
    ? suggestProducts(selectedGoal, profile)
    : null;

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

      {/* Coach Notes — at the TOP of the report: editable on screen, and prints
          here on the first page so clients see it. One section, both jobs. */}
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

      {/* Your daily routine — lead with the client's actionable plan */}
      <Section
        icon={<Sun className="w-6 h-6 text-gold" />}
        title="Your Daily Routine"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <RoutineCard
            icon={<Sun className="w-5 h-5" />}
            time="Morning"
            text={recommendation.dailyRoutine.morning}
          />
          <RoutineCard
            icon={<Coffee className="w-5 h-5" />}
            time="Midday"
            text={recommendation.dailyRoutine.afternoon}
          />
          <RoutineCard
            icon={<Moon className="w-5 h-5" />}
            time="Evening"
            text={recommendation.dailyRoutine.evening}
          />
        </div>
      </Section>

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

      {/* Wellness Stack Selector (practitioner tool — not part of the printed plan) */}
      <div className="no-print">
        <Section
          icon={<Layers className="w-6 h-6 text-gold" />}
          title="Wellness Stack"
        >
          <div className="bg-[var(--solae-bg-card)] border border-[var(--solae-border)] rounded-xl p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-1">
              <div>
                <label className="block text-[10px] tracking-widest uppercase text-[var(--solae-text-faint)] mb-2">
                  Primary Wellness Goal
                </label>
                <select
                  value={selectedGoal}
                  onChange={(e) => {
                    setSelectedGoal(e.target.value);
                    saveStackSelection(e.target.value);
                  }}
                  className="w-full bg-[var(--solae-bg)] border border-[var(--solae-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--solae-text)] focus:outline-none focus:border-[var(--solae-gold-dim)]"
                >
                  <option value="">Select a goal…</option>
                  {CLIENT_STACKS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.goal}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] tracking-widest uppercase text-[var(--solae-text-faint)] mb-2">
                  Eating Pattern
                </label>
                <select
                  value={profile.eating}
                  onChange={(e) =>
                    updateProfile({ eating: e.target.value as EatingPattern })
                  }
                  className="w-full bg-[var(--solae-bg)] border border-[var(--solae-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--solae-text)] focus:outline-none focus:border-[var(--solae-gold-dim)]"
                >
                  {EATING_PATTERNS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] tracking-widest uppercase text-[var(--solae-text-faint)] mb-2">
                  Hormonal Stage
                </label>
                <select
                  value={profile.hormonal}
                  onChange={(e) =>
                    updateProfile({
                      hormonal: e.target.value as HormonalStage,
                    })
                  }
                  className="w-full bg-[var(--solae-bg)] border border-[var(--solae-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--solae-text)] focus:outline-none focus:border-[var(--solae-gold-dim)]"
                >
                  {HORMONAL_STAGES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] tracking-widest uppercase text-[var(--solae-text-faint)] mb-2">
                  Exercise
                </label>
                <select
                  value={profile.exercise}
                  onChange={(e) =>
                    updateProfile({
                      exercise: e.target.value as ExerciseStatus,
                    })
                  }
                  className="w-full bg-[var(--solae-bg)] border border-[var(--solae-border)] rounded-lg px-4 py-2.5 text-sm text-[var(--solae-text)] focus:outline-none focus:border-[var(--solae-gold-dim)]"
                >
                  {EXERCISE_STATUSES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {suggestion && (
              <div className="mt-4 pt-4 border-t border-[var(--solae-border-subtle)]">
                {suggestion.note && (
                  <div className="text-xs text-[var(--solae-status-green)] bg-[var(--solae-status-green)]/10 border border-[var(--solae-status-green)]/25 rounded-lg px-3 py-2 mb-3">
                    {suggestion.note}
                  </div>
                )}
                <div className="text-[10px] tracking-widest uppercase text-[var(--solae-gold-light)] mb-2">
                  Suggested — awaiting your review
                </div>
                <ul className="flex flex-col gap-2">
                  {suggestion.products.map((p) => {
                    const added = productsGiven.includes(p.name);
                    return (
                      <li
                        key={p.name}
                        className="flex items-start justify-between gap-3 bg-[var(--solae-bg)] border border-[var(--solae-border-subtle)] rounded-lg px-4 py-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-baseline gap-2 flex-wrap">
                            <span className="text-sm font-medium text-[var(--solae-text)]">
                              {p.name}
                            </span>
                            <span className="text-[10px] uppercase tracking-widest text-[var(--solae-text-faint)]">
                              {p.role}
                            </span>
                          </div>
                          <div className="text-xs text-[var(--solae-text-muted)] mt-0.5">
                            {p.reason}
                          </div>
                          {p.caution && (
                            <div className="text-xs text-[var(--solae-status-red)] mt-1">
                              ⚠ {p.caution}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={() => toggleProductGiven(p.name)}
                          className={`shrink-0 text-xs px-3 py-1.5 rounded-md border transition-colors ${
                            added
                              ? "border-[var(--solae-status-green)]/50 text-[var(--solae-status-green)]"
                              : "border-[var(--solae-gold-dim)] text-gold hover:bg-[var(--solae-gold)]/10"
                          }`}
                        >
                          {added ? "Added ✓" : "Add"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <div className="text-[11px] text-[var(--solae-text-faint)] mt-3">
                  Adding a product checks it into this client&rsquo;s plan below.
                  Review safety and current labels before approving. Your existing
                  selections and Coach Notes are untouched.
                </div>
              </div>
            )}
          </div>
        </Section>
      </div>

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
              alt={altNoteFor(p.name)}
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

interface AltNote {
  level: ResponseLevel;
  message: string;
  alternatives: string[];
  contraindication: string;
}

function ProductCard({
  product,
  role,
  why,
  given,
  onToggle,
  alt,
}: {
  product: string;
  role: string;
  why: string;
  given: boolean;
  onToggle: () => void;
  alt?: AltNote | null;
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
      {alt && <AlternativeNote alt={alt} />}
    </div>
  );
}

/** Practitioner-selected alternative note — never an automatic substitution. */
function AlternativeNote({ alt }: { alt: AltNote }) {
  const escalated = alt.level !== "option";
  const accent = escalated
    ? "var(--solae-status-red)"
    : "var(--solae-gold-dim)";
  return (
    <div
      className="mt-3 pt-3 border-t text-xs leading-relaxed"
      style={{ borderColor: "var(--solae-border-subtle)" }}
    >
      <div
        className="uppercase tracking-widest text-[10px] mb-1"
        style={{ color: accent }}
      >
        {alt.level === "persistent"
          ? "Persistent non-response"
          : alt.level === "limited"
            ? "Limited response"
            : "Alternative to consider"}
      </div>
      <div className="text-[var(--solae-text-muted)]">{alt.message}</div>
      {alt.alternatives.length > 0 && (
        <div className="text-[var(--solae-text)] mt-1">
          Practitioner alternative:{" "}
          <span className="text-[var(--solae-gold-light)]">
            {alt.alternatives.join(", ")}
          </span>
        </div>
      )}
      <div className="text-[var(--solae-text-faint)] mt-1 italic">
        {alt.contraindication} Practitioner confirmation required — the app does
        not switch products automatically.
      </div>
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
