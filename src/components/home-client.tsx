"use client";

import Link from "next/link";
import { useCart } from "./CartProvider";

export function HomeCartButton() {
  const { count } = useCart();
  void count;
  return <span className="hidden" />;
}

export function HeaderCartCount() {
  const { count } = useCart();
  return <span>{count}</span>;
}

export function StickyCartBar() {
  const { count, subtotal } = useCart();
  if (count === 0) return null;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 p-3 backdrop-blur md:hidden">
      <Link
        href="/cart"
        className="flex items-center justify-between rounded-2xl bg-slate-900 px-5 py-3 font-bold text-white"
      >
        <span>🛒 View Cart ({count})</span>
        <span>৳{subtotal.toLocaleString("en-IN")} →</span>
      </Link>
    </div>
  );
}
