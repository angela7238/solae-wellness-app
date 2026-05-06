// Supabase client for browser (uses publishable key — safe to expose).
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// We intentionally don't pass a Database<> generic — our hand-written ClientRow/
// ScanRow types don't structurally satisfy Supabase's Record<string, unknown>
// index-signature constraint, and casting at query sites is cleaner.
export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false },
});
