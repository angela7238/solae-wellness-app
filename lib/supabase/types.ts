// Shared row shapes — kept in sync with the SQL schema in supabase/schema.sql.
// We don't pass these to the Supabase client as a Database<> generic (see client.ts);
// instead we cast query results to these types at use sites in lib/db.ts.

import type { ParsedScan } from "@/lib/parser/parseScan";

export interface ClientRow {
  id: string; // uuid
  name: string;
  age: number | null;
  sex: string | null;
  email: string | null;
  current_solae_stack: {
    detox: string[];
    repair: string[];
    restore: string[];
    nourish: string[];
  } | null;
  non_solae_supplements: {
    omega3: boolean;
    berberine: boolean;
    cinnamon: boolean;
    glutathione: boolean;
    multivitamin: boolean;
    other: string;
  } | null;
  goals: string | null;
  notes: string | null;
  created_at: string;
}

export interface ScanRow {
  id: string; // uuid
  client_id: string;
  scan_date: string; // ISO date YYYY-MM-DD
  parsed_data: ParsedScan;
  notes: string | null;
  coach_notes: string | null;
  uploaded_at: string;
}

export interface SupplementEvaluation {
  product_name: string;
  product_type: string;
  overall_score: number;
  purity_score: number;
  effectiveness_score: number;
  bioavailability_score: number;
  clean_label_score: number;
  top_strengths: string[];
  top_concerns: string[];
  ingredient_flags: {
    red: string[];
    yellow: string[];
    green: string[];
  };
  plain_english_summary: string;
  practitioner_summary: string;
  recommendation: {
    use: "yes" | "no" | "conditional";
    best_for: string[];
    avoid_or_caution_if: string[];
    better_alternative_strategy: string;
  };
}

export interface SupplementEvaluationRow {
  id: string;
  client_id: string;
  product_name: string | null;
  brand_name: string | null;
  evaluation: SupplementEvaluation;
  created_at: string;
}
