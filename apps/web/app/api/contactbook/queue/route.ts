import { NextResponse } from "next/server";
import { pollScaleConvoContactQueue } from "@/lib/scaleconvo-contact-queue";

export async function GET() {
  try {
    const result = await pollScaleConvoContactQueue();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not poll contact queue",
        source: "scaleconvo",
        events: [],
        fetchedAt: new Date().toISOString()
      },
      { status: 502 }
    );
  }
}
