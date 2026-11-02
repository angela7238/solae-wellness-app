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
