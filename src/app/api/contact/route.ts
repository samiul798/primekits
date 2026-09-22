import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contactMessages } from "@/db/schema";
import { z } from "zod";
import { getSettings } from "@/lib/settings";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

const schema = z.object({
  name: z.string().min(2).max(120),
  mobile: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  subject: z.string().max(200).optional().nullable(),
  message: z.string().min(5).max(2000),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const p = schema.safeParse(body);
  if (!p.success) return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  await db.insert(contactMessages).values({
    name: p.data.name,
    mobile: p.data.mobile || null,
    email: p.data.email || null,
    subject: p.data.subject || null,
    message: p.data.message,
  });
  const settings = await getSettings();
  const message = [
    `Hello ${settings.businessName},`,
    "",
    `Name: ${p.data.name}`,
    p.data.mobile ? `Mobile: ${p.data.mobile}` : "",
    p.data.email ? `Email: ${p.data.email}` : "",
    p.data.subject ? `Subject: ${p.data.subject}` : "",
    `Message: ${p.data.message}`,
  ].filter(Boolean).join("\n");
  const whatsappUrl = buildWhatsAppUrl(settings.whatsapp, message) || buildWhatsAppUrl(settings.phone, message);
  return NextResponse.json({ ok: true, whatsappUrl });
}
