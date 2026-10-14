import Link from "next/link";
import { redirect } from "next/navigation";
import { requirePortalClient, approvedReports, GuideError } from "@/lib/guide/server";
export const dynamic = "force-dynamic";
export default async function PortalPage() {
  let reports;
  try { const client = await requirePortalClient(); reports = await approvedReports(client.client_id); }
  catch (error) {
    if (error instanceof GuideError && error.status === 401) redirect("/portal/login");
    return <div className="guide-shell"><h1>Your private Solae page</h1><p>{error instanceof GuideError ? error.message : "Your summaries are unavailable right now. Please contact Solae."}</p><Link href="/portal/login">Return to sign-in</Link></div>;
  }
  return <div className="guide-shell">
    <div className="flex justify-between gap-4 flex-wrap"><div><p className="guide-eyebrow">SOLAE GUIDE</p><h1>Your scan summaries</h1></div><form action="/api/portal/signout" method="post"><button>Sign out</button></form></div>
    <p>A clear starting point, an honest look at changes, and your next focus together.</p>
    {reports.length === 0 ? <div className="guide-panel"><h2>Your summary is on its way.</h2><p>Angela will review it before it appears here.</p></div> : reports.map(report => <div className="guide-panel" key={report.id}>
      <p className="guide-eyebrow">REVIEWED BY ANGELA</p><h2>{report.published_content.scanDate}</h2>
      <p>{report.published_content.previousDate ? "Changes since " + report.published_content.previousDate : "Your starting point"}</p>
      <Link className="guide-button" href={"/portal/reports/" + report.id}>Read my summary</Link>
    </div>)}
  </div>;
}
