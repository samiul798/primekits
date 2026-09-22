import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { inventoryTransactions, productVariants, products } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-guard";
import { desc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;
  const url = new URL(req.url);
  const variantId = url.searchParams.get("variantId") || "";
  const type = url.searchParams.get("type") || "";
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const limit = Math.min(200, Number(url.searchParams.get("limit") || 50));

  let rows = await db.select().from(inventoryTransactions).orderBy(desc(inventoryTransactions.createdAt)).limit(2000);
  if (variantId) rows = rows.filter((r) => r.variantId === variantId);
  if (type) rows = rows.filter((r) => r.type === type);

  const vars = await db.select().from(productVariants).limit(5000);
  const prods = await db.select().from(products).limit(1000);
  const vmap = new Map(vars.map((v) => [v.id, v]));
  const pmap = new Map(prods.map((p) => [p.id, p]));

  // stock report
  const report = vars.map((v) => ({
    variantId: v.id,
    productName: pmap.get(v.productId)?.name || "",
    label: v.label,
    sku: v.sku,
    size: v.size,
    color: v.color,
    stock: v.stockQty,
    reserved: v.reservedQty,
    available: (v.stockQty ?? 0) - (v.reservedQty ?? 0),
    damaged: v.damagedQty,
    lost: v.lostQty,
    threshold: v.lowStockThreshold,
    isLow: (v.stockQty ?? 0) - (v.reservedQty ?? 0) <= (v.lowStockThreshold ?? 5),
    isOut: (v.stockQty ?? 0) - (v.reservedQty ?? 0) <= 0,
  }));

  const total = rows.length;
  const paged = rows.slice((page - 1) * limit, page * limit).map((r) => ({
    ...r,
    variantSku: r.variantId ? vmap.get(r.variantId)?.sku : null,
    variantLabel: r.variantId ? vmap.get(r.variantId)?.label : null,
    productName: r.productId ? pmap.get(r.productId)?.name : null,
  }));

  // size-wise / color-wise
  const sizeWise = new Map<string, number>();
  const colorWise = new Map<string, number>();
  for (const v of vars) {
    const avail = (v.stockQty ?? 0) - (v.reservedQty ?? 0);
    if (v.size) sizeWise.set(v.size, (sizeWise.get(v.size) ?? 0) + avail);
    if (v.color) colorWise.set(v.color, (colorWise.get(v.color) ?? 0) + avail);
  }

  return NextResponse.json({
    transactions: paged,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    report,
    sizeWise: [...sizeWise.entries()].map(([k, v]) => ({ name: k, stock: v })),
    colorWise: [...colorWise.entries()].map(([k, v]) => ({ name: k, stock: v })),
  });
}
