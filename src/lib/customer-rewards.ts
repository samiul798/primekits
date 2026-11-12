import { randomBytes } from "crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { coupons, orders } from "@/db/schema";

/** Creates one inactive, customer-bound reward after a first delivered order. */
export async function createDeliveredOrderReward(orderId: string) {
  const order = (await db.select().from(orders).where(eq(orders.id, orderId)).limit(1))[0];
  if (!order?.customerId || order.status !== "delivered") return null;

  // A customer only earns the first-delivery reward once. The qualifying-order
  // unique index also makes duplicated courier callbacks idempotent.
  const alreadyRewarded = await db.select({ id: coupons.id })
    .from(coupons)
    .where(and(eq(coupons.customerId, order.customerId), eq(coupons.kind, "returning_customer")))
    .limit(1);
  if (alreadyRewarded[0]) return null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = `PRIME-${randomBytes(5).toString("hex").toUpperCase()}`;
    try {
      const created = await db.insert(coupons).values({
        code,
        customerId: order.customerId,
        qualifyingOrderId: order.id,
        kind: "returning_customer",
        type: "fixed",
        value: "0",
        minOrder: "0",
        usageLimit: 1,
        isActive: false,
      }).returning();
      return created[0] ?? null;
    } catch (error) {
      // Unique collisions are exceptionally unlikely. A duplicate delivery event
      // is safe to ignore because the database uniqueness constraint wins.
      if (attempt === 4) console.error("Could not create customer reward", error);
    }
  }
  return null;
}
