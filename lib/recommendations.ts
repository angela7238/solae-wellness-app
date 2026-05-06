// Rule-based 30-day plan recommendation engine.
// Implements Angela's JSON spec: scan triggers + phase-aware stack picks +
// duplication logic against current supplements + max 4 core / 2 optional.
//
// Phase 3 future polish: layer Claude API on top to generate warm, personalized
// prose around the products picked here. For now, prose is templated by phase.

import type { ScanComparison, Phase } from "@/lib/types";

export interface RecommendedProduct {
  name: string;
  role: "core" | "optional";
  why: string;
}

export interface DailyRoutine {
  morning: string;
  afternoon: string;
  evening: string;
}

export interface PlanRecommendation {
  /** Top 3-5 issues surfaced by the scan, ranked by severity */
  topPriorities: string[];
  /** Acknowledgment of products the client already takes */
  continueCurrentSupplements: string[];
  /** 2-4 core products tied to phase + scan triggers */
  coreProducts: RecommendedProduct[];
  /** Up to 2 optional add-ons */
  optionalProducts: RecommendedProduct[];
  /** Why this phase was picked, in plain language */
  phaseRationale: string;
  /** 30-day daily routine, templated by phase */
  dailyRoutine: DailyRoutine;
  /** What to expect over 30 days */
  expectedResults: string[];
  /** Compliance-safe disclaimer */
  disclaimer: string;
}

/* ----------------------------- Product reasons ----------------------------- */

const PRODUCT_WHY: Record<string, string> = {
  "V-Organex":
    "Supports the liver, bile flow, and fat metabolism. Anchors any phase that needs drainage opened first.",
  "V-Tedetox":
    "Gentle bowel and elimination support so detox pathways stay open.",
  "V-Itaren":
    "Supports kidney function and fluid balance — important when water retention or puffiness is present.",
  "Glutation Plus":
    "Liquid antioxidant for active detox and repair phases. Cellular protection during metabolic transition.",
  "V-Glutation":
    "Capsule antioxidant for maintenance phases — gentler than the liquid form.",
  "V-Asculax":
    "Lymphatic drainage, circulation, and connective tissue support. Anchors the body's transport systems.",
  "V-Fortyflora":
    "Gut balance, microbiome, and absorption support. Foundational for digestive health and detox.",
  "V-Omega 3":
    "Cardiovascular, brain, joint, and inflammatory-response support. Foundational across multiple phases.",
  "V-Curcumax":
    "Inflammation and antioxidant support. Helpful when inflammatory markers run high.",
  "V-Itadol":
    "Joint comfort, mobility, and recovery — useful when joint or muscle stress is present.",
  "V-Nitro":
    "Healthy blood flow and circulation support. Useful when cardiovascular markers show vascular strain.",
  "V-Italay":
    "Calm, sleep, and nervous-system balance. Helpful when stress or sleep disruption is showing up.",
  "S-Balance":
    "Blood sugar, cravings, and metabolic balance. Anchors restoration of healthy glucose handling.",
  "V-Control":
    "Stress + metabolic support — bridges nervous system and blood sugar when both are stressed.",
  "V-Daily":
    "Daily multivitamin, mineral, and prebiotic foundation for general wellness.",
  "V-Daily Sachet":
    "Single-serve daily multivitamin format — convenient maintenance support.",
  "VitalPro":
    "Protein, lean muscle, and satiety support. Helpful for metabolic and weight goals.",
  "VitalAge Collagen":
    "Skin, hair, nails, joints, and connective-tissue aging support.",
  "V-NRGY": "Energy, focus, and metabolic drive — lifestyle support.",
  "V-Italboost":
    "Activation and energy support — helpful in the early restore phase.",
  "V-Thermokafe":
    "Thermogenic energy + metabolism. Caffeine-sensitive clients should use with care.",
  "V-Neurokafe":
    "Focus and gut-brain support. Caffeine-sensitive clients should use with care.",
  "V-Lovkafe":
    "Vitality and stamina support. Caffeine-sensitive clients should use with care.",
};

/* --------------------------- Duplication helpers --------------------------- */

/** Normalize a product name to its generic ingredient family (for non-Solae duplication). */
function getGenericFamily(productName: string): keyof NonSolaeMap | null {
  if (productName === "V-Omega 3") return "omega3";
  if (productName === "S-Balance") return "berberine"; // contains berberine
  if (productName === "Glutation Plus" || productName === "V-Glutation")
    return "glutathione";
  if (productName === "V-Daily" || productName === "V-Daily Sachet")
    return "multivitamin";
  return null;
}

type NonSolaeMap = ScanComparison["client"]["nonSolaeSupplements"];

/** Returns true if the client is already covered by a non-Solae generic equivalent. */
function isCoveredByNonSolae(productName: string, ns: NonSolaeMap): boolean {
  const family = getGenericFamily(productName);
  if (!family) return false;
  return Boolean(ns[family]);
}

/** Returns true if the client is already taking this exact Solae product in any phase. */
function isAlreadyTaking(
  productName: string,
  stack: ScanComparison["client"]["currentSolaeStack"],
): boolean {
  return (
    stack.detox.includes(productName) ||
    stack.repair.includes(productName) ||
    stack.restore.includes(productName) ||
    stack.nourish.includes(productName)
  );
}

/* ------------------------------ Stack templates ----------------------------- */

const PHASE_CORE: Record<Phase, string[]> = {
  detox: ["V-Organex", "Glutation Plus"],
  repair: ["Glutation Plus", "V-Omega 3"],
  restore: ["S-Balance", "V-Organex"],
  nourish: ["V-Daily", "VitalPro"],
};

const PHASE_DESCRIPTIONS: Record<Phase, string> = {
  detox:
    "Drainage pathways are showing the most stress. Opening liver, bowels, kidneys, and lymph comes before any other intervention — nothing else works as well if drainage is blocked.",
  repair:
    "Detox is sufficiently open; the next priority is reducing inflammatory and oxidative stress so cells and tissues can rebuild.",
  restore:
    "Drainage and repair are stable; the focus shifts to optimizing how systems function — metabolism, hormones, blood sugar, and circulation.",
  nourish:
    "No major dysfunction is showing. The phase is about building, maintaining, and optimizing — energy, longevity, performance, and aging support.",
};

/* --------------------------- Marker-driven add-ons -------------------------- */

interface SystemTrigger {
  systemSubstring: string; // matches comparison.systems[].name (case-insensitive contains)
  product: string;
  reason: string;
}

const SYSTEM_TRIGGERS: SystemTrigger[] = [
  {
    systemSubstring: "Large Intestine",
    product: "V-Tedetox",
    reason: "Bowel/colon function is sluggish — V-Tedetox supports elimination.",
  },
  {
    systemSubstring: "Gastrointestinal",
    product: "V-Fortyflora",
    reason: "Gut function is showing stress — V-Fortyflora supports microbiome and absorption.",
  },
  {
    systemSubstring: "Kidney",
    product: "V-Itaren",
    reason: "Kidney/fluid balance is below optimal — V-Itaren supports fluid drainage.",
  },
  {
    systemSubstring: "Cardiovascular",
    product: "V-Asculax",
    reason: "Cardiovascular and lymph circulation need support — V-Asculax targets vascular flow.",
  },
  {
    systemSubstring: "Bone",
    product: "VitalAge Collagen",
    reason: "Bone or connective tissue is below optimal — collagen supports the matrix.",
  },
  {
    systemSubstring: "Skin",
    product: "VitalAge Collagen",
    reason: "Skin markers indicate connective tissue support — collagen is foundational.",
  },
  {
    systemSubstring: "Blood Sugar",
    product: "S-Balance",
    reason: "Glucose handling is showing imbalance — S-Balance supports metabolic stability.",
  },
  {
    systemSubstring: "Endocrine",
    product: "V-Control",
    reason: "Endocrine stress detected — V-Control bridges nervous system and metabolic balance.",
  },
];

/* ------------------------------ Top priorities ----------------------------- */

function buildTopPriorities(c: ScanComparison): string[] {
  // Use red/yellow systems first, then top out-of-range markers
  const stressedSystems = c.systems
    .filter((s) => s.status === "red" || s.status === "yellow")
    .sort((a, b) => a.current - b.current)
    .slice(0, 3)
    .map((s) => `${s.name} — currently at ${s.current.toFixed(0)}% normal`);

  const topMarkers = c.needsAttention
    .slice(0, 3)
    .map((m) => `${m.name} (${m.system})`);

  // Combine, dedupe, cap
  const combined = [...stressedSystems];
  for (const m of topMarkers) if (combined.length < 5) combined.push(m);
  return combined.slice(0, 5);
}

/* ------------------------------ Daily routine ------------------------------ */

const ROUTINE_BY_PHASE: Record<Phase, DailyRoutine> = {
  detox: {
    morning:
      "On waking: 12–16 oz warm water with lemon. V-Organex with breakfast (or before, per label). Light movement — a short walk supports lymph flow.",
    afternoon:
      "Continue hydrating (half your body weight in ounces, minimum). Glutation Plus mid-afternoon if drainage feels heavy. Keep meals simple — protein + vegetables.",
    evening:
      "Light dinner before 7pm. V-Tedetox 30–60 min before bed if bowels are sluggish. Wind down screens by 9pm — sleep is when detox pathways do the most work.",
  },
  repair: {
    morning:
      "Hydrate first. Glutation Plus with breakfast for cellular protection. V-Omega 3 with the meal that has the most fat (best absorption).",
    afternoon:
      "Steady protein + healthy fats. Anti-inflammatory foods — leafy greens, berries, fatty fish. Movement that doesn't overstress: walking, yoga, light strength.",
    evening:
      "V-Curcumax with dinner if inflammation is active. Magnesium-rich foods or supplement. Aim for 7–9 hours of sleep — repair happens overnight.",
  },
  restore: {
    morning:
      "S-Balance with breakfast — supports steady glucose through the morning. Protein-forward meal (avoid sugar spikes early).",
    afternoon:
      "V-Organex with lunch to keep fat metabolism efficient. Movement — anything that builds metabolic flexibility (intervals, strength, walking after meals).",
    evening:
      "Dinner with healthy fats + protein + non-starchy vegetables. V-Italay before bed if sleep is disrupted. Keep evening light and meals consistent.",
  },
  nourish: {
    morning:
      "V-Daily with breakfast. Protein-forward meal. Sunlight in the eyes within an hour of waking — sets the circadian rhythm.",
    afternoon:
      "VitalPro shake or balanced lunch. Movement that builds — strength training, walks, anything you enjoy.",
    evening:
      "Balanced dinner. VitalAge Collagen if working on skin/joints/aging. Wind down — sleep is when the body builds and consolidates.",
  },
};

/* --------------------------- Expected results ----------------------------- */

const EXPECTED_RESULTS_BY_PHASE: Record<Phase, string[]> = {
  detox: [
    "More regular bowel movements and reduced bloating in the first 7–10 days",
    "Clearer skin and brighter eyes by week 3",
    "Less fluid retention and puffiness, especially in face and hands",
    "Steadier energy as toxic load reduces — fewer afternoon crashes",
  ],
  repair: [
    "Less morning stiffness and joint discomfort by week 2",
    "Quicker recovery from exercise or stress",
    "More consistent energy through the day as oxidative load drops",
    "Skin tone evens; minor inflammation marks fade",
  ],
  restore: [
    "Steadier blood sugar — fewer cravings and energy crashes",
    "Better sleep quality, especially deeper sleep stages",
    "Improved metabolic flexibility — less hunger between meals",
    "Mood and focus stabilize as hormones balance",
  ],
  nourish: [
    "Sustained daily energy without stimulants",
    "Improved skin, hair, and nail quality over 4–6 weeks",
    "Better strength and recovery from training",
    "Markers continue trending toward optimal at next scan",
  ],
};

/* --------------------------------- Disclaimer ----------------------------- */

const DISCLAIMER =
  "These recommendations are wellness support based on scan data and are not intended to diagnose, treat, cure, or prevent disease. Discuss any new supplement protocol with a qualified healthcare provider, especially if you take medications or have ongoing medical conditions.";

/* ------------------------------- Main entry -------------------------------- */

export function buildRecommendations(c: ScanComparison): PlanRecommendation {
  const phase = c.currentPhase;
  const stack = c.client.currentSolaeStack;
  const ns = c.client.nonSolaeSupplements;

  const picked = new Set<string>();
  const products: RecommendedProduct[] = [];

  // Helper to attempt a product pick
  const tryAdd = (name: string, role: "core" | "optional", why: string) => {
    if (picked.has(name)) return false;
    if (isAlreadyTaking(name, stack)) return false;
    if (isCoveredByNonSolae(name, ns)) return false;
    if (role === "core" && products.filter((p) => p.role === "core").length >= 4)
      return false;
    if (
      role === "optional" &&
      products.filter((p) => p.role === "optional").length >= 2
    )
      return false;
    picked.add(name);
    products.push({ name, role, why: why || PRODUCT_WHY[name] || "" });
    return true;
  };

  // 1. Core picks from phase template
  for (const productName of PHASE_CORE[phase]) {
    tryAdd(productName, "core", PRODUCT_WHY[productName] ?? "");
  }

  // 2. Marker-driven core picks (most stressed systems)
  const stressedSystems = c.systems
    .filter((s) => s.status === "red" || s.status === "yellow")
    .sort((a, b) => a.current - b.current);
  for (const system of stressedSystems) {
    for (const trigger of SYSTEM_TRIGGERS) {
      if (
        system.name.toLowerCase().includes(trigger.systemSubstring.toLowerCase())
      ) {
        tryAdd(trigger.product, "core", trigger.reason);
      }
    }
  }

  // 3. Optional add-ons based on secondary phase or specific patterns
  if (c.secondaryPhase) {
    for (const productName of PHASE_CORE[c.secondaryPhase]) {
      tryAdd(productName, "optional", PRODUCT_WHY[productName] ?? "");
    }
  }

  const coreProducts = products.filter((p) => p.role === "core");
  const optionalProducts = products.filter((p) => p.role === "optional");

  // Acknowledge currently-taking
  const continueCurrentSupplements: string[] = [];
  for (const phaseKey of ["detox", "repair", "restore", "nourish"] as const) {
    for (const p of stack[phaseKey]) {
      if (!continueCurrentSupplements.includes(p))
        continueCurrentSupplements.push(p);
    }
  }
  if (ns.omega3) continueCurrentSupplements.push("Omega 3 (current brand)");
  if (ns.berberine) continueCurrentSupplements.push("Berberine (current brand)");
  if (ns.cinnamon) continueCurrentSupplements.push("Cinnamon (current brand)");
  if (ns.glutathione)
    continueCurrentSupplements.push("Glutathione (current brand)");
  if (ns.multivitamin)
    continueCurrentSupplements.push("Multivitamin (current brand)");
  if (ns.other) continueCurrentSupplements.push(ns.other);

  return {
    topPriorities: buildTopPriorities(c),
    continueCurrentSupplements,
    coreProducts,
    optionalProducts,
    phaseRationale: PHASE_DESCRIPTIONS[phase],
    dailyRoutine: ROUTINE_BY_PHASE[phase],
    expectedResults: EXPECTED_RESULTS_BY_PHASE[phase],
    disclaimer: DISCLAIMER,
  };
}
