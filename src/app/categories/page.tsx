import Link from "next/link";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSettings } from "@/lib/settings";
import { SiteHeader, SiteFooter } from "@/components/store";
import { SafeImage } from "@/components/safe-image";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const settings = await getSettings();
  let cats: typeof categories.$inferSelect[] = [];
  try {
    cats = await db.select().from(categories).where(eq(categories.isActive, true)).limit(50);
  } catch {}
  return (
    <div className="min-h-screen">
      <SiteHeader settings={settings as never} />
      <div className="mx-auto max-w-7xl px-4 py-8">
        <h1 className="text-2xl font-black">Categories</h1>
        <p className="text-sm text-slate-500">Apparel collections at PrimeKits Studio</p>
        {cats.length === 0 ? (
          <div className="mt-6 rounded-2xl border bg-white p-10 text-center text-slate-500">No categories yet.</div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {cats.map((c) => (
              <Link key={c.id} href={`/category/${c.slug}`} className="overflow-hidden rounded-2xl border bg-white hover:shadow-lg">
                {c.image ? (
                  <SafeImage src={c.image} alt={c.name} className="h-44 w-full bg-slate-100 object-cover" fallback="👕" />
                ) : (
                  <div className="flex h-44 items-center justify-center bg-slate-100 text-4xl">👕</div>
                )}
                <div className="p-3">
                  <div className="font-extrabold">{c.name}</div>
                  <div className="text-xs text-slate-500 line-clamp-2">{c.description}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
      <SiteFooter settings={settings as never} />
    </div>
  );
}
