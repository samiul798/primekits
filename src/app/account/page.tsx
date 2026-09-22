"use client";

import { useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/store";
import { useEffect } from "react";
import { statusLabel } from "@/lib/utils";

export default function AccountPage() {
  const [settings, setSettings] = useState<Record<string, string>>({ businessName: "PrimeKits Studio" });
  const [mobile, setMobile] = useState("");
  const [orders, setOrders] = useState<{ orderNumber: string; status: string; grandTotal: number; createdAt: string }[]>([]);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => d.settings && setSettings(d.settings)).catch(() => {});
    const saved = localStorage.getItem("pks_mobile");
    if (saved) {
      setMobile(saved);
      lookup(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function lookup(m?: string) {
    const q = (m ?? mobile).trim();
    if (!q) return setMsg("Enter your mobile number.");
    const r = await fetch(`/api/orders/track?q=${encodeURIComponent(q)}`);
    const d = await r.json();
    if (r.ok) {
      setOrders(d.orders || []);
      localStorage.setItem("pks_mobile", q);
      if ((d.orders || []).length === 0) setMsg("No orders found for this number.");
      else setMsg("");
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader settings={settings as never} />
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-black">My Orders</h1>
        <p className="text-sm text-slate-500">Enter your mobile number to see all your orders (no password needed).</p>
        <form onSubmit={(e) => { e.preventDefault(); lookup(); }} className="mt-4 flex gap-2">
          <input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="01XXXXXXXXX" className="w-full rounded-2xl border px-4 py-3" />
          <button className="rounded-2xl bg-slate-900 px-6 font-bold text-white">View</button>
        </form>
        {msg ? <div className="mt-3 text-sm font-bold">{msg}</div> : null}
        <div className="mt-4 space-y-2">
          {orders.map((o) => (
            <div key={o.orderNumber} className="flex items-center justify-between rounded-2xl border bg-white p-3 text-sm">
              <div>
                <div className="font-black">{o.orderNumber}</div>
                <div className="text-xs text-slate-500">{new Date(o.createdAt).toLocaleDateString("en-GB")} • ৳{Number(o.grandTotal).toLocaleString("en-IN")}</div>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold">{statusLabel(o.status)}</span>
            </div>
          ))}
        </div>
      </div>
      <SiteFooter settings={settings as never} />
    </div>
  );
}
