"use server";

import { redirect } from "next/navigation";
import { createSmsBlast } from "@/lib/sms-blasts";

function firstFormValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

export async function queueSmsBlast(formData: FormData) {
  const title = firstFormValue(formData.get("title")) || "Detroit Metro Men SMS blast";
  const message = firstFormValue(formData.get("message"));

  if (message.length < 8) {
    redirect("/conversations?status=message-too-short");
  }

  let nextUrl = "/conversations?status=queued";

  try {
    await createSmsBlast({
      title,
      message,
      audience: "@detroitmetromen contacts",
      status: "queued"
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Could not queue blast.";
    nextUrl = `/conversations?status=queue-failed&reason=${encodeURIComponent(reason)}`;
  }

  redirect(nextUrl);
}
