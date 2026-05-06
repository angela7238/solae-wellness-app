// State-based phase detector — Phase 1C v3.
// Lessons from earlier iterations:
//   v1: summed status weights; Repair always won (it has 17 mapped systems)
//   v2: averaged severity; Kim went straight to NOURISH because most of her systems
//       are green even though her kidneys + cardiovascular are still stressed
//   v3 (this): score = sum of weights of NON-GREEN systems per phase, with non-linear
//       weights (red counts more than yellow), low triggering thresholds, and a
//       drainage-first preference. A single critical system is enough to anchor a phase.

import type { ParsedSystem } from "./parseScan";
import type { Phase } from "@/lib/types";

const SYSTEM_PHASE_MAP: Record<string, Phase> = {
  // Detox — drainage/elimination
  "Liver Function": "detox",
  "Kidney Function": "detox",
  "Large Intestine Function": "detox",
  "Gastrointestinal Function": "detox",
  "Heavy Metal": "detox",
  "Human Toxin": "detox",
  "Gallbladder Function": "detox",
  "Pancreatic Function": "detox",

  // Repair — inflammation, oxidative stress, structural
  "Cardiovascular and Cerebrovascular": "repair",
  "Bone Mineral Density": "repair",
  "Bone Growth Index": "repair",
  "Rheumatoid Bone Disease": "repair",
  "Brain Nerve": "repair",
  "Coenzyme": "repair",
  "Essential Fatty Acid": "repair",
  "Immune System": "repair",
  "Human Immunity": "repair",
  "Skin": "repair",
  "Eye": "repair",
  "Lung Function": "repair",
  "Respiratory Function": "repair",
  "Pulse of heart and brain": "repair",
  "Channels and collaterals": "repair",
  "Collagen": "repair",

  // Restore — metabolism, hormones, function
  "Blood Sugar": "restore",
  "Blood lipids": "restore",
  "Endocrine System": "restore",
  "Thyroid": "restore",
  "Obesity": "restore",
  "Lecithin": "restore",
  "Fatty acid": "restore",
  "Female Hormone": "restore",
  "Gynecology": "restore",
  "Breast": "restore",
  "Menstrual cycle": "restore",
  "Male Hormone": "restore",
  "Male Sexual Function": "restore",
  "Sperm and semen": "restore",
  "Prostate": "restore",
  "Human Consciousness Level": "restore",

  // Nourish — building blocks, foundational
  "Vitamin": "nourish",
  "Trace Element": "nourish",
  "Amino Acid": "nourish",
  "Basic Physical Quality": "nourish",
  "Allergy": "nourish",
};

// Non-linear: red is much heavier than yellow (single red can anchor a phase)
const STATUS_WEIGHT: Record<ParsedSystem["status"], number> = {
  green: 0,
  blue: 1, // improving but still needs support
  yellow: 3, // active issue
  red: 6, // critical — single red triggers its phase
};

export interface PhaseResult {
  primary: Phase;
  secondary?: Phase;
  /** Sum-of-weights score per phase (0 = all green). */
  scores: Record<Phase, number>;
}

/** A single yellow (3) or any red (6) is enough to trigger that phase. */
const TRIGGER_THRESHOLD = 3;
/** Detox-first: drainage stress always primary if it crosses this lower threshold. */
const DETOX_PRIORITY_THRESHOLD = 3;
/** Secondary needs at least a yellow's worth of stress to show up. */
const SECONDARY_THRESHOLD = 2;

export function detectPhase(systems: ParsedSystem[]): PhaseResult {
  const scores: Record<Phase, number> = {
    detox: 0,
    repair: 0,
    restore: 0,
    nourish: 0,
  };

  for (const s of systems) {
    const phase = SYSTEM_PHASE_MAP[s.name];
    if (!phase) continue;
    scores[phase] += STATUS_WEIGHT[s.status];
  }

  // Drainage-first principle: any meaningful detox stress → DETOX primary
  let primary: Phase;
  if (scores.detox >= DETOX_PRIORITY_THRESHOLD) {
    primary = "detox";
  } else {
    // Otherwise pick the highest-scoring phase among repair / restore / nourish
    const candidates: Phase[] = ["repair", "restore", "nourish"];
    const ranked = [...candidates].sort((a, b) => scores[b] - scores[a]);
    if (scores[ranked[0]] >= TRIGGER_THRESHOLD) {
      primary = ranked[0];
    } else {
      // Truly clean: NOURISH for maintenance/optimization
      primary = "nourish";
    }
  }

  // Secondary: highest of the remaining phases that shows even mild stress
  const remaining = (Object.entries(scores) as [Phase, number][])
    .filter(([p]) => p !== primary)
    .sort((a, b) => b[1] - a[1]);
  const top = remaining[0];
  const secondary = top && top[1] >= SECONDARY_THRESHOLD ? top[0] : undefined;

  return { primary, secondary, scores };
}
