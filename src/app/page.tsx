import Link from "next/link";
import { db } from "@/db";
import { products, categories } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSettings } from "@/lib/settings";
import { SiteHeader, SiteFooter, ProductCard } from "@/components/store";
import { SafeImage } from "@/components/safe-image";
import { HomeCartButton } from "@/components/home-client";

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
    // The storefront remains presentable while a new database is being configured.
  }

  const fallback = prods.slice(0, 8);
  const featured = prods.filter((p) => p.isFeatured).slice(0, 8);
  const best = prods.filter((p) => p.isBestSeller).slice(0, 8);
  const fresh = prods.filter((p) => p.isNewArrival).slice(0, 8);
  const heroCats = cats.slice(0, 4);

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f8fafc]">
      <SiteHeader settings={settings as never} />
      <HomeCartButton />

      <main>
        <section className="relative isolate overflow-hidden bg-[#07101f] text-white">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_74%_26%,rgba(245,158,11,.22),transparent_20%),radial-gradient(circle_at_8%_80%,rgba(14,165,233,.16),transparent_25%)]" />
          <div className="absolute -right-28 top-8 h-80 w-80 rounded-full border border-white/10" />
          <div className="absolute -right-8 top-20 h-56 w-56 rounded-full border border-white/10" />
          <div className="relative mx-auto grid max-w-7xl gap-6 px-4 pb-9 pt-8 sm:px-6 md:grid-cols-[1.05fr_.95fr] md:items-center md:py-12 lg:px-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 text-xs font-bold tracking-wide text-amber-200">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-300" /> NEW SEASON · PRIMEKITS STUDIO
              </div>
              <h1 className="mt-4 text-3xl font-black leading-[1.02] tracking-tight sm:text-4xl lg:text-5xl">
                Everyday essentials,<br />
                <span className="text-amber-300">finished exceptionally.</span>
              </h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300 sm:text-base">
                Premium jerseys, tees, shirts, hoodies and high-necks with a fit you will reach for every day. Cash on Delivery across Bangladesh.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/shop" className="rounded-full bg-amber-300 px-6 py-3.5 text-sm font-extrabold text-slate-950 transition hover:-translate-y-0.5 hover:bg-amber-200">
                  Explore the collection <span aria-hidden>→</span>
                </Link>
                <Link href="/track" className="rounded-full border border-white/20 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/10">
                  Track your order
                </Link>
              </div>
              <div className="mt-6 grid max-w-xl grid-cols-3 gap-3 border-t border-white/10 pt-4 text-xs text-slate-300 sm:text-sm">
                <TrustItem title="Cash on Delivery" detail="Nationwide" />
                <TrustItem title="Secure checkout" detail="Your data protected" />
                <TrustItem title="Easy support" detail="WhatsApp assistance" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:gap-4">
              {heroCats.length ? heroCats.map((category, index) => (
                <Link key={category.id} href={`/category/${category.slug}`} className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-slate-800 ${index === 0 ? "col-span-2 aspect-[2/1]" : "aspect-square"}`}>
                  {category.image ? <SafeImage src={category.image} alt={category.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" fallback={category.name} /> : <div className="flex h-full items-center justify-center bg-slate-800 text-lg font-bold">{category.name}</div>}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-slate-950/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between p-4">
                    <span className="text-base font-extrabold">{category.name}</span>
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-slate-900 transition group-hover:bg-amber-300">→</span>
                  </div>
                </Link>
              )) : <HeroFallback />}
            </div>
          </div>
        </section>

        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-y divide-slate-200 px-4 sm:grid-cols-4 sm:divide-y-0 sm:px-6 lg:px-8">
            <Metric value="Premium" label="Fabric & finishing" />
            <Metric value="COD" label="All over Bangladesh" />
            <Metric value="Fast" label="Dispatch & delivery" />
            <Metric value="Live" label="WhatsApp support" />
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <SectionHeading eyebrow="SHOP YOUR STYLE" title="Categories made for your rotation" href="/categories" />
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {cats.slice(0, 5).map((category) => <CategoryCard key={category.id} category={category} />)}
            {!cats.length ? ["Jersey", "T-Shirt", "Shirt", "Hoodie", "High-Neck"].map((name) => (
              <Link key={name} href="/shop" className="flex aspect-[4/5] items-end rounded-2xl bg-slate-200 p-4 text-base font-extrabold text-slate-900">{name}</Link>
            )) : null}
          </div>
        </section>

        <ProductSection eyebrow="CURATED FOR YOU" title="Featured pieces" href="/shop?featured=1" items={(featured.length ? featured : fallback) as never[]} />

        <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="overflow-hidden rounded-3xl bg-slate-900 px-6 py-7 text-white sm:px-10 sm:py-8 md:grid md:grid-cols-[1fr_auto] md:items-center md:gap-8">
            <div>
              <p className="text-xs font-bold tracking-[.18em] text-amber-300">A BETTER WAY TO ORDER</p>
              <h2 className="mt-3 text-2xl font-black tracking-tight sm:text-3xl">Found your perfect piece?</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Add it to your cart, share your delivery details, and confirm effortlessly on WhatsApp.</p>
            </div>
            <Link href="/shop" className="mt-6 inline-flex rounded-full bg-amber-300 px-5 py-3 text-sm font-extrabold text-slate-950 transition hover:bg-amber-200 md:mt-0">Start shopping →</Link>
          </div>
        </section>

        <ProductSection eyebrow="MOST LOVED" title="Best sellers" href="/shop?best=1" items={(best.length ? best : fallback) as never[]} />
        <ProductSection eyebrow="JUST IN" title="New arrivals" href="/shop?new=1" items={(fresh.length ? fresh : fallback) as never[]} />

        <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
            <div className="max-w-xl"><p className="text-xs font-bold tracking-[.18em] text-slate-500">THE PRIMEKITS PROMISE</p><h2 className="mt-2 text-2xl font-black tracking-tight">Simple shopping. Solid standards.</h2></div>
            <div className="mt-5 grid gap-5 sm:grid-cols-3">
              <PromiseCard title="Full product view" text="Product images are displayed without unnecessary cropping or stretching." />
              <PromiseCard title="Helpful fit support" text="Size charts and customer support make choosing your fit less stressful." />
              <PromiseCard title="Order with confidence" text="Clear order tracking and a responsive support team from checkout onward." />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter settings={settings as never} />
    </div>
  );
}

function SectionHeading({ eyebrow, title, href }: { eyebrow: string; title: string; href: string }) {
  return <div className="flex items-end justify-between gap-4"><div><p className="text-[11px] font-bold tracking-[.18em] text-slate-500">{eyebrow}</p><h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">{title}</h2></div><Link href={href} className="shrink-0 text-sm font-bold text-slate-700 underline-offset-4 hover:text-slate-950 hover:underline">View all →</Link></div>;
}

function ProductSection({ eyebrow, title, href, items }: { eyebrow: string; title: string; href: string; items: { name: string; slug: string; thumbnail?: string | null; images?: string[]; sellingPrice: number | string; discountPrice?: number | string | null; isNewArrival?: boolean; isBestSeller?: boolean }[] }) {
  if (!items.length) return null;
  return <section className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-8 lg:px-8"><SectionHeading eyebrow={eyebrow} title={title} href={href} /><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{items.map((product, index) => <ProductCard key={`${product.slug}-${index}`} p={product as never} />)}</div></section>;
}

function CategoryCard({ category }: { category: typeof categories.$inferSelect }) {
  return <Link href={`/category/${category.slug}`} className="group relative aspect-[4/5] overflow-hidden rounded-2xl bg-slate-200"><SafeImage src={category.image} alt={category.name} className="h-full w-full object-cover object-center transition duration-500 group-hover:scale-105" fallback={category.name} /><div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent" /><span className="absolute bottom-0 left-0 p-4 text-base font-extrabold text-white">{category.name}</span></Link>;
}

function TrustItem({ title, detail }: { title: string; detail: string }) { return <div><div className="font-bold text-white">{title}</div><div className="mt-1 text-[11px] text-slate-400 sm:text-xs">{detail}</div></div>; }
function Metric({ value, label }: { value: string; label: string }) { return <div className="px-3 py-5 text-center sm:px-6"><div className="text-base font-black text-slate-950">{value}</div><div className="mt-0.5 text-[11px] font-medium text-slate-500">{label}</div></div>; }
function PromiseCard({ title, text }: { title: string; text: string }) { return <div><div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 font-black text-amber-700">✓</div><h3 className="mt-3 font-extrabold text-slate-950">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-500">{text}</p></div>; }
function HeroFallback() { return <>{["Jersey", "T-Shirt", "Hoodie", "High-Neck"].map((name, index) => <Link key={name} href="/shop" className={`flex items-end rounded-2xl bg-slate-800 p-4 text-base font-extrabold ${index === 0 ? "col-span-2 aspect-[2/1]" : "aspect-square"}`}>{name}</Link>)}</>; }
