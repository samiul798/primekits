import Link from "next/link";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { categories, products, productVariants } from "@/db/schema";
import { getSettings } from "@/lib/settings";
import { LookbookClient, type LookbookImage } from "@/components/lookbook-client";
import { SiteFooter, SiteHeader } from "@/components/store";

export const dynamic = "force-dynamic";

export default async function LookbookPage() {
  const settings = await getSettings();
  let images: LookbookImage[] = [];
  try {
    const category = (await db.select().from(categories).where(eq(categories.slug, "jersey")).limit(1))[0];
    if (category) {
      const jerseys = await db.select().from(products).where(and(eq(products.categoryId, category.id), eq(products.status, "published"))).orderBy(desc(products.createdAt)).limit(60);
      const variants = jerseys.length ? await db.select().from(productVariants).where(eq(productVariants.isActive, true)) : [];
      const availability = new Map<string, boolean>();
      for (const variant of variants) if (jerseys.some((product) => product.id === variant.productId)) availability.set(variant.productId, (availability.get(variant.productId) || false) || variant.stockQty > variant.reservedQty);
      images = jerseys.flatMap((product) => Array.from(new Set([product.thumbnail, ...(product.images || [])].filter(Boolean) as string[])).map((src) => ({ src, productName: product.name, slug: product.slug, available: availability.get(product.id) || false }))).slice(0, 120);
    }
  } catch { /* Render the empty state during initial database setup. */ }
  return <div className="min-h-screen bg-[#f8f8f5]"><SiteHeader settings={settings as never} /><main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-black tracking-[.24em] text-emerald-700">PRIMEKITS JERSEY WORLD</p><h1 className="mt-2 text-4xl font-black tracking-tight sm:text-5xl">Jersey Lookbook</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">Explore every available photograph by jersey design. Images belong to their real product—never duplicate listings.</p></div><Link href="/jerseys" className="bg-slate-950 px-5 py-3 text-sm font-bold text-white">Shop jerseys</Link></div><div className="mt-9"><LookbookClient images={images} /></div></main><SiteFooter settings={settings as never} /></div>;
}
