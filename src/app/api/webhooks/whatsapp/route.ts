import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { orders, orderStatusHistory } from "@/db/schema";
import { isConfirmationReply, normalizeWhatsAppPhone } from "@/lib/whatsapp-cloud";

export const runtime = "nodejs";

function hasValidSignature(body: string, signature: string | null) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret || !signature?.startsWith("sha256=")) return false;
  const expected = `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
  const supplied = signature;
  return expected.length === supplied.length && timingSafeEqual(Buffer.from(expected), Buffer.from(supplied));
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  if (
    params.get("hub.mode") === "subscribe" &&
    params.get("hub.verify_token") === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN
  ) {
    return new NextResponse(params.get("hub.challenge") || "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  if (!hasValidSignature(rawBody, req.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody) as {
      entry?: { changes?: { value?: { messages?: { from?: string; text?: { body?: string } }[] } }[] }[];
    };
    const messages = payload.entry?.flatMap((entry) => entry.changes?.flatMap((change) => change.value?.messages || []) || []) || [];

    for (const message of messages) {
      const from = message.from ? normalizeWhatsAppPhone(message.from) : "";
      const text = message.text?.body || "";
      if (!from || !text) continue;

      const candidates = await db.select().from(orders)
        .where(inArray(orders.status, ["pending_whatsapp", "whatsapp_contacted"]))
        .orderBy(desc(orders.createdAt))
        .limit(100);
      const order = candidates.find((candidate) => normalizeWhatsAppPhone(candidate.whatsapp || candidate.mobile) === from);
      if (!order) continue;

      if (isConfirmationReply(text)) {
        const updated = await db.update(orders)
          .set({ status: "confirmed", whatsappStatus: "verified", updatedAt: new Date() })
          .where(and(eq(orders.id, order.id), inArray(orders.status, ["pending_whatsapp", "whatsapp_contacted"])))
          .returning({ id: orders.id });
        if (updated.length) {
          await db.insert(orderStatusHistory).values({
            orderId: order.id,
            prevStatus: order.status,
            newStatus: "confirmed",
            changedBy: "whatsapp_webhook",
            reason: "Customer confirmed through WhatsApp",
            note: text.slice(0, 1000),
          });
        }
      } else {
        await db.update(orders)
          .set({ whatsappStatus: "contacted", updatedAt: new Date() })
          .where(eq(orders.id, order.id));
      }
    }
  } catch (error) {
    console.error("WhatsApp webhook processing failed", error);
    // Acknowledge the verified webhook event to avoid repeated delivery storms.
  }

  return NextResponse.json({ ok: true });
}
