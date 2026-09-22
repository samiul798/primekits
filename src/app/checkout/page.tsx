"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteHeader, SiteFooter } from "@/components/store";
import { useCart } from "@/components/CartProvider";
import { DIVISIONS } from "@/lib/utils";
import { SafeImage } from "@/components/safe-image";

export default function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const [settings, setSettings] = useState<Record<string, number | string>>({ businessName: "PrimeKits Studio", deliveryInsideDhaka: 60, deliveryOutsideDhaka: 130, deliverySubDhaka: 100 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    customerName: "",
    mobile: "",
    whatsapp: "",
    email: "",
    address: "",
    division: "Dhaka",
    district: "",
    thana: "",
    postal: "",
    deliveryZone: "outside_dhaka",
    notes: "",
    paymentMethod: "cod",
    couponCode: "",
  });

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => d.settings && setSettings(d.settings)).catch(() => {});
  }, []);

  const deliveryCharge =
    form.deliveryZone === "inside_dhaka"
      ? Number(settings.deliveryInsideDhaka || 60)
      : form.deliveryZone === "sub_dhaka"
        ? Number(settings.deliverySubDhaka || 100)
        : Number(settings.deliveryOutsideDhaka || 130);

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (items.length === 0) return setError("Your cart is empty.");
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          email: form.email || null,
          whatsapp: form.whatsapp || null,
          postal: form.postal || null,
          notes: form.notes || null,
          couponCode: form.couponCode || null,
          items: items.map((i) => ({ productId: i.productId, variantId: i.variantId || null, quantity: i.quantity })),
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        const detail = Array.isArray(d.issues) ? d.issues.map((issue: { message?: string }) => issue.message).filter(Boolean).join(" • ") : "";
        throw new Error(detail || d.error || "Checkout failed");
      }
      try {
        sessionStorage.setItem("pks_last_order", JSON.stringify(d));
      } catch {}
      clear();
      window.location.href = `/order-success?order=${d.orderNumber}`;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader settings={settings as unknown as never} />
      <div className="mx-auto max-w-5xl px-4 py-6">
        <h1 className="text-2xl font-black">Checkout</h1>
        <p className="text-sm text-slate-500">Fill delivery info → Place order → Confirm on WhatsApp</p>
        {items.length === 0 ? (
          <div className="mt-6 rounded-2xl border bg-white p-10 text-center">
            <div className="font-extrabold">Cart is empty</div>
            <Link href="/shop" className="mt-3 inline-block rounded-full bg-slate-900 px-5 py-2 text-sm font-bold text-white">Go to Shop</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-4 grid gap-4 md:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              <div className="rounded-2xl border bg-white p-4">
                <div className="font-extrabold">1. Contact Information</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="sm:col-span-2">Full Name *
                    <input required value={form.customerName} onChange={(e) => set("customerName", e.target.value)} placeholder="e.g. Tanvir Hasan" className="mt-1 w-full rounded-xl border px-3 py-2.5" />
                  </label>
                  <label>Mobile Number * <span className="text-xs text-slate-400">(01XXXXXXXXX)</span>
                    <input required value={form.mobile} onChange={(e) => set("mobile", e.target.value)} placeholder="01XXXXXXXXX" inputMode="tel" className="mt-1 w-full rounded-xl border px-3 py-2.5" />
                  </label>
                  <label>WhatsApp Number
                    <input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="Same as mobile if empty" inputMode="tel" className="mt-1 w-full rounded-xl border px-3 py-2.5" />
                  </label>
                  <label className="sm:col-span-2">Email (optional)
                    <input value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@email.com" type="email" className="mt-1 w-full rounded-xl border px-3 py-2.5" />
                  </label>
                </div>
              </div>
              <div className="rounded-2xl border bg-white p-4">
                <div className="font-extrabold">2. Delivery Address</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="sm:col-span-2">Full Address *
                    <textarea required value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="House, Road, Area…" rows={2} className="mt-1 w-full rounded-xl border px-3 py-2.5" />
                  </label>
                  <label>Division *
                    <select value={form.division} onChange={(e) => set("division", e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2.5">
                      {DIVISIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </label>
                  <label>District *
                    <input required value={form.district} onChange={(e) => set("district", e.target.value)} placeholder="e.g. Dhaka" className="mt-1 w-full rounded-xl border px-3 py-2.5" />
                  </label>
                  <label>Area / Thana *
                    <input required value={form.thana} onChange={(e) => set("thana", e.target.value)} placeholder="e.g. Dhanmondi" className="mt-1 w-full rounded-xl border px-3 py-2.5" />
                  </label>
                  <label>Postal Code
                    <input value={form.postal} onChange={(e) => set("postal", e.target.value)} placeholder="e.g. 1205" className="mt-1 w-full rounded-xl border px-3 py-2.5" />
                  </label>
                  <label className="sm:col-span-2">Delivery Zone *
                    <div className="mt-1 grid grid-cols-3 gap-2">
                      {[
                        ["inside_dhaka", `Inside Dhaka (৳${settings.deliveryInsideDhaka})`],
                        ["sub_dhaka", `Sub-Dhaka (৳${settings.deliverySubDhaka})`],
                        ["outside_dhaka", `Outside Dhaka (৳${settings.deliveryOutsideDhaka})`],
                      ].map(([v, l]) => (
                        <button type="button" key={v} onClick={() => set("deliveryZone", v)} className={`rounded-xl border px-2 py-2 text-xs font-bold ${form.deliveryZone === v ? "border-slate-900 bg-slate-900 text-white" : "bg-white"}`}>{l}</button>
                      ))}
                    </div>
                  </label>
                  <label className="sm:col-span-2">Order Notes
                    <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Any instruction… (optional)" rows={2} className="mt-1 w-full rounded-xl border px-3 py-2.5" />
                  </label>
                </div>
              </div>
              <div className="rounded-2xl border bg-white p-4">
                <div className="font-extrabold">3. Payment Method</div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {[
                    ["cod", "Cash on Delivery"],
                    ["bkash", "bKash"],
                    ["nagad", "Nagad"],
                    ["bank", "Bank Transfer"],
                    ["advance", "Advance"],
                    ["partial", "Partial"],
                  ].map(([v, l]) => (
                    <button type="button" key={v} onClick={() => set("paymentMethod", v)} className={`rounded-xl border px-3 py-2.5 text-sm font-bold ${form.paymentMethod === v ? "border-slate-900 bg-slate-900 text-white" : "bg-white"}`}>{l}</button>
                  ))}
                </div>
                <label className="mt-3 block">Coupon Code (if any)
                  <input value={form.couponCode} onChange={(e) => set("couponCode", e.target.value.toUpperCase())} placeholder="WELCOME50" className="mt-1 w-full rounded-xl border px-3 py-2.5 uppercase" />
                </label>
              </div>
              {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</div> : null}
            </div>
            <div className="h-fit rounded-2xl border bg-white p-4 md:sticky md:top-24">
              <div className="font-extrabold">Order Summary</div>
              <div className="mt-2 max-h-64 space-y-2 overflow-y-auto">
                {items.map((i) => (
                  <div key={`${i.productId}-${i.variantId}`} className="flex gap-2 text-xs">
                    {i.image ? (
                       
                      <SafeImage src={i.image} alt={`${i.name} thumbnail`} className="h-10 w-10 shrink-0 rounded-lg bg-slate-100 object-contain" fallback="👕" />
                    ) : null}
                    <div className="flex-1">
                      <div className="font-bold">{i.name} {i.variationLabel ? `(${i.variationLabel})` : ""}</div>
                      <div className="text-slate-500">{i.quantity} × ৳{i.unitPrice.toLocaleString("en-IN")}</div>
                    </div>
                    <div className="font-bold">৳{(i.quantity * i.unitPrice).toLocaleString("en-IN")}</div>
                  </div>
                ))}
              </div>
              <div className="mt-3 space-y-1 border-t pt-2 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><b>৳{subtotal.toLocaleString("en-IN")}</b></div>
                <div className="flex justify-between"><span>Delivery</span><b>৳{deliveryCharge.toLocaleString("en-IN")}</b></div>
                <div className="flex justify-between text-base font-black"><span>Total</span><span>৳{(subtotal + deliveryCharge).toLocaleString("en-IN")}</span></div>
              </div>
              <button disabled={loading} className="mt-3 w-full rounded-2xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-emerald-500 disabled:opacity-50">
                {loading ? "Placing order…" : "✅ Place Order via WhatsApp"}
              </button>
              <p className="mt-2 text-[11px] text-slate-500">By ordering you agree to our Terms & Return Policy. Stock & price are revalidated on the server.</p>
            </div>
          </form>
        )}
      </div>
      <SiteFooter settings={settings as unknown as never} />
    </div>
  );
}
