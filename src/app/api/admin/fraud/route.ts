import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems, customers } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-guard";
import { eq } from "drizzle-orm";
import { calcRisk, courierWiseReport, type FraudOrder } from "@/lib/fraud";
import { getSettings } from "@/lib/settings";

export async function GET(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;
  const url = new URL(req.url);
  const mobile = (url.searchParams.get("mobile") || "").trim();
  const name = (url.searchParams.get("name") || "").trim().toLowerCase();
  const orderNo = (url.searchParams.get("orderNo") || "").trim().toUpperCase();
  const tracking = (url.searchParams.get("tracking") || "").trim();
  const courier = url.searchParams.get("courier") || "";
  const status = url.searchParams.get("status") || "";
  const cStatus = url.searchParams.get("courierStatus") || "";
  const payment = url.searchParams.get("payment") || "";
  const only = url.searchParams.get("only") || "";
  const from = url.searchParams.get("from") || "";
  const to = url.searchParams.get("to") || "";
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const limit = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") || 50)));

  if (!mobile && !name && !orderNo && !tracking) {
    return NextResponse.json({ searched: false, message: "Enter a mobile number to run fraud check" });
  }

  let rows = await db.select().from(orders).limit(5000);
  if (mobile) rows = rows.filter((o) => o.mobile.includes(mobile.replace(/[^0-9]/g, "").slice(-11)) || o.mobile === mobile);
  if (name) rows = rows.filter((o) => o.customerName.toLowerCase().includes(name));
  if (orderNo) rows = rows.filter((o) => o.orderNumber.toUpperCase().includes(orderNo));
  if (tracking) rows = rows.filter((o) => (o.trackingId || "").includes(tracking));
  if (courier) rows = rows.filter((o) => o.courierName === courier || o.courierId === courier);
  if (status) rows = rows.filter((o) => o.status === status);
  if (cStatus) rows = rows.filter((o) => o.courierStatus === cStatus);
  if (payment) rows = rows.filter((o) => o.paymentStatus === payment);
  if (only === "delivered") rows = rows.filter((o) => o.status === "delivered");
  if (only === "rejected") rows = rows.filter((o) => o.status === "rejected");
  if (only === "returned") rows = rows.filter((o) => o.status === "returned");
  if (only === "cancelled") rows = rows.filter((o) => o.status === "cancelled" || o.status === "expired");
  if (from) rows = rows.filter((o) => new Date(o.createdAt) >= new Date(from));
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    rows = rows.filter((o) => new Date(o.createdAt) <= end);
  }

  // dedupe by orderNumber
  const seen = new Set<string>();
  rows = rows.filter((o) => (seen.has(o.orderNumber) ? false : (seen.add(o.orderNumber), true)));
  rows.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const settings = await getSettings();
  const thresholds = {
    low: Number(settings.riskSuccessLow || 80),
    medium: Number(settings.riskSuccessMedium || 50),
    rejectHigh: Number(settings.riskRejectHigh || 40),
  };

  const allItems = await db.select().from(orderItems).limit(10000);
  const itemsByOrder = new Map<string, typeof allItems>();
  for (const it of allItems) {
    if (!itemsByOrder.has(it.orderId)) itemsByOrder.set(it.orderId, []);
    itemsByOrder.get(it.orderId)!.push(it);
  }

  const fraudOrders: FraudOrder[] = rows.map((o) => {
    const its = itemsByOrder.get(o.id) ?? [];
    return {
      id: o.id,
      orderNumber: o.orderNumber,
      createdAt: new Date(o.createdAt).toISOString(),
      customerName: o.customerName,
      mobile: o.mobile,
      courierName: o.courierName,
      trackingId: o.trackingId,
      itemsText: its.map((i) => `${i.productName}${i.variationLabel ? ` (${i.variationLabel})` : ""} x${i.quantity}`).join("; "),
      quantity: its.reduce((s, i) => s + (i.quantity || 0), 0),
      grandTotal: Number(o.grandTotal || 0),
      paymentStatus: o.paymentStatus,
      status: o.status,
      courierStatus: o.courierStatus,
      rejectReason: o.rejectReason,
      returnReason: o.returnReason,
      adminNotes: o.adminNotes,
    };
  });

  const summary = calcRisk(fraudOrders, thresholds);
  const courierRows = courierWiseReport(fraudOrders);

  const first = rows[rows.length - 1];
  const last = rows[0];
  const custRows = mobile ? await db.select().from(customers).where(eq(customers.mobile, mobile)).limit(1) : [];
  const customer = custRows[0] || (rows[0] ? {
    name: rows[0].customerName,
    mobile: rows[0].mobile,
    whatsapp: rows[0].whatsapp,
    address: rows[0].address,
    riskOverride: null,
    riskNote: null,
  } : null);

  const effectiveRisk = (customer as { riskOverride?: string | null })?.riskOverride || summary.riskLevel;

  const total = fraudOrders.length;
  const paged = fraudOrders.slice((page - 1) * limit, page * limit);

  return NextResponse.json({
    searched: true,
    customer: customer
      ? {
          ...(customer as object),
          totalOrders: summary.total,
          delivered: summary.delivered,
          rejected: summary.rejected,
          returned: summary.returned,
          cancelled: summary.cancelled,
          pending: summary.pending,
          confirmed: summary.confirmed,
          totalValue: summary.totalValue,
          deliveredValue: summary.deliveredValue,
          rejectedValue: summary.rejectedValue,
          returnedValue: summary.returnedValue,
          successRate: summary.successRate,
          rejectionRate: summary.rejectionRate,
          returnRate: summary.returnRate,
          riskLevel: effectiveRisk,
          calculatedRisk: summary.riskLevel,
          reasons: summary.reasons,
          firstOrderDate: first ? first.createdAt : null,
          lastOrderDate: last ? last.createdAt : null,
        }
      : null,
    summary,
    courierRows,
    orders: paged,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    thresholds,
  });
}
