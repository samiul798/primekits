"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type C = { id: string; name: string; mobile: string; whatsapp?: string | null; address?: string | null; district?: string | null; totalOrders: number; totalValue: number; delivered: number; lastOrder?: string | null; riskOverride?: string | null; riskNote?: string | null; internalNotes?: string | null };

export default function AdminCustomers() {
  const [items, setItems] = useState<C[]>([]);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<C | null>(null);
  const [override, setOverride] = useState("");
  const [note, setNote] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", mobile: "", whatsapp: "", email: "", address: "", district: "", thana: "" });

  async function load() {
    const r = await fetch(`/api/admin/customers?q=${encodeURIComponent(q)}`).then((x) => x.json()).catch(() => null);
    if (r) setItems(r.customers || []);
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveRisk() {
    if (!sel) return;
    await fetch("/api/admin/customers", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: sel.id, riskOverride: override || null, riskNote: note || null }) });
    alert("Risk override saved ✅");
    setSel(null);
    load();
  }

  async function addCustomer() {
    const r = await fetch("/api/admin/customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const d = await r.json();
    if (!r.ok) return alert(d.error || "Could not add customer");
    setForm({ name: "", mobile: "", whatsapp: "", email: "", address: "", district: "", thana: "" }); setShowAdd(false); load();
  }

  async function removeCustomer(c: C) {
    if (!confirm(`Remove ${c.name}? Existing orders will remain, but this customer profile will be removed.`)) return;
    const r = await fetch(`/api/admin/customers?id=${encodeURIComponent(c.id)}`, { method: "DELETE" });
    const d = await r.json();
    if (!r.ok) return alert(d.error || "Could not remove customer");
    load();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2"><h1 className="text-xl font-black">Customers</h1><button onClick={() => setShowAdd(true)} className="ml-auto rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">+ Add Customer</button></div>
      <div className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name / mobile…" className="w-full rounded-xl border bg-white px-3 py-2" />
        <button onClick={load} className="rounded-xl bg-slate-900 px-4 font-bold text-white">Search</button>
      </div>
      <div className="grid gap-2">
        {items.map((c) => (
          <div key={c.id} className="rounded-2xl border bg-white p-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <b>{c.name}</b><span className="text-slate-500">{c.mobile}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold">{c.totalOrders} orders • ৳{Number(c.totalValue).toLocaleString("en-IN")}</span>
              <span className="ml-auto flex gap-1">
                <Link href={`/admin/fraud?mobile=${c.mobile}`} className="rounded-full border px-3 py-1 text-xs font-bold">🛡️ Fraud Check</Link>
                <button onClick={() => { setSel(c); setOverride(c.riskOverride || ""); setNote(c.riskNote || ""); }} className="rounded-full border px-3 py-1 text-xs font-bold">Risk Override</button>
                <button onClick={() => removeCustomer(c)} className="rounded-full border border-rose-200 px-3 py-1 text-xs font-bold text-rose-700">Remove</button>
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-500">{c.address} {c.district} • Delivered {c.delivered} • Last: {c.lastOrder ? new Date(c.lastOrder).toLocaleDateString("en-GB") : "-"}</div>
          </div>
        ))}
        {items.length === 0 ? <div className="rounded-2xl border bg-white p-8 text-center text-slate-400">No customers yet — they appear automatically after first order.</div> : null}
      </div>
      {sel ? (
        <div className="fixed inset-0 z-50 bg-black/50 p-4">
          <div className="mx-auto max-w-md rounded-3xl bg-white p-5">
            <h2 className="font-black">Risk Override — {sel.name}</h2>
            <p className="text-xs text-slate-500">Admin can override auto-calculated risk with a reason. This is logged on the customer record.</p>
            <select value={override} onChange={(e) => setOverride(e.target.value)} className="mt-3 w-full rounded-xl border px-3 py-2">
              <option value="">Auto (no override)</option>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason for override (required if overriding)…" rows={3} className="mt-2 w-full rounded-xl border px-3 py-2" />
            <div className="mt-3 flex gap-2">
              <button onClick={() => setSel(null)} className="flex-1 rounded-xl border px-3 py-2 font-bold">Cancel</button>
              <button onClick={saveRisk} className="flex-1 rounded-xl bg-slate-900 px-3 py-2 font-bold text-white">Save</button>
            </div>
          </div>
        </div>
      ) : null}
      {showAdd ? <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4"><div className="mx-auto max-w-lg rounded-3xl bg-white p-5"><div className="flex items-center justify-between"><h2 className="font-black">Add Customer</h2><button onClick={() => setShowAdd(false)} className="rounded-full border px-3 py-1">×</button></div><div className="mt-3 grid gap-2 sm:grid-cols-2"><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name *" className="rounded-xl border px-3 py-2"/><input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} placeholder="Mobile *" className="rounded-xl border px-3 py-2"/><input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} placeholder="WhatsApp" className="rounded-xl border px-3 py-2"/><input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className="rounded-xl border px-3 py-2"/><input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Address" className="rounded-xl border px-3 py-2 sm:col-span-2"/><input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} placeholder="District" className="rounded-xl border px-3 py-2"/><input value={form.thana} onChange={(e) => setForm({ ...form, thana: e.target.value })} placeholder="Area / Thana" className="rounded-xl border px-3 py-2"/></div><button onClick={addCustomer} className="mt-3 w-full rounded-2xl bg-slate-900 px-4 py-3 font-bold text-white">Save Customer</button></div></div> : null}
    </div>
  );
}
