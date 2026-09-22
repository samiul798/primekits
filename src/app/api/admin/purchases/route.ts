import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { purchases, purchaseItems, suppliers, productVariants, inventoryTransactions } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-guard";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const itemSchema = z.object({
  productId: z.string().optional().nullable(),
  variantId: z.string().optional().nullable(),
  sku: z.string().optional().nullable(),
  quantity: z.number().int().min(1),
  unitCost: z.number().min(0),
});

const schema = z.object({
  supplierId: z.string().optional().nullable(),
  purchaseDate: z.string().optional().nullable(),
  items: z.array(itemSchema).min(1),
  paidAmount: z.number().min(0).default(0),
  invoiceNo: z.string().max(80).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;
  const rows = await db.select().from(purchases).orderBy(desc(purchases.createdAt)).limit(200);
  const items = await db.select().from(purchaseItems).limit(2000);
  const sups = await db.select().from(suppliers).limit(100);
  return NextResponse.json({
    purchases: rows.map((p) => ({
      ...p,
      items: items.filter((i) => i.purchaseId === p.id),
      supplier: sups.find((s) => s.id === p.supplierId) || null,
    })),
    suppliers: sups,
  });
}

export async function POST(req: NextRequest) {
  const { admin, response } = await requireAdmin();
  if (response) return response;
  const body = await req.json();
  const p = schema.safeParse(body);
  if (!p.success) return NextResponse.json({ error: "Invalid purchase", issues: p.error.issues }, { status: 400 });
  const d = p.data;
  if (d.purchaseDate && Number.isNaN(new Date(d.purchaseDate).getTime())) return NextResponse.json({ error: "Invalid purchase date" }, { status: 400 });
  // Reject an invalid variant before creating a purchase header. This keeps
  // purchases, inventory and product variants in one consistent workflow.
  for (const item of d.items) {
    if (!item.variantId) continue;
    const variant = (await db.select({ id: productVariants.id }).from(productVariants).where(eq(productVariants.id, item.variantId)).limit(1))[0];
    if (!variant) return NextResponse.json({ error: "One selected variant no longer exists. Refresh and try again." }, { status: 409 });
  }
  const subtotal = d.items.reduce((s, i) => s + i.quantity * i.unitCost, 0);
  const paid = d.paidAmount || 0;
  const due = Math.max(0, subtotal - paid);
  const changeAmount = Math.max(0, paid - subtotal);
  let purchaseNo = `PUR-${Date.now().toString().slice(-8)}`;
  for (let i = 0; i < 5; i++) {
    if (!(await db.select({ id: purchases.id }).from(purchases).where(eq(purchases.purchaseNo, purchaseNo)).limit(1)).length) break;
    purchaseNo = `PUR-${Date.now().toString().slice(-8)}${i + 1}`;
  }
  const ins = await db.insert(purchases).values({
    purchaseNo,
    supplierId: d.supplierId || null,
    purchaseDate: d.purchaseDate ? new Date(d.purchaseDate) : new Date(),
    subtotal: String(subtotal),
    paidAmount: String(paid),
    dueAmount: String(due),
    paymentStatus: changeAmount > 0 ? "overpaid" : due <= 0 ? "paid" : paid > 0 ? "partial" : "unpaid",
    invoiceNo: d.invoiceNo || null,
    notes: d.notes || null,
  }).returning();
  const pur = ins[0];
  for (const it of d.items) {
    await db.insert(purchaseItems).values({
      purchaseId: pur.id,
      productId: it.productId || null,
      variantId: it.variantId || null,
      sku: it.sku || null,
      quantity: it.quantity,
      unitCost: String(it.unitCost),
      totalCost: String(it.quantity * it.unitCost),
    });
    if (it.variantId) {
      const vr = await db.select().from(productVariants).where(eq(productVariants.id, it.variantId)).limit(1);
      const v = vr[0];
      if (v) {
        const prev = v.stockQty ?? 0;
        const next = prev + it.quantity;
        const oldCost = Number(v.purchaseCost || 0);
        const avg = next > 0 ? (oldCost * prev + it.unitCost * it.quantity) / next : it.unitCost;
        await db.update(productVariants).set({ stockQty: next, purchaseCost: avg.toFixed(2) }).where(eq(productVariants.id, v.id));
        await db.insert(inventoryTransactions).values({
          productId: v.productId,
          variantId: v.id,
          type: "purchase",
          quantity: it.quantity,
          prevStock: prev,
          newStock: next,
          referenceType: "purchase",
          referenceId: purchaseNo,
          reason: `Purchase ${purchaseNo}`,
          createdBy: admin?.email || "admin",
        });
      }
    }
  }
  return NextResponse.json({ purchase: pur, changeAmount });
}

export async function DELETE(req: NextRequest) {
  const { admin, response } = await requireAdmin();
  if (response) return response;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing purchase id" }, { status: 400 });
  const found = await db.select().from(purchases).where(eq(purchases.id, id)).limit(1);
  const purchase = found[0];
  if (!purchase) return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
  const items = await db.select().from(purchaseItems).where(eq(purchaseItems.purchaseId, id));

  // Validate all reversals first. This prevents a partially deleted purchase
  // and never lets a reversal consume stock reserved for live orders.
  for (const item of items) {
    if (!item.variantId) continue;
    const variant = (await db.select().from(productVariants).where(eq(productVariants.id, item.variantId)).limit(1))[0];
    if (!variant) continue;
    const next = (variant.stockQty ?? 0) - item.quantity;
    if (next < (variant.reservedQty ?? 0)) {
      return NextResponse.json({ error: `Cannot delete ${purchase.purchaseNo}: ${variant.sku} stock is reserved by active orders.` }, { status: 409 });
    }
  }
  for (const item of items) {
    if (!item.variantId) continue;
    const variant = (await db.select().from(productVariants).where(eq(productVariants.id, item.variantId)).limit(1))[0];
    if (!variant) continue;
    const prev = variant.stockQty ?? 0;
    const next = prev - item.quantity;
    await db.update(productVariants).set({ stockQty: next }).where(eq(productVariants.id, variant.id));
    await db.insert(inventoryTransactions).values({
      productId: variant.productId, variantId: variant.id, type: "purchase_reversal", quantity: -item.quantity,
      prevStock: prev, newStock: next, referenceType: "purchase", referenceId: purchase.purchaseNo,
      reason: `Deleted purchase ${purchase.purchaseNo}`, createdBy: admin?.email || "admin",
    });
  }
  await db.delete(purchaseItems).where(eq(purchaseItems.purchaseId, id));
  await db.delete(purchases).where(eq(purchases.id, id));
  return NextResponse.json({ ok: true });
}
