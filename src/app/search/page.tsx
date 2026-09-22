"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { SiteHeader, SiteFooter } from "@/components/store";

function Inner() {
  const sp = useSearchParams();
  const router = useRouter();
  const [settings, setSettings] = useState<Record<string, string>>({ businessName: "PrimeKits Studio" });
  const [q, setQ] = useState(sp.get("q") || "");

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => d.settings && setSettings(d.settings)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen">
      <SiteHeader settings={settings as never} />
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-black">Search Products</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            router.push(`/shop?q=${encodeURIComponent(q)}`);
          }}
          className="mt-4 flex gap-2"
        >
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, SKU…" autoFocus className="w-full rounded-2xl border px-4 py-3" />
          <button className="rounded-2xl bg-slate-900 px-6 font-bold text-white">Search</button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          {["Jersey", "T-Shirt", "Hoodie", "High-Neck", "Shirt"].map((t) => (
            <button key={t} onClick={() => router.push(`/shop?q=${encodeURIComponent(t)}`)} className="rounded-full border bg-white px-4 py-1.5 font-bold">{t}</button>
          ))}
        </div>
      </div>
      <SiteFooter settings={settings as never} />
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading…</div>}>
      <Inner />
    </Suspense>
  );
}
