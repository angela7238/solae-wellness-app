// Supabase client for server-side use (route handlers, server components).
// Uses the secret service-role key, which bypasses RLS. This key must NEVER be
// exposed to the browser — it lives only in server-side env (.env.local / Netlify),
// never prefixed with NEXT_PUBLIC. All client data access goes through server API
// routes, so the browser never needs a Supabase key at all.
import "server-only";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;

export function createServerSupabase() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    // Checked lazily (not at module load) so importing this file never throws
    // during the build. Fails loud at request time if the key is missing —
    // better than silently falling back to the now-powerless anon key.
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local and your Netlify environment.",
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
