import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { productVariants, inventoryTransactions } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-guard";
import { variantSchema } from "@/lib/validations";
import { and, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;
  const url = new URL(req.url);
  const productId = url.searchParams.get("productId");
  const filtered = productId
    ? await db.select().from(productVariants).where(eq(productVariants.productId, productId)).limit(500)
    : await db.select().from(productVariants).limit(500);
  const movements = await db.select().from(inventoryTransactions).limit(10000);
  const soldByVariant = new Map<string, number>();
  for (const movement of movements) {
    if (movement.variantId && movement.type === "sale") {
      soldByVariant.set(movement.variantId, (soldByVariant.get(movement.variantId) ?? 0) + Math.max(0, -movement.quantity));
    }
  }
  return NextResponse.json({
    variants: filtered.map((v) => ({
      ...v,
      available: (v.stockQty ?? 0) - (v.reservedQty ?? 0),
      soldQty: soldByVariant.get(v.id) ?? 0,
    })),
  });
}

export async function POST(req: NextRequest) {
  const { admin, response } = await requireAdmin();
  if (response) return response;
  const body = await req.json();
  const p = variantSchema.safeParse(body);
  if (!p.success) return NextResponse.json({ error: "Validation failed", issues: p.error.issues }, { status: 400 });
  const d = p.data;
  try {
    const ins = await db
      .insert(productVariants)
      .values({
        productId: d.productId,
        size: d.size || null,
        color: d.color || null,
        design: d.design || null,
        material: d.material || null,
        label: [d.size, d.color, d.design].filter(Boolean).join(" / ") || d.sku,
        sku: d.sku,
        purchaseCost: String(d.purchaseCost || 0),
        sellingPrice: String(d.sellingPrice),
        discountPrice: d.discountPrice != null ? String(d.discountPrice) : null,
        stockQty: d.stockQty ?? 0,
        reservedQty: 0,
        lowStockThreshold: d.lowStockThreshold ?? 5,
        barcode: d.barcode || null,
        image: d.image || null,
        isActive: d.isActive ?? true,
      })
      .returning();
    const v = ins[0];
    if ((d.stockQty ?? 0) > 0) {
      await db.insert(inventoryTransactions).values({
        productId: d.productId,
        variantId: v.id,
        type: "purchase",
        quantity: d.stockQty ?? 0,
        prevStock: 0,
        newStock: d.stockQty ?? 0,
        referenceType: "manual",
        referenceId: "initial",
        reason: "Initial stock",
        createdBy: admin?.email || "admin",
      });
    }
    return NextResponse.json({ variant: v });
  } catch {
    return NextResponse.json({ error: "SKU already exists" }, { status: 400 });
  }
}

const stockSchema = z.object({
  variantId: z.string().min(1),
  type: z.enum(["purchase", "adjustment", "damage", "lost", "return", "manual"]),
  quantity: z.number().int().min(1).max(100000),
  reason: z.string().max(500).optional().nullable(),
  unitCost: z.number().min(0).optional().nullable(),
  direction: z.enum(["add", "reduce"]).optional(),
});

export async function PUT(req: NextRequest) {
  const { admin, response } = await requireAdmin();
  if (response) return response;
  const body = await req.json();
  // stock adjustment path
  if (body.variantId && body.type && body.quantity != null) {
    const s = stockSchema.safeParse(body);
    if (!s.success) return NextResponse.json({ error: "Invalid stock update" }, { status: 400 });
    const rows = await db.select().from(productVariants).where(eq(productVariants.id, s.data.variantId)).limit(1);
    const v = rows[0];
    if (!v) return NextResponse.json({ error: "Variant not found" }, { status: 404 });
    const prev = v.stockQty ?? 0;
    const isReduction = s.data.type === "damage" || s.data.type === "lost" || ((s.data.type === "adjustment" || s.data.type === "manual") && s.data.direction === "reduce");
    const delta = isReduction ? -s.data.quantity : s.data.quantity;
    const next = prev + delta;
    if (next < (v.reservedQty ?? 0)) {
      return NextResponse.json({ error: `Cannot remove ${s.data.quantity}: only ${(v.stockQty ?? 0) - (v.reservedQty ?? 0)} unit(s) are available; ${v.reservedQty ?? 0} are reserved.` }, { status: 400 });
    }

    // The conditional update makes a concurrent sale/reservation safe: if the
    // available quantity changed after the read above, no partial log is written.
    const update: Record<string, unknown> = { stockQty: next };
    if (s.data.type === "damage") update.damagedQty = sql`${productVariants.damagedQty} + ${s.data.quantity}`;
    if (s.data.type === "lost") update.lostQty = sql`${productVariants.lostQty} + ${s.data.quantity}`;
    if (s.data.type === "return") update.returnedQty = sql`${productVariants.returnedQty} + ${s.data.quantity}`;
    if (s.data.unitCost != null && s.data.type === "purchase") {
      // weighted average cost update
      const oldCost = Number(v.purchaseCost || 0);
      const newCost = s.data.unitCost;
      const avg = prev + s.data.quantity > 0 ? (oldCost * prev + newCost * s.data.quantity) / (prev + s.data.quantity) : newCost;
      update.purchaseCost = avg.toFixed(2);
    }
    const changed = await db.update(productVariants).set(update as never).where(and(eq(productVariants.id, v.id), gte(productVariants.stockQty, (v.reservedQty ?? 0) + (isReduction ? s.data.quantity : 0)))).returning({ id: productVariants.id });
    if (!changed.length) return NextResponse.json({ error: "Stock changed by another operation. Please refresh and try again." }, { status: 409 });
    await db.insert(inventoryTransactions).values({
      productId: v.productId,
      variantId: v.id,
      type: s.data.type === "manual" ? "manual_adjustment" : s.data.type,
      quantity: delta,
      prevStock: prev,
      newStock: next,
      referenceType: "manual",
      referenceId: "admin",
      reason: s.data.reason || `${s.data.type} by admin`,
      createdBy: admin?.email || "admin",
    });
    return NextResponse.json({ ok: true, prevStock: prev, newStock: next });
  }
  // generic variant edit
  const { id, ...rest } = body as { id: string } & Record<string, unknown>;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  if ("stockQty" in rest || "reservedQty" in rest || "damagedQty" in rest || "lostQty" in rest || "returnedQty" in rest) {
    return NextResponse.json({ error: "Use Stock Adjustment for inventory changes so the audit trail stays accurate." }, { status: 400 });
  }
  const parsed = variantSchema.partial().safeParse(rest);
  if (!parsed.success) return NextResponse.json({ error: "Invalid variant", issues: parsed.error.issues }, { status: 400 });
  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(parsed.data)) {
    if (v === undefined) continue;
    if (["purchaseCost", "sellingPrice", "discountPrice"].includes(k)) patch[k] = v == null ? null : String(v as number);
    else patch[k] = v;
  }
  await db.update(productVariants).set(patch as never).where(eq(productVariants.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await db.delete(productVariants).where(eq(productVariants.id, id));
  return NextResponse.json({ ok: true });
}
