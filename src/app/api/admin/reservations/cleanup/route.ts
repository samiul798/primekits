import { NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems, orderStatusHistory, productVariants, inventoryTransactions } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-guard";
import { eq, and, lt } from "drizzle-orm";

export async function POST(req: Request) {
  // A scheduler may call this endpoint without a browser session. Requiring a
  // separate secret keeps it private while allowing reservation expiry to be
  // genuinely automatic (configure a cron job to POST this URL periodically).
  const cronSecret = process.env.RESERVATION_CLEANUP_SECRET;
  const isScheduler = !!cronSecret && req.headers.get("x-reservation-cleanup-secret") === cronSecret;
  const { admin, response } = await requireAdmin();
  if (!isScheduler && response) return response;
  const now = new Date();
  const expired = await db
    .select()
    .from(orders)
    .where(and(eq(orders.status, "pending_whatsapp"), lt(orders.reservedUntil, now)))
    .limit(100);

  let released = 0;
  for (const o of expired) {
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, o.id));
    for (const it of items) {
      if (!it.variantId) continue;
      const vr = await db.select().from(productVariants).where(eq(productVariants.id, it.variantId)).limit(1);
      const v = vr[0];
      if (v) {
        const rel = Math.min(v.reservedQty ?? 0, it.quantity);
        await db.update(productVariants).set({ reservedQty: (v.reservedQty ?? 0) - rel }).where(eq(productVariants.id, v.id));
        await db.insert(inventoryTransactions).values({
          productId: v.productId,
          variantId: v.id,
          type: "reservation_release",
          quantity: -rel,
          prevStock: v.stockQty ?? 0,
          newStock: v.stockQty ?? 0,
          referenceType: "order",
          referenceId: o.orderNumber,
          reason: `Reservation expired for ${o.orderNumber}`,
          createdBy: admin?.email || "system",
        });
      }
    }
    await db.update(orders).set({ status: "expired", updatedAt: new Date() }).where(eq(orders.id, o.id));
    await db.insert(orderStatusHistory).values({
      orderId: o.id,
      prevStatus: "pending_whatsapp",
      newStatus: "expired",
      changedBy: "system",
      reason: "Reservation expired",
      note: "Auto-released by cleanup job",
    });
    released++;
  }
  return NextResponse.json({ ok: true, released });
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
