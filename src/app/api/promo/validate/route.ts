import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { coupons, customers } from "@/db/schema";
import { normalizeBDPhone } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim().toUpperCase() : "";
  const subtotal = Number(body?.subtotal || 0);
  if (!code || !Number.isFinite(subtotal) || subtotal <= 0 || !body?.mobile) return NextResponse.json({ error: "Enter your mobile number and a valid promo code." }, { status: 400 });
  const customer = (await db.select({ id: customers.id }).from(customers).where(eq(customers.mobile, normalizeBDPhone(body.mobile))).limit(1))[0];
  const reward = (await db.select().from(coupons).where(and(eq(coupons.code, code), eq(coupons.kind, "returning_customer"))).limit(1))[0];
  const invalid = !customer || !reward || reward.customerId !== customer.id || !reward.isActive || !!reward.redeemedOrderId || (reward.expiresAt && reward.expiresAt <= new Date()) || (reward.usageLimit && reward.usedCount >= reward.usageLimit) || subtotal < Number(reward.minOrder);
  if (invalid) return NextResponse.json({ error: "This promo code is unavailable for this order." }, { status: 400 });
  const raw = reward.type === "percent" ? subtotal * Number(reward.value) / 100 : Number(reward.value);
  const discount = Math.min(subtotal, reward.maxDiscount ? Math.min(raw, Number(reward.maxDiscount)) : raw);
  return NextResponse.json({ code, discount, type: reward.type });
}
