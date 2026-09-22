import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems, orderStatusHistory } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-guard";
import { eq } from "drizzle-orm";

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { response } = await requireAdmin();
  if (response) return response;
  const { id } = await ctx.params;
  const found = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  const o = found[0];
  if (!o) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
  const history = await db.select().from(orderStatusHistory).where(eq(orderStatusHistory.orderId, id));
  return NextResponse.json({
    order: { ...o, grandTotal: Number(o.grandTotal), subtotal: Number(o.subtotal), deliveryCharge: Number(o.deliveryCharge), discount: Number(o.discount) },
    items,
    history,
  });
}
