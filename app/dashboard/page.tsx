"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Upload } from "lucide-react";
import { mockComparison } from "@/lib/data/mockScan";
import { mockBaselineParsed, mockCompareParsed } from "@/lib/data/mockParsedScan";
import { getCurrentScan } from "@/lib/storage";
import { fromParsedScan, isSingleScan } from "@/lib/adapters";
import { buildComparison } from "@/lib/compare";
import { buildRadarData } from "@/lib/radar";
import type { ScanComparison } from "@/lib/types";
import type { ParsedScan } from "@/lib/parser/parseScan";
import type { ClientRow, ScanRow } from "@/lib/supabase/types";
import { ScanHeader } from "@/components/dashboard/ScanHeader";
import { HeroStats } from "@/components/dashboard/HeroStats";
import type { SinceLastStats } from "@/components/dashboard/HeroStats";
import { HealingPhase } from "@/components/dashboard/HealingPhase";
import { TransformationSnapshot } from "@/components/dashboard/TransformationSnapshot";
import { ScanNotes } from "@/components/dashboard/ScanNotes";
import { SystemsGrid } from "@/components/dashboard/SystemsGrid";
import {
  StandoutImprovements,
  TopImproved,
} from "@/components/dashboard/StandoutImprovements";
import { AreasNeedingAttention } from "@/components/dashboard/AreasNeedingAttention";
import { WellnessRadar } from "@/components/dashboard/WellnessRadar";
import { TimelineTrends } from "@/components/dashboard/TimelineTrends";
import type { RadarPoint } from "@/lib/radar";

function DashboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const clientId = searchParams.get("client");
  const baselineParam = searchParams.get("baseline");
  const compareParam = searchParams.get("compare");

  const [comparison, setComparison] = useState<ScanComparison | null>(null);
  const [radarData, setRadarData] = useState<RadarPoint[] | null>(null);
  const [scans, setScans] = useState<ScanRow[] | null>(null);
  const [client, setClient] = useState<ClientRow | null>(null);
  const [baselineParsed, setBaselineParsed] = useState<ParsedScan | null>(null);
  const [compareParsed, setCompareParsed] = useState<ParsedScan | null>(null);
  const [compareScanId, setCompareScanId] = useState<string | null>(null);
  const [compareScanNotes, setCompareScanNotes] = useState<string>("");
  const [sinceLast, setSinceLast] = useState<SinceLastStats | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Source-of-truth load: clientId in URL → fetch DB; else localStorage; else mock.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoaded(false);
      setError(null);
      setSinceLast(null);

      if (clientId) {
        try {
          const res = await fetch(`/api/clients/${clientId}`);
          if (!res.ok) throw new Error(`Failed to load client (${res.status})`);
          const data = (await res.json()) as {
            client: ClientRow;
            scans: ScanRow[];
          };
          if (cancelled) return;
          setClient(data.client);
          setScans(data.scans);

          if (data.scans.length === 0) {
            setComparison(null);
            setRadarData(null);
            setLoaded(true);
            return;
          }

          // Pick baseline + compare scans
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

          if (baselineScan.id === compareScan.id) {
            // Single scan available — render single-scan view
            const sc = fromParsedScan(baselineScan.parsed_data);
            setComparison(sc);
            setRadarData(null);
            setBaselineParsed(null);
            setCompareParsed(baselineScan.parsed_data);
            setCompareScanId(baselineScan.id);
            setCompareScanNotes(baselineScan.notes ?? "");
            setSinceLast(null);
          } else {
            const sc = buildComparison(
              data.client,
              baselineScan.parsed_data,
              compareScan.parsed_data,
            );
            setComparison(sc);
            setRadarData(
              buildRadarData(
                baselineScan.parsed_data,
                compareScan.parsed_data,
                data.client.sex ?? undefined,
              ),
            );
            setBaselineParsed(baselineScan.parsed_data);
            setCompareParsed(compareScan.parsed_data);
            setCompareScanId(compareScan.id);
            setCompareScanNotes(compareScan.notes ?? "");

            // "Since last scan": compare the scan immediately before the compare
            // scan against the compare scan. Only meaningful when that previous
            // scan is distinct from the baseline (otherwise it equals the overall
            // numbers already shown).
            const compareIdx = sortedScans.findIndex(
              (s) => s.id === compareScan.id,
            );
            const previousScan =
              compareIdx > 0 ? sortedScans[compareIdx - 1] : null;
            if (previousScan && previousScan.id !== baselineScan.id) {
              const cycle = buildComparison(
                data.client,
                previousScan.parsed_data,
                compareScan.parsed_data,
              );
              const prevMs = new Date(
                previousScan.scan_date + "T00:00:00",
              ).getTime();
              const compMs = new Date(
                compareScan.scan_date + "T00:00:00",
              ).getTime();
              const daysBetween = Math.max(
                0,
                Math.round((compMs - prevMs) / 86_400_000),
              );
              setSinceLast({
                previousDate: new Date(
                  previousScan.scan_date + "T00:00:00",
                ).toLocaleDateString("en-US"),
                daysBetween,
                overallImprovement: cycle.overallImprovement,
                yearsRecovered: cycle.yearsRecovered,
                systemsMovedToGreen: cycle.systemsMovedToGreen,
                markersMovedIntoRange: cycle.markersMovedIntoRange,
              });
            } else {
              setSinceLast(null);
            }
          }
          setLoaded(true);
        } catch (e) {
          if (!cancelled) {
            setError(e instanceof Error ? e.message : String(e));
            setLoaded(true);
          }
        }
        return;
      }

      // No clientId → check localStorage for a recently-uploaded scan
      const local = getCurrentScan();
      if (local) {
        setComparison(fromParsedScan(local));
        setRadarData(null);
        setBaselineParsed(null);
        setCompareParsed(local);
        setLoaded(true);
        return;
      }

      // Fallback: demo data
      setComparison(mockComparison);
      setRadarData(null);
      setBaselineParsed(mockBaselineParsed);
      setCompareParsed(mockCompareParsed);
      setLoaded(true);
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [clientId, baselineParam, compareParam]);

  const scanOptions = useMemo(
    () =>
      (scans ?? [])
        .slice()
        .sort((a, b) => a.scan_date.localeCompare(b.scan_date))
        .map((s) => ({ id: s.id, date: s.scan_date })),
    [scans],
  );

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    router.replace(`/dashboard?${params.toString()}`, { scroll: false });
  };

  if (!loaded) {
    return (
      <div className="text-[var(--solae-text-muted)] text-center py-20">
        Loading dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--solae-bg-card)] border border-[var(--solae-status-red)]/40 rounded-xl p-6">
        <div className="text-[var(--solae-status-red)] text-sm font-medium mb-1">
          Could not load dashboard
        </div>
        <div className="text-[var(--solae-text-muted)] text-sm">{error}</div>
      </div>
    );
  }

  // Empty state for clients with no scans
  if (clientId && (!scans || scans.length === 0)) {
    return (
      <div className="bg-[var(--solae-bg-card)] border border-[var(--solae-border)] rounded-xl p-12 text-center">
        <div className="font-display text-2xl text-gold mb-2">
          {client?.name ?? "Client"}
        </div>
        <div className="text-[var(--solae-text-muted)] mb-6">
          No scans uploaded yet for this client.
        </div>
        <Link
          href="/import"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-md bg-[var(--solae-gold)] text-[var(--solae-bg)] font-medium hover:bg-[var(--solae-gold-light)] transition-colors text-sm"
        >
          <Upload className="w-4 h-4" />
          Upload first scan
        </Link>
      </div>
    );
  }

  if (!comparison) {
    return (
      <div className="text-[var(--solae-text-muted)] text-center py-20">
        No data available.
      </div>
    );
  }

  const c = comparison;
  const single = isSingleScan(c) || (scans !== null && scans.length < 2);
  const baselineDate = c.baseline.date
    ? new Date(c.baseline.date + "T00:00:00").toLocaleDateString("en-US")
    : "";
  const compareDate = c.compare.date
    ? new Date(c.compare.date + "T00:00:00").toLocaleDateString("en-US")
    : "";

  // Determine the actual selected IDs (default: oldest baseline, newest compare)
  const sortedScans = scanOptions;
  const selectedBaselineId =
    baselineParam ?? (sortedScans.length > 0 ? sortedScans[0].id : "");
  const selectedCompareId =
    compareParam ??
    (sortedScans.length > 0 ? sortedScans[sortedScans.length - 1].id : "");

  return (
    <div>
      <ScanHeader
        clientName={c.client.name}
        age={c.client.age}
        baselineDate={baselineDate}
        compareDate={compareDate}
        singleScan={single}
        scans={sortedScans.length > 1 ? sortedScans : undefined}
        baselineId={selectedBaselineId}
        compareId={selectedCompareId}
        onBaselineChange={(id) => updateParam("baseline", id)}
        onCompareChange={(id) => updateParam("compare", id)}
        clientId={clientId ?? undefined}
      />

      <HeroStats
        overallImprovement={c.overallImprovement}
        startingBodyAge={c.startingBodyAge}
        currentBodyAge={c.currentBodyAge}
        yearsRecovered={c.yearsRecovered}
        systemsImproved={c.systemsImproved}
        systemsTotal={c.systemsTotal}
        systemsMovedToGreen={c.systemsMovedToGreen}
        currentGreenCount={c.currentGreenCount}
        markersMovedIntoRange={c.markersMovedIntoRange}
        totalMarkers={c.totalMarkers}
        currentMarkersInRange={c.currentMarkersInRange}
        singleScan={single}
        sinceLast={sinceLast}
      />

      <HealingPhase current={c.currentPhase} secondary={c.secondaryPhase} />

      {compareParsed && (
        <TransformationSnapshot
          baseline={baselineParsed}
          compare={compareParsed}
          baselineDate={baselineDate}
          compareDate={compareDate}
        />
      )}

      {compareScanId && (
        <ScanNotes
          scanId={compareScanId}
          initialNotes={compareScanNotes}
        />
      )}

      <SystemsGrid systems={c.systems} singleScan={single} />

      {c.standouts.length > 0 && <StandoutImprovements items={c.standouts} />}

      {c.topImproved.length > 0 && <TopImproved items={c.topImproved} />}

      {c.needsAttention.length > 0 && (
        <AreasNeedingAttention items={c.needsAttention} />
      )}

      {!single && radarData && radarData.length > 0 && (
        <WellnessRadar
          baselineDate={baselineDate}
          compareDate={compareDate}
          data={radarData}
        />
      )}

      {scans && scans.length >= 2 && (
        <TimelineTrends scans={scans} sex={c.client.sex} />
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardInner />
    </Suspense>
  );
}
