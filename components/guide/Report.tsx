import type { GuideContent } from "@/lib/guide/summary";
export function GuideReportView({ content, draft = false }: { content: GuideContent; draft?: boolean }) {
  return <article className="guide-report">
    <p className="guide-eyebrow">SOLAE GUIDE · {draft ? "DRAFT PREVIEW · NOT RELEASED" : "REVIEWED BY ANGELA"}</p>
    <h2>{content.previousDate ? "What changed since your last scan" : "Your starting point"}</h2>
    <p className="guide-muted">Scan: {content.scanDate}{content.previousDate ? " · Compared with " + content.previousDate : " · First scan"}</p>
    <div className="whitespace-pre-wrap">{content.text}</div>
    {content.focus && <section><h3>Our agreed focus</h3><p className="whitespace-pre-wrap">{content.focus}</p></section>}
    <section><h3>Your system graphs</h3><p className="guide-muted">Percentage of scan markers within the scanner&apos;s reference ranges. These are not percentages of organ function.</p>
      <div className="guide-legend"><span>Gold: current scan</span><span>Gray: previous scan</span></div>
      {content.systems.map(system => <div className="guide-system" key={system.name}>
        <div className="flex justify-between gap-3"><span>{system.name}</span><span>{system.current}%</span></div>
        <div className="guide-track" role="img" aria-label={system.name + ": current " + system.current + " percent"}><div className="guide-current" style={{ width: system.current + "%" }} /></div>
        {system.previous !== null && <div className="guide-track" role="img" aria-label={"Previous " + system.previous + " percent"}><div className="guide-previous" style={{ width: system.previous + "%" }} /></div>}
        <p className="guide-muted">{system.inRange} of {system.total} markers in range{system.previous !== null ? " · Previous " + system.previous + "% · " + (system.current > system.previous ? "Up" : system.current < system.previous ? "Dip" : "No change") : " · Starting point / no comparable prior data"}</p>
      </div>)}
    </section>
    {content.warnings.length > 0 && <section><h3>Comparison notes</h3><ul>{content.warnings.map(w => <li key={w}>{w}</li>)}</ul></section>}
    <p className="guide-muted">Wellness-tracking information, not diagnostic laboratory results. Product choices and next steps remain a conversation with Angela.</p>
  </article>;
}
