import Link from "next/link";
import { db } from "@/db";
import { products, categories } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSettings } from "@/lib/settings";
import { SiteHeader, SiteFooter, ProductCard } from "@/components/store";

export const dynamic = "force-dynamic";

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const settings = await getSettings();
  let cat: typeof categories.$inferSelect | null = null;
  let items: typeof products.$inferSelect[] = [];
  try {
    const c = await db.select().from(categories).where(eq(categories.slug, slug)).limit(1);
    cat = c[0] || null;
    if (cat) {
      items = await db.select().from(products).where(and(eq(products.status, "published"), eq(products.categoryId, cat.id))).orderBy(desc(products.createdAt)).limit(60);
    }
  } catch {}
  if (!cat) {
    return (
      <div className="min-h-screen">
        <SiteHeader settings={settings as never} />
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="text-xl font-black">Category not found</h1>
          <Link href="/shop" className="mt-4 inline-block rounded-full bg-slate-900 px-5 py-2 text-sm font-bold text-white">Back to Shop</Link>
        </div>
        <SiteFooter settings={settings as never} />
      </div>
    );
  }
  return (
    <div className="min-h-screen">
      <SiteHeader settings={settings as never} />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-black">{cat.name}</h1>
        <p className="text-sm text-slate-500">{cat.description} • {items.length} products</p>
        {items.length === 0 ? (
          <div className="mt-6 rounded-2xl border bg-white p-10 text-center text-slate-500">No products in this category yet.</div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((p) => (
              <ProductCard key={p.id} p={{ ...p, sellingPrice: Number(p.sellingPrice), discountPrice: p.discountPrice ? Number(p.discountPrice) : null, images: (p.images as string[]) || [] } as never} />
            ))}
          </div>
        )}
      </div>
      <SiteFooter settings={settings as never} />
    </div>
  );
}
