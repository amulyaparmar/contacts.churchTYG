import { NextResponse } from "next/server";
import { pullAllContactsAndConversations } from "@/lib/contactbook-pull";

export async function GET() {
  try {
    const result = await pullAllContactsAndConversations();
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Could not pull contacts and conversations",
        contacts: [],
        events: [],
        fetchedAt: new Date().toISOString()
      },
      { status: 502 }
    );
  }
}
