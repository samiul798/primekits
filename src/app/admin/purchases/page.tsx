"use client";

import { useEffect, useState } from "react";

type Variant = { id: string; sku: string; label?: string | null; productId: string; stockQty: number };
type Product = { id: string; name: string; sku: string };

export default function AdminPurchases() {
  const [purchases, setPurchases] = useState<{ id: string; purchaseNo: string; subtotal: string; paidAmount: string; dueAmount: string; paymentStatus: string; invoiceNo?: string | null; notes?: string | null; purchaseDate: string; createdAt: string; items: { sku?: string | null; quantity: number; unitCost: string; totalCost: string }[]; supplier?: { name: string; company?: string | null; phone?: string | null; email?: string | null } | null }[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: string; name: string; company?: string | null }[]>([]);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [paid, setPaid] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<{ variantId: string; quantity: string; unitCost: string }[]>([{ variantId: "", quantity: "10", unitCost: "250" }]);
  const [newSupplier, setNewSupplier] = useState({ name: "", phone: "", company: "" });
  const [visiblePurchases, setVisiblePurchases] = useState(20);
  const [saving, setSaving] = useState(false);

  async function load() {
    const r = await fetch("/api/admin/purchases").then((x) => x.json()).catch(() => null);
    if (r) {
      setPurchases(r.purchases || []);
      setSuppliers(r.suppliers || []);
    }
    const v = await fetch("/api/admin/variants").then((x) => x.json()).catch(() => null);
    if (v) setVariants(v.variants || []);
    const p = await fetch("/api/admin/products").then((x) => x.json()).catch(() => null);
    if (p) setProducts(p.products || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function submit() {
    const items = rows.filter((x) => x.variantId && Number(x.quantity) > 0).map((x) => {
      const v = variants.find((vv) => vv.id === x.variantId);
      return { variantId: x.variantId, productId: v?.productId || null, sku: v?.sku || null, quantity: Number(x.quantity), unitCost: Number(x.unitCost) };
    });
    if (items.length === 0) return alert("Add at least one item");
    if (items.some((item) => !Number.isFinite(item.unitCost) || item.unitCost < 0)) return alert("Enter a valid unit cost for every item.");
    setSaving(true);
    try {
    const r = await fetch("/api/admin/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplierId: supplierId || null, invoiceNo: invoiceNo || null, purchaseDate, notes: notes || null, paidAmount: Number(paid || 0), items }),
    });
    const result = await r.json();
    if (!r.ok) throw new Error(result.error || "Failed to save purchase");
    alert("Purchase recorded & stock added ✅ (weighted average cost applied)");
    setRows([{ variantId: "", quantity: "10", unitCost: "250" }]);
    setPaid("");
    setInvoiceNo("");
    setNotes("");
    await load();
    } catch (error) { alert(error instanceof Error ? error.message : "Failed to save purchase"); } finally { setSaving(false); }
  }

  async function addSupplier() {
    if (!newSupplier.name) return alert("Supplier name required");
    const r = await fetch("/api/admin/suppliers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(newSupplier) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return alert(d.error || "Could not add supplier");
    setNewSupplier({ name: "", phone: "", company: "" });
    await load();
  }

  async function deletePurchase(id: string, no: string) {
    if (!confirm(`Delete ${no}? Its stock additions will be reversed.`)) return;
    const r = await fetch(`/api/admin/purchases?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const d = await r.json();
    if (!r.ok) return alert(d.error || "Could not delete purchase");
    load();
  }

  const draftTotal = rows.reduce((total, row) => total + Math.max(0, Number(row.quantity) || 0) * Math.max(0, Number(row.unitCost) || 0), 0);
  const draftPaid = Math.max(0, Number(paid) || 0);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-black">Purchase & Supplier Management</h1>

      <div className="grid grid-cols-3 gap-2 text-center text-xs"><div className="rounded-2xl border bg-white p-3"><b className="text-base">{suppliers.length}</b><br /><span className="text-slate-500">Suppliers</span></div><div className="rounded-2xl border bg-white p-3"><b className="text-base">{variants.length}</b><br /><span className="text-slate-500">Variants connected</span></div><div className="rounded-2xl border bg-white p-3"><b className="text-base">{purchases.length}</b><br /><span className="text-slate-500">Purchase records</span></div></div>
      <details className="rounded-2xl border bg-white p-4">
        <summary className="cursor-pointer font-extrabold">+ Add supplier</summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <input value={newSupplier.name} onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })} placeholder="Supplier name *" className="rounded-xl border px-3 py-2" />
          <input value={newSupplier.phone} onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })} placeholder="Phone" className="rounded-xl border px-3 py-2" />
          <input value={newSupplier.company} onChange={(e) => setNewSupplier({ ...newSupplier, company: e.target.value })} placeholder="Company" className="rounded-xl border px-3 py-2" />
        </div>
        <button onClick={addSupplier} className="mt-2 rounded-xl border px-4 py-2 text-sm font-bold">Add Supplier</button>
      </details>

      <div className="rounded-2xl border bg-white p-4">
        <div className="font-extrabold">+ New Purchase (adds stock with weighted-average cost)</div>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="rounded-xl border px-3 py-2">
            <option value="">Select supplier</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}{s.company ? ` — ${s.company}` : ""}</option>)}
          </select>
          <input value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} placeholder="Invoice no." className="rounded-xl border px-3 py-2" />
          <input value={paid} onChange={(e) => setPaid(e.target.value)} placeholder="Advance / paid amount ৳" type="number" min="0" className="rounded-xl border px-3 py-2" />
          <input value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} type="date" className="rounded-xl border px-3 py-2" />
        </div>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Purchase notes (optional)" className="mt-2 w-full rounded-xl border px-3 py-2 text-sm" rows={2} />
        <div className="mt-2 grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4"><div className="rounded-xl bg-slate-100 p-2"><b>৳{draftTotal.toLocaleString("en-IN")}</b><br />Purchase Total</div><div className="rounded-xl bg-emerald-50 p-2 text-emerald-800"><b>৳{draftPaid.toLocaleString("en-IN")}</b><br />Advance / Paid</div><div className="rounded-xl bg-amber-50 p-2 text-amber-800"><b>৳{Math.max(0, draftTotal - draftPaid).toLocaleString("en-IN")}</b><br />Due</div><div className="rounded-xl bg-sky-50 p-2 text-sky-800"><b>৳{Math.max(0, draftPaid - draftTotal).toLocaleString("en-IN")}</b><br />Return / Change</div></div>
        <div className="mt-2 space-y-2">
          {rows.map((row, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-4">
              <select value={row.variantId} onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, variantId: e.target.value } : r)))} className="rounded-xl border px-2 py-2 text-sm sm:col-span-2">
                <option value="">Select variant (SKU)</option>
                {variants.slice(0, 500).map((v) => <option key={v.id} value={v.id}>{v.sku} — {v.label} (stock {v.stockQty})</option>)}
              </select>
              <input type="number" value={row.quantity} onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, quantity: e.target.value } : r)))} placeholder="Qty" className="rounded-xl border px-2 py-2" />
              <input type="number" value={row.unitCost} onChange={(e) => setRows(rows.map((r, j) => (j === i ? { ...r, unitCost: e.target.value } : r)))} placeholder="Unit cost" className="rounded-xl border px-2 py-2" />
            </div>
          ))}
          <button onClick={() => setRows([...rows, { variantId: "", quantity: "10", unitCost: "250" }])} className="rounded-xl border px-3 py-1.5 text-sm font-bold">+ Add row</button>
        </div>
        <button onClick={submit} disabled={saving} className="mt-3 w-full rounded-2xl bg-slate-900 px-4 py-3 font-bold text-white disabled:opacity-50">{saving ? "Saving & adding stock…" : "Save purchase & update stock"}</button>
        <p className="mt-1 text-[11px] text-slate-500">Products: {products.length} • Variants: {variants.length}</p>
      </div>

      <div className="space-y-2">
        {purchases.slice(0, visiblePurchases).map((p) => (
          <div key={p.id} className="rounded-2xl border bg-white p-4 text-sm">
            <div className="flex flex-wrap items-center gap-2"><b>{p.purchaseNo}</b><span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${p.paymentStatus === "paid" ? "bg-emerald-100 text-emerald-800" : p.paymentStatus === "partial" ? "bg-amber-100 text-amber-800" : "bg-rose-100 text-rose-800"}`}>{p.paymentStatus.toUpperCase()}</span><button onClick={() => deletePurchase(p.id, p.purchaseNo)} className="ml-auto rounded-full border border-rose-200 px-2 py-0.5 text-xs text-rose-700">Delete</button></div>
            <div className="mt-2 grid gap-2 text-xs sm:grid-cols-2"><div><b>Supplier:</b> {p.supplier?.name || "No supplier"}{p.supplier?.company ? ` (${p.supplier.company})` : ""}<br />{p.supplier?.phone || "No supplier phone"}</div><div className="sm:text-right"><b>Purchase Date:</b> {new Date(p.purchaseDate || p.createdAt).toLocaleDateString("en-GB")}<br /><b>Invoice:</b> {p.invoiceNo || "—"}</div></div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-center text-xs sm:grid-cols-4"><div className="rounded-xl bg-slate-100 p-2"><b>৳{Number(p.subtotal).toLocaleString("en-IN")}</b><br />Total</div><div className="rounded-xl bg-emerald-50 p-2 text-emerald-800"><b>৳{Number(p.paidAmount).toLocaleString("en-IN")}</b><br />Advance / Paid</div><div className="rounded-xl bg-amber-50 p-2 text-amber-800"><b>৳{Number(p.dueAmount).toLocaleString("en-IN")}</b><br />Due</div><div className="rounded-xl bg-sky-50 p-2 text-sky-800"><b>৳{Math.max(0, Number(p.paidAmount) - Number(p.subtotal)).toLocaleString("en-IN")}</b><br />Return / Change</div></div>
            <details className="mt-3 rounded-xl border p-3"><summary className="cursor-pointer text-xs font-bold">View item details ({p.items.length})</summary><div className="mt-2 space-y-1 text-xs">{p.items.map((i, index) => <div key={index} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 border-b py-1"><span className="font-bold">{i.sku || "No SKU"}</span><span>× {i.quantity}</span><span>৳{Number(i.unitCost).toLocaleString("en-IN")}</span><b>৳{Number(i.totalCost).toLocaleString("en-IN")}</b></div>)}</div></details>
            {p.notes ? <p className="mt-2 text-xs text-slate-500"><b>Note:</b> {p.notes}</p> : null}
          </div>
        ))}
        {purchases.length === 0 ? <div className="rounded-2xl border bg-white p-8 text-center text-slate-400">No purchases yet.</div> : null}
        {purchases.length > visiblePurchases ? <button onClick={() => setVisiblePurchases((n) => n + 20)} className="w-full rounded-xl border bg-white px-4 py-2 text-sm font-bold">Show more purchases ({purchases.length - visiblePurchases} remaining)</button> : null}
      </div>
    </div>
  );
}
