"use client";
import { useEffect, useState } from "react";
import type { GuideContent } from "@/lib/guide/summary";
import { GuideReportView } from "@/components/guide/Report";

type Report = { id: string; client_id: string; draft_content: GuideContent; published_content: GuideContent | null; revision: number; approved_at: string | null; notification_status: string };
type Client = { id: string; name: string; email: string | null };
type Access = { client_id: string; email: string };

export default function StudioGuidePage() {
  const [data, setData] = useState<{ reports: Report[]; clients: Client[]; access: Access[] }>({ reports: [], clients: [], access: [] });
  const [clientId, setClientId] = useState("");
  const [reportId, setReportId] = useState("");
  const [text, setText] = useState(""); const [focus, setFocus] = useState("");
  const [email, setEmail] = useState(""); const [verified, setVerified] = useState(false);
  const [numbersChecked, setNumbersChecked] = useState(false); const [voiceChecked, setVoiceChecked] = useState(false);
  const [message, setMessage] = useState("Loading Solae Guide…"); const [busy, setBusy] = useState(false);
  const report = data.reports.find(r => r.id === reportId && r.client_id === clientId);
  const access = data.access.find(a => a.client_id === clientId);
  const dirty = !!report && (text !== report.draft_content.text || focus !== report.draft_content.focus);

  async function load() {
    const response = await fetch("/api/guide", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Solae Guide is unavailable.");
    setData(result); return result;
  }
  useEffect(() => {
    let active = true;
    fetch("/api/guide", { cache: "no-store" }).then(async response => {
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Solae Guide is unavailable.");
      if (active) { setData(result); setMessage(""); }
    }).catch(error => { if (active) setMessage(error.message); });
    return () => { active = false; };
  }, []);
  function selectReport(row: Report | undefined) {
    setReportId(row?.id ?? ""); setText(row?.draft_content.text ?? ""); setFocus(row?.draft_content.focus ?? "");
    setNumbersChecked(false); setVoiceChecked(false);
  }
  async function action(path: string, body: object, method = "POST") {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || "Action failed.");
      const refreshed = await load();
      selectReport(refreshed.reports.find((r: Report) => r.id === reportId));
      setMessage(result.warning || "Saved.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Please try again."); }
    finally { setBusy(false); }
  }
  return <div className="guide-shell">
    <p className="guide-eyebrow">STUDIO REVIEW</p><h1>Solae Guide</h1>
    <p>Check the numbers. Make it sound like you. Release it when you&apos;re ready.</p>
    <p role="status" className="guide-message">{message}</p>
    <div className="guide-panel">
      <label htmlFor="guide-client">Client</label><select id="guide-client" value={clientId} onChange={event => {
        const id = event.target.value; setClientId(id); selectReport(data.reports.find(r => r.client_id === id));
        setEmail(data.access.find(a => a.client_id === id)?.email ?? data.clients.find(c => c.id === id)?.email ?? ""); setVerified(false);
      }}><option value="">Choose a client</option>{data.clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
      <button disabled={busy || !clientId} onClick={() => action("/api/guide", { clientId })}>Prepare missing summaries for existing scans</button>
    </div>
    {clientId && <div className="guide-panel"><h2>Private client access</h2><p>Only enable access for a client you&apos;ve seen in person. Confirm their email before linking their reports.</p>
      <label htmlFor="guide-access-email">Client&apos;s email</label><input id="guide-access-email" type="email" value={email} onChange={event => { setEmail(event.target.value); setVerified(false); }} />
      <label className="guide-check"><input type="checkbox" checked={verified} onChange={e => setVerified(e.target.checked)} />I&apos;ve seen this client in person and confirmed this is their email.</label>
      <div className="flex gap-3 flex-wrap"><button disabled={busy || !verified || !email} onClick={() => action("/api/guide/access", { clientId, email, confirmedInPerson: true, confirmedEmail: true })}>{access ? "Update client access" : "Enable client access"}</button>
      {access && <button disabled={busy} onClick={() => action("/api/guide/access", { clientId }, "DELETE")}>Disable client access</button>}</div>
      <p className="guide-muted">{access ? "Enabled for " + access.email : "Not enabled yet."} Sign-in page: /portal/login</p>
    </div>}
    {clientId && <div className="guide-panel"><label htmlFor="guide-scan">Scan summary</label><select id="guide-scan" value={reportId} onChange={e => selectReport(data.reports.find(r => r.id === e.target.value))}>
      <option value="">Choose a summary</option>{data.reports.filter(r => r.client_id === clientId).map(r => <option value={r.id} key={r.id}>{r.draft_content.scanDate} · {r.approved_at ? "Published version available" : "Draft only"}</option>)}</select>
    </div>}
    {report && <>
      <div className="guide-panel"><h2>Your draft</h2><p>Client-visible content stays on the last approved version until you approve again.</p>
        <label htmlFor="guide-summary-text">Explanation</label><textarea id="guide-summary-text" rows={14} maxLength={15000} value={text} onChange={e => { setText(e.target.value); setNumbersChecked(false); setVoiceChecked(false); }} />
        <label htmlFor="guide-focus">Our agreed focus</label><textarea id="guide-focus" rows={3} maxLength={2000} placeholder="The focus and next steps you agreed on together." value={focus} onChange={e => { setFocus(e.target.value); setNumbersChecked(false); setVoiceChecked(false); }} />
        <button disabled={busy || !dirty || !text.trim()} onClick={() => action("/api/guide/" + report.id, { action: "save", revision: report.revision, text, focus })}>Save draft</button>
      </div>
      <GuideReportView draft content={{ ...report.draft_content, text, focus }} />
      <div className="guide-panel"><h2>Review and release</h2>
        <label className="guide-check"><input type="checkbox" checked={numbersChecked} onChange={e => setNumbersChecked(e.target.checked)} />The numbers match the source scan.</label>
        <label className="guide-check"><input type="checkbox" checked={voiceChecked} onChange={e => setVoiceChecked(e.target.checked)} />The explanation sounds like me.</label>
        {dirty && <p>Save your changes before approving.</p>}
        {!access && <p>Enable private client access before releasing and emailing.</p>}
        <button disabled={busy || dirty || !numbersChecked || !voiceChecked || !access} onClick={() => action("/api/guide/" + report.id, { action: "approve", revision: report.revision, numbersChecked: true, voiceChecked: true })}>Approve and notify client</button>
        {report.approved_at && <><p className="guide-muted">Approved {new Date(report.approved_at).toLocaleString()} · Ready email: {report.notification_status}</p>
        {report.notification_status !== "sent" && <button disabled={busy || !access} onClick={() => action("/api/guide/" + report.id, { action: "notify" })}>Retry ready email</button>}</>}
      </div>
    </>}
  </div>;
}
