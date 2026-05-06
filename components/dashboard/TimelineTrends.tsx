"use client";

import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { ScanRow } from "@/lib/supabase/types";
import { getRadarAxes } from "@/lib/radar";

interface Props {
  scans: ScanRow[];
  /** Drives sex-aware reproductive-health axis (Women's vs Men's Health). */
  sex?: string;
}

function fmtShortDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${parseInt(m, 10)}/${parseInt(d, 10)}`;
}

/** Build per-axis trend data: one series per radar axis, X = scan dates, Y = avg system %. */
function buildTrendsData(
  scans: ScanRow[],
  sex?: string,
): Record<string, Array<{ date: string; value: number }>> {
  const axes = getRadarAxes(sex);
  const sorted = [...scans].sort((a, b) =>
    a.scan_date.localeCompare(b.scan_date),
  );

  const result: Record<string, Array<{ date: string; value: number }>> = {};
  for (const { axis, systems } of axes) {
    result[axis] = sorted.map((scan) => {
      const byName = new Map<string, number>();
      for (const s of scan.parsed_data.systems)
        byName.set(s.name, s.percentNormal);
      const values = systems
        .map((s) => byName.get(s))
        .filter((v): v is number => v !== undefined);
      const avg =
        values.length > 0
          ? values.reduce((a, b) => a + b, 0) / values.length
          : 0;
      return { date: fmtShortDate(scan.scan_date), value: avg };
    });
  }
  return result;
}

export function TimelineTrends({ scans, sex }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (scans.length < 2) return null;

  const visibleAxes = getRadarAxes(sex);
  const trends = buildTrendsData(scans, sex);

  return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-2">
        <TrendingUp className="w-6 h-6 text-gold" />
        <h2 className="font-display text-2xl text-gold">Timeline Trends</h2>
      </div>
      <div className="text-[var(--solae-text-faint)] text-xs mb-5">
        Each system over time across all of this client&rsquo;s scans
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {visibleAxes.map(({ axis }) => {
          const data = trends[axis];
          const last = data[data.length - 1]?.value ?? 0;
          const first = data[0]?.value ?? 0;
          const delta = last - first;
          const trendColor =
            delta > 1 ? "#22c55e" : delta < -1 ? "#ef4444" : "#9ca0aa";

          return (
            <div
              key={axis}
              className="bg-[var(--solae-bg-card)] border border-[var(--solae-border-subtle)] rounded-lg p-4"
            >
              <div className="flex items-baseline justify-between mb-2">
                <div className="font-display text-base text-[var(--solae-text)]">
                  {axis}
                </div>
                <div
                  className="text-xs font-medium"
                  style={{ color: trendColor }}
                >
                  {delta > 0 && "+"}
                  {delta.toFixed(1)}%
                </div>
              </div>
              <div className="text-xs text-[var(--solae-text-faint)] mb-3">
                {first.toFixed(0)}% → {last.toFixed(0)}%
              </div>
              <div className="h-20">
                {mounted && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={data}
                      margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
                    >
                      <XAxis
                        dataKey="date"
                        tick={{
                          fill: "var(--solae-text-faint)",
                          fontSize: 9,
                        }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis domain={[0, 100]} hide />
                      <Tooltip
                        contentStyle={{
                          background: "var(--solae-bg-card)",
                          border: "1px solid var(--solae-border)",
                          borderRadius: 6,
                          fontSize: 11,
                        }}
                        labelStyle={{ color: "var(--solae-text-faint)" }}
                        itemStyle={{ color: "var(--solae-gold-light)" }}
                        formatter={(v) => [
                          `${typeof v === "number" ? v.toFixed(1) : v}%`,
                          axis,
                        ]}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke={trendColor}
                        strokeWidth={2}
                        dot={{ r: 3, fill: trendColor }}
                        activeDot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
