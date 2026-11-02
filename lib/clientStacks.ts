// Client Requested Stacks — goal-based Vital Health product groupings.
//
// These are practitioner STARTING POINTS organized by what clients commonly ask
// for help with. Wellness/"supports" framing only — not treatment for any
// condition. Product picks are grounded in official Vital Health support
// categories; Angela reviews and customizes per client.

/** Short, official-aligned "supports" blurb per product. */
const SUPPORTS: Record<string, string> = {
  "V-Omega 3": "Omega-3 nutrition — cardiovascular and antioxidant support.",
  "V-Nitro": "Circulation and physical-performance support.",
  "V-Asculax": "Circulatory wellness support.",
  "Glutation Plus": "Antioxidant and cellular wellness support.",
  "S-Balance": "Blood sugar and metabolic wellness support.",
  "V-Control": "Fullness and appetite-management support.",
  "VitalPro": "Protein and daily nutritional support.",
  "V-NRGY": "Clean energy and focus support (contains caffeine).",
  "V-Italay": "Calm, relaxation, and restful-sleep support.",
  "V-Daily": "Daily micronutrient and nutritional support.",
  "V-Fortyflora": "Gut-wellness support.",
  "Smart Biotics": "Gut flora and cognitive support.",
  "V-Organex": "Liver and botanical digestive support.",
  "V-Tedetox": "Gentle botanical digestive-cleansing support.",
  "V-Itaren": "Urinary wellness and water-balance support.",
  "LatteKafe": "Natural energy and focus — functional mushrooms + MCTs.",
  "Performance+": "Energy, recovery, and physical-performance support.",
  "V-Curcumax": "Joint and antioxidant support.",
  "V-Itadol": "Joint and mobility support.",
  "VitalAge Collagen": "Skin, joint, and connective-tissue support.",
  "VitalBoost": "Immune and antioxidant support.",
  "D-Fenz": "Daily immune and digestion support.",
  "Nourish+": "Complete plant protein and nutrient support.",
  "V-Harmony": "Women's hormone-balance support.",
  "V-Prime": "Men's vitality and hormone-balance support.",
};

export function productSupports(name: string): string {
  return SUPPORTS[name] ?? "";
}

export interface ClientStack {
  id: string;
  goal: string;
  /** What a client might say when they ask for this. */
  request: string;
  /** One-line "supports…" framing for the goal. */
  supports: string;
  /** Product names (look up blurb via productSupports). */
  products: string[];
}

export const CLIENT_STACKS: ClientStack[] = [
  {
    id: "heart-cholesterol",
    goal: "Heart & Cholesterol",
    request: "“I want to support my heart and cholesterol.”",
    supports: "Supports cardiovascular wellness, healthy circulation, and antioxidant balance.",
    products: ["V-Omega 3", "V-Nitro", "V-Asculax", "Glutation Plus"],
  },
  {
    id: "weight-metabolism",
    goal: "Weight & Metabolism",
    request: "“I want help with weight and fat metabolism.”",
    supports: "Supports healthy metabolism, blood-sugar balance, satiety, and protein intake.",
    products: ["S-Balance", "V-Control", "VitalPro", "V-NRGY"],
  },
  {
    id: "blood-pressure",
    goal: "Blood Pressure & Circulation",
    request: "“I want to support healthy blood pressure.”",
    supports: "Supports healthy circulation and cardiovascular wellness.",
    products: ["V-Nitro", "V-Asculax", "V-Omega 3"],
  },
  {
    id: "sleep-calm",
    goal: "Sleep & Calm",
    request: "“I'm not sleeping well / I feel wired.”",
    supports: "Supports calm, relaxation, and restful sleep.",
    products: ["V-Italay", "V-Daily"],
  },
  {
    id: "digestion-gut",
    goal: "Digestion & Gut",
    request: "“My digestion feels off / I'm bloated.”",
    supports: "Supports gut balance, digestion, and gentle elimination.",
    products: ["V-Fortyflora", "Smart Biotics", "V-Organex", "V-Tedetox"],
  },
  {
    id: "energy-focus",
    goal: "Energy & Focus",
    request: "“I'm tired and foggy / I want more energy.”",
    supports: "Supports natural energy, focus, and daily nutrition.",
    products: ["V-NRGY", "LatteKafe", "Performance+", "VitalPro"],
  },
  {
    id: "joint-mobility",
    goal: "Joint & Mobility",
    request: "“My joints ache / I want to move better.”",
    supports: "Supports joint comfort, mobility, and connective tissue.",
    products: ["V-Curcumax", "V-Itadol", "VitalAge Collagen"],
  },
  {
    id: "immune",
    goal: "Immune Support",
    request: "“I keep getting sick / I want to stay well.”",
    supports: "Supports immune and respiratory wellness with antioxidant support.",
    products: ["VitalBoost", "D-Fenz", "Glutation Plus"],
  },
  {
    id: "hormones",
    goal: "Hormone Balance",
    request: "“I want hormone and vitality support.”",
    supports: "Supports hormonal balance and vitality (sex-specific).",
    products: ["V-Harmony", "V-Prime", "V-Daily"],
  },
  {
    id: "skin-aging",
    goal: "Skin, Hair & Aging",
    request: "“I want to support my skin and healthy aging.”",
    supports: "Supports skin, collagen, and antioxidant balance.",
    products: ["VitalAge Collagen", "Glutation Plus", "V-Omega 3"],
  },
  {
    id: "detox-cleanse",
    goal: "Detox & Cleanse",
    request: "“I want to do a gentle cleanse / reset.”",
    supports: "Supports liver, gentle elimination, and antioxidant balance.",
    products: ["V-Organex", "V-Tedetox", "V-Itaren", "Glutation Plus"],
  },
  {
    id: "daily-foundation",
    goal: "Daily Foundation",
    request: "“I just want a solid daily baseline.”",
    supports: "Supports daily nutrition, protein, and micronutrients.",
    products: ["V-Daily", "VitalPro", "Nourish+", "V-Omega 3"],
  },
];

// ─── Phase 1: goal + profile → suggested products (awaiting review) ─────────────

export type ProductRole = "foundational" | "conditional" | "optional";
export type EatingPattern = "cravings" | "low-intake" | "balanced" | "unknown";

export const EATING_PATTERNS: { value: EatingPattern; label: string }[] = [
  { value: "balanced", label: "Generally balanced intake" },
  { value: "cravings", label: "Frequent cravings / appetite concerns" },
  { value: "low-intake", label: "Eats very little / skips meals" },
  { value: "unknown", label: "Unknown" },
];

export interface SuggestedProduct {
  name: string;
  role: ProductRole;
  reason: string;
  caution?: string;
}

export interface StackSuggestion {
  products: SuggestedProduct[];
  /** Optional guidance shown above the suggestions. */
  note?: string;
}

/**
 * Suggest products for a goal, refined by eating pattern. Weight & Metabolism is
 * eating-pattern aware: a cravings client and a barely-eating client get
 * different stacks. Nothing here is auto-approved — the practitioner reviews.
 */
export function suggestProducts(
  goalId: string,
  eating: EatingPattern,
): StackSuggestion {
  if (goalId === "weight-metabolism") {
    if (eating === "low-intake") {
      return {
        note: "Nourishment first — no appetite suppressants or thermogenics. Flag persistent under-eating for appropriate professional assessment.",
        products: [
          {
            name: "VitalPro",
            role: "foundational",
            reason: "Protein support when dietary protein intake is insufficient.",
          },
          {
            name: "V-Daily",
            role: "conditional",
            reason: "Micronutrient support where nutritional gaps exist.",
          },
        ],
      };
    }
    if (eating === "cravings") {
      return {
        products: [
          {
            name: "VitalPro",
            role: "foundational",
            reason: "Protein and satiety support when protein intake is low.",
          },
          {
            name: "V-Control",
            role: "conditional",
            reason: "Appetite and satiety support.",
            caution:
              "Only when food intake is adequate — not for under-eating or disordered eating.",
          },
          {
            name: "S-Balance",
            role: "conditional",
            reason: "Blood sugar and metabolic support.",
            caution:
              "Screen medications (especially glucose-lowering) and metabolic history first.",
          },
        ],
      };
    }
    return {
      products: [
        {
          name: "VitalPro",
          role: "foundational",
          reason: "Protein support when intake is insufficient.",
        },
        {
          name: "V-Daily",
          role: "optional",
          reason: "Micronutrient support where gaps are identified.",
        },
        {
          name: "S-Balance",
          role: "conditional",
          reason: "Blood sugar and metabolic support.",
          caution: "Screen medications and metabolic history first.",
        },
      ],
    };
  }

  const stack = CLIENT_STACKS.find((s) => s.id === goalId);
  if (!stack) return { products: [] };
  return {
    products: stack.products.map((name, i) => ({
      name,
      role: i === 0 ? "foundational" : "optional",
      reason: productSupports(name),
    })),
  };
}
