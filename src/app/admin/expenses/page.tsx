"use client";

import { useEffect, useState } from "react";

export default function AdminExpenses() {
  const [items, setItems] = useState<{ id: string; title: string; category: string; amount: string; expenseDate: string; paymentMethod?: string | null; notes?: string | null }[]>([]);
  const [form, setForm] = useState({ title: "", category: "rent", amount: "", expenseDate: new Date().toISOString().slice(0, 10), paymentMethod: "cash", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    try {
      const response = await fetch("/api/admin/expenses");
      const r = await response.json();
      if (!response.ok) throw new Error(r.error || "Could not load expenses");
      setItems(r.expenses || []);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load expenses"); }
  }
  useEffect(() => {
    load();
  }, []);

  async function add() {
    const amount = Number(form.amount);
    if (!form.title.trim() || !Number.isFinite(amount) || amount <= 0) return alert("Enter an expense title and a valid amount.");
    setSaving(true);
    try {
    const r = await fetch("/api/admin/expenses", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, title: form.title.trim(), amount }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || "Could not save expense");
    setForm({ title: "", category: "rent", amount: "", expenseDate: new Date().toISOString().slice(0, 10), paymentMethod: "cash", notes: "" });
    await load();
    } catch (e) { alert(e instanceof Error ? e.message : "Could not save expense"); } finally { setSaving(false); }
  }

  async function remove(id: string) {
    if (!confirm("Delete expense?")) return;
    const r = await fetch(`/api/admin/expenses?id=${id}`, { method: "DELETE" });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return alert(d.error || "Could not delete expense");
    await load();
  }

  const total = items.reduce((s, e) => s + Number(e.amount || 0), 0);

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-black">Expenses <span className="text-sm font-normal text-slate-500">(Total ৳{total.toLocaleString("en-IN")})</span></h1>
      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</div> : null}
      <div className="rounded-2xl border bg-white p-3">
        <div className="grid gap-2 sm:grid-cols-3">
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title e.g. Shop rent" className="rounded-xl border px-3 py-2" />
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-xl border px-3 py-2">
            {["rent", "salary", "marketing", "courier", "packaging", "utility", "purchase", "other", "general"].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="Amount ৳" className="rounded-xl border px-3 py-2" />
          <input type="date" value={form.expenseDate} onChange={(e) => setForm({ ...form, expenseDate: e.target.value })} className="rounded-xl border px-3 py-2" />
          <select value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="rounded-xl border px-3 py-2">
            {["cash", "bkash", "nagad", "bank"].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" className="rounded-xl border px-3 py-2" />
        </div>
        <button onClick={add} disabled={saving} className="mt-2 w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving…" : "Add Expense"}</button>
      </div>
      <div className="space-y-2">
        {items.map((e) => (
          <div key={e.id} className="flex items-center gap-2 rounded-2xl border bg-white p-3 text-sm">
            <div className="flex-1"><b>{e.title}</b> <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{e.category}</span><div className="text-xs text-slate-500">{new Date(e.expenseDate).toLocaleDateString("en-GB")} • {e.paymentMethod} {e.notes ? `• ${e.notes}` : ""}</div></div>
            <b>৳{Number(e.amount).toLocaleString("en-IN")}</b>
            <button onClick={() => remove(e.id)} className="rounded-full border px-2 py-1 text-xs font-bold text-rose-600">Del</button>
          </div>
        ))}
      </div>
    </div>
  );
}
