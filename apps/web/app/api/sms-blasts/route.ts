import { NextResponse } from "next/server";
import { createSmsBlast, listSmsBlasts } from "@/lib/sms-blasts";

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
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (message.length < 8) {
      return NextResponse.json({ error: "Message must be at least 8 characters." }, { status: 400 });
    }

    const blast = await createSmsBlast({
      title,
      message,
      audience: "@detroitmetromen contacts",
      status: "queued"
    });

    return NextResponse.json({ blast }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not queue SMS blast."
      },
      { status: 502 }
    );
  }
}
