import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { orders, orderItems, orderStatusHistory, productVariants, inventoryTransactions, couriers, products, customers } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-guard";
import { orderStatusSchema } from "@/lib/validations";
import { eq, desc, sql, and } from "drizzle-orm";
import { z } from "zod";
import { generateOrderNumber, normalizeBDPhone } from "@/lib/utils";

const TERMINAL_RELEASE = new Set(["cancelled", "rejected", "expired", "returned"]);
const DELIVER_FINALIZE = new Set(["delivered"]);
// Courier progress is the source of truth once a parcel has been handed over.
// Operators should not have to update courier, order, payment and inventory as
// separate unrelated fields.
const COURIER_TO_ORDER_STATUS: Record<string, string | undefined> = {
  picked_up: "shipped",
  in_transit: "shipped",
  delivered: "delivered",
  returned: "returned",
  rejected: "rejected",
  cancelled: "cancelled",
};
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending_whatsapp: ["whatsapp_contacted", "confirmed", "cancelled", "rejected", "expired"],
  whatsapp_contacted: ["confirmed", "cancelled", "rejected", "expired"],
  confirmed: ["processing", "cancelled", "rejected"],
  processing: ["ready_to_ship", "cancelled"],
  ready_to_ship: ["shipped", "cancelled"],
  shipped: ["delivered", "returned", "rejected"],
  delivered: ["returned"],
  cancelled: [], rejected: [], expired: [], returned: [],
};

const manualOrderSchema = z.object({
  customerName: z.string().min(2).max(120),
  mobile: z.string().min(8).max(20),
  address: z.string().min(5).max(500),
  district: z.string().max(80).optional().nullable(),
  thana: z.string().max(80).optional().nullable(),
  paymentMethod: z.enum(["cod", "bkash", "nagad", "bank", "cash", "advance", "partial"]).default("cod"),
  paymentStatus: z.enum(["unpaid", "pending", "paid", "partial"]).default("unpaid"),
  deliveryCharge: z.number().min(0).max(100000).default(0),
  discount: z.number().min(0).max(100000).default(0),
  notes: z.string().max(1000).optional().nullable(),
  items: z.array(z.object({ variantId: z.string().min(1), quantity: z.number().int().min(1).max(100), unitPrice: z.number().min(0).max(100000).optional() })).min(1).max(30),
});

export async function GET(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const status = url.searchParams.get("status") || "";
  const payment = url.searchParams.get("payment") || "";
  const courier = url.searchParams.get("courier") || "";
  const from = url.searchParams.get("from") || "";
  const to = url.searchParams.get("to") || "";
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") || 25)));

  let rows = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(2000);
  if (q) {
    const ql = q.toLowerCase();
    rows = rows.filter(
      (o) =>
        o.orderNumber.toLowerCase().includes(ql) ||
        o.customerName.toLowerCase().includes(ql) ||
        o.mobile.includes(q) ||
        (o.trackingId || "").toLowerCase().includes(ql)
    );
  }
  if (status) rows = rows.filter((o) => o.status === status);
  if (payment) rows = rows.filter((o) => o.paymentStatus === payment);
  if (courier) rows = rows.filter((o) => o.courierId === courier || o.courierName === courier);
  if (from) rows = rows.filter((o) => new Date(o.createdAt) >= new Date(from));
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    rows = rows.filter((o) => new Date(o.createdAt) <= end);
  }
  const total = rows.length;
  const paged = rows.slice((page - 1) * limit, page * limit);
  const data = [];
  for (const o of paged) {
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, o.id));
    data.push({
      ...o,
      subtotal: Number(o.subtotal),
      deliveryCharge: Number(o.deliveryCharge),
      discount: Number(o.discount),
      grandTotal: Number(o.grandTotal),
      items: items.map((i) => ({ ...i, unitPrice: Number(i.unitPrice) })),
    });
  }
  return NextResponse.json({ orders: data, total, page, totalPages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const { admin, response } = await requireAdmin();
  if (response) return response;
  const parsed = manualOrderSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid manual order" }, { status: 400 });
  const data = parsed.data;
  const grouped = new Map<string, { variantId: string; quantity: number; unitPrice?: number }>();
  for (const item of data.items) {
    const old = grouped.get(item.variantId);
    grouped.set(item.variantId, { ...item, quantity: (old?.quantity || 0) + item.quantity });
  }
  const lines: { variant: typeof productVariants.$inferSelect; product: typeof products.$inferSelect; quantity: number; unitPrice: number }[] = [];
  for (const item of grouped.values()) {
    if (item.quantity > 100) return NextResponse.json({ error: "Maximum 100 pcs per SKU" }, { status: 400 });
    const variant = (await db.select().from(productVariants).where(eq(productVariants.id, item.variantId)).limit(1))[0];
    if (!variant || !variant.isActive) return NextResponse.json({ error: "Selected variant is unavailable" }, { status: 400 });
    const product = (await db.select().from(products).where(eq(products.id, variant.productId)).limit(1))[0];
    if (!product) return NextResponse.json({ error: "Product not found for selected variant" }, { status: 400 });
    if ((variant.stockQty ?? 0) - (variant.reservedQty ?? 0) < item.quantity) return NextResponse.json({ error: `Insufficient stock for ${variant.sku}` }, { status: 409 });
    const salePrice = item.unitPrice ?? (variant.discountPrice != null && Number(variant.discountPrice) > 0 ? Number(variant.discountPrice) : Number(variant.sellingPrice));
    lines.push({ variant, product, quantity: item.quantity, unitPrice: salePrice });
  }
  const mobile = normalizeBDPhone(data.mobile);
  let customerId: string | null = null;
  const oldCustomer = (await db.select().from(customers).where(eq(customers.mobile, mobile)).limit(1))[0];
  if (oldCustomer) {
    customerId = oldCustomer.id;
    await db.update(customers).set({ name: data.customerName, address: data.address, district: data.district || null, thana: data.thana || null }).where(eq(customers.id, oldCustomer.id));
  } else {
    customerId = (await db.insert(customers).values({ name: data.customerName, mobile, address: data.address, district: data.district || null, thana: data.thana || null }).returning({ id: customers.id }))[0]?.id || null;
  }
  const subtotal = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const grandTotal = Math.max(0, subtotal + data.deliveryCharge - data.discount);
  let orderNumber = generateOrderNumber();
  for (let i = 0; i < 5; i++) {
    if (!(await db.select({ id: orders.id }).from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1)).length) break;
    orderNumber = generateOrderNumber();
  }
  const inserted = await db.insert(orders).values({ orderNumber, customerId, customerName: data.customerName, mobile, address: data.address, district: data.district || null, thana: data.thana || null, notes: data.notes || null, paymentMethod: data.paymentMethod, paymentStatus: data.paymentStatus, subtotal: subtotal.toFixed(2), deliveryCharge: data.deliveryCharge.toFixed(2), discount: data.discount.toFixed(2), grandTotal: grandTotal.toFixed(2), status: "confirmed", whatsappStatus: "contacted", reservedUntil: new Date(Date.now() + 24 * 60 * 60 * 1000) }).returning();
  const order = inserted[0];
  const reservedLines: { variant: typeof productVariants.$inferSelect; quantity: number }[] = [];
  for (const line of lines) {
    const reserved = await db.update(productVariants).set({ reservedQty: sql`${productVariants.reservedQty} + ${line.quantity}` }).where(and(eq(productVariants.id, line.variant.id), sql`${productVariants.stockQty} - ${productVariants.reservedQty} >= ${line.quantity}`)).returning({ id: productVariants.id });
    if (!reserved.length) {
      for (const old of reservedLines) await db.update(productVariants).set({ reservedQty: sql`GREATEST(0, ${productVariants.reservedQty} - ${old.quantity})` }).where(eq(productVariants.id, old.variant.id));
      await db.delete(orderItems).where(eq(orderItems.orderId, order.id));
      await db.delete(orders).where(eq(orders.id, order.id));
      return NextResponse.json({ error: `Stock changed for ${line.variant.sku}; no order was created.` }, { status: 409 });
    }
    reservedLines.push({ variant: line.variant, quantity: line.quantity });
    const cogs = Number(line.variant.purchaseCost || 0) * line.quantity;
    await db.insert(orderItems).values({ orderId: order.id, productId: line.product.id, variantId: line.variant.id, productName: line.product.name, sku: line.variant.sku, variationLabel: line.variant.label, quantity: line.quantity, unitPrice: line.unitPrice.toFixed(2), discount: "0", purchaseCostBasis: String(line.variant.purchaseCost || 0), cogs: cogs.toFixed(2), grossProfit: (line.unitPrice * line.quantity - cogs).toFixed(2), image: line.variant.image || line.product.thumbnail });
    await db.update(products).set({ soldCount: sql`${products.soldCount} + ${line.quantity}` }).where(eq(products.id, line.product.id));
    await db.insert(inventoryTransactions).values({ productId: line.product.id, variantId: line.variant.id, type: "reservation", quantity: line.quantity, prevStock: line.variant.stockQty ?? 0, newStock: line.variant.stockQty ?? 0, referenceType: "order", referenceId: orderNumber, reason: `Manual order ${orderNumber}`, createdBy: admin?.email || "admin" });
  }
  await db.insert(orderStatusHistory).values({ orderId: order.id, prevStatus: null, newStatus: "confirmed", changedBy: admin?.email || "admin", reason: "Manual order created", note: "Stock reserved" });
  return NextResponse.json({ ok: true, orderNumber, orderId: order.id }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { admin, response } = await requireAdmin();
  if (response) return response;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing order id" }, { status: 400 });
  const order = (await db.select().from(orders).where(eq(orders.id, id)).limit(1))[0];
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
  // A delivered order has already reduced physical stock. It may be removed
  // from the admin list, but must never put its sold items back into stock.
  // Other order states still have reservations that need a safe release.
  if (order.status !== "delivered") {
    for (const item of items) {
      if (!item.variantId) continue;
      const variant = (await db.select().from(productVariants).where(eq(productVariants.id, item.variantId)).limit(1))[0];
      if (!variant) continue;
      const release = Math.min(variant.reservedQty ?? 0, item.quantity);
      await db.update(productVariants).set({ reservedQty: (variant.reservedQty ?? 0) - release }).where(eq(productVariants.id, variant.id));
      await db.update(products).set({ soldCount: sql`GREATEST(0, ${products.soldCount} - ${item.quantity})` }).where(eq(products.id, variant.productId));
      await db.insert(inventoryTransactions).values({ productId: variant.productId, variantId: variant.id, type: "order_deletion_release", quantity: -release, prevStock: variant.stockQty ?? 0, newStock: variant.stockQty ?? 0, referenceType: "order", referenceId: order.orderNumber, reason: `Deleted order ${order.orderNumber}`, createdBy: admin?.email || "admin" });
    }
  }
  await db.delete(orderStatusHistory).where(eq(orderStatusHistory.orderId, id));
  await db.delete(orderItems).where(eq(orderItems.orderId, id));
  await db.delete(orders).where(eq(orders.id, id));
  return NextResponse.json({ ok: true });
}

export async function PUT(req: NextRequest) {
  const { admin, response } = await requireAdmin();
  if (response) return response;
  const body = await req.json();
  const { id, ...rest } = body as { id: string } & Record<string, unknown>;
  if (!id) return NextResponse.json({ error: "Missing order id" }, { status: 400 });
  const p = orderStatusSchema.partial().safeParse(rest);
  if (!p.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  const d = p.data;

  const found = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  const order = found[0];
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (d.adminNotes !== undefined) patch.adminNotes = d.adminNotes;
  if (d.trackingId !== undefined) patch.trackingId = d.trackingId;
  if (d.consignmentId !== undefined) patch.consignmentId = d.consignmentId;
  if (d.courierStatus) patch.courierStatus = d.courierStatus;
  if (d.courierCharge != null) patch.courierCharge = String(d.courierCharge);
  if (d.paymentStatus) patch.paymentStatus = d.paymentStatus;
  if (d.courierId) {
    const c = await db.select().from(couriers).where(eq(couriers.id, d.courierId)).limit(1);
    if (!c[0] || !c[0].isActive) return NextResponse.json({ error: "Select an active courier." }, { status: 400 });
    patch.courierId = d.courierId;
    patch.courierName = c[0].name;
    patch.courierAssignedAt = new Date();
  }
  if (rest.courierName) patch.courierName = rest.courierName;

  // A courier update drives the connected order workflow automatically. The
  // direct status field remains available only for exceptional/manual orders.
  const courierMappedStatus = d.courierStatus ? COURIER_TO_ORDER_STATUS[d.courierStatus] : undefined;
  const requestedStatus = courierMappedStatus || d.status;
  if (d.courierStatus === "delivered") {
    if (TERMINAL_RELEASE.has(order.status)) {
      return NextResponse.json({ error: `A ${order.status} order cannot be marked delivered by courier.` }, { status: 400 });
    }
    if (order.paymentMethod === "cod") patch.paymentStatus = "paid";
    patch.courierDeliveredAt = new Date();
  }

  // status transition with inventory handling
  if (requestedStatus && requestedStatus !== order.status) {
    const prev = order.status;
    const next = requestedStatus as string;
    const courierDriven = courierMappedStatus === next;
    if (!courierDriven && !(ALLOWED_TRANSITIONS[prev] || []).includes(next)) {
      return NextResponse.json({ error: `Cannot change an order from ${prev} to ${next}.` }, { status: 400 });
    }
    patch.status = next;
    if (d.reason) {
      if (next === "returned") patch.returnReason = d.reason;
      if (next === "rejected") patch.rejectReason = d.reason;
    }

    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));

    // release reservation on terminal cancel-type
    if (TERMINAL_RELEASE.has(next) && !TERMINAL_RELEASE.has(prev)) {
      for (const it of items) {
        if (!it.variantId) continue;
        const vr = await db.select().from(productVariants).where(eq(productVariants.id, it.variantId)).limit(1);
        const v = vr[0];
        if (v) {
          const rel = Math.min(v.reservedQty ?? 0, it.quantity);
          await db.update(productVariants).set({ reservedQty: (v.reservedQty ?? 0) - rel }).where(eq(productVariants.id, v.id));
          await db.update(products).set({ soldCount: sql`GREATEST(0, ${products.soldCount} - ${it.quantity})` }).where(eq(products.id, v.productId));
          await db.insert(inventoryTransactions).values({
            productId: v.productId,
            variantId: v.id,
            type: "reservation_release",
            quantity: -rel,
            prevStock: v.stockQty ?? 0,
            newStock: v.stockQty ?? 0,
            referenceType: "order",
            referenceId: order.orderNumber,
            reason: `Released on ${next} for ${order.orderNumber}`,
            createdBy: admin?.email || "admin",
          });
        }
      }
    }

    // finalize sale on delivered: deduct physical stock, clear reservation
    if (DELIVER_FINALIZE.has(next) && !DELIVER_FINALIZE.has(prev)) {
      for (const it of items) {
        if (!it.variantId) continue;
        const vr = await db.select().from(productVariants).where(eq(productVariants.id, it.variantId)).limit(1);
        const v = vr[0];
        if (v) {
          const prevStock = v.stockQty ?? 0;
          const rel = Math.min(v.reservedQty ?? 0, it.quantity);
          const newStock = Math.max(0, prevStock - it.quantity);
          await db
            .update(productVariants)
            .set({ stockQty: newStock, reservedQty: (v.reservedQty ?? 0) - rel })
            .where(eq(productVariants.id, v.id));
          await db.insert(inventoryTransactions).values({
            productId: v.productId,
            variantId: v.id,
            type: "sale",
            quantity: -it.quantity,
            prevStock,
            newStock,
            referenceType: "order",
            referenceId: order.orderNumber,
            reason: `Delivered ${order.orderNumber}`,
            createdBy: admin?.email || "admin",
          });
        }
      }
      patch.courierDeliveredAt = new Date();
    }

    // returned: add back 1 unit assumption? process as stock return
    if (next === "returned" && prev !== "returned") {
      for (const it of items) {
        if (!it.variantId) continue;
        const vr = await db.select().from(productVariants).where(eq(productVariants.id, it.variantId)).limit(1);
        const v = vr[0];
        if (v) {
          const prevStock = v.stockQty ?? 0;
          // if it was delivered before, stock was deducted; add back
          const wasDelivered = prev === "delivered";
          const newStock = wasDelivered ? prevStock + it.quantity : prevStock;
          await db
            .update(productVariants)
            .set({ stockQty: newStock, returnedQty: (v.returnedQty ?? 0) + it.quantity })
            .where(eq(productVariants.id, v.id));
          await db.insert(inventoryTransactions).values({
            productId: v.productId,
            variantId: v.id,
            type: "return",
            quantity: wasDelivered ? it.quantity : 0,
            prevStock,
            newStock,
            referenceType: "order",
            referenceId: order.orderNumber,
            reason: `Return processed for ${order.orderNumber}`,
            createdBy: admin?.email || "admin",
          });
        }
      }
      patch.courierReturnedAt = new Date();
    }

    await db.insert(orderStatusHistory).values({
      orderId: id,
      prevStatus: prev,
      newStatus: next,
      changedBy: admin?.email || "admin",
      reason: (d.reason as string) || null,
      note: (d.note as string) || null,
    });
  } else if (d.note || d.reason) {
    await db.insert(orderStatusHistory).values({
      orderId: id,
      prevStatus: order.status,
      newStatus: order.status,
      changedBy: admin?.email || "admin",
      reason: (d.reason as string) || null,
      note: (d.note as string) || (d.adminNotes as string) || null,
    });
  }

  // whatsapp status manual update
  if ((rest as Record<string, unknown>).whatsappStatus) {
    patch.whatsappStatus = (rest as Record<string, unknown>).whatsappStatus as string;
  }

  await db.update(orders).set(patch as never).where(eq(orders.id, id));
  return NextResponse.json({ ok: true });
}
