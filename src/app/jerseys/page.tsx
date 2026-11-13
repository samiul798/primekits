import Link from "next/link";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { categories, products } from "@/db/schema";
import { getSettings } from "@/lib/settings";
import { ProductCard, SiteFooter, SiteHeader } from "@/components/store";
import { SafeImage } from "@/components/safe-image";

export const dynamic = "force-dynamic";

type Search = { q?: string; sort?: string; page?: string };

export default async function JerseysPage({ searchParams }: { searchParams: Promise<Search> }) {
  const [settings, search] = await Promise.all([getSettings(), searchParams]);
  const q = (search.q || "").trim();
  const page = Math.max(1, Number(search.page || 1));
  const pageSize = 24;
  let jerseyCategory: typeof categories.$inferSelect | undefined;
  let rows: (typeof products.$inferSelect)[] = [];
  try {
    jerseyCategory = (await db.select().from(categories).where(eq(categories.slug, "jersey")).limit(1))[0];
    if (jerseyCategory) {
      const where = q
        ? and(eq(products.status, "published"), eq(products.categoryId, jerseyCategory.id), or(ilike(products.name, `%${q}%`), ilike(products.keywords, `%${q}%`)))
        : and(eq(products.status, "published"), eq(products.categoryId, jerseyCategory.id));
      rows = await db.select().from(products).where(where).orderBy(search.sort === "popular" ? desc(products.soldCount) : search.sort === "price_asc" ? products.sellingPrice : search.sort === "price_desc" ? desc(products.sellingPrice) : desc(products.createdAt));
    }
  } catch { /* Keep the storefront usable while the database is unavailable. */ }
  const shown = rows.slice((page - 1) * pageSize, page * pageSize);
  const featured = rows.find((item) => item.isFeatured) || rows[0];
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const url = (next: number) => `/jerseys?${new URLSearchParams({ ...(q ? { q } : {}), ...(search.sort ? { sort: search.sort } : {}), page: String(next) })}`;

  return <div className="min-h-screen bg-[#f8f8f5] text-slate-950">
    <SiteHeader settings={settings as never} />
    <main>
      <section className="relative isolate overflow-hidden bg-[#07120f] text-white">
        {featured?.thumbnail || featured?.images?.[0] ? <SafeImage src={featured.thumbnail || featured.images?.[0] || ""} alt={featured.name} className="absolute inset-0 h-full w-full object-cover opacity-25" fallback="" /> : null}
        <div className="absolute inset-0 bg-gradient-to-r from-[#07120f] via-[#07120f]/85 to-[#07120f]/35" />
        <div className="relative mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-6 md:grid-cols-[1fr_auto] md:py-24 lg:px-8">
          <div className="max-w-2xl"><p className="text-xs font-black tracking-[.3em] text-lime-300">PRIMEKITS JERSEY WORLD</p><h1 className="mt-4 text-5xl font-black tracking-[-.07em] sm:text-7xl">WEAR<br /><span className="text-lime-300">THE GAME.</span></h1><p className="mt-5 max-w-lg text-base leading-7 text-slate-300">Discover the PrimeKits Jersey Collection. Built for the match, the street, and every supporter.</p><div className="mt-8 flex flex-wrap gap-3"><a href="#catalog" className="bg-lime-300 px-6 py-3 text-sm font-black text-slate-950">Shop jerseys</a><Link href="/lookbook" className="border border-white/30 px-6 py-3 text-sm font-black">View lookbook</Link></div></div>
          {featured ? <Link href={`/product/${featured.slug}`} className="hidden w-56 self-end overflow-hidden border border-white/20 bg-white/10 p-3 md:block"><SafeImage src={featured.thumbnail || featured.images?.[0] || ""} alt={featured.name} className="aspect-[3/4] w-full object-contain" fallback="Featured jersey" /><p className="mt-3 text-xs font-bold text-lime-300">FEATURED JERSEY</p><p className="mt-1 text-sm font-black">{featured.name}</p></Link> : null}
        </div>
      </section>
      <section id="catalog" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-black tracking-[.2em] text-emerald-700">THE COLLECTION</p><h2 className="mt-2 text-3xl font-black tracking-tight">Jerseys, your way.</h2><p className="mt-2 text-sm text-slate-600">Only published PrimeKits jersey products appear here.</p></div><Link href="/lookbook" className="border border-slate-950 px-4 py-2 text-sm font-bold hover:bg-slate-950 hover:text-white">Jersey lookbook</Link></div>
        <form className="mt-7 grid gap-2 rounded-2xl border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_180px_auto]"><input name="q" defaultValue={q} placeholder="Search jersey designs" className="border border-slate-200 px-3 py-2.5 text-sm" /><select name="sort" defaultValue={search.sort || "newest"} className="border border-slate-200 px-3 py-2.5 text-sm"><option value="newest">Newest arrivals</option><option value="popular">Best selling</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option></select><button className="bg-slate-950 px-5 py-2.5 text-sm font-bold text-white">Apply</button></form>
        {!jerseyCategory ? <div className="mt-8 rounded-2xl border border-dashed p-10 text-center text-sm text-slate-500">Create a category with the slug <b>jersey</b> in Admin to publish this collection.</div> : shown.length ? <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{shown.map((item) => <ProductCard key={item.id} p={item} />)}</div> : <div className="mt-8 rounded-2xl border bg-white p-10 text-center text-sm text-slate-500">No jersey matches this search yet.</div>}
        {pages > 1 ? <nav className="mt-8 flex items-center justify-center gap-4"><Link aria-disabled={page <= 1} className="border px-4 py-2 text-sm font-bold aria-disabled:pointer-events-none aria-disabled:opacity-40" href={url(Math.max(1, page - 1))}>Previous</Link><span className="text-sm font-bold">Page {page} of {pages}</span><Link aria-disabled={page >= pages} className="border px-4 py-2 text-sm font-bold aria-disabled:pointer-events-none aria-disabled:opacity-40" href={url(Math.min(pages, page + 1))}>Next</Link></nav> : null}
      </section>
    </main><SiteFooter settings={settings as never} />
  </div>;
}
