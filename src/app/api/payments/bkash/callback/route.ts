import { NextRequest, NextResponse } from "next/server";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { orders, orderStatusHistory } from "@/db/schema";
import { appUrl, executeBkashPayment } from "@/lib/payments";

export const runtime = "nodejs";

function resultUrl(order: string, state: "success" | "failed") {
  return new URL(`/order-success?order=${encodeURIComponent(order)}&payment=${state}`, appUrl());
}

export async function GET(req: NextRequest) {
  const paymentId = req.nextUrl.searchParams.get("paymentID");
  const status = req.nextUrl.searchParams.get("status");
  if (!paymentId || status !== "success") {
    const [order] = paymentId ? await db.select({ orderNumber: orders.orderNumber }).from(orders).where(eq(orders.paymentReference, paymentId)).limit(1) : [];
    return NextResponse.redirect(resultUrl(order?.orderNumber || req.nextUrl.searchParams.get("merchantInvoiceNumber") || "", "failed"));
  }
  try {
    const completed = await executeBkashPayment(paymentId);
    const [order] = await db.select().from(orders).where(eq(orders.orderNumber, completed.invoice)).limit(1);
    if (!order) throw new Error("Order not found for bKash callback");
    if (order.paymentStatus !== "paid") {
      const total = Number(order.grandTotal || 0);
      const updated = await db.update(orders).set({
        paymentStatus: "paid",
        paymentProvider: "bkash",
        paymentReference: completed.transactionId,
        paymentTransactionId: completed.transactionId,
        paymentPaidAmount: total.toFixed(2),
        paymentDueAmount: "0.00",
        codAmount: "0.00",
        paymentTimestamp: new Date(),
        updatedAt: new Date(),
      }).where(and(eq(orders.id, order.id), ne(orders.paymentStatus, "paid"))).returning({ id: orders.id });
      if (updated.length) {
        await db.insert(orderStatusHistory).values({ orderId: order.id, prevStatus: order.status, newStatus: order.status, changedBy: "bkash_callback", reason: "bKash payment completed", note: `Transaction ID: ${completed.transactionId}` });
      }
    }
    return NextResponse.redirect(resultUrl(order.orderNumber, "success"));
  } catch (error) {
    console.error("bKash callback failed", error);
    const [order] = await db.select({ orderNumber: orders.orderNumber }).from(orders).where(eq(orders.paymentReference, paymentId)).limit(1).catch(() => []);
    return NextResponse.redirect(resultUrl(order?.orderNumber || "", "failed"));
  }
}
