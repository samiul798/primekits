"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { SiteHeader, SiteFooter } from "@/components/store";
import { statusLabel } from "@/lib/utils";

type Order = {
  orderNumber: string;
  customerName: string;
  mobile: string;
  status: string;
  paymentStatus: string;
  grandTotal: number;
  createdAt: string;
  trackingId?: string | null;
  courierName?: string | null;
  courierStatus?: string | null;
  items: { productName: string; variationLabel?: string | null; quantity: number; unitPrice: number }[];
  history: { prevStatus?: string | null; newStatus: string; createdAt: string; note?: string | null }[];
};

function Inner() {
  const sp = useSearchParams();
  const [settings, setSettings] = useState<Record<string, string>>({ businessName: "PrimeKits Studio" });
  const [q, setQ] = useState(sp.get("q") || "");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => d.settings && setSettings(d.settings)).catch(() => {});
    const init = sp.get("q");
    if (init) lookup(init);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function lookup(val?: string) {
    const query = (val ?? q).trim();
    if (!query) return setMsg("Enter your order number (e.g. PKS-20260912-0001) or mobile number.");
    setLoading(true);
    setMsg("");
    try {
      const r = await fetch(`/api/orders/track?q=${encodeURIComponent(query)}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Lookup failed");
      setOrders(d.orders || []);
      if ((d.orders || []).length === 0) setMsg("No order found. Check the order number or mobile number.");
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Lookup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader settings={settings as never} />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-black">Track Your Order</h1>
        <p className="text-sm text-slate-500">Enter order number or mobile number used at checkout.</p>
        <form onSubmit={(e) => { e.preventDefault(); lookup(); }} className="mt-4 flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="PKS-20260912-0001 or 01XXXXXXXXX" className="w-full rounded-2xl border px-4 py-3" />
          <button disabled={loading} className="rounded-2xl bg-slate-900 px-6 font-bold text-white disabled:opacity-50">{loading ? "…" : "Track"}</button>
        </form>
        {msg ? <div className="mt-3 rounded-xl bg-amber-50 border px-3 py-2 text-sm font-bold">{msg}</div> : null}
        <div className="mt-6 space-y-4">
          {orders.map((o) => (
            <div key={o.orderNumber} className="rounded-2xl border bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="font-black">{o.orderNumber}</div>
                  <div className="text-xs text-slate-500">{new Date(o.createdAt).toLocaleString("en-GB")} • {o.customerName} • {o.mobile}</div>
                </div>
                <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">{statusLabel(o.status)}</span>
              </div>
              <div className="mt-3 space-y-1 text-sm">
                {o.items.map((it, i) => (
                  <div key={i} className="flex justify-between gap-2 border-b border-slate-100 pb-1">
                    <span>{it.productName} {it.variationLabel ? `(${it.variationLabel})` : ""} × {it.quantity}</span>
                    <b>৳{(it.unitPrice * it.quantity).toLocaleString("en-IN")}</b>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-slate-100 px-2 py-1">Total: <b>৳{Number(o.grandTotal).toLocaleString("en-IN")}</b></span>
                <span className="rounded-full bg-slate-100 px-2 py-1">Payment: <b>{o.paymentStatus}</b></span>
                {o.courierName ? <span className="rounded-full bg-slate-100 px-2 py-1">Courier: <b>{o.courierName}</b></span> : null}
                {o.trackingId ? <span className="rounded-full bg-slate-100 px-2 py-1">Tracking: <b>{o.trackingId}</b></span> : null}
                {o.courierStatus ? <span className="rounded-full bg-slate-100 px-2 py-1">Courier status: <b>{o.courierStatus}</b></span> : null}
              </div>
              {o.history?.length ? (
                <details className="mt-3">
                  <summary className="cursor-pointer text-xs font-bold text-slate-500">Status history ({o.history.length})</summary>
                  <ul className="mt-2 space-y-1 text-xs text-slate-600">
                    {o.history.map((h, i) => (
                      <li key={i}>• {h.prevStatus || "—"} → <b>{h.newStatus}</b> ({new Date(h.createdAt).toLocaleString("en-GB")}){h.note ? ` — ${h.note}` : ""}</li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </div>
          ))}
        </div>
      </div>
      <SiteFooter settings={settings as never} />
    </div>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading…</div>}>
      <Inner />
    </Suspense>
  );
}
