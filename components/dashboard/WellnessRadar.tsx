"use client";

import { useEffect, useState } from "react";
import { Target } from "lucide-react";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { RadarPoint } from "@/lib/radar";

interface Props {
  baselineDate: string;
  compareDate: string;
  data: RadarPoint[];
}

export function WellnessRadar({ baselineDate, compareDate, data }: Props) {
  // Data is already sex-aware (built via buildRadarData(sex) in the parent).
  // Wait for client mount so the responsive container has real dimensions.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-2">
        <Target className="w-6 h-6 text-gold" />
        <h2 className="font-display text-2xl text-gold">
          Wellness Radar — System Health Overview
        </h2>
      </div>
      <div className="text-[var(--solae-text-faint)] text-xs mb-5">
        Larger area = Better health · Outward = healthier (100% at edge)
      </div>
      <div className="bg-[var(--solae-bg-card)] border border-[var(--solae-border)] rounded-xl p-6">
        <div className="w-full h-[480px]">
          {mounted && (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
                <PolarGrid stroke="var(--solae-border)" />
                <PolarAngleAxis
                  dataKey="axis"
                  tick={{ fill: "var(--solae-text-muted)", fontSize: 11 }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 100]}
                  tick={{ fill: "var(--solae-text-faint)", fontSize: 10 }}
                  axisLine={false}
                />
                <Radar
                  name={`${baselineDate} (Baseline)`}
                  dataKey="baseline"
                  stroke="var(--solae-gold-dim)"
                  fill="var(--solae-gold-dim)"
                  fillOpacity={0.3}
                  strokeWidth={2}
                />
                <Radar
                  name={`${compareDate} (Compare)`}
                  dataKey="compare"
                  stroke="var(--solae-status-green)"
                  fill="var(--solae-status-green)"
                  fillOpacity={0.25}
                  strokeWidth={2}
                />
                <Legend
                  wrapperStyle={{
                    paddingTop: 12,
                    color: "var(--solae-text-muted)",
                    fontSize: 12,
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </section>
  );
}
