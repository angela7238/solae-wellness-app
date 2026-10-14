const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

function loadTs(file, mocks = {}) {
  const filename = path.resolve(file);
  const mod = new Module(filename, module);
  mod.filename = filename;
  mod.paths = Module._nodeModulePaths(path.dirname(filename));
  const original = mod.require.bind(mod);
  mod.require = name => Object.hasOwn(mocks, name) ? mocks[name] : original(name);
  mod._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
  return mod.exports;
}
const summary = loadTs('lib/guide/summary.ts');
const security = loadTs('lib/guide/security.ts');
const session = loadTs('lib/session.ts');
function scan(date, values, name = 'Kidney Function') {
  return { scanDate: date, client: {name:'Example'}, systems: [{name, markers: values.map((value, i) => ({name:'Marker '+i, value, rangeMin:0, rangeMax:10}))}] };
}

test('first scan is a starting point and recalculates counts from source values', () => {
  const result = summary.draftGuide(scan('2026-04-21', [2,20,8,15]));
  assert.equal(result.previousDate, null); assert.equal(result.systems[0].current, 50);
  assert.equal(result.systems[0].inRange, 2); assert.match(result.text,/starting point/);
  assert.doesNotMatch(result.text,/This is great!/);
});
test('25 to 50 percent is a marker count, while closer/farther are separate', () => {
  const result = summary.draftGuide(scan('2026-04-21',[2,20,8,15]), scan('2026-03-21',[2,25,12,14]));
  assert.equal(result.systems[0].previous,25); assert.equal(result.systems[0].current,50);
  assert.equal(result.systems[0].closer,2); assert.equal(result.systems[0].farther,1);
  assert.match(result.text,/25% to 50%/); assert.match(result.text,/1 moved farther/);
});
test('unchanged category can contain closer and farther markers', () => {
  const result = summary.draftGuide(scan('2026-04-21',[2,18,8,25]), scan('2026-03-21',[2,20,8,15]));
  assert.match(result.text,/unchanged/); assert.equal(result.systems[0].closer,1); assert.equal(result.systems[0].farther,1);
});
test('dips are not described as improvements', () => {
  const result = summary.draftGuide(scan('2026-04-21',[2,20,12,15]), scan('2026-03-21',[2,20,8,15]));
  assert.match(result.text,/fewer markers/); assert.match(result.text,/1 dipped/); assert.doesNotMatch(result.text,/This is great!/);
});
test('changed marker coverage cannot masquerade as a trend', () => {
  assert.throws(() => summary.draftGuide(scan('2026-04-21',[2]),scan('2026-03-21',[2,8])), /No comparable/);
  const current = scan('2026-04-21',[2,8]); current.systems.push({...scan('2026-04-21',[2],'New system').systems[0]});
  const result = summary.draftGuide(current, scan('2026-03-21',[2,8]));
  assert.equal(result.systems[1].previous,null); assert.equal(result.warnings.length,1);
});
test('bad values and reversed scan chronology are held', () => {
  assert.throws(() => summary.draftGuide(scan('2026-04-21',[NaN])),/Invalid/);
  assert.throws(() => summary.draftGuide(scan('2026-04-21',[2]), scan('2026-04-21',[2])),/earlier/);
});
test('portal boundary matching never opens similarly named studio paths', () => {
  assert.equal(security.isPortalPath('/api/portal/reports/a/pdf'),true);
  assert.equal(security.isPortalPath('/portal-admin'),false);
  assert.equal(security.isPortalPath('/api/portal-extra'),false);
});
test('mutations reject cross-origin and missing-origin requests', () => {
  assert.equal(security.sameOrigin(new Request('https://solae.example/api/guide',{headers:{origin:'https://evil.example'}})),false);
  assert.equal(security.sameOrigin(new Request('https://solae.example/api/guide')),false);
  assert.equal(security.sameOrigin(new Request('https://solae.example/api/guide',{headers:{origin:'https://solae.example'}})),true);
});

function backend(user) {
  const rows = [{id:'a',client_id:'client-a',published_content:{text:'A'},approved_at:'today'}, {id:'b',client_id:'client-b',published_content:{text:'B'},approved_at:'today'}, {id:'draft',client_id:'client-a',published_content:null}];
  const filters = [];
  const db = {from(table) {
    const constraints = [];
    const query = {
      select() { return query; }, eq(key,value) { constraints.push(row=>row[key]===value); filters.push([table,key,value]); return query; },
      not(key,_operator,_value) { constraints.push(row=>row[key]!==null); return query; }, order() {return query;},
      async maybeSingle() {return {data:table==='guide_access' && user?.id==='user-a'?{client_id:'client-a',email:'example@invalid.test'}:null,error:null};},
      then(resolve) {return Promise.resolve({data:rows.filter(row=>constraints.every(c=>c(row))),error:null}).then(resolve);},
    }; return query;
  }};
  const auth = {auth:{async getUser(){return {data:{user},error:user?null:{message:'Invalid token'}};}}};
  const server = loadTs('lib/guide/server.ts', {'server-only':{},'next/headers':{cookies:async()=>({getAll:()=>[],get:()=>undefined})},
    '@supabase/ssr':{createServerClient:()=>auth},'../supabase/server':{createServerSupabase:()=>db},'../db':{},'../session':session,'./summary':summary,'./security':security});
  return { server, filters };
}
process.env.SOLAE_GUIDE_ENABLED='true'; process.env.NEXT_PUBLIC_SUPABASE_URL='http://localhost:54321'; process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='test-only';
test('forged/missing client identity fails before data queries', async () => {
  const {server,filters}=backend(null); await assert.rejects(server.requirePortalClient(), e=>e.status===401); assert.equal(filters.length,0);
});
test('verified client is mapped by auth user id, not a supplied client id', async () => {
  const {server,filters}=backend({id:'user-a'}); const access=await server.requirePortalClient(); assert.equal(access.client_id,'client-a');
  assert.deepEqual(filters[0],['guide_access','auth_user_id','user-a']);
});
test('uninvited authenticated users are denied', async () => {
  const {server}=backend({id:'uninvited'}); await assert.rejects(server.requirePortalClient(), e=>e.status===403);
});
test('approved listing excludes drafts and other clients', async () => {
  const {server}=backend({id:'user-a'}); assert.deepEqual((await server.approvedReports('client-a')).map(r=>r.id),['a']);
});
test('another client report id cannot be downloaded as PDF', async () => {
  const {server}=backend({id:'user-a'});
  const route=loadTs('app/api/portal/reports/[id]/pdf/route.ts',{'@/lib/guide/server':server,'@/lib/guide/pdf':{guidePdf:()=>{throw Error('Must not render another client PDF');}}});
  const response=await route.GET(new Request('https://solae.example/api/portal/reports/b/pdf'),{params:Promise.resolve({id:'b'})});
  assert.equal(response.status,404);
});
test('own approved PDF is private and downloadable', async () => {
  const {server}=backend({id:'user-a'});
  const route=loadTs('app/api/portal/reports/[id]/pdf/route.ts',{'@/lib/guide/server':server,'@/lib/guide/pdf':{guidePdf:async()=>new Uint8Array([37,80,68,70])}});
  const response=await route.GET(new Request('https://solae.example/api/portal/reports/a/pdf'),{params:Promise.resolve({id:'a'})});
  assert.equal(response.status,200); assert.equal(response.headers.get('Cache-Control'),'private, no-store');
});
test('PDF creation paginates long reviewed text and includes summary data', async () => {
  const {guidePdf}=loadTs('lib/guide/pdf.ts'); const {PDFDocument}=require('pdf-lib');
  const content=summary.draftGuide(scan('2026-04-21',[2,20,8,15]), scan('2026-03-21',[2,25,12,14]));
  const bytes=await guidePdf({...content,focus:'Example focus. '.repeat(600)});
  const doc=await PDFDocument.load(bytes); assert.ok(doc.getPageCount()>1);
  if(process.env.GUIDE_TEST_PDF)fs.writeFileSync(process.env.GUIDE_TEST_PDF,bytes);
});
