// Canonical 41-system mapping for the Solae dashboard.
// The raw Wellness Scan Co PDF contains 42-43 sections; we exclude
// the ones not used on the dashboard ("Bone Disease", "Element of Human").

export const DASHBOARD_SYSTEMS = [
  "Allergy",
  "Amino Acid",
  "Basic Physical Quality",
  "Blood Sugar",
  "Blood lipids",
  "Bone Growth Index",
  "Bone Mineral Density",
  "Brain Nerve",
  "Breast",
  "Cardiovascular and Cerebrovascular",
  "Channels and collaterals",
  "Coenzyme",
  "Collagen",
  "Endocrine System",
  "Essential Fatty Acid",
  "Eye",
  "Fatty acid",
  "Female Hormone",
  "Gallbladder Function",
  "Gastrointestinal Function",
  "Gynecology",
  "Heavy Metal",
  "Human Consciousness Level",
  "Human Immunity",
  "Human Toxin",
  "Immune System",
  "Kidney Function",
  "Large Intestine Function",
  "Lecithin",
  "Liver Function",
  "Lung Function",
  "Menstrual cycle",
  "Obesity",
  "Pancreatic Function",
  "Pulse of heart and brain",
  "Respiratory Function",
  "Rheumatoid Bone Disease",
  "Skin",
  "Thyroid",
  "Trace Element",
  "Vitamin",
  // Male-specific systems (only present in male client scans)
  "Male Sexual Function",
  "Male Hormone",
  "Sperm and semen",
  "Prostate",
] as const;

export type DashboardSystem = (typeof DASHBOARD_SYSTEMS)[number];

const SYSTEM_SET = new Set<string>(DASHBOARD_SYSTEMS);

export function isDashboardSystem(name: string): name is DashboardSystem {
  return SYSTEM_SET.has(name);
}
