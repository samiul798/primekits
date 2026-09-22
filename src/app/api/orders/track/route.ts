import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems, orderStatusHistory } from "@/db/schema";
import { eq, or } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  if (!q) return NextResponse.json({ error: "Enter order number or mobile number" }, { status: 400 });

  const rows = await db
    .select()
    .from(orders)
    .where(or(eq(orders.orderNumber, q.toUpperCase()), eq(orders.mobile, q)))
    .limit(10);

  if (rows.length === 0) return NextResponse.json({ orders: [] });

  const out = [];
  for (const o of rows) {
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, o.id));
    const history = await db.select().from(orderStatusHistory).where(eq(orderStatusHistory.orderId, o.id));
    out.push({
      ...o,
      subtotal: Number(o.subtotal),
      deliveryCharge: Number(o.deliveryCharge),
      discount: Number(o.discount),
      grandTotal: Number(o.grandTotal),
      items: items.map((i) => ({ ...i, unitPrice: Number(i.unitPrice) })),
      history,
    });
  }
  return NextResponse.json({ orders: out });
}
