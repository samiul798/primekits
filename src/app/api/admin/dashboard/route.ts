import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems, products, productVariants, expenses, customers } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-guard";
import { desc, gte, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;
  const url = new URL(req.url);
  const requestedDays = Number(url.searchParams.get("days") || 30);
  const days = Number.isInteger(requestedDays) && requestedDays > 0 && requestedDays <= 3650 ? requestedDays : 30;
  const since = new Date(Date.now() - days * 24 * 3600 * 1000);

  const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(2000);
  const inRange = allOrders.filter((o) => new Date(o.createdAt) >= since);

  const count = (s: string) => inRange.filter((o) => o.status === s).length;

  // Sales are recognized when delivery is completed, not when the customer
  // placed the order. This keeps today's profit correct for older orders.
  const delivered = allOrders.filter((o) => o.status === "delivered" && new Date(o.courierDeliveredAt || o.updatedAt || o.createdAt) >= since);
  const items = await db.select().from(orderItems).limit(5000);
  const itemsInRange = items.filter((i) =>
    delivered.some((d) => d.id === i.orderId)
  );
  // Product revenue intentionally excludes the delivery fee. Delivery is
  // reported separately, so merchandise profit remains easy to audit.
  // `unitPrice` already contains a variant's sale/discount price. An order
  // coupon is stored separately, so deduct it once here rather than counting
  // list-price revenue.
  const revenue = delivered.reduce((sum, order) => {
    const itemRevenue = itemsInRange.filter((item) => item.orderId === order.id).reduce((s, item) => s + Number(item.unitPrice) * item.quantity, 0);
    return sum + Math.max(0, itemRevenue - Number(order.discount || 0));
  }, 0);
  const cogs = itemsInRange.reduce((s, i) => s + Number(i.cogs || 0), 0);
  const deliveryCollected = delivered.reduce((s, o) => s + Number(o.deliveryCharge || 0), 0);
  const grossProfit = revenue - cogs;

  const allExp = await db.select().from(expenses).limit(1000);
  const expInRange = allExp.filter((e) => new Date(e.expenseDate) >= since);
  const totalExpenses = expInRange.reduce((s, e) => s + Number(e.amount || 0), 0);

  const allVariants = await db.select().from(productVariants).limit(5000);
  const lowStock = allVariants.filter((v) => (v.stockQty ?? 0) - (v.reservedQty ?? 0) <= (v.lowStockThreshold ?? 5));
  const outOfStock = allVariants.filter((v) => (v.stockQty ?? 0) - (v.reservedQty ?? 0) <= 0);

  const totalCustomers = await db.select({ c: sql<number>`count(*)` }).from(customers);

  // daily sales
  const daily = new Map<string, { date: string; revenue: number; orders: number }>();
  for (const o of delivered) {
    const d = new Date(o.courierDeliveredAt || o.updatedAt || o.createdAt).toISOString().slice(0, 10);
    if (!daily.has(d)) daily.set(d, { date: d, revenue: 0, orders: 0 });
    const r = daily.get(d)!;
    const orderItemsForDay = itemsInRange.filter((item) => item.orderId === o.id);
    r.revenue += Math.max(0, orderItemsForDay.reduce((s, item) => s + Number(item.unitPrice) * item.quantity, 0) - Number(o.discount || 0));
    r.orders += 1;
  }
  const dailyArr = [...daily.values()].sort((a, b) => a.date.localeCompare(b.date)).slice(-30);

  // status breakdown
  const byStatus = new Map<string, number>();
  for (const o of inRange) byStatus.set(o.status, (byStatus.get(o.status) ?? 0) + 1);

  const prodCount = await db.select({ c: sql<number>`count(*)` }).from(products);
  const recentOrders = allOrders.slice(0, 10).map((o) => ({
    ...o,
    grandTotal: Number(o.grandTotal),
  }));

  return NextResponse.json({
    kpis: {
      totalOrders: inRange.length,
      totalRevenue: revenue,
      deliveredRevenue: revenue,
      grossProfit,
      deliveryCollected,
      averageOrderValue: delivered.length ? revenue / delivered.length : 0,
      activeOrders: inRange.filter((o) => !["delivered", "cancelled", "rejected", "returned", "expired"].includes(o.status)).length,
      netProfit: grossProfit - totalExpenses,
      totalExpenses,
      pendingWhatsapp: count("pending_whatsapp"),
      confirmed: count("confirmed"),
      deliveredCount: count("delivered"),
      cancelled: count("cancelled"),
      returned: count("returned"),
      rejected: count("rejected"),
      lowStockCount: lowStock.length,
      outOfStockCount: outOfStock.length,
      totalProducts: Number(prodCount[0]?.c || 0),
      totalCustomers: Number(totalCustomers[0]?.c || 0),
    },
    daily: dailyArr,
    byStatus: [...byStatus.entries()].map(([status, count]) => ({ status, count })),
    recentOrders,
    lowStock: lowStock.slice(0, 10).map((v) => ({
      id: v.id,
      sku: v.sku,
      label: v.label,
      stock: v.stockQty,
      reserved: v.reservedQty,
      available: (v.stockQty ?? 0) - (v.reservedQty ?? 0),
    })),
  });
}
