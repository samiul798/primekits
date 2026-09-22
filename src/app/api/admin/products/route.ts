import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, productVariants, orderItems, inventoryTransactions, reviews } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-guard";
import { productSchema } from "@/lib/validations";
import { slugify } from "@/lib/utils";
import { eq, desc, ilike, or, inArray } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;
  const url = new URL(req.url);
  const q = url.searchParams.get("q") || "";
  const rows = q
    ? await db.select().from(products).where(or(ilike(products.name, `%${q}%`), ilike(products.sku, `%${q}%`), ilike(products.slug, `%${q}%`))).orderBy(desc(products.createdAt)).limit(500)
    : await db.select().from(products).orderBy(desc(products.createdAt)).limit(500);
  const ids = rows.map((p) => p.id);
  const vars = ids.length ? await db.select().from(productVariants).where(inArray(productVariants.productId, ids)) : [];
  const withStock = rows.map((p) => {
    const vs = vars.filter((v) => v.productId === p.id);
    const stock = vs.reduce((s, v) => s + Math.max(0, (v.stockQty ?? 0) - (v.reservedQty ?? 0)), 0);
    return { ...p, variantCount: vs.length, availableStock: stock };
  });
  return NextResponse.json({ products: withStock });
}

export async function POST(req: NextRequest) {
  const { admin, response } = await requireAdmin();
  if (response) return response;
  void admin;
  const body = await req.json();
  const p = productSchema.safeParse(body);
  if (!p.success) return NextResponse.json({ error: "Validation failed", issues: p.error.issues }, { status: 400 });
  const d = p.data;
  const slug = d.slug ? slugify(d.slug) : slugify(d.name);
  try {
    const ins = await db
      .insert(products)
      .values({
        name: d.name,
        slug,
        shortDescription: d.shortDescription || null,
        description: d.description || null,
        categoryId: d.categoryId || null,
        brand: d.brand || null,
        thumbnail: d.thumbnail || (d.images?.[0] as string) || null,
        images: d.images || [],
        videoUrl: d.videoUrl || null,
        specifications: d.specifications || {},
        features: d.features || [],
        material: d.material || null,
        purchaseCost: String(d.purchaseCost || 0),
        sellingPrice: String(d.sellingPrice),
        discountPrice: d.discountPrice != null ? String(d.discountPrice) : null,
        sku: d.sku,
        barcode: d.barcode || null,
        status: d.status,
        isFeatured: !!d.isFeatured,
        isNewArrival: !!d.isNewArrival,
        isBestSeller: !!d.isBestSeller,
        lowStockThreshold: d.lowStockThreshold ?? 5,
        sizeChartImage: d.sizeChartImage || null,
        sizeChartNote: d.sizeChartNote || null,
        seoTitle: d.seoTitle || null,
        seoDescription: d.seoDescription || null,
        keywords: d.keywords || null,
      })
      .returning();
    return NextResponse.json({ product: ins[0] });
  } catch (e: unknown) {
    return NextResponse.json({ error: "Failed to create product (slug/SKU may already exist)" }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;
  const body = await req.json();
  const { id, ...rest } = body as { id: string } & Record<string, unknown>;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const p = productSchema.partial().safeParse(rest);
  if (!p.success) return NextResponse.json({ error: "Validation failed", issues: p.error.issues }, { status: 400 });
  const d = p.data as Record<string, unknown>;
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(d)) {
    if (v === undefined) continue;
    if (["purchaseCost", "sellingPrice", "discountPrice"].includes(k)) {
      patch[k] = v == null ? null : String(v as number);
    } else if (k === "slug" && typeof v === "string") {
      patch[k] = slugify(v);
    } else {
      patch[k] = v;
    }
  }
  try {
    await db.update(products).set(patch as never).where(eq(products.id, id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Update failed (slug/SKU conflict?)" }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const [usedInOrders, usedInInventory, hasReviews] = await Promise.all([
    db.select({ id: orderItems.id }).from(orderItems).where(eq(orderItems.productId, id)).limit(1),
    db.select({ id: inventoryTransactions.id }).from(inventoryTransactions).where(eq(inventoryTransactions.productId, id)).limit(1),
    db.select({ id: reviews.id }).from(reviews).where(eq(reviews.productId, id)).limit(1),
  ]);
  if (usedInOrders.length || usedInInventory.length || hasReviews.length) {
    return NextResponse.json({ error: "This product has order, inventory, or review history and cannot be deleted. Archive it instead." }, { status: 409 });
  }
  await db.delete(productVariants).where(eq(productVariants.productId, id));
  await db.delete(products).where(eq(products.id, id));
  return NextResponse.json({ ok: true });
}
