"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SiteHeader, SiteFooter } from "@/components/store";
import { useCart } from "@/components/CartProvider";
import { SafeImage } from "@/components/safe-image";

export default function CartPage() {
  const { items, updateQty, removeItem, clear, subtotal } = useCart();
  const [settings, setSettings] = useState<Record<string, string>>({ businessName: "PrimeKits Studio" });
  const [delivery, setDelivery] = useState(130);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => {
      if (d.settings) {
        setSettings(d.settings);
        setDelivery(Number(d.settings.deliveryOutsideDhaka || 130));
      }
    }).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen">
      <SiteHeader settings={settings as never} />
      <div className="mx-auto max-w-4xl px-4 py-6">
        <h1 className="text-2xl font-black">Shopping Cart ({items.length})</h1>
        {items.length === 0 ? (
          <div className="mt-6 rounded-2xl border bg-white p-10 text-center">
            <div className="text-5xl">🛒</div>
            <div className="mt-2 font-extrabold">Your cart is empty</div>
            <p className="text-sm text-slate-500">Add some premium apparel to get started.</p>
            <Link href="/shop" className="mt-4 inline-block rounded-full bg-slate-900 px-6 py-2.5 text-sm font-bold text-white">Continue Shopping</Link>
          </div>
        ) : (
          <div className="mt-4 grid gap-4 md:grid-cols-[1fr_300px]">
            <div className="space-y-3">
              {items.map((it) => (
                <div key={`${it.productId}-${it.variantId}`} className="flex gap-3 rounded-2xl border bg-white p-3">
                  <Link href={`/product/${it.slug}`}>
                    {it.image ? (
                       
                      <SafeImage src={it.image} alt={it.name} className="h-20 w-20 rounded-xl bg-slate-100 object-contain" fallback="👕" />
                    ) : (
                      <span className="flex h-20 w-20 items-center justify-center rounded-xl bg-slate-100 text-3xl">👕</span>
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={`/product/${it.slug}`} className="line-clamp-2 text-sm font-bold">{it.name}</Link>
                    {it.variationLabel ? <div className="text-xs text-slate-500">Size/Color: {it.variationLabel}</div> : null}
                    {it.sku ? <div className="text-xs text-slate-400">SKU: {it.sku}</div> : null}
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center rounded-xl border">
                        <button onClick={() => updateQty(it.productId, it.variantId, it.quantity - 1)} className="px-3 py-1 font-bold">−</button>
                        <span className="min-w-7 text-center text-sm font-bold">{it.quantity}</span>
                        <button onClick={() => updateQty(it.productId, it.variantId, it.quantity + 1)} className="px-3 py-1 font-bold">+</button>
                      </div>
                      <div className="text-sm font-extrabold">৳{(it.unitPrice * it.quantity).toLocaleString("en-IN")}</div>
                    </div>
                    <button onClick={() => removeItem(it.productId, it.variantId)} className="mt-1 text-xs font-bold text-rose-600">Remove</button>
                  </div>
                </div>
              ))}
              <button onClick={clear} className="text-xs font-bold text-slate-500 underline">Clear cart</button>
            </div>
            <div className="h-fit rounded-2xl border bg-white p-4">
              <div className="font-extrabold">Order Summary</div>
              <div className="mt-2 space-y-1 text-sm">
                <div className="flex justify-between"><span>Subtotal</span><span className="font-bold">৳{subtotal.toLocaleString("en-IN")}</span></div>
                <div className="flex justify-between"><span>Delivery (approx)</span><span className="font-bold">৳{delivery}</span></div>
                <div className="flex justify-between border-t pt-2 text-base font-black"><span>Total</span><span>৳{(subtotal + delivery).toLocaleString("en-IN")}</span></div>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">Exact delivery charge is calculated at checkout by zone. Prices revalidated on server.</p>
              <Link href="/checkout" className="mt-3 block rounded-2xl bg-amber-400 px-4 py-3 text-center text-sm font-extrabold text-slate-950 hover:bg-amber-300">
                Proceed to Checkout →
              </Link>
              <Link href="/shop" className="mt-2 block text-center text-xs font-bold text-slate-500">← Continue shopping</Link>
            </div>
          </div>
        )}
      </div>
      <SiteFooter settings={settings as never} />
    </div>
  );
}
