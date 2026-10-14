const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { PGlite } = require('@electric-sql/pglite');
const a='00000000-0000-4000-8000-000000000001', b='00000000-0000-4000-8000-000000000002';
const s1='10000000-0000-4000-8000-000000000001', s2='10000000-0000-4000-8000-000000000002';

test('database protects drafts, requires a fresh revision, and invalidates changed comparisons', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create schema auth; create table auth.users(id uuid primary key,email text);
      create table public.clients(id uuid primary key);
      create table public.scans(id uuid primary key,client_id uuid references clients(id),scan_date date,parsed_data jsonb);`);
    await db.exec(fs.readFileSync('supabase/migrations/20261013_solae_guide.sql','utf8'));
    await db.exec(`insert into clients values('${a}'),('${b}');
      insert into auth.users values('${a}','a@example.test'),('${b}','b@example.test');
      insert into scans values('${s1}','${a}','2026-03-01','{}'),('${s2}','${a}','2026-04-01','{}');
      insert into guide_reports(client_id,scan_id,previous_scan_id,draft_content) values
      ('${a}','${s2}','${s1}','{"text":"Draft one"}');`);
    const id=(await db.query('select id from guide_reports')).rows[0].id;
    for(const role of ['anon','authenticated']) {
      await db.exec('set role '+role);
      await assert.rejects(db.query('select * from guide_reports'),/permission denied/);
      await assert.rejects(db.query('select * from guide_access'),/permission denied/);
      await assert.rejects(db.query(`select publish_guide_report('${id}',1)`),/permission denied/);
      await db.exec('reset role');
    }
    assert.equal((await db.query(`select published_content from guide_reports`)).rows[0].published_content,null);
    assert.equal((await db.query(`select publish_guide_report('${id}',1) as ok`)).rows[0].ok,true);
    assert.equal((await db.query(`select publish_guide_report('${id}',1) as ok`)).rows[0].ok,false);
    await db.exec(`update guide_reports set draft_content='{"text":"Edited draft"}', revision=3 where id='${id}'`);
    assert.equal((await db.query('select published_content from guide_reports')).rows[0].published_content.text,'Draft one');
    await db.query(`select enroll_guide_client('${a}','a@example.test')`);
    await assert.rejects(db.query(`select enroll_guide_client('${b}','a@example.test')`),/unique/);
    await db.exec(`update scans set parsed_data='{"changed":true}' where id='${s1}'`);
    assert.equal((await db.query('select count(*)::int as n from guide_reports')).rows[0].n,0);
    await db.exec(`insert into guide_reports(client_id,scan_id,previous_scan_id,draft_content) values ('${a}','${s2}','${s1}','{"text":"Another draft"}');
      insert into scans values('10000000-0000-4000-8000-000000000003','${a}','2026-03-15','{}');`);
    assert.equal((await db.query('select count(*)::int as n from guide_reports')).rows[0].n,0);
  } finally { await db.close(); }
});
