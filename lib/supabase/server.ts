// Supabase client for server-side use (route handlers, server components).
// Same publishable key — RLS policies enforce access rules.
import "server-only";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function createServerSupabase() {
  return createClient(url, anonKey, {
    auth: { persistSession: false },
  });
}
