import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems, expenses } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-guard";

export async function GET(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;
  const url = new URL(req.url);
  const from = url.searchParams.get("from") || "";
  const to = url.searchParams.get("to") || "";
  let ords = await db.select().from(orders).limit(5000);
  const recognitionDate = (o: typeof ords[number]) => new Date(o.courierDeliveredAt || o.updatedAt || o.createdAt);
  const items = await db.select().from(orderItems).limit(10000);
  let recognized = ords.filter((o) => ["delivered", "shipped", "confirmed", "processing", "ready_to_ship"].includes(o.status));
  let deliveredOnly = ords.filter((o) => o.status === "delivered");
  if (from) deliveredOnly = deliveredOnly.filter((o) => recognitionDate(o) >= new Date(from));
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    deliveredOnly = deliveredOnly.filter((o) => recognitionDate(o) <= end);
    recognized = recognized.filter((o) => recognitionDate(o) <= end);
  }
  if (from) recognized = recognized.filter((o) => recognitionDate(o) >= new Date(from));

  const byOrder = new Map<string, typeof items>();
  for (const i of items) {
    if (!byOrder.has(i.orderId)) byOrder.set(i.orderId, []);
    byOrder.get(i.orderId)!.push(i);
  }

  let revenue = 0, cogs = 0, deliveryCollected = 0;
  for (const o of deliveredOnly) {
    deliveryCollected += Number(o.deliveryCharge || 0);
    let itemRevenue = 0;
    for (const i of byOrder.get(o.id) ?? []) {
      itemRevenue += Number(i.unitPrice) * i.quantity;
      cogs += Number(i.cogs || 0);
    }
    revenue += Math.max(0, itemRevenue - Number(o.discount || 0));
  }
  let exps = await db.select().from(expenses).limit(2000);
  if (from) exps = exps.filter((e) => new Date(e.expenseDate) >= new Date(from));
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    exps = exps.filter((e) => new Date(e.expenseDate) <= end);
  }
  const totalExp = exps.reduce((s, e) => s + Number(e.amount || 0), 0);
  const gross = revenue - cogs;
  const net = gross - totalExp;

  const byCat = new Map<string, number>();
  for (const e of exps) byCat.set(e.category, (byCat.get(e.category) ?? 0) + Number(e.amount || 0));

  return NextResponse.json({
    revenue,
    cogs,
    deliveryCollected,
    grossProfit: gross,
    totalExpenses: totalExp,
    netProfit: net,
    deliveredOrders: deliveredOnly.length,
    recognizedOrders: recognized.length,
    expensesByCategory: [...byCat.entries()].map(([category, amount]) => ({ category, amount })),
    expenses: exps.slice(0, 100),
  });
}
