import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, productVariants, categories } from "@/db/schema";
import { eq, and, ilike, or, sql, desc, asc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").trim();
  const category = url.searchParams.get("category") || "";
  const minPrice = Number(url.searchParams.get("minPrice") || 0);
  const maxPrice = Number(url.searchParams.get("maxPrice") || 0);
  const size = url.searchParams.get("size") || "";
  const color = url.searchParams.get("color") || "";
  const sort = url.searchParams.get("sort") || "newest";
  const featured = url.searchParams.get("featured") || "";
  const best = url.searchParams.get("best") || "";
  const isNew = url.searchParams.get("new") || "";
  const page = Math.max(1, Number(url.searchParams.get("page") || 1));
  const limit = Math.min(48, Math.max(1, Number(url.searchParams.get("limit") || 20)));
  const offset = (page - 1) * limit;

  const wheres: unknown[] = [eq(products.status, "published")];

  if (q) {
    wheres.push(
      or(
        ilike(products.name, `%${q}%`),
        ilike(products.sku, `%${q}%`),
        ilike(products.keywords, `%${q}%`)
      )
    );
  }
  if (category) {
    const cat = await db.select().from(categories).where(eq(categories.slug, category)).limit(1);
    if (cat[0]) wheres.push(eq(products.categoryId, cat[0].id));
    else wheres.push(sql`1=0`);
  }
  if (featured === "1") wheres.push(eq(products.isFeatured, true));
  if (best === "1") wheres.push(eq(products.isBestSeller, true));
  if (isNew === "1") wheres.push(eq(products.isNewArrival, true));

  let orderBy: ReturnType<typeof desc> = desc(products.createdAt);
  if (sort === "price_asc") orderBy = asc(products.sellingPrice) as never;
  else if (sort === "price_desc") orderBy = desc(products.sellingPrice) as never;
  else if (sort === "popular") orderBy = desc(products.soldCount) as never;

  const whereClause = wheres.length === 1 ? (wheres[0] as never) : (and(...(wheres as never[])) as never);

  let rows = await db
    .select()
    .from(products)
    .where(whereClause)
    .orderBy(orderBy as never)
    .limit(200);

  // Resolve variant filters in one place so every selected option must match the
  // same active variation (rather than independently matching different ones).
  if (minPrice > 0 || maxPrice > 0 || size || color) {
    const vrows = await db.select().from(productVariants);
    const byProduct = new Map<string, typeof vrows>();
    for (const v of vrows) {
      if (!byProduct.has(v.productId)) byProduct.set(v.productId, []);
      byProduct.get(v.productId)!.push(v);
    }
    rows = rows.filter((p) => {
      const vs = (byProduct.get(p.id) ?? []).filter((v) => v.isActive);
      const priceOf = (x: typeof p) =>
        x.discountPrice != null && Number(x.discountPrice) > 0 ? Number(x.discountPrice) : Number(x.sellingPrice);
      if (vs.length === 0) {
        return (!size && !color) &&
          (minPrice <= 0 || priceOf(p) >= minPrice) &&
          (maxPrice <= 0 || priceOf(p) <= maxPrice);
      }
      return vs.some((v) => {
        const price = v.discountPrice != null && Number(v.discountPrice) > 0 ? Number(v.discountPrice) : Number(v.sellingPrice);
        return (!size || (v.size || "").toLowerCase() === size.toLowerCase()) &&
          (!color || (v.color || "").toLowerCase() === color.toLowerCase()) &&
          (minPrice <= 0 || price >= minPrice) &&
          (maxPrice <= 0 || price <= maxPrice);
      });
    });
  }

  const total = rows.length;
  const paged = rows.slice(offset, offset + limit);

  // attach available stock summary
  const allVariants = await db.select().from(productVariants);
  const stockMap = new Map<string, number>();
  for (const v of allVariants) {
    const avail = Math.max(0, (v.stockQty ?? 0) - (v.reservedQty ?? 0));
    stockMap.set(v.productId, (stockMap.get(v.productId) ?? 0) + avail);
  }
  const data = paged.map((p) => ({
    id: p.id,
    name: p.name,
    slug: p.slug,
    shortDescription: p.shortDescription,
    categoryId: p.categoryId,
    brand: p.brand,
    thumbnail: p.thumbnail,
    images: p.images,
    sku: p.sku,
    isFeatured: p.isFeatured,
    isNewArrival: p.isNewArrival,
    isBestSeller: p.isBestSeller,
    createdAt: p.createdAt,
    sellingPrice: Number(p.sellingPrice),
    discountPrice: p.discountPrice != null ? Number(p.discountPrice) : null,
    availableStock: stockMap.get(p.id) ?? 0,
  }));

  return NextResponse.json({ products: data, total, page, limit, totalPages: Math.ceil(total / limit) });
}
