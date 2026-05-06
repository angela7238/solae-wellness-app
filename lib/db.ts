// Database helpers — thin wrappers over Supabase queries.
// Always called from server-side API routes (uses createServerSupabase).
//
// Note: we don't use a typed Database<> generic on the Supabase client (see lib/supabase/client.ts).
// Instead, queries are .returns<T>()-cast or `as` cast at the call site.

import "server-only";
import { createServerSupabase } from "./supabase/server";
import type { ClientRow, ScanRow } from "./supabase/types";
import type { ParsedScan } from "./parser/parseScan";

const DEFAULT_STACK = {
  detox: [] as string[],
  repair: [] as string[],
  restore: [] as string[],
  nourish: [] as string[],
};

const DEFAULT_NON_SOLAE = {
  omega3: false,
  berberine: false,
  cinnamon: false,
  glutathione: false,
  multivitamin: false,
  other: "",
};

export async function findClientByName(name: string): Promise<ClientRow | null> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .ilike("name", name.trim())
    .maybeSingle();
  if (error) throw error;
  return (data as ClientRow | null) ?? null;
}

export async function createClient(input: {
  name: string;
  age: number | null;
  sex: string | null;
}): Promise<ClientRow> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("clients")
    .insert({
      name: input.name.trim(),
      age: input.age,
      sex: input.sex,
      email: null,
      goals: null,
      notes: null,
      current_solae_stack: DEFAULT_STACK,
      non_solae_supplements: DEFAULT_NON_SOLAE,
    })
    .select()
    .single();
  if (error) throw error;
  return data as ClientRow;
}

/** Save (or upsert by client_id + scan_date) a parsed scan. */
export async function saveScan(input: {
  clientId: string;
  scanDate: string; // YYYY-MM-DD
  parsedData: ParsedScan;
}): Promise<ScanRow> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("scans")
    .upsert(
      {
        client_id: input.clientId,
        scan_date: input.scanDate,
        parsed_data: input.parsedData,
      },
      { onConflict: "client_id,scan_date" },
    )
    .select()
    .single();
  if (error) throw error;
  return data as ScanRow;
}

export type ScanSummary = { id: string; scan_date: string; notes: string | null };

export async function listClientsWithScanCounts(): Promise<
  Array<ClientRow & { scan_count: number; scan_dates: string[]; scans: ScanSummary[] }>
> {
  const supabase = createServerSupabase();
  const { data: clients, error: clientsErr } = await supabase
    .from("clients")
    .select("*")
    .order("name");
  if (clientsErr) throw clientsErr;

  const { data: scans, error: scansErr } = await supabase
    .from("scans")
    .select("id,client_id,scan_date,notes")
    .order("scan_date", { ascending: true });
  if (scansErr) throw scansErr;

  const byClient = new Map<string, ScanSummary[]>();
  for (const s of (scans as Array<Pick<ScanRow, "id" | "client_id" | "scan_date" | "notes">>) ?? []) {
    const arr = byClient.get(s.client_id) ?? [];
    arr.push({ id: s.id, scan_date: s.scan_date, notes: s.notes });
    byClient.set(s.client_id, arr);
  }

  return ((clients as ClientRow[]) ?? []).map((c) => {
    const clientScans = byClient.get(c.id) ?? [];
    return {
      ...c,
      scan_count: clientScans.length,
      scan_dates: clientScans.map((s) => s.scan_date),
      scans: clientScans,
    };
  });
}

export async function getClientWithScans(
  clientId: string,
): Promise<{ client: ClientRow; scans: ScanRow[] } | null> {
  const supabase = createServerSupabase();
  const [{ data: client, error: cErr }, { data: scans, error: sErr }] =
    await Promise.all([
      supabase.from("clients").select("*").eq("id", clientId).maybeSingle(),
      supabase
        .from("scans")
        .select("*")
        .eq("client_id", clientId)
        .order("scan_date", { ascending: true }),
    ]);
  if (cErr) throw cErr;
  if (sErr) throw sErr;
  if (!client) return null;
  return {
    client: client as ClientRow,
    scans: (scans as ScanRow[]) ?? [],
  };
}

export async function deleteClient(clientId: string): Promise<void> {
  const supabase = createServerSupabase();
  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("id", clientId);
  if (error) throw error;
}

export async function deleteScan(scanId: string): Promise<void> {
  const supabase = createServerSupabase();
  const { error } = await supabase.from("scans").delete().eq("id", scanId);
  if (error) throw error;
}

export async function updateScanNotes(
  scanId: string,
  notes: string,
): Promise<void> {
  const supabase = createServerSupabase();
  const { error } = await supabase
    .from("scans")
    .update({ notes: notes || null })
    .eq("id", scanId);
  if (error) throw error;
}

export async function updateScanCoachNotes(
  scanId: string,
  coachNotes: string,
): Promise<void> {
  const supabase = createServerSupabase();
  const { error } = await supabase
    .from("scans")
    .update({ coach_notes: coachNotes || null })
    .eq("id", scanId);
  if (error) throw error;
}

export async function saveSupplementEvaluation(input: {
  clientId: string;
  productName: string;
  brandName: string;
  evaluation: import("./supabase/types").SupplementEvaluation;
}): Promise<import("./supabase/types").SupplementEvaluationRow> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("supplement_evaluations")
    .insert({
      client_id: input.clientId,
      product_name: input.productName || null,
      brand_name: input.brandName || null,
      evaluation: input.evaluation,
    })
    .select()
    .single();
  if (error) throw error;
  return data as import("./supabase/types").SupplementEvaluationRow;
}

export async function getSupplementEvaluations(
  clientId: string,
): Promise<import("./supabase/types").SupplementEvaluationRow[]> {
  const supabase = createServerSupabase();
  const { data, error } = await supabase
    .from("supplement_evaluations")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as import("./supabase/types").SupplementEvaluationRow[]) ?? [];
}

export async function deleteSupplementEvaluation(id: string): Promise<void> {
  const supabase = createServerSupabase();
  const { error } = await supabase
    .from("supplement_evaluations")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
