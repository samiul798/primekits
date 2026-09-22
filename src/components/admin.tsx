"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminPdfButton } from "@/components/admin-pdf-button";

const NAV = [
  ["Categories", "/admin/categories", "C"],
  ["Dashboard", "/admin", "📊"],
  ["Orders", "/admin/orders", "🧾"],
  ["Products", "/admin/products", "👕"],
  ["Reviews", "/admin/reviews", "⭐"],
  ["Inventory", "/admin/inventory", "📦"],
  ["Fraud Check", "/admin/fraud", "🛡️"],
  ["Couriers", "/admin/couriers", "🚚"],
  ["Purchases", "/admin/purchases", "🏭"],
  ["Expenses", "/admin/expenses", "💸"],
  ["Customers", "/admin/customers", "👥"],
  ["Coupons", "/admin/coupons", "🎟️"],
  ["Profit", "/admin/profit", "📈"],
  ["Settings", "/admin/settings", "⚙️"],
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [admin, setAdmin] = useState<{ name: string; email: string } | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/admin/auth/me")
      .then((r) => {
        if (!r.ok) throw new Error("auth");
        return r.json();
      })
      .then((d) => setAdmin(d.admin))
      .catch(() => router.push("/admin/login"));
  }, [router]);

  async function logout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
  }

  if (path === "/admin/login") return <>{children}</>;

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-40 border-b bg-slate-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
          <button onClick={() => setOpen((o) => !o)} className="rounded-lg border border-white/20 px-3 py-1.5 md:hidden">☰</button>
          <Link href="/admin" className="font-black">PrimeKits <span className="text-amber-400">Admin</span></Link>
          <span className="hidden text-xs text-slate-400 sm:block">Asia/Dhaka • BDT (৳)</span>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <Link href="/" target="_blank" className="rounded-full border border-white/20 px-3 py-1 text-xs">View Shop</Link>
            <AdminPdfButton />
            <span className="hidden text-xs text-slate-300 sm:block">{admin?.name}</span>
            <button onClick={logout} className="rounded-full bg-rose-600 px-3 py-1 text-xs font-bold">Logout</button>
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl gap-4 px-4 py-4">
        <aside className={`${open ? "block" : "hidden"} w-56 shrink-0 md:block`}>
          <nav className="sticky top-16 space-y-1 rounded-2xl border bg-white p-2">
            {NAV.map(([label, href, icon]) => {
              const active = path === href || (href !== "/admin" && path.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${active ? "bg-slate-900 text-white" : "hover:bg-slate-100"}`}
                >
                  <span>{icon}</span> {label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
