import Link from "next/link";
import { db } from "@/db";
import { products, categories } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSettings } from "@/lib/settings";
import { SiteHeader, SiteFooter, ProductCard } from "@/components/store";
import { SafeImage } from "@/components/safe-image";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const settings = await getSettings();
  let prods: typeof products.$inferSelect[] = [];
  let cats: typeof categories.$inferSelect[] = [];
  try {
    [prods, cats] = await Promise.all([
      db.select().from(products).where(eq(products.status, "published")).orderBy(desc(products.createdAt)).limit(40),
      db.select().from(categories).where(eq(categories.isActive, true)).orderBy(categories.sortOrder).limit(20),
    ]);
  } catch {
    // The storefront stays available while its database is being configured.
  }

  const fallback = prods.slice(0, 8);
  const featured = prods.filter((p) => p.isFeatured).slice(0, 8);
  const best = prods.filter((p) => p.isBestSeller).slice(0, 8);
  const fresh = prods.filter((p) => p.isNewArrival).slice(0, 8);
  const leadCategory = cats[0];
  const supportingCategories = cats.slice(1, 4);

  return (
    <div className="min-h-screen bg-stone-50 text-slate-950">
      <SiteHeader settings={settings as never} />
      <main>
        <section className="border-b border-slate-200 bg-[#102238] text-white">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-[1.04fr_.96fr] md:items-end md:py-16 lg:px-8">
            <div className="max-w-2xl">
              <p className="text-xs font-bold tracking-[.18em] text-amber-300">PRIMEKITS STUDIO</p>
              <h1 className="mt-4 text-4xl font-black leading-[1.04] tracking-tight sm:text-5xl">Everyday apparel, selected with a sharper eye.</h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">Jerseys, tees, shirts and layers for Bangladesh. Browse the current collection, check your fit, and order on your terms.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/shop" className="border border-amber-300 bg-amber-300 px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-amber-200">Shop the collection</Link>
                <Link href="/track" className="border border-slate-500 px-5 py-3 text-sm font-bold text-white transition hover:border-white hover:bg-white/5">Track an order</Link>
              </div>
            </div>
            <div className="border-l border-white/15 pl-6 sm:pl-8">
              <p className="text-xs font-bold tracking-[.16em] text-slate-400">ORDERING WITH PRIMEKITS</p>
              <dl className="mt-5 grid gap-5 sm:grid-cols-3 md:grid-cols-1">
                <TrustItem number="01" title="Clear product details" text="See the product, price and available options before checkout." />
                <TrustItem number="02" title="Cash on Delivery" text="Delivery coverage is confirmed at checkout for your address." />
                <TrustItem number="03" title="Direct support" text="Get order assistance through our verified support channels." />
              </dl>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <SectionHeading eyebrow="SHOP BY CATEGORY" title="Find the right layer" href="/categories" />
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {leadCategory ? <CategoryFeature category={leadCategory} featured /> : <CategoryFallback name="Jerseys" featured />}
            <div className="grid grid-cols-3 gap-4">
              {supportingCategories.length ? supportingCategories.map((category) => <CategoryFeature key={category.id} category={category} />) : ["T-Shirts", "Shirts", "Hoodies"].map((name) => <CategoryFallback key={name} name={name} />)}
            </div>
          </div>
        </section>

        <ProductSection eyebrow="CURRENT EDIT" title="Featured pieces" href="/shop?featured=1" items={(featured.length ? featured : fallback) as never[]} />

        <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="grid border border-slate-200 bg-white md:grid-cols-[.75fr_1.25fr]">
            <div className="border-b border-slate-200 bg-slate-100 p-7 md:border-b-0 md:border-r sm:p-9">
              <p className="text-xs font-bold tracking-[.16em] text-slate-500">BUY WITH CLARITY</p>
              <h2 className="mt-3 text-2xl font-black tracking-tight">Fit, delivery and support before you order.</h2>
              <Link href="/faq" className="mt-6 inline-block border-b-2 border-slate-950 pb-1 text-sm font-bold text-slate-950">Read the ordering guide</Link>
            </div>
            <div className="grid divide-y divide-slate-200 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              <InfoItem title="Size guidance" text="Use the size chart available on each product page before selecting your option." />
              <InfoItem title="Order updates" text="Track your submitted order and contact us if you need help with a delivery." />
              <InfoItem title="Returns" text="Review the return policy for eligibility and the steps to request assistance." />
            </div>
          </div>
        </section>

        <ProductSection eyebrow="POPULAR NOW" title="Best sellers" href="/shop?best=1" items={(best.length ? best : fallback) as never[]} />
        <ProductSection eyebrow="NEW TO THE SHOP" title="Recent arrivals" href="/shop?new=1" items={(fresh.length ? fresh : fallback) as never[]} />
      </main>
      <SiteFooter settings={settings as never} />
    </div>
  );
}

function SectionHeading({ eyebrow, title, href }: { eyebrow: string; title: string; href: string }) {
  return <div className="flex items-end justify-between gap-4 border-b border-slate-300 pb-4"><div><p className="text-[11px] font-bold tracking-[.18em] text-slate-500">{eyebrow}</p><h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">{title}</h2></div><Link href={href} className="shrink-0 text-sm font-bold text-slate-700 underline underline-offset-4 hover:text-slate-950">View all</Link></div>;
}

function ProductSection({ eyebrow, title, href, items }: { eyebrow: string; title: string; href: string; items: { name: string; slug: string; thumbnail?: string | null; images?: string[]; sellingPrice: number | string; discountPrice?: number | string | null; isNewArrival?: boolean; isBestSeller?: boolean }[] }) {
  if (!items.length) return null;
  return <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8"><SectionHeading eyebrow={eyebrow} title={title} href={href} /><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{items.map((product, index) => <ProductCard key={`${product.slug}-${index}`} p={product as never} />)}</div></section>;
}

function CategoryFeature({ category, featured = false }: { category: typeof categories.$inferSelect; featured?: boolean }) {
  return <Link href={`/category/${category.slug}`} className={`group relative overflow-hidden border border-slate-200 bg-slate-200 ${featured ? "aspect-[16/10]" : "aspect-[4/5]"}`}><SafeImage src={category.image} alt={category.name} className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]" fallback={category.name} /><div className="absolute inset-x-0 bottom-0 bg-slate-950/85 p-4 text-white"><span className="block text-xs font-bold tracking-[.14em] text-amber-300">SHOP</span><span className="mt-1 block text-lg font-black">{category.name}</span></div></Link>;
}

function CategoryFallback({ name, featured = false }: { name: string; featured?: boolean }) {
  return <Link href="/shop" className={`flex items-end border border-slate-300 bg-slate-200 p-4 text-lg font-black text-slate-900 ${featured ? "aspect-[16/10]" : "aspect-[4/5]"}`}>{name}</Link>;
}

function TrustItem({ number, title, text }: { number: string; title: string; text: string }) { return <div className="grid grid-cols-[28px_1fr] gap-3"><dt className="text-xs font-bold text-amber-300">{number}</dt><dd><div className="text-sm font-bold text-white">{title}</div><p className="mt-1 text-xs leading-5 text-slate-400">{text}</p></dd></div>; }
function InfoItem({ title, text }: { title: string; text: string }) { return <div className="p-6"><h3 className="text-sm font-bold text-slate-950">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{text}</p></div>; }
