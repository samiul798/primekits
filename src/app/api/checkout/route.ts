import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  products,
  productVariants,
  orders,
  orderItems,
  orderStatusHistory,
  customers,
  coupons,
  inventoryTransactions,
} from "@/db/schema";
import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { checkoutSchema } from "@/lib/validations";
import { generateOrderNumber, normalizeBDPhone } from "@/lib/utils";
import { getSettings } from "@/lib/settings";
import { buildWhatsAppMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { sendOrderConfirmationTemplate } from "@/lib/whatsapp-cloud";

// simple in-memory rate limit
const hits = new Map<string, { count: number; ts: number }>();

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const now = Date.now();
    const h = hits.get(ip);
    if (h && now - h.ts < 60_000 && h.count >= 8) {
      return NextResponse.json({ error: "Too many order attempts. Please wait a minute and try again." }, { status: 429 });
    }
    hits.set(ip, { count: (h && now - h.ts < 60_000 ? h.count : 0) + 1, ts: h && now - h.ts < 60_000 ? h.ts : now });

    const body = await req.json();
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", issues: parsed.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })) },
        { status: 400 }
      );
    }
    const data = parsed.data;
    const mobile = normalizeBDPhone(data.mobile);
    const whatsappNum = data.whatsapp ? normalizeBDPhone(data.whatsapp) : mobile;
    // A crafted request can repeat the same variant. Combine those lines before
    // checking stock so the total reservation can never exceed availability.
    const itemMap = new Map<string, { productId: string; variantId?: string | null; quantity: number }>();
    for (const item of data.items) {
      const key = `${item.productId}:${item.variantId ?? "none"}`;
      const previous = itemMap.get(key);
      const quantity = (previous?.quantity ?? 0) + item.quantity;
      if (quantity > 50) {
        return NextResponse.json({ error: "A single item cannot exceed 50 pcs" }, { status: 400 });
      }
      itemMap.set(key, { productId: item.productId, variantId: item.variantId, quantity });
    }
    const items = [...itemMap.values()];

    if (items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    const settings = await getSettings();
    const shopWhatsapp = buildWhatsAppUrl(String(settings.whatsapp || ""), "test")
      ? String(settings.whatsapp || "")
      : String(settings.phone || "");
    if (!buildWhatsAppUrl(shopWhatsapp, "test")) {
      return NextResponse.json({ error: "Add your shop WhatsApp or Hotline number in Admin → Settings (01XXXXXXXXX, +8801XXXXXXXXX, or 8801XXXXXXXXX)." }, { status: 503 });
    }

    // Load products + variants, revalidate price & stock on server
    const productIds = [...new Set(items.map((i) => i.productId))];
    const variantIds = [...new Set(items.map((i) => i.variantId).filter(Boolean) as string[])];

    const prows = await db.select().from(products).where(inArray(products.id, productIds));
    const pmap = new Map(prows.map((p) => [p.id, p]));
    const vrows = variantIds.length > 0 ? await db.select().from(productVariants).where(inArray(productVariants.id, variantIds)) : [];
    const vmap = new Map(vrows.map((v) => [v.id, v]));

    // all variants for stock check of simple products
    const allVarRows = await db.select().from(productVariants).where(inArray(productVariants.productId, productIds));
    const varsByProduct = new Map<string, typeof allVarRows>();
    for (const v of allVarRows) {
      if (!varsByProduct.has(v.productId)) varsByProduct.set(v.productId, []);
      varsByProduct.get(v.productId)!.push(v);
    }

    let subtotal = 0;
    const lines: {
      productId: string;
      variantId: string | null;
      name: string;
      sku: string | null;
      variationLabel: string | null;
      qty: number;
      unitPrice: number;
      costBasis: number;
      image: string | null;
    }[] = [];

    for (const it of items) {
      const p = pmap.get(it.productId);
      if (!p || p.status !== "published") {
        return NextResponse.json({ error: `Product no longer available: ${it.productId}` }, { status: 400 });
      }
      const pVars = varsByProduct.get(p.id) ?? [];
      if (pVars.filter((v) => v.isActive).length > 0 && !it.variantId) {
        return NextResponse.json({ error: `Please select size/color for "${p.name}"` }, { status: 400 });
      }
      if (it.quantity < 1 || it.quantity > 50) {
        return NextResponse.json({ error: `Invalid quantity for "${p.name}"` }, { status: 400 });
      }
      if (it.variantId) {
        const v = vmap.get(it.variantId);
        if (!v || v.productId !== p.id || !v.isActive) {
          return NextResponse.json({ error: `Selected variation is unavailable for "${p.name}"` }, { status: 400 });
        }
        const avail = (v.stockQty ?? 0) - (v.reservedQty ?? 0);
        if (avail < it.quantity) {
          return NextResponse.json(
            { error: `Only ${Math.max(0, avail)} pcs available for "${p.name} (${v.label || [v.size, v.color].filter(Boolean).join(" / ")})"` },
            { status: 400 }
          );
        }
        const unit = v.discountPrice != null && Number(v.discountPrice) > 0 ? Number(v.discountPrice) : Number(v.sellingPrice);
        subtotal += unit * it.quantity;
        lines.push({
          productId: p.id,
          variantId: v.id,
          name: p.name,
          sku: v.sku,
          variationLabel: v.label || [v.size, v.color, v.design].filter(Boolean).join(" / "),
          qty: it.quantity,
          unitPrice: unit,
          costBasis: Number(v.purchaseCost || 0),
          image: v.image || (p.thumbnail as string | null) || (Array.isArray(p.images) ? (p.images as string[])[0] : null),
        });
      } else {
        // simple product: use product price, check summed stock or allow product-level
        const unit =
          p.discountPrice != null && Number(p.discountPrice) > 0 ? Number(p.discountPrice) : Number(p.sellingPrice);
        subtotal += unit * it.quantity;
        lines.push({
          productId: p.id,
          variantId: null,
          name: p.name,
          sku: p.sku,
          variationLabel: null,
          qty: it.quantity,
          unitPrice: unit,
          costBasis: Number(p.purchaseCost || 0),
          image: (p.thumbnail as string | null) || (Array.isArray(p.images) ? (p.images as string[])[0] : null),
        });
      }
    }

    // Prevent an accidental double-submit without blocking a legitimate new
    // cart. Both the phone and the normalized item/variant quantities must
    // match a live order created in the previous two minutes.
    const recent = await db.select({ id: orders.id, status: orders.status })
      .from(orders)
      .where(and(eq(orders.mobile, mobile), gte(orders.createdAt, new Date(Date.now() - 2 * 60 * 1000))))
      .limit(20);
    const requestedSignature = [...itemMap.values()]
      .map((item) => `${item.productId}:${item.variantId ?? "none"}:${item.quantity}`).sort().join("|");
    for (const existing of recent) {
      if (["cancelled", "rejected", "expired"].includes(existing.status)) continue;
      const existingItems = await db.select({ productId: orderItems.productId, variantId: orderItems.variantId, quantity: orderItems.quantity })
        .from(orderItems).where(eq(orderItems.orderId, existing.id));
      const existingSignature = existingItems
        .map((item) => `${item.productId ?? "none"}:${item.variantId ?? "none"}:${item.quantity}`).sort().join("|");
      if (existingSignature === requestedSignature) {
        return NextResponse.json({ error: "This order was already submitted. Please check your recent order instead of submitting again." }, { status: 409 });
      }
    }

    // delivery charge
    let deliveryCharge = 0;
    if (data.deliveryZone === "inside_dhaka") deliveryCharge = Number(settings.deliveryInsideDhaka || 60);
    else if (data.deliveryZone === "sub_dhaka") deliveryCharge = Number(settings.deliverySubDhaka || 100);
    else deliveryCharge = Number(settings.deliveryOutsideDhaka || 130);
    if (Number(settings.freeDeliveryAbove || 0) > 0 && subtotal >= Number(settings.freeDeliveryAbove)) deliveryCharge = 0;

    // coupon
    let discount = 0;
    let couponCode: string | null = null;
    let couponId: string | null = null;
    let couponUsedCount = 0;
    if (data.couponCode) {
      const code = data.couponCode.trim().toUpperCase();
      const crow = await db.select().from(coupons).where(eq(coupons.code, code)).limit(1);
      const c = crow[0];
      if (c && c.isActive && (!c.expiresAt || new Date(c.expiresAt) > new Date())) {
        if (subtotal >= Number(c.minOrder || 0)) {
          if (c.usageLimit && (c.usedCount ?? 0) >= c.usageLimit) {
            // expired usage
          } else {
            const raw = c.type === "percent" ? (subtotal * Number(c.value)) / 100 : Number(c.value);
            const capped = c.maxDiscount ? Math.min(raw, Number(c.maxDiscount)) : raw;
            discount = Math.min(capped, subtotal);
            couponCode = code;
            couponId = c.id;
            couponUsedCount = c.usedCount ?? 0;
          }
        }
      }
    }

    const grandTotal = Math.max(0, subtotal + deliveryCharge - discount);

    // find or create customer
    let customerId: string | null = null;
    const existing = await db.select().from(customers).where(eq(customers.mobile, mobile)).limit(1);
    if (existing[0]) {
      customerId = existing[0].id;
      try {
        await db
          .update(customers)
          .set({
            name: data.customerName,
            whatsapp: whatsappNum,
            email: data.email || existing[0].email,
            address: data.address,
            division: data.division,
            district: data.district,
            thana: data.thana,
            postal: data.postal || existing[0].postal,
          })
          .where(eq(customers.id, existing[0].id));
      } catch {}
    } else {
      const ins = await db
        .insert(customers)
        .values({
          name: data.customerName,
          mobile,
          whatsapp: whatsappNum,
          email: data.email || null,
          address: data.address,
          division: data.division,
          district: data.district,
          thana: data.thana,
          postal: data.postal || null,
        })
        .returning({ id: customers.id });
      customerId = ins[0]?.id ?? null;
    }

    // unique order number with retry
    let orderNumber = generateOrderNumber();
    for (let i = 0; i < 5; i++) {
      const chk = await db.select({ id: orders.id }).from(orders).where(eq(orders.orderNumber, orderNumber)).limit(1);
      if (chk.length === 0) break;
      orderNumber = generateOrderNumber();
    }

    const expiryMin = Number(settings.reservationExpiryMinutes || 120);
    const reservedUntil = new Date(Date.now() + expiryMin * 60 * 1000);

    const inserted = await db
      .insert(orders)
      .values({
        orderNumber,
        customerId,
        customerName: data.customerName,
        mobile,
        whatsapp: whatsappNum,
        email: data.email || null,
        address: data.address,
        division: data.division,
        district: data.district,
        thana: data.thana,
        postal: data.postal || null,
        deliveryZone: data.deliveryZone,
        notes: data.notes || null,
        paymentMethod: data.paymentMethod,
        subtotal: subtotal.toFixed(2),
        deliveryCharge: deliveryCharge.toFixed(2),
        discount: discount.toFixed(2),
        grandTotal: grandTotal.toFixed(2),
        couponCode,
        status: "pending_whatsapp",
        whatsappStatus: "link_generated",
        paymentStatus: data.paymentMethod === "cod" ? "unpaid" : "pending",
        reservedUntil,
        ipAddress: ip,
        userAgent: req.headers.get("user-agent") || null,
      })
      .returning();
    const order = inserted[0];

    // Reserve with a conditional SQL update. Unlike read-then-write, this is
    // safe when two customers try to buy the final unit at the same time.
    const reservedLines: { variantId: string; quantity: number }[] = [];
    for (const ln of lines) {
      const cogs = ln.costBasis * ln.qty;
      const gross = ln.unitPrice * ln.qty - cogs;
      await db.insert(orderItems).values({
        orderId: order.id,
        productId: ln.productId,
        variantId: ln.variantId,
        productName: ln.name,
        sku: ln.sku,
        variationLabel: ln.variationLabel,
        quantity: ln.qty,
        unitPrice: ln.unitPrice.toFixed(2),
        discount: "0",
        purchaseCostBasis: ln.costBasis.toFixed(2),
        cogs: cogs.toFixed(2),
        grossProfit: gross.toFixed(2),
        image: ln.image,
      });
      if (ln.variantId) {
        const v = vmap.get(ln.variantId)!;
        const reserved = await db
          .update(productVariants)
          .set({ reservedQty: sql`${productVariants.reservedQty} + ${ln.qty}` })
          .where(and(eq(productVariants.id, ln.variantId), sql`${productVariants.stockQty} - ${productVariants.reservedQty} >= ${ln.qty}`))
          .returning({ id: productVariants.id, stockQty: productVariants.stockQty });
        if (!reserved.length) {
          // Undo every earlier reservation from this request before returning.
          for (const previous of reservedLines) {
            await db.update(productVariants)
              .set({ reservedQty: sql`GREATEST(0, ${productVariants.reservedQty} - ${previous.quantity})` })
              .where(eq(productVariants.id, previous.variantId));
          }
          await db.update(orders).set({ status: "expired", updatedAt: new Date() }).where(eq(orders.id, order.id));
          return NextResponse.json({ error: `Stock changed during checkout for "${ln.name}". Please refresh and try again.` }, { status: 409 });
        }
        reservedLines.push({ variantId: ln.variantId, quantity: ln.qty });
        const prev = Number(reserved[0].stockQty ?? v.stockQty ?? 0);
        await db.insert(inventoryTransactions).values({
          productId: ln.productId,
          variantId: ln.variantId,
          type: "reservation",
          quantity: ln.qty,
          prevStock: prev,
          newStock: prev,
          referenceType: "order",
          referenceId: orderNumber,
          reason: `Reserved for order ${orderNumber}`,
          createdBy: "website",
        });
        // bump sold count
        await db.update(products).set({ soldCount: sql`${products.soldCount} + ${ln.qty}` }).where(eq(products.id, ln.productId));
      }
    }

    // Count the coupon only after the order and its stock reservations exist.
    // Previously failed checkouts could consume a coupon without creating an order.
    if (couponId) {
      await db.update(coupons).set({ usedCount: couponUsedCount + 1 }).where(eq(coupons.id, couponId));
    }

    await db.insert(orderStatusHistory).values({
      orderId: order.id,
      prevStatus: null,
      newStatus: "pending_whatsapp",
      changedBy: "website",
      reason: "Order created on website",
      note: `Reservation expires ${reservedUntil.toLocaleString("en-GB", { timeZone: "Asia/Dhaka" })}`,
    });

    const message = buildWhatsAppMessage({
      businessName: String(settings.businessName || "PrimeKits Studio"),
      orderNumber,
      customerName: data.customerName,
      mobile,
      whatsapp: whatsappNum,
      address: data.address,
      division: data.division,
      district: data.district,
      thana: data.thana,
      items: lines.map((l) => ({ name: l.name, variation: l.variationLabel, sku: l.sku, qty: l.qty, unitPrice: l.unitPrice })),
      subtotal,
      deliveryCharge,
      discount,
      grandTotal,
      paymentMethod: data.paymentMethod,
      notes: data.notes,
    });
    const waUrl = buildWhatsAppUrl(shopWhatsapp, message);

    // Template delivery is deliberately non-blocking for checkout. A temporary
    // Meta outage must not discard a valid order or its stock reservation.
    let whatsappAutomation = "not_configured";
    try {
      const sent = await sendOrderConfirmationTemplate({
        customerName: data.customerName,
        mobile: whatsappNum,
        orderNumber,
        grandTotal,
      });
      if (sent.sent) {
        whatsappAutomation = "template_sent";
        await db.update(orders)
          .set({ whatsappStatus: "confirmation_sent", updatedAt: new Date() })
          .where(eq(orders.id, order.id));
      }
    } catch (error) {
      whatsappAutomation = "template_failed";
      console.error("WhatsApp confirmation template failed", error);
    }

    return NextResponse.json({
      orderNumber,
      orderId: order.id,
      grandTotal,
      subtotal,
      deliveryCharge,
      discount,
      whatsappUrl: waUrl,
      message,
      whatsappAutomation,
    });
  } catch (e: unknown) {
    console.error("checkout error", e);
    return NextResponse.json({ error: "Failed to place order. Please try again." }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
