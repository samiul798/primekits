"use client";

import { useEffect, useState } from "react";

type Review = { id: string; customerName: string; rating: number; comment?: string | null; isApproved: boolean; createdAt: string; productName?: string | null };

export default function ReviewsPage() {
  const [items, setItems] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/admin/reviews", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) {
        setError(d.error || "Could not load reviews");
        return;
      }
      setItems(d.reviews || []);
    } catch {
      setError("Could not load reviews");
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);
  async function approve(id: string, isApproved: boolean) {
    const r = await fetch("/api/admin/reviews", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, isApproved }) });
    if (r.ok) setItems((rows) => rows.map((row) => row.id === id ? { ...row, isApproved } : row));
  }
  async function remove(id: string) {
    if (!confirm("Delete this review permanently?")) return;
    const r = await fetch(`/api/admin/reviews?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    if (r.ok) setItems((rows) => rows.filter((row) => row.id !== id));
  }
  return <div className="space-y-4"><div className="flex items-center gap-3"><h1 className="text-xl font-black">Customer Reviews</h1><button onClick={() => void load()} className="ml-auto rounded-xl border bg-white px-3 py-2 text-sm font-bold">Refresh</button></div><p className="text-sm text-slate-500">Reviews are published immediately; use this page to hide or delete inappropriate ones.</p><div className="grid gap-3">{loading ? <div className="rounded-2xl border bg-white p-5">Loading…</div> : items.map((r) => <article key={r.id} className="rounded-2xl border bg-white p-4"><div className="flex flex-wrap items-start gap-2"><div className="min-w-0 flex-1"><div className="font-bold">{r.customerName} <span className="text-amber-500">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span></div><div className="text-xs text-slate-500">{r.productName || "Deleted product"} · {new Date(r.createdAt).toLocaleString()}</div></div><span className={`rounded-full px-2 py-1 text-xs font-bold ${r.isApproved ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{r.isApproved ? "Published" : "Hidden"}</span></div>{r.comment ? <p className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{r.comment}</p> : null}<div className="mt-3 flex gap-2"><button onClick={() => void approve(r.id, !r.isApproved)} className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white">{r.isApproved ? "Hide" : "Publish"}</button><button onClick={() => void remove(r.id)} className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-bold text-rose-600">Delete</button></div></article>)}{!loading && items.length === 0 ? <div className="rounded-2xl border bg-white p-8 text-center text-slate-500">No customer reviews yet.</div> : null}</div></div>;
}
