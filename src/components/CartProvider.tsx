"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type CartItem = {
  productId: string;
  variantId?: string | null;
  name: string;
  slug: string;
  image?: string | null;
  sku?: string | null;
  variationLabel?: string | null;
  unitPrice: number;
  maxStock: number;
  quantity: number;
};

type CartCtx = {
  items: CartItem[];
  addItem: (it: CartItem) => void;
  updateQty: (productId: string, variantId: string | null | undefined, qty: number) => void;
  removeItem: (productId: string, variantId: string | null | undefined) => void;
  clear: () => void;
  subtotal: number;
  count: number;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "pks_cart_v1";

function keyOf(p: string, v?: string | null) {
  return `${p}__${v ?? "none"}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
    } catch {}
  }, [items]);

  const value = useMemo<CartCtx>(() => {
    return {
      items,
      addItem: (it) => {
        setItems((prev) => {
          const k = keyOf(it.productId, it.variantId);
          const found = prev.find((p) => keyOf(p.productId, p.variantId) === k);
          if (found) {
            return prev.map((p) =>
              keyOf(p.productId, p.variantId) === k
                ? { ...p, quantity: Math.min(p.quantity + it.quantity, p.maxStock || 99) }
                : p
            );
          }
          return [...prev, it];
        });
      },
      updateQty: (pid, vid, qty) => {
        const q = Math.max(0, Math.min(99, Math.floor(qty || 0)));
        setItems((prev) =>
          q === 0
            ? prev.filter((p) => keyOf(p.productId, p.variantId) !== keyOf(pid, vid))
            : prev.map((p) =>
                keyOf(p.productId, p.variantId) === keyOf(pid, vid)
                  ? { ...p, quantity: Math.min(q, Math.max(0, p.maxStock)) }
                  : p
              )
        );
      },
      removeItem: (pid, vid) => {
        setItems((prev) => prev.filter((p) => keyOf(p.productId, p.variantId) !== keyOf(pid, vid)));
      },
      clear: () => setItems([]),
      subtotal: items.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
      count: items.reduce((s, i) => s + i.quantity, 0),
    };
  }, [items]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart(): CartCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCart must be used inside CartProvider");
  return v;
}
