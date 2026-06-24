"use server";

import { redirect } from "next/navigation";
import { createSmsBlast, deleteSmsBlast, sendExistingSmsBlast, type SmsBlastStatus } from "@/lib/sms-blasts";

function firstFormValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function getTimeZoneOffsetMs(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const asUtc = Date.UTC(
    Number(values.year),
    Number(values.month) - 1,
    Number(values.day),
    Number(values.hour),
    Number(values.minute),
    Number(values.second)
  );

  return asUtc - date.getTime();
}

function parseDetroitDateTimeLocal(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return null;

  const [, year, month, day, hour, minute] = match;
  const localAsUtc = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), 0);
  let utc = new Date(localAsUtc);

  for (let index = 0; index < 2; index += 1) {
    utc = new Date(localAsUtc - getTimeZoneOffsetMs(utc, "America/Detroit"));
  }

  return utc;
}

async function saveSmsBlast(formData: FormData, status: SmsBlastStatus) {
  const title = firstFormValue(formData.get("title")) || "Detroit Metro Men SMS blast";
  const message = firstFormValue(formData.get("message"));

  if (message.length < 8) {
    redirect("/conversations?status=message-too-short");
  }

  let nextUrl = `/conversations?status=${status}`;

  try {
    const blast = await createSmsBlast({
      title,
      message,
      audience: "@detroitmetromen contacts",
      status
    });
    if (status === "queued") {
      nextUrl =
        blast.status === "sent"
          ? "/conversations?status=sent"
          : `/conversations?status=send-failed&reason=${encodeURIComponent(blast.errorMessage ?? "No messages were sent.")}`;
    }
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

export async function scheduleSmsBlast(formData: FormData) {
  const title = firstFormValue(formData.get("title")) || "Detroit Metro Men SMS blast";
  const message = firstFormValue(formData.get("message"));
  const scheduledAtValue = firstFormValue(formData.get("scheduledAt"));
  const scheduledAt = parseDetroitDateTimeLocal(scheduledAtValue);

  if (message.length < 8) {
    redirect("/conversations?status=message-too-short");
  }

  if (!scheduledAt || scheduledAt.getTime() <= Date.now()) {
    redirect("/conversations?status=schedule-failed&reason=Choose%20a%20future%20Detroit%20time");
  }

  let nextUrl = "/conversations?status=scheduled";

  try {
    await createSmsBlast({
      title,
      message,
      audience: "@detroitmetromen contacts",
      status: "queued",
      scheduledAt: scheduledAt.toISOString()
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Could not schedule blast.";
    nextUrl = `/conversations?status=schedule-failed&reason=${encodeURIComponent(reason)}`;
  }

  redirect(nextUrl);
}

export async function sendSavedSmsBlast(formData: FormData) {
  const blastId = firstFormValue(formData.get("blastId"));
  if (!blastId) {
    redirect("/conversations?status=send-failed&reason=Missing%20blast%20id");
  }

  let nextUrl = "/conversations?status=sent";

  try {
    const blast = await sendExistingSmsBlast(blastId);
    nextUrl =
      blast.status === "sent"
        ? "/conversations?status=sent-existing"
        : `/conversations?status=send-failed&reason=${encodeURIComponent(blast.errorMessage ?? "No messages were sent.")}`;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Could not send blast.";
    nextUrl = `/conversations?status=send-failed&reason=${encodeURIComponent(reason)}`;
  }

  redirect(nextUrl);
}

export async function deleteSavedSmsBlast(formData: FormData) {
  const blastId = firstFormValue(formData.get("blastId"));
  if (!blastId) {
    redirect("/conversations?status=delete-failed&reason=Missing%20blast%20id");
  }

  let nextUrl = "/conversations?status=deleted";

  try {
    await deleteSmsBlast(blastId);
  } catch (error) {
    const reason = error instanceof Error ? error.message : "Could not delete blast.";
    nextUrl = `/conversations?status=delete-failed&reason=${encodeURIComponent(reason)}`;
  }

  redirect(nextUrl);
}
