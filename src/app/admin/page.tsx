"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from "recharts";

type Dash = {
  kpis: Record<string, number>;
  daily: { date: string; revenue: number; orders: number }[];
  byStatus: { status: string; count: number }[];
  recentOrders: { orderNumber: string; customerName: string; grandTotal: number; status: string; createdAt: string }[];
  lowStock: { sku: string; label?: string | null; stock: number; reserved: number; available: number }[];
};

const COLORS = ["#0f172a", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316"];

export default function AdminDashboard() {
  const [data, setData] = useState<Dash | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(d = days) {
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`/api/admin/dashboard?days=${d}`);
      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error(j?.error || "Could not load dashboard data");
      setData(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load dashboard data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(30);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cleanup() {
    try {
      const r = await fetch("/api/admin/reservations/cleanup", { method: "POST" });
      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error(j?.error || "Could not release reservations");
      alert(j?.released != null ? `Released ${j.released} expired reservations.` : "Cleanup done");
      load();
    } catch (e) { alert(e instanceof Error ? e.message : "Could not release reservations"); }
  }

  if (loading && !data) return <div className="p-8">Loading dashboard…</div>;
  if (error && !data) return <div className="space-y-3 p-8"><div className="font-bold text-rose-700">{error}</div><button onClick={() => load()} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">Retry dashboard</button></div>;
  const k = data?.kpis || {};

  const cards: [string, number | string, string][] = [
    ["Total Orders", k.totalOrders ?? 0, "🧾"],
    ["Product Revenue", `৳${Number(k.totalRevenue || 0).toLocaleString("en-IN")}`, "💰"],
    ["Delivery Collected", `৳${Number(k.deliveryCollected || 0).toLocaleString("en-IN")}`, "🛵"],
    ["Gross Profit", `৳${Number(k.grossProfit || 0).toLocaleString("en-IN")}`, "📈"],
    ["Avg. Order Value", `৳${Number(k.averageOrderValue || 0).toLocaleString("en-IN")}`, "🧮"],
    ["Active Orders", k.activeOrders ?? 0, "⚡"],
    ["Net Profit", `৳${Number(k.netProfit || 0).toLocaleString("en-IN")}`, "✅"],
    ["Pending WhatsApp", k.pendingWhatsapp ?? 0, "⏳"],
    ["Delivered", k.deliveredCount ?? 0, "📦"],
    ["Cancelled", k.cancelled ?? 0, "❌"],
    ["Low Stock Variants", k.lowStockCount ?? 0, "⚠️"],
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-black">Dashboard</h1>
        <span className="text-xs text-slate-500">Real data from database • No dummy stats</span>
        <div className="ml-auto flex gap-2">
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => { setDays(d); load(d); }} className={`rounded-full px-3 py-1 text-xs font-bold ${days === d ? "bg-slate-900 text-white" : "bg-white border"}`}>{d}d</button>
          ))}
          <button onClick={cleanup} className="rounded-full border bg-white px-3 py-1 text-xs font-bold">🧹 Release expired</button>
        </div>
      </div>
      {error ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{error}</div> : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(([label, val, icon]) => (
          <div key={label} className="rounded-2xl border bg-white p-4">
            <div className="text-xl">{icon}</div>
            <div className="mt-1 text-lg font-black">{val}</div>
            <div className="text-xs text-slate-500">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-4">
          <div className="font-extrabold">Daily Sales (BDT)</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.daily || []}>
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={Math.max(0, Math.floor((data?.daily.length || 1) / 8))} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="revenue" fill="#0f172a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <div className="font-extrabold">Orders by Status</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data?.byStatus || []} dataKey="count" nameKey="status" outerRadius={90} label>
                  {(data?.byStatus || []).map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {(data?.byStatus || []).map((s) => (
              <span key={s.status} className="rounded-full bg-slate-100 px-2 py-1 font-bold">{s.status}: {s.count}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="font-extrabold">Recent Orders</div>
            <Link href="/admin/orders" className="text-xs font-bold text-slate-600">View all →</Link>
          </div>
          <div className="mt-2 divide-y text-sm">
            {(data?.recentOrders || []).map((o) => (
              <Link key={o.orderNumber} href="/admin/orders" className="flex items-center justify-between py-2">
                <span><b>{o.orderNumber}</b> <span className="text-slate-500">• {o.customerName}</span></span>
                <span className="font-bold">৳{Number(o.grandTotal).toLocaleString("en-IN")}</span>
              </Link>
            ))}
            {(data?.recentOrders || []).length === 0 ? <div className="py-6 text-center text-slate-400">No orders yet — share your shop link to get sales.</div> : null}
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-4">
          <div className="flex items-center justify-between">
            <div className="font-extrabold">⚠️ Low Stock Alerts</div>
            <Link href="/admin/inventory" className="text-xs font-bold text-slate-600">Inventory →</Link>
          </div>
          <div className="mt-2 divide-y text-sm">
            {(data?.lowStock || []).map((v, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <span><b>{v.sku}</b> <span className="text-slate-500">{v.label}</span></span>
                <span className={`font-bold ${v.available <= 0 ? "text-rose-600" : "text-amber-600"}`}>{v.available} left</span>
              </div>
            ))}
            {(data?.lowStock || []).length === 0 ? <div className="py-6 text-center text-slate-400">All stocked up ✅</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
