import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, productVariants, reviews, categories } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";

function publicProduct(p: typeof products.$inferSelect) {
  const { purchaseCost: _purchaseCost, ...product } = p;
  return {
    ...product,
    sellingPrice: Number(p.sellingPrice),
    discountPrice: p.discountPrice != null ? Number(p.discountPrice) : null,
  };
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const found = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  const p = found[0];
  if (!p || p.status !== "published") {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  // views++
  try {
    await db.update(products).set({ views: (p.views ?? 0) + 1 }).where(eq(products.id, p.id));
  } catch {}

  const variants = await db
    .select()
    .from(productVariants)
    .where(and(eq(productVariants.productId, p.id), eq(productVariants.isActive, true)));

  const revs = await db
    .select()
    .from(reviews)
    .where(and(eq(reviews.productId, p.id), eq(reviews.isApproved, true)))
    .orderBy(desc(reviews.createdAt))
    .limit(20);

  let category = null;
  if (p.categoryId) {
    const c = await db.select().from(categories).where(eq(categories.id, p.categoryId)).limit(1);
    category = c[0] ?? null;
  }

  // related
  let related: typeof p[] = [];
  if (p.categoryId) {
    related = await db
      .select()
      .from(products)
      .where(and(eq(products.status, "published"), eq(products.categoryId, p.categoryId)))
      .limit(9);
    related = related.filter((r) => r.id !== p.id).slice(0, 8);
  }

  return NextResponse.json({
    product: publicProduct(p),
    variants: variants.map((v) => ({
      // Purchase cost is internal accounting data and must never reach shoppers.
      id: v.id,
      productId: v.productId,
      size: v.size,
      color: v.color,
      design: v.design,
      material: v.material,
      label: v.label,
      sku: v.sku,
      sellingPrice: Number(v.sellingPrice),
      discountPrice: v.discountPrice != null ? Number(v.discountPrice) : null,
      available: Math.max(0, (v.stockQty ?? 0) - (v.reservedQty ?? 0)),
      image: v.image,
    })),
    reviews: revs,
    category,
    related: related.map(publicProduct),
  });
}
