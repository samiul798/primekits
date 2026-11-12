import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { createBkashPayment, isPaymentEnabled } from "@/lib/payments";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    if (!isPaymentEnabled("bkash")) return NextResponse.json({ error: "bKash is not configured yet." }, { status: 503 });
    const { orderId } = await req.json();
    if (typeof orderId !== "string") return NextResponse.json({ error: "Invalid order." }, { status: 400 });
    const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order || order.paymentMethod !== "bkash") return NextResponse.json({ error: "bKash order not found." }, { status: 404 });
    if (order.paymentStatus === "paid") return NextResponse.json({ error: "This order is already paid." }, { status: 409 });
    const payment = await createBkashPayment(order);
    await db.update(orders).set({ paymentReference: payment.paymentId, updatedAt: new Date() }).where(eq(orders.id, order.id));
    return NextResponse.json({ redirectUrl: payment.redirectUrl });
  } catch (error) {
    console.error("bKash start failed", error);
    return NextResponse.json({ error: "Could not start bKash payment. Please try again." }, { status: 502 });
  }
}
