"use server";

import { redirect } from "next/navigation";
import { createSmsBlast, type SmsBlastStatus } from "@/lib/sms-blasts";

function firstFormValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

async function saveSmsBlast(formData: FormData, status: SmsBlastStatus) {
  const title = firstFormValue(formData.get("title")) || "Detroit Metro Men SMS blast";
  const message = firstFormValue(formData.get("message"));

  if (message.length < 8) {
    redirect("/conversations?status=message-too-short");
  }

  let nextUrl = `/conversations?status=${status}`;

  try {
    await createSmsBlast({
      title,
      message,
      audience: "@detroitmetromen contacts",
      status
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Could not save blast.";
    nextUrl = `/conversations?status=save-failed&reason=${encodeURIComponent(reason)}`;
  }

  redirect(nextUrl);
}

export async function saveSmsBlastDraft(formData: FormData) {
  await saveSmsBlast(formData, "draft");
}

export async function queueSmsBlast(formData: FormData) {
  await saveSmsBlast(formData, "queued");
}
