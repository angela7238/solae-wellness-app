import { requirePortalClient, approvedReports, GuideError, guideResponseError } from "@/lib/guide/server";
import { guidePdf } from "@/lib/guide/pdf";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const client = await requirePortalClient();
    const { id } = await params;
    const reports = await approvedReports(client.client_id, id);
    if (!reports[0]) throw new GuideError(404, "Summary not found.");
    const bytes = await guidePdf(reports[0].published_content);
    return new Response(Buffer.from(bytes), { headers: { "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="solae-guide.pdf"', "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  } catch (error) { return guideResponseError(error); }
}
