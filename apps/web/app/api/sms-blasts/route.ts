import { NextResponse } from "next/server";
import { createSmsBlast, listSmsBlasts, previewSmsBlastAudience, type SmsBlastStatus } from "@/lib/sms-blasts";

export async function GET() {
  const result = await listSmsBlasts();
  return NextResponse.json({
    ...result,
    fetchedAt: new Date().toISOString()
  });
}

export async function POST(request: Request) {
  try {
    const payload: unknown = await request.json();
    const body = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
    const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : "Detroit Metro Men SMS blast";
    const messages = Array.isArray(body.messages)
      ? body.messages.map((message) => (typeof message === "string" ? message.trim() : "")).filter(Boolean)
      : [];
    const message = messages.length > 0 ? messages.join("\n\n") : typeof body.message === "string" ? body.message.trim() : "";
    const requestedStatus = typeof body.status === "string" ? body.status.trim().toLowerCase() : "";
    const scheduledAt = typeof body.scheduledAt === "string" && body.scheduledAt.trim() ? body.scheduledAt.trim() : null;
    const audienceMode = body.audienceMode === "specific" ? "specific" : "all";
    const specificNumbers = Array.isArray(body.specificNumbers)
      ? body.specificNumbers.map((number) => (typeof number === "string" ? number.trim() : "")).filter(Boolean)
      : [];
    const contactIds = Array.isArray(body.contactIds)
      ? body.contactIds.map((contactId) => (typeof contactId === "string" ? contactId.trim() : "")).filter(Boolean)
      : [];
    const specificNumber = typeof body.specificNumber === "string" && body.specificNumber.trim() ? body.specificNumber.trim() : null;
    const audienceFilter = typeof body.audienceFilter === "string" && body.audienceFilter.trim() ? body.audienceFilter.trim() : null;
    const status: SmsBlastStatus = requestedStatus === "draft" ? "draft" : "queued";
    const dryRun = body.dryRun === true;

    if (dryRun) {
      const preview = await previewSmsBlastAudience();
      return NextResponse.json({ preview });
    }

    if (message.length < 8) {
      return NextResponse.json({ error: "Message must be at least 8 characters." }, { status: 400 });
    }

    const blast = await createSmsBlast({
      title,
      messages: messages.length > 0 ? messages : [message],
      status,
      scheduledAt,
      audienceMode,
      specificNumber,
      specificNumbers,
      contactIds,
      audienceFilter
    });

    return NextResponse.json({ blast }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not save SMS blast."
      },
      { status: 502 }
    );
  }
}
