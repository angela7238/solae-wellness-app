// Aggregate the 41 systems into the 14 radar axes used by the Wellness Radar.
// The reproductive-health axis is sex-aware:
//   Female clients see "Women's Health" (Female Hormone, Gynecology, Breast, Menstrual cycle)
//   Male clients see "Men's Health" (Male Hormone, Male Sexual Function, Sperm and semen)

import type { ParsedScan } from "@/lib/parser/parseScan";

export interface RadarAxis {
  axis: string;
  systems: string[];
}

const COMMON_AXES: RadarAxis[] = [
  {
    axis: "Cardiovascular",
    systems: ["Cardiovascular and Cerebrovascular", "Pulse of heart and brain"],
  },
  {
    axis: "Digestive",
    systems: ["Gastrointestinal Function", "Large Intestine Function"],
  },
  {
    axis: "Liver & Gallbladder",
    systems: ["Liver Function", "Gallbladder Function"],
  },
  { axis: "Kidney", systems: ["Kidney Function"] },
  { axis: "Respiratory", systems: ["Respiratory Function", "Lung Function"] },
  { axis: "Brain & Nerve", systems: ["Brain Nerve", "Channels and collaterals"] },
  {
    axis: "Bone & Joint",
    systems: [
      "Bone Mineral Density",
      "Bone Growth Index",
      "Rheumatoid Bone Disease",
    ],
  },
  { axis: "Blood", systems: ["Blood Sugar", "Blood lipids"] },
  {
    axis: "Nutrients",
    systems: [
      "Vitamin",
      "Trace Element",
      "Amino Acid",
      "Coenzyme",
      "Essential Fatty Acid",
      "Lecithin",
      "Fatty acid",
    ],
  },
  {
    axis: "Immune",
    systems: ["Immune System", "Human Immunity", "Allergy"],
  },
  { axis: "Endocrine", systems: ["Endocrine System", "Thyroid"] },
  { axis: "Skin & Eye", systems: ["Skin", "Eye", "Collagen"] },
  {
    axis: "Energy",
    systems: ["Basic Physical Quality", "Human Consciousness Level"],
  },
];

const WOMENS_HEALTH_AXIS: RadarAxis = {
  axis: "Women's Health",
  systems: ["Female Hormone", "Gynecology", "Breast", "Menstrual cycle"],
};

const MENS_HEALTH_AXIS: RadarAxis = {
  axis: "Men's Health",
  systems: ["Male Hormone", "Male Sexual Function", "Sperm and semen", "Prostate"],
};

/** Returns the radar-axis list appropriate for the client's sex. */
export function getRadarAxes(sex?: string): RadarAxis[] {
  if (sex === "Male") return [...COMMON_AXES, MENS_HEALTH_AXIS];
  return [...COMMON_AXES, WOMENS_HEALTH_AXIS];
}

/** Default export — kept for callers that don't have sex context. Defaults to female. */
export const RADAR_AXES = getRadarAxes(undefined);

export interface RadarPoint {
  axis: string;
  baseline: number;
  compare: number;
}

/** Aggregate systems by averaging their percentNormal values across the right axis set. */
export function buildRadarData(
  baseline: ParsedScan,
  compare: ParsedScan,
  sex?: string,
): RadarPoint[] {
  const axes = getRadarAxes(sex);
  const baselineByName = new Map<string, number>();
  for (const s of baseline.systems) baselineByName.set(s.name, s.percentNormal);
  const compareByName = new Map<string, number>();
  for (const s of compare.systems) compareByName.set(s.name, s.percentNormal);

  return axes.map(({ axis, systems }) => {
    const baseValues = systems
      .map((s) => baselineByName.get(s))
      .filter((v): v is number => v !== undefined);
    const compareValues = systems
      .map((s) => compareByName.get(s))
      .filter((v): v is number => v !== undefined);
    const avg = (vs: number[]) =>
      vs.length > 0 ? vs.reduce((a, b) => a + b, 0) / vs.length : 0;
    return {
      axis,
      baseline: avg(baseValues),
      compare: avg(compareValues),
    };
  });
}
