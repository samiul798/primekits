"use client";

import { useEffect, useState } from "react";

export default function AdminCoupons() {
  const [items, setItems] = useState<{ id: string; code: string; type: string; value: string; minOrder: string; isActive: boolean; usedCount: number }[]>([]);
  const [form, setForm] = useState({ code: "", type: "fixed", value: "", minOrder: "0" });
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await fetch("/api/admin/coupons").then((x) => x.json()).catch(() => null);
    if (r) setItems(r.coupons || []);
  }
  useEffect(() => {
    load();
  }, []);

  async function add() {
    const value = Number(form.value);
    const minOrder = Number(form.minOrder || 0);
    if (!form.code.trim() || !Number.isFinite(value) || value <= 0 || !Number.isFinite(minOrder) || minOrder < 0) return alert("Enter a coupon code, a valid value and a valid minimum order.");
    if (form.type === "percent" && value > 100) return alert("Percentage discount cannot exceed 100%.");
    setSaving(true);
    try {
    const r = await fetch("/api/admin/coupons", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code: form.code.trim(), type: form.type, value, minOrder }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || "Could not add coupon");
    setForm({ code: "", type: "fixed", value: "", minOrder: "0" });
    await load();
    } catch (e) { alert(e instanceof Error ? e.message : "Could not add coupon"); } finally { setSaving(false); }
  }

  async function toggle(id: string, isActive: boolean) {
    const r = await fetch("/api/admin/coupons", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, isActive: !isActive }) });
    if (!r.ok) return alert("Could not update coupon");
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Delete coupon?")) return;
    const r = await fetch(`/api/admin/coupons?id=${id}`, { method: "DELETE" });
    if (!r.ok) return alert("Could not delete coupon");
    await load();
  }

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-black">Coupons / Discounts</h1>
      <div className="grid gap-2 rounded-2xl border bg-white p-3 sm:grid-cols-4">
        <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="CODE e.g. EID100" className="rounded-xl border px-3 py-2 uppercase" />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="rounded-xl border px-3 py-2">
          <option value="fixed">Fixed ৳</option>
          <option value="percent">Percent %</option>
        </select>
        <input value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} placeholder="Value" type="number" className="rounded-xl border px-3 py-2" />
        <input value={form.minOrder} onChange={(e) => setForm({ ...form, minOrder: e.target.value })} placeholder="Min order ৳" type="number" className="rounded-xl border px-3 py-2" />
        <button onClick={add} disabled={saving} className="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white disabled:opacity-50 sm:col-span-4">{saving ? "Saving…" : "Add Coupon"}</button>
      </div>
      <div className="grid gap-2">
        {items.map((c) => (
          <div key={c.id} className="flex items-center gap-2 rounded-2xl border bg-white p-3 text-sm">
            <b>{c.code}</b><span>{c.type} {c.value}</span><span className="text-slate-500">min ৳{c.minOrder} • used {c.usedCount}</span>
            <span className="ml-auto flex gap-1">
              <button onClick={() => toggle(c.id, c.isActive)} className="rounded-full border px-3 py-1 text-xs font-bold">{c.isActive ? "Disable" : "Enable"}</button>
              <button onClick={() => remove(c.id)} className="rounded-full border border-rose-200 px-3 py-1 text-xs font-bold text-rose-600">Del</button>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
