"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteHeader, SiteFooter } from "@/components/store";
import { useCart } from "@/components/CartProvider";
import { DIVISIONS, PAYMENT_METHODS } from "@/lib/utils";
import { SafeImage } from "@/components/safe-image";

export default function CheckoutPage() {
  const { items, subtotal, updateQty, removeItem, clear } = useCart();
  const [settings, setSettings] = useState<Record<string, number | string>>({ businessName: "PrimeKits Studio", deliveryInsideDhaka: 60, deliveryOutsideDhaka: 130, deliverySubDhaka: 100 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [onlinePayments, setOnlinePayments] = useState({ bkash: false, nagad: false });
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
    fetch("/api/payments/status")
      .then((r) => r.json())
      .then((d) => setOnlinePayments({ bkash: Boolean(d.providers?.bkash?.enabled), nagad: Boolean(d.providers?.nagad?.enabled) }))
      .catch(() => {});
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
      const orderData = {
        ...d,
        paymentMethod: d.paymentMethod || form.paymentMethod,
        paymentStatus: d.paymentStatus || (form.paymentMethod === "cod" ? "unpaid" : "pending"),
      };
      try {
        sessionStorage.setItem("pks_last_order", JSON.stringify(orderData));
      } catch {}
      clear();
      if (d.paymentStartUrl) {
        const payment = await fetch(d.paymentStartUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId: d.orderId }),
        });
        const paymentData = await payment.json();
        if (payment.ok && paymentData.redirectUrl) {
          window.location.href = paymentData.redirectUrl;
          return;
        }
        sessionStorage.setItem("pks_payment_error", paymentData.error || "bKash payment could not be started.");
        window.location.href = `/order-success?order=${encodeURIComponent(d.orderNumber)}&payment=pending`;
        return;
      }
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
      <div className="checkout-shell mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <div className="border-b border-slate-200 pb-5">
          <p className="text-[11px] font-bold tracking-[.16em] text-sky-700">SECURE CHECKOUT</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-3"><div><h1 className="text-3xl font-black tracking-tight">Complete your order</h1><p className="mt-1 text-sm text-slate-600">Enter your delivery details and choose a payment method.</p></div><Link href="/cart" className="text-sm font-bold text-slate-700 underline underline-offset-4">Back to cart</Link></div>
        </div>
        {items.length === 0 ? (
          <div className="mt-6 rounded-2xl border bg-white p-10 text-center">
            <div className="font-extrabold">Cart is empty</div>
            <Link href="/shop" className="mt-3 inline-block border border-slate-900 bg-slate-900 px-5 py-2 text-sm font-bold text-white">Go to Shop</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="checkout-form mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-5">
              <div className="checkout-section border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="checkout-section-heading"><span>01</span><div><div className="font-extrabold">Contact information</div><p>Your name and the best number to reach you.</p></div></div>
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
              <div className="checkout-section border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="checkout-section-heading"><span>02</span><div><div className="font-extrabold">Delivery address</div><p>Use the address where you want the order delivered.</p></div></div>
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
                        <button type="button" key={v} onClick={() => set("deliveryZone", v)} className={`checkout-choice border px-2 py-3 text-xs font-bold ${form.deliveryZone === v ? "border-sky-800 bg-sky-800 text-white" : "border-slate-200 bg-white text-slate-700"}`}>{l}</button>
                      ))}
                    </div>
                  </label>
                  <label className="sm:col-span-2">Order Notes
                    <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Any instruction… (optional)" rows={2} className="mt-1 w-full rounded-xl border px-3 py-2.5" />
                  </label>
                </div>
              </div>
              <div className="checkout-section border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="checkout-section-heading"><span>03</span><div><div className="font-extrabold">Payment method</div><p>Select your preferred way to pay.</p></div></div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {PAYMENT_METHODS.map(({ value, label }) => (
                    <button type="button" key={value} onClick={() => set("paymentMethod", value)} className={`checkout-choice border px-3 py-3 text-sm font-bold ${form.paymentMethod === value ? "border-sky-800 bg-sky-800 text-white" : "border-slate-200 bg-white text-slate-700"}`}>{label}</button>
                  ))}
                </div>
                <label className="mt-3 block">Coupon Code (if any)
                  <input value={form.couponCode} onChange={(e) => set("couponCode", e.target.value.toUpperCase())} placeholder="Enter a code" className="mt-1 w-full rounded-xl border px-3 py-2.5 uppercase" />
                </label>
              </div>
              {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">{error}</div> : null}
            </div>
            <aside className="checkout-summary h-fit border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-24 sm:p-6">
              <div className="flex items-center justify-between border-b border-slate-200 pb-4"><div><p className="text-[11px] font-bold tracking-[.14em] text-sky-700">YOUR ORDER</p><div className="mt-1 font-extrabold">Order summary</div></div><span className="text-xs text-slate-500">{items.length} item{items.length === 1 ? "" : "s"}</span></div>
              <div className="mt-2 max-h-64 space-y-2 overflow-y-auto">
                {items.map((i) => (
                  <div key={`${i.productId}-${i.variantId}`} className="flex gap-2 text-xs">
                    {i.image ? (
                       
                      <SafeImage src={i.image} alt={`${i.name} thumbnail`} className="h-10 w-10 shrink-0 rounded-lg bg-slate-100 object-contain" fallback="Image unavailable" />
                    ) : null}
                    <div className="flex-1">
                      <div className="font-bold">{i.name} {i.variationLabel ? `(${i.variationLabel})` : ""}</div>
                      <div className="text-slate-500">{i.quantity} × ৳{i.unitPrice.toLocaleString("en-IN")}</div>
                      <div className="mt-1 flex items-center gap-1">
                        <button type="button" onClick={() => updateQty(i.productId, i.variantId, i.quantity - 1)} className="h-6 w-6 rounded-md border font-black leading-none hover:bg-slate-100" aria-label={`Decrease ${i.name}`}>−</button>
                        <span className="min-w-6 text-center text-xs font-bold">{i.quantity}</span>
                        <button type="button" onClick={() => updateQty(i.productId, i.variantId, i.quantity + 1)} disabled={i.quantity >= i.maxStock} className="h-6 w-6 rounded-md border font-black leading-none hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40" aria-label={`Increase ${i.name}`}>+</button>
                        <button type="button" onClick={() => removeItem(i.productId, i.variantId)} className="ml-1 px-1 text-[11px] font-bold text-rose-600 hover:underline">Remove</button>
                      </div>
                    </div>
                    <div className="font-bold">৳{(i.quantity * i.unitPrice).toLocaleString("en-IN")}</div>
                  </div>
                ))}
              </div>
              <div className="mt-5 space-y-2 border-t border-slate-200 pt-4 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><b>BDT {subtotal.toLocaleString("en-IN")}</b></div>
                <div className="flex justify-between"><span>Delivery</span><b>BDT {deliveryCharge.toLocaleString("en-IN")}</b></div>
                <div className="flex justify-between border-t border-slate-200 pt-3 text-lg font-black"><span>Total</span><span>BDT {(subtotal + deliveryCharge).toLocaleString("en-IN")}</span></div>
              </div>
              <button disabled={loading} className="mt-5 w-full bg-emerald-700 px-4 py-4 text-sm font-extrabold text-white hover:bg-emerald-600 disabled:opacity-50">
                {loading ? "Placing order…" : "Place order via WhatsApp"}
              </button>
              <p className="mt-3 text-[11px] leading-5 text-slate-500">By ordering, you agree to our Terms and Return Policy. Stock and price are revalidated on the server.</p>
            </aside>
          </form>
        )}
      </div>
      <SiteFooter settings={settings as unknown as never} />
    </div>
  );
}
