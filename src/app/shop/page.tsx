"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { SiteHeader, SiteFooter, ProductCard } from "@/components/store";
import { StickyCartBar } from "@/components/home-client";

type P = {
  id: string;
  name: string;
  slug: string;
  thumbnail?: string | null;
  images?: string[];
  sellingPrice: number;
  discountPrice?: number | null;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
};

function ShopInner() {
  const sp = useSearchParams();
  const [settings, setSettings] = useState<Record<string, string>>({ businessName: "PrimeKits Studio" });
  const [cats, setCats] = useState<{ name: string; slug: string }[]>([]);
  const [items, setItems] = useState<P[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState(sp.get("q") || "");
  const [category, setCategory] = useState(sp.get("category") || "");
  const [sort, setSort] = useState("newest");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [size, setSize] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => d.settings && setSettings(d.settings)).catch(() => {});
    fetch("/api/categories").then((r) => r.json()).then((d) => setCats(d.categories || [])).catch(() => {});
  }, []);

  useEffect(() => {
    setQ(sp.get("q") || "");
    setCategory(sp.get("category") || sp.get("featured") ? "" : sp.get("category") || "");
  }, [sp]);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (category) params.set("category", category);
      if (sort) params.set("sort", sort);
      if (minPrice) params.set("minPrice", minPrice);
      if (maxPrice) params.set("maxPrice", maxPrice);
      if (size) params.set("size", size);
      const feat = sp.get("featured");
      const best = sp.get("best");
      const isNew = sp.get("new");
      if (feat) params.set("featured", feat);
      if (best) params.set("best", best);
      if (isNew) params.set("new", isNew);
      params.set("page", String(page));
      params.set("limit", "20");
      const r = await fetch(`/api/products?${params.toString()}`);
      const d = await r.json();
      setItems(d.products || []);
      setTotal(d.total || 0);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, sort, page]);

  return (
    <div className="min-h-screen pb-20">
      <SiteHeader settings={settings as never} />
      <div className="mx-auto max-w-7xl px-4 py-6">
        <h1 className="text-2xl font-black">Shop</h1>
        <p className="text-sm text-slate-500">{total} products • Cash on Delivery • BDT (৳)</p>

        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            load();
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search jersey, t-shirt, hoodie…"
            className="w-full rounded-2xl border border-slate-300 px-4 py-2.5 outline-none focus:border-slate-900"
          />
          <button className="rounded-2xl bg-slate-900 px-5 font-bold text-white">Search</button>
        </form>

        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={() => { setCategory(""); setPage(1); }} className={`rounded-full px-4 py-1.5 text-sm font-bold ${!category ? "bg-slate-900 text-white" : "bg-white border"}`}>All</button>
          {cats.map((c) => (
            <button key={c.slug} onClick={() => { setCategory(c.slug); setPage(1); }} className={`rounded-full px-4 py-1.5 text-sm font-bold ${category === c.slug ? "bg-slate-900 text-white" : "bg-white border"}`}>{c.name}</button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5">
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="rounded-xl border px-3 py-2">
            <option value="newest">Newest</option>
            <option value="price_asc">Price: Low → High</option>
            <option value="price_desc">Price: High → Low</option>
            <option value="popular">Popularity</option>
          </select>
          <select value={size} onChange={(e) => { setSize(e.target.value); setPage(1); }} className="rounded-xl border px-3 py-2">
            <option value="">All Sizes</option>
            {["S", "M", "L", "XL", "XXL"].map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <input value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="Min ৳" inputMode="numeric" className="rounded-xl border px-3 py-2" />
          <input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Max ৳" inputMode="numeric" className="rounded-xl border px-3 py-2" />
          <button onClick={() => { setPage(1); load(); }} className="rounded-xl border bg-white px-3 py-2 font-bold">Apply</button>
        </div>

        {loading ? (
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-2xl bg-slate-200" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-10 rounded-2xl border bg-white p-10 text-center">
            <div className="text-4xl">🔍</div>
            <div className="mt-2 font-extrabold">No products found</div>
            <p className="text-sm text-slate-500">Try a different search or category.</p>
            <Link href="/shop" className="mt-4 inline-block rounded-full bg-slate-900 px-5 py-2 text-sm font-bold text-white">Clear filters</Link>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((p) => <ProductCard key={p.id} p={p as never} />)}
          </div>
        )}

        {total > 20 ? (
          <div className="mt-6 flex items-center justify-center gap-3">
            <button disabled={page <= 1} onClick={() => setPage((x) => x - 1)} className="rounded-full border px-4 py-2 text-sm font-bold disabled:opacity-40">← Prev</button>
            <span className="text-sm font-bold">Page {page} of {Math.ceil(total / 20)}</span>
            <button disabled={page >= Math.ceil(total / 20)} onClick={() => setPage((x) => x + 1)} className="rounded-full border px-4 py-2 text-sm font-bold disabled:opacity-40">Next →</button>
          </div>
        ) : null}
      </div>
      <SiteFooter settings={settings as never} />
      <StickyCartBar />
    </div>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading shop…</div>}>
      <ShopInner />
    </Suspense>
  );
}
