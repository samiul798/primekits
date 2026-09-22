"use client";

import { useEffect, useState } from "react";

export default function AdminProfit() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<{ revenue: number; cogs: number; deliveryCollected: number; grossProfit: number; totalExpenses: number; netProfit: number; deliveredOrders: number; expensesByCategory: { category: string; amount: number }[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load(range?: { from: string; to: string }) {
    setLoading(true);
    setError("");
    const p = new URLSearchParams();
    const selectedFrom = range?.from ?? from;
    const selectedTo = range?.to ?? to;
    if (selectedFrom) p.set("from", selectedFrom);
    if (selectedTo) p.set("to", selectedTo);
    try {
      const response = await fetch(`/api/admin/profit?${p.toString()}`);
      const r = await response.json();
      if (!response.ok) throw new Error(r.error || "Could not load profit report");
      setData(r);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load profit report"); } finally { setLoading(false); }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyRange(days: number) {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (days - 1));
    const next = { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
    setFrom(next.from);
    setTo(next.to);
    load(next);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-black">Cost, Sales & Profit</h1>
      <p className="text-xs text-slate-500">Only delivered sales are counted. Revenue uses the actual sold price after discounts; COGS uses each order’s preserved purchase cost. Purchases add inventory, not expense.</p>
      <div className="flex flex-wrap gap-2">
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full rounded-xl border bg-white px-3 py-2" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded-xl border bg-white px-3 py-2" />
        <button onClick={() => load()} className="rounded-xl bg-slate-900 px-5 font-bold text-white">Apply</button>
        {[7, 30, 90].map((days) => <button key={days} onClick={() => applyRange(days)} className="rounded-xl border bg-white px-3 text-xs font-bold">{days} days</button>)}
      </div>
      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</div> : null}
      {data ? (
        <>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-6">
            {[
              ["Revenue", data.revenue],
              ["Delivery Collected", data.deliveryCollected],
              ["COGS", data.cogs],
              ["Gross Profit", data.grossProfit],
              ["Expenses", data.totalExpenses],
              ["Net Profit", data.netProfit],
            ].map(([l, v]) => (
              <div key={l as string} className="rounded-2xl border bg-white p-4">
                <div className="text-lg font-black">৳{Number(v).toLocaleString("en-IN")}</div>
                <div className="text-xs text-slate-500">{l} • {data.deliveredOrders} delivered</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-3">
            <div className="rounded-2xl border bg-white p-3"><b className="text-base">{data.deliveredOrders}</b><br /><span className="text-slate-500">Delivered Orders</span></div>
            <div className="rounded-2xl border bg-white p-3"><b className="text-base">{data.revenue ? ((data.grossProfit / data.revenue) * 100).toFixed(1) : "0.0"}%</b><br /><span className="text-slate-500">Gross Margin</span></div>
            <div className="rounded-2xl border bg-white p-3"><b className="text-base">{data.revenue ? ((data.netProfit / data.revenue) * 100).toFixed(1) : "0.0"}%</b><br /><span className="text-slate-500">Net Margin</span></div>
          </div>
          <div className="rounded-2xl border bg-white p-4">
            <div className="font-extrabold">Expenses by Category</div>
            <div className="mt-2 space-y-1 text-sm">
              {data.expensesByCategory.map((e) => (
                <div key={e.category} className="flex justify-between border-b py-1"><span>{e.category}</span><b>৳{Number(e.amount).toLocaleString("en-IN")}</b></div>
              ))}
              {data.expensesByCategory.length === 0 ? <div className="text-slate-400">No expenses in range.</div> : null}
            </div>
          </div>
        </>
      ) : loading ? (
        <div>Loading…</div>
      ) : (
        <div className="rounded-2xl border bg-white p-8 text-center text-slate-400">No report data available.</div>
      )}
    </div>
  );
}
