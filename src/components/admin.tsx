"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminPdfButton } from "@/components/admin-pdf-button";

const NAV = [
  { label: "Overview", href: "/admin", code: "OV" },
  { label: "Orders", href: "/admin/orders", code: "OR" },
  { label: "Products", href: "/admin/products", code: "PR" },
  { label: "Jersey Gallery", href: "/admin/jersey-gallery", code: "JG" },
  { label: "Categories", href: "/admin/categories", code: "CT" },
  { label: "Inventory", href: "/admin/inventory", code: "IN" },
  { label: "Customers", href: "/admin/customers", code: "CU" },
  { label: "Reviews", href: "/admin/reviews", code: "RV" },
  { label: "Promotions", href: "/admin/coupons", code: "PM" },
  { label: "Customer rewards", href: "/admin/rewards", code: "RW" },
  { label: "Couriers", href: "/admin/couriers", code: "CR" },
  { label: "Purchases", href: "/admin/purchases", code: "PU" },
  { label: "Expenses", href: "/admin/expenses", code: "EX" },
  { label: "Profit", href: "/admin/profit", code: "PF" },
  { label: "Fraud review", href: "/admin/fraud", code: "FR" },
  { label: "Settings", href: "/admin/settings", code: "ST" },
];

const NAV_TONES = ["bg-sky-100 text-sky-800", "bg-amber-100 text-amber-800", "bg-teal-100 text-teal-800", "bg-rose-100 text-rose-800"];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [admin, setAdmin] = useState<{ name: string; email: string } | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/admin/auth/me").then((r) => {
      if (!r.ok) throw new Error("auth");
      return r.json();
    }).then((d) => setAdmin(d.admin)).catch(() => router.push("/admin/login"));
  }, [router]);

  async function logout() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.push("/admin/login");
  }

  if (path === "/admin/login") return <>{children}</>;

  return (
    <div className="admin-shell min-h-screen bg-[#090d0d] text-slate-100">
      <header className="sticky top-0 z-40 border-b border-lime-300/50 bg-[#0d1111] text-white">
        <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-4 py-3 sm:px-6">
          <button onClick={() => setOpen((value) => !value)} className="border border-white/30 px-3 py-2 text-xs font-bold md:hidden" aria-label="Toggle navigation">Menu</button>
          <Link href="/admin" className="font-black tracking-tight">PrimeKits <span className="text-amber-300">Operations</span></Link>
          <span className="hidden border-l border-white/20 pl-3 text-xs text-slate-300 sm:block">Bangladesh commerce desk</span>
          <div className="ml-auto flex items-center gap-2 text-sm">
            <Link href="/" target="_blank" className="hidden border border-sky-300 bg-sky-500/20 px-3 py-2 text-xs font-bold text-sky-100 hover:bg-sky-500/30 sm:block">View storefront</Link>
            <AdminPdfButton />
            <span className="hidden border-l border-white/20 pl-3 text-xs text-slate-300 lg:block">{admin?.name || "Loading account"}</span>
            <button onClick={logout} className="border border-rose-400 bg-rose-700 px-3 py-2 text-xs font-bold hover:bg-rose-600">Sign out</button>
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-[1440px] gap-5 px-4 py-5 sm:px-6">
        <aside className={`${open ? "block" : "hidden"} w-60 shrink-0 md:block`}>
          <nav className="sticky top-20 border border-white/10 bg-[#111716] p-2 shadow-sm">
            <p className="border-b border-white/10 px-3 pb-3 pt-1 text-[10px] font-bold tracking-[.16em] text-slate-400">MANAGEMENT</p>
            <div className="space-y-0.5">
              {NAV.map((item, index) => {
                const active = path === item.href || (item.href !== "/admin" && path.startsWith(item.href));
                return <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={`flex items-center gap-3 border-l-2 px-3 py-2.5 text-sm font-bold ${active ? "border-lime-300 bg-lime-300/15 text-lime-300" : "border-transparent text-slate-400 hover:bg-white/5 hover:text-white"}`}><span className={`flex h-6 w-6 items-center justify-center rounded text-[9px] font-black ${active ? "bg-lime-300 text-slate-950" : NAV_TONES[index % NAV_TONES.length]}`}>{item.code}</span>{item.label}</Link>;
              })}
            </div>
          </nav>
        </aside>
        <main className="min-w-0 flex-1 pb-8">{children}</main>
      </div>
    </div>
  );
}
