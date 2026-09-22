"use client";

import { useEffect, useState } from "react";

type C = { id: string; name: string; phone?: string | null; website?: string | null; trackingUrlPattern?: string | null; contactPerson?: string | null; isActive: boolean; notes?: string | null };

export default function AdminCouriers() {
  const [items, setItems] = useState<C[]>([]);
  const [form, setForm] = useState({ name: "", phone: "", website: "", trackingUrlPattern: "", contactPerson: "", notes: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await fetch("/api/admin/couriers");
    const d = await r.json();
    if (r.ok) setItems(d.couriers || []);
  }
  useEffect(() => {
    load();
  }, []);

  async function add() {
    if (!form.name) return alert("Name required");
    setSaving(true);
    try {
    const r = await fetch("/api/admin/couriers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error || "Could not add courier");
    setForm({ name: "", phone: "", website: "", trackingUrlPattern: "", contactPerson: "", notes: "" });
    await load();
    } catch (error) { alert(error instanceof Error ? error.message : "Could not add courier"); } finally { setSaving(false); }
  }

  async function toggle(c: C) {
    const r = await fetch("/api/admin/couriers", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: c.id, isActive: !c.isActive }) });
    if (!r.ok) return alert("Could not update courier");
    await load();
  }

  async function remove(id: string) {
    if (!confirm("Delete courier?")) return;
    const r = await fetch(`/api/admin/couriers?id=${id}`, { method: "DELETE" });
    if (!r.ok) return alert("Could not delete courier");
    await load();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-black">Courier Management</h1><span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-800">{items.filter((x) => x.isActive).length} active</span></div>
      <p className="text-xs text-slate-500">Active couriers appear in Orders. Set a tracking URL pattern once; tracking IDs can then be opened consistently from each order.</p>
      <details className="rounded-2xl border bg-white p-3">
        <summary className="cursor-pointer text-sm font-black">+ Add courier</summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name e.g. Steadfast" className="rounded-xl border px-3 py-2" />
          <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" className="rounded-xl border px-3 py-2" />
          <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="Website" className="rounded-xl border px-3 py-2" />
          <input value={form.trackingUrlPattern} onChange={(e) => setForm({ ...form, trackingUrlPattern: e.target.value })} placeholder="Tracking URL with {trackingId}" className="rounded-xl border px-3 py-2" />
          <input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} placeholder="Contact person" className="rounded-xl border px-3 py-2" />
          <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes" className="rounded-xl border px-3 py-2" />
        </div>
        <button onClick={add} disabled={saving} className="mt-2 w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? "Adding…" : "Add Courier"}</button>
      </details>
      <div className="grid gap-2">
        {items.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-3">
            <div className="flex-1">
              <div className="text-sm font-black">{c.name} {!c.isActive ? <span className="text-rose-600">(inactive)</span> : null}</div>
              <div className="text-xs text-slate-500">{[c.phone, c.website, c.contactPerson].filter(Boolean).join(" • ") || "No contact details"}</div>
              {c.trackingUrlPattern ? <div className="text-[11px] text-slate-400">{c.trackingUrlPattern}</div> : null}
            </div>
            <button onClick={() => toggle(c)} className="rounded-full border px-3 py-1 text-xs font-bold">{c.isActive ? "Deactivate" : "Activate"}</button>
            <button onClick={() => remove(c.id)} className="rounded-full border border-rose-200 px-3 py-1 text-xs font-bold text-rose-600">Del</button>
          </div>
        ))}
      </div>
    </div>
  );
}
