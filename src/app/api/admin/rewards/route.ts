import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { coupons, customers, orders } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-guard";
import { createDeliveredOrderReward } from "@/lib/customer-rewards";
import { z } from "zod";

const updateSchema = z.object({
  id: z.string().uuid(), type: z.enum(["fixed", "percent"]).optional(),
  value: z.number().min(0).max(100000).optional(), minOrder: z.number().min(0).max(100000).optional(),
  maxDiscount: z.number().min(0).max(100000).nullable().optional(), expiresAt: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;
  const rewards = await db.select().from(coupons).where(eq(coupons.kind, "returning_customer")).orderBy(desc(coupons.createdAt)).limit(500);
  const data = await Promise.all(rewards.map(async (reward) => {
    const customer = reward.customerId ? (await db.select({ name: customers.name, mobile: customers.mobile }).from(customers).where(eq(customers.id, reward.customerId)).limit(1))[0] : null;
    const qualifying = reward.qualifyingOrderId ? (await db.select({ orderNumber: orders.orderNumber }).from(orders).where(eq(orders.id, reward.qualifyingOrderId)).limit(1))[0] : null;
    const redeemed = reward.redeemedOrderId ? (await db.select({ orderNumber: orders.orderNumber }).from(orders).where(eq(orders.id, reward.redeemedOrderId)).limit(1))[0] : null;
    return { ...reward, customer, qualifyingOrder: qualifying?.orderNumber || null, redeemedOrder: redeemed?.orderNumber || null };
  }));
  return NextResponse.json({ rewards: data });
}

export async function PUT(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;
  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid reward update" }, { status: 400 });
  const { id, value, minOrder, maxDiscount, expiresAt, ...rest } = parsed.data;
  if (rest.type === "percent" && value != null && value > 100) return NextResponse.json({ error: "Percentage cannot exceed 100" }, { status: 400 });
  const patch: Record<string, unknown> = { ...rest };
  if (value != null) patch.value = String(value);
  if (minOrder != null) patch.minOrder = String(minOrder);
  if (maxDiscount !== undefined) patch.maxDiscount = maxDiscount == null ? null : String(maxDiscount);
  if (expiresAt !== undefined) patch.expiresAt = expiresAt ? new Date(expiresAt) : null;
  await db.update(coupons).set(patch as never).where(and(eq(coupons.id, id), eq(coupons.kind, "returning_customer")));
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;
  const { orderId } = await req.json().catch(() => ({}));
  if (!orderId) return NextResponse.json({ error: "A delivered qualifying order is required" }, { status: 400 });
  const order = (await db.select().from(orders).where(eq(orders.id, orderId)).limit(1))[0];
  if (!order || order.status !== "delivered") return NextResponse.json({ error: "Rewards can only be generated for delivered orders" }, { status: 400 });
  const reward = await createDeliveredOrderReward(orderId);
  if (!reward) return NextResponse.json({ error: "This customer already has a returning-customer reward" }, { status: 409 });
  return NextResponse.json({ reward }, { status: 201 });
}
