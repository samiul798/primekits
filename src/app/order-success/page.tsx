"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { SiteHeader, SiteFooter } from "@/components/store";

function Inner() {
  const sp = useSearchParams();
  const orderNo = sp.get("order") || "";
  const [settings, setSettings] = useState<Record<string, string>>({ businessName: "PrimeKits Studio", whatsapp: "" });
  const [data, setData] = useState<{ whatsappUrl?: string; message?: string; grandTotal?: number } | null>(null);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => d.settings && setSettings(d.settings)).catch(() => {});
    try {
      const raw = sessionStorage.getItem("pks_last_order");
      if (raw) setData(JSON.parse(raw));
    } catch {}
  }, []);

  function openWhatsApp() {
    if (data?.whatsappUrl) {
      window.open(data.whatsappUrl, "_blank");
      try {
        fetch(`/api/orders/track?q=${encodeURIComponent(orderNo)}`).catch(() => {});
      } catch {}
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader settings={settings as never} />
      <div className="mx-auto max-w-2xl px-4 py-10 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">✅</div>
        <h1 className="mt-4 text-2xl font-black">Order Placed Successfully!</h1>
        <p className="mt-1 text-sm text-slate-500">Your order has been created in our system.</p>
        {orderNo ? (
          <div className="mx-auto mt-4 max-w-sm rounded-2xl border-2 border-dashed border-slate-300 bg-white p-4">
            <div className="text-xs text-slate-500">ORDER NUMBER</div>
            <div className="text-xl font-black tracking-wide">{orderNo}</div>
            {data?.grandTotal ? <div className="mt-1 text-sm font-bold">Total: ৳{Number(data.grandTotal).toLocaleString("en-IN")} (Cash on Delivery)</div> : null}
          </div>
        ) : null}
        <div className="mt-6 rounded-2xl border bg-amber-50 p-4 text-left text-sm">
          <div className="font-extrabold">📲 Final step — Confirm on WhatsApp (important!)</div>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-slate-700">
            <li>Tap the green button below to open WhatsApp.</li>
            <li>Your order details are already written — just press <b>Send</b>.</li>
            <li>Our team will confirm your order & delivery charge on WhatsApp.</li>
          </ol>
          <p className="mt-2 text-xs text-slate-500">Note: Opening WhatsApp does not auto-confirm. Our admin verifies every order (status: Pending WhatsApp Confirmation → Confirmed).</p>
        </div>
        {data?.whatsappUrl ? (
          <button onClick={openWhatsApp} className="mt-4 w-full rounded-2xl bg-[#25D366] px-6 py-4 text-base font-extrabold text-white hover:brightness-95">
            💬 Confirm Order on WhatsApp
          </button>
        ) : (
          <Link href="/track" className="mt-4 block w-full rounded-2xl bg-slate-900 px-6 py-4 text-base font-extrabold text-white">Track Your Order</Link>
        )}
        {data?.message ? (
          <details className="mt-4 rounded-2xl border bg-white p-3 text-left">
            <summary className="cursor-pointer text-sm font-bold">Preview WhatsApp message</summary>
            <pre className="mt-2 whitespace-pre-wrap text-xs text-slate-600">{data.message}</pre>
          </details>
        ) : null}
        <div className="mt-6 flex justify-center gap-3">
          <Link href={`/track?q=${encodeURIComponent(orderNo)}`} className="rounded-full border px-5 py-2 text-sm font-bold">Track Order</Link>
          <Link href="/shop" className="rounded-full bg-slate-900 px-5 py-2 text-sm font-bold text-white">Continue Shopping</Link>
        </div>
      </div>
      <SiteFooter settings={settings as never} />
    </div>
  );
}

export default function OrderSuccessPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center">Loading…</div>}>
      <Inner />
    </Suspense>
  );
}
