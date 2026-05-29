// One-off backup: dumps all Supabase tables to local JSON files.
// Usage: node scripts/backup-db.mjs
import { createClient } from "@supabase/supabase-js";
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// Minimal .env.local parser (no dotenv dependency).
const env = {};
for (const line of readFileSync(join(root, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2];
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
// Prefer service-role if present, else fall back to the anon key.
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !key) {
  console.error("Missing Supabase URL or key in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
const outDir = join(root, "backups", `backup-${stamp}`);
mkdirSync(outDir, { recursive: true });

const tables = ["clients", "scans", "supplement_evaluations"];
const summary = {};

for (const table of tables) {
  const { data, error } = await supabase.from(table).select("*");
  if (error) {
    console.error(`Failed to read ${table}:`, error.message);
    process.exit(1);
  }
  writeFileSync(join(outDir, `${table}.json`), JSON.stringify(data, null, 2));
  summary[table] = data.length;
  console.log(`  ${table}: ${data.length} rows`);
}

writeFileSync(
  join(outDir, "_manifest.json"),
  JSON.stringify({ exported_at: new Date().toISOString(), project: url, counts: summary }, null, 2),
);

console.log(`\nBackup written to: ${outDir}`);
