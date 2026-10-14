import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { GuideReportView } from "@/components/guide/Report";
import { requirePortalClient, approvedReports, GuideError } from "@/lib/guide/server";
export const dynamic = "force-dynamic";
export default async function ClientReportPage({ params }: { params: Promise<{ id: string }> }) {
  let reports;
  try {
    const client = await requirePortalClient();
    const { id } = await params;
    reports = await approvedReports(client.client_id, id);
  } catch (error) {
    if (error instanceof GuideError && error.status === 401) redirect("/portal/login");
    if (error instanceof GuideError && error.status === 403) notFound();
    return <div className="guide-shell"><p>This summary is unavailable right now. Please try again later.</p></div>;
  }
  const report = reports[0];
  if (!report) notFound();
  return <div className="guide-shell"><div className="flex gap-4 justify-between flex-wrap no-print"><Link href="/portal">← My summaries</Link><a className="guide-button" href={"/api/portal/reports/" + report.id + "/pdf"}>Download PDF</a></div><GuideReportView content={report.published_content} /></div>;
}
