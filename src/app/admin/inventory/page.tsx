"use client";

import { useEffect, useState } from "react";

type Row = {
  variantId: string;
  productName: string;
  label?: string | null;
  sku: string;
  size?: string | null;
  color?: string | null;
  stock: number;
  reserved: number;
  available: number;
  threshold: number;
  isLow: boolean;
  isOut: boolean;
};

export default function AdminInventory() {
  const [report, setReport] = useState<Row[]>([]);
  const [txns, setTxns] = useState<{ id: string; type: string; quantity: number; prevStock: number; newStock: number; referenceId?: string | null; reason?: string | null; createdAt: string; variantSku?: string | null }[]>([]);
  const [sizeWise, setSizeWise] = useState<{ name: string; stock: number }[]>([]);
  const [colorWise, setColorWise] = useState<{ name: string; stock: number }[]>([]);
  const [filter, setFilter] = useState("");
  const [adjustment, setAdjustment] = useState({ variantId: "", quantity: "", direction: "add", reason: "" });
  const [saving, setSaving] = useState(false);
  const [visibleRows, setVisibleRows] = useState(50);

  async function load() {
    const r = await fetch("/api/admin/inventory?limit=100");
    const d = await r.json();
    if (r.ok) {
      setReport(d.report || []);
      setTxns(d.transactions || []);
      setSizeWise(d.sizeWise || []);
      setColorWise(d.colorWise || []);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function adjustStock() {
    if (!adjustment.variantId || !Number.isInteger(Number(adjustment.quantity)) || Number(adjustment.quantity) < 1) return alert("Select a variant and enter a whole quantity.");
    setSaving(true);
    try {
      const r = await fetch("/api/admin/variants", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ variantId: adjustment.variantId, type: "adjustment", direction: adjustment.direction === "remove" ? "reduce" : "add", quantity: Number(adjustment.quantity), reason: adjustment.reason || `Manual stock ${adjustment.direction}` }) });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Stock update failed");
      setAdjustment({ variantId: "", quantity: "", direction: "add", reason: "" });
      await load();
    } catch (e) { alert(e instanceof Error ? e.message : "Stock update failed"); } finally { setSaving(false); }
  }

  const shown = report.filter((x) =>
    !filter || x.sku.toLowerCase().includes(filter.toLowerCase()) || x.productName.toLowerCase().includes(filter.toLowerCase())
  );
  useEffect(() => setVisibleRows(50), [filter]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-black">Inventory (variation-level)</h1>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-2xl border bg-white p-3 text-center"><div className="text-lg font-black">{report.length}</div><div className="text-xs text-slate-500">Variants</div></div>
        <div className="rounded-2xl border bg-white p-3 text-center"><div className="text-lg font-black text-amber-600">{report.filter((r) => r.isLow).length}</div><div className="text-xs text-slate-500">Low Stock</div></div>
        <div className="rounded-2xl border bg-white p-3 text-center"><div className="text-lg font-black text-rose-600">{report.filter((r) => r.isOut).length}</div><div className="text-xs text-slate-500">Out of Stock</div></div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border bg-white p-3">
          <div className="text-sm font-black">Size-wise Stock</div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {sizeWise.map((s) => <span key={s.name} className="rounded-full bg-slate-100 px-3 py-1 font-bold">{s.name}: {s.stock}</span>)}
          </div>
        </div>
        <div className="rounded-2xl border bg-white p-3">
          <div className="text-sm font-black">Color-wise Stock</div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            {colorWise.map((s) => <span key={s.name} className="rounded-full bg-slate-100 px-3 py-1 font-bold">{s.name}: {s.stock}</span>)}
          </div>
        </div>
      </div>

      <details className="rounded-2xl border bg-white p-4" open>
        <summary className="cursor-pointer font-extrabold">Quick stock adjustment <span className="ml-1 text-xs font-normal text-slate-500">— logged and synced everywhere</span></summary>
        <p className="mt-1 text-xs text-slate-500">Add or remove stock safely. Every change is saved in the audit log; reserved stock cannot be removed.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <select value={adjustment.variantId} onChange={(e) => setAdjustment({ ...adjustment, variantId: e.target.value })} className="rounded-xl border px-3 py-2 sm:col-span-2"><option value="">Select SKU</option>{report.map((r) => <option key={r.variantId} value={r.variantId}>{r.sku} — {r.productName} (available {r.available})</option>)}</select>
          <input type="number" min="1" step="1" value={adjustment.quantity} onChange={(e) => setAdjustment({ ...adjustment, quantity: e.target.value })} placeholder="Quantity" className="rounded-xl border px-3 py-2" />
          <select value={adjustment.direction} onChange={(e) => setAdjustment({ ...adjustment, direction: e.target.value })} className="rounded-xl border px-3 py-2"><option value="add">Add stock</option><option value="remove">Remove stock</option></select>
        </div>
        <input value={adjustment.reason} onChange={(e) => setAdjustment({ ...adjustment, reason: e.target.value })} placeholder="Reason (optional)" className="mt-2 w-full rounded-xl border px-3 py-2" />
        <button onClick={adjustStock} disabled={saving} className="mt-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? "Saving…" : "Save stock change"}</button>
      </details>

      <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by SKU / product…" className="w-full rounded-xl border bg-white px-3 py-2" />

      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full min-w-[700px] text-xs">
          <thead><tr className="border-b text-left text-slate-500"><th className="p-2">SKU</th><th className="p-2">Product / Variation</th><th className="p-2">Stock</th><th className="p-2">Reserved</th><th className="p-2">Available</th><th className="p-2">Status</th></tr></thead>
          <tbody>
            {shown.slice(0, visibleRows).map((r) => (
              <tr key={r.variantId} className="border-b">
                <td className="p-2 font-bold">{r.sku}</td>
                <td className="p-2">{r.productName} — {r.label}</td>
                <td className="p-2">{r.stock}</td>
                <td className="p-2">{r.reserved}</td>
                <td className="p-2 font-black">{r.available}</td>
                <td className="p-2">{r.isOut ? <span className="rounded-full bg-rose-600 px-2 py-0.5 font-bold text-white">OUT</span> : r.isLow ? <span className="rounded-full bg-amber-400 px-2 py-0.5 font-bold">LOW</span> : <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">OK</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {shown.length > visibleRows ? <button onClick={() => setVisibleRows((n) => n + 50)} className="w-full rounded-xl border bg-white px-4 py-2 text-sm font-bold">Show 50 more ({shown.length - visibleRows} remaining)</button> : null}

      <div className="rounded-2xl border bg-white p-3">
        <div className="flex items-center justify-between"><div className="text-sm font-black">Recent Stock Activity</div><span className="text-[11px] text-slate-500">Latest {Math.min(txns.length, 15)} changes</span></div>
        <div className="mt-2 max-h-72 space-y-1 overflow-y-auto pr-1 text-xs">
          {txns.slice(0, 15).map((t) => (
            <div key={t.id} className="flex flex-wrap items-center gap-2 border-b py-1.5 last:border-0">
              <span className="rounded-full bg-slate-100 px-2 font-bold">{t.type}</span>
              <span className="font-bold">{t.variantSku}</span>
              <span>{t.prevStock} → {t.newStock} ({t.quantity > 0 ? "+" : ""}{t.quantity})</span>
              <span className="text-slate-500">{t.reason} • {t.referenceId}</span>
              <span className="ml-auto text-slate-400">{new Date(t.createdAt).toLocaleString("en-GB")}</span>
            </div>
          ))}
          {txns.length === 0 ? <div className="py-4 text-center text-slate-400">No stock activity yet.</div> : null}
        </div>
      </div>
    </div>
  );
}
