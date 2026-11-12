"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { PageSkeleton } from "@/components/skeleton";

type Dash = {
  kpis: Record<string, number>;
  daily: { date: string; revenue: number; orders: number }[];
  byStatus: { status: string; count: number }[];
  recentOrders: { orderNumber: string; customerName: string; grandTotal: number; status: string; createdAt: string }[];
  lowStock: { sku: string; label?: string | null; stock: number; reserved: number; available: number }[];
};

const COLORS = ["#102238", "#c58b19", "#0f766e", "#b91c1c", "#475569", "#0369a1"];
const formatMoney = (value: number) => `BDT ${Number(value || 0).toLocaleString("en-IN")}`;

export default function AdminDashboard() {
  const [data, setData] = useState<Dash | null>(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(range = days) {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/dashboard?days=${range}`);
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "Could not load dashboard data");
      setData(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load dashboard data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(30); }, []);

  async function cleanup() {
    try {
      const response = await fetch("/api/admin/reservations/cleanup", { method: "POST" });
      const result = await response.json().catch(() => null);
      if (!response.ok) throw new Error(result?.error || "Could not release reservations");
      alert(result?.released != null ? `${result.released} expired reservations released.` : "Reservation cleanup completed.");
      load();
    } catch (cause) { alert(cause instanceof Error ? cause.message : "Could not release reservations"); }
  }

  if (loading && !data) return <PageSkeleton cards={8} />;
  if (error && !data) return <div className="border border-rose-200 bg-rose-50 p-6"><p className="font-bold text-rose-800">{error}</p><button onClick={() => load()} className="mt-4 border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-bold text-white">Retry</button></div>;

  const k = data?.kpis || {};
  const cards: [string, number | string][] = [
    ["Total orders", k.totalOrders ?? 0], ["Product revenue", formatMoney(k.totalRevenue)], ["Delivery collected", formatMoney(k.deliveryCollected)], ["Gross profit", formatMoney(k.grossProfit)],
    ["Average order value", formatMoney(k.averageOrderValue)], ["Active orders", k.activeOrders ?? 0], ["Net profit", formatMoney(k.netProfit)], ["Pending WhatsApp", k.pendingWhatsapp ?? 0],
  ];

  return <div className="space-y-5">
    <div className="border-b border-slate-300 pb-5 sm:flex sm:items-end sm:justify-between">
      <div><p className="text-[11px] font-bold tracking-[.16em] text-slate-500">OPERATIONS OVERVIEW</p><h1 className="mt-1 text-2xl font-black tracking-tight">Store dashboard</h1><p className="mt-1 text-sm text-slate-600">Live figures from the connected store database.</p></div>
      <div className="mt-4 flex flex-wrap gap-2 sm:mt-0">
        {[7, 30, 90].map((range) => <button key={range} onClick={() => { setDays(range); load(range); }} className={`border px-3 py-2 text-xs font-bold ${days === range ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700"}`}>{range} days</button>)}
        <button onClick={cleanup} className="border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-slate-950">Release expired holds</button>
      </div>
    </div>
    {error ? <div className="border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{error}</div> : null}

    <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">{cards.map(([label, value]) => <div key={label} className="border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-xl font-black tracking-tight text-slate-950">{value}</p></div>)}</section>

    <section className="grid gap-5 xl:grid-cols-2">
      <div className="border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h2 className="font-black">Daily revenue</h2><span className="text-xs text-slate-500">BDT</span></div><div className="mt-4 h-64"><ResponsiveContainer width="100%" height="100%"><BarChart data={data?.daily || []}><XAxis dataKey="date" tick={{ fontSize: 10 }} interval={Math.max(0, Math.floor((data?.daily.length || 1) / 8))} /><YAxis tick={{ fontSize: 10 }} /><Tooltip formatter={(value) => formatMoney(Number(value))} /><Bar dataKey="revenue" fill="#102238" radius={0} /></BarChart></ResponsiveContainer></div></div>
      <div className="border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-black">Orders by status</h2><div className="mt-4 grid items-center gap-4 sm:grid-cols-[1fr_auto]"><div className="h-56"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data?.byStatus || []} dataKey="count" nameKey="status" outerRadius={80}>{(data?.byStatus || []).map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div><div className="space-y-2 text-xs">{(data?.byStatus || []).map((item, index) => <div key={item.status} className="flex items-center gap-2"><span className="h-2.5 w-2.5" style={{ background: COLORS[index % COLORS.length] }} /><span className="font-bold text-slate-700">{item.status}</span><span className="ml-auto text-slate-500">{item.count}</span></div>)}</div></div></div>
    </section>

    <section className="grid gap-5 xl:grid-cols-2">
      <ListPanel title="Recent orders" action="All orders" href="/admin/orders">{(data?.recentOrders || []).length ? (data?.recentOrders || []).map((order) => <Link key={order.orderNumber} href="/admin/orders" className="grid grid-cols-[1fr_auto] gap-3 border-b border-slate-100 py-3 last:border-0 hover:bg-slate-50"><span><b className="block text-sm">{order.orderNumber}</b><span className="text-xs text-slate-500">{order.customerName} · {order.status}</span></span><b className="text-sm">{formatMoney(order.grandTotal)}</b></Link>) : <EmptyState text="No orders have been recorded yet." />}</ListPanel>
      <ListPanel title="Low stock" action="Inventory" href="/admin/inventory">{(data?.lowStock || []).length ? (data?.lowStock || []).map((item, index) => <div key={`${item.sku}-${index}`} className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0"><span><b className="block text-sm">{item.sku}</b><span className="text-xs text-slate-500">{item.label || "Product variant"}</span></span><b className={item.available <= 0 ? "text-sm text-rose-700" : "text-sm text-amber-700"}>{item.available} available</b></div>) : <EmptyState text="No low-stock variants at the moment." />}</ListPanel>
    </section>
  </div>;
}

function ListPanel({ title, action, href, children }: { title: string; action: string; href: string; children: React.ReactNode }) { return <div className="border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between border-b border-slate-200 pb-3"><h2 className="font-black">{title}</h2><Link href={href} className="text-xs font-bold text-slate-700 underline underline-offset-4">{action}</Link></div>{children}</div>; }
function EmptyState({ text }: { text: string }) { return <p className="py-8 text-center text-sm text-slate-500">{text}</p>; }
