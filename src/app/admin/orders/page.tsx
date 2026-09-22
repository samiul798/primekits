"use client";

import { useEffect, useState } from "react";
import { statusLabel } from "@/lib/utils";

type Item = { productName: string; variationLabel?: string | null; quantity: number; unitPrice: number; sku?: string | null };
type Order = {
  id: string;
  orderNumber: string;
  customerName: string;
  mobile: string;
  whatsapp?: string | null;
  address: string;
  district?: string | null;
  thana?: string | null;
  status: string;
  whatsappStatus: string;
  paymentStatus: string;
  paymentMethod: string;
  grandTotal: number;
  subtotal: number;
  deliveryCharge: number;
  discount: number;
  courierName?: string | null;
  trackingId?: string | null;
  consignmentId?: string | null;
  courierStatus?: string | null;
  adminNotes?: string | null;
  notes?: string | null;
  createdAt: string;
  items: Item[];
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [payment, setPayment] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [couriers, setCouriers] = useState<{ id: string; name: string }[]>([]);
  const [variants, setVariants] = useState<{ id: string; sku: string; label?: string | null; stockQty: number; reservedQty?: number; sellingPrice: string }[]>([]);
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState({ customerName: "", mobile: "", address: "", district: "", thana: "", paymentMethod: "cod", paymentStatus: "unpaid", deliveryCharge: "0", discount: "0", notes: "", items: [{ variantId: "", quantity: "1", unitPrice: "" }] });
  const [selected, setSelected] = useState<Order | null>(null);
  const [edit, setEdit] = useState({ status: "", reason: "", note: "", trackingId: "", consignmentId: "", courierStatus: "", courierId: "", paymentStatus: "", adminNotes: "", whatsappStatus: "" });
  const [saving, setSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  async function load(p = page) {
    const params = new URLSearchParams({ page: String(p), limit: "20" });
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    if (payment) params.set("payment", payment);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const r = await fetch(`/api/admin/orders?${params.toString()}`);
    const d = await r.json();
    if (r.ok) {
      setOrders(d.orders || []);
      setTotal(d.total || 0);
    }
  }

  useEffect(() => {
    load(1);
    fetch("/api/admin/couriers").then((r) => r.json()).then((d) => setCouriers(d.couriers || [])).catch(() => {});
    fetch("/api/admin/variants").then((r) => r.json()).then((d) => setVariants(d.variants || [])).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openDetail(o: Order) {
    setSelected(o);
    setEdit({
      status: o.status,
      reason: "",
      note: "",
      trackingId: o.trackingId || "",
      consignmentId: o.consignmentId || "",
      courierStatus: o.courierStatus || "pending",
      courierId: (couriers.find((c) => c.name === o.courierName)?.id) || "",
      paymentStatus: o.paymentStatus,
      adminNotes: o.adminNotes || "",
      whatsappStatus: o.whatsappStatus,
    });
    setShowAdvanced(false);
  }

  async function createManualOrder() {
    const items = manual.items.filter((i) => i.variantId && Number(i.quantity) > 0).map((i) => ({ variantId: i.variantId, quantity: Number(i.quantity), ...(i.unitPrice !== "" ? { unitPrice: Number(i.unitPrice) } : {}) }));
    if (!manual.customerName || !manual.mobile || !manual.address || !items.length) return alert("Customer, mobile, address and at least one item are required.");
    const r = await fetch("/api/admin/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...manual, deliveryCharge: Number(manual.deliveryCharge || 0), discount: Number(manual.discount || 0), items }) });
    const d = await r.json();
    if (!r.ok) return alert(d.error || "Could not create manual order");
    alert(`Manual order ${d.orderNumber} created successfully.`);
    setManualOpen(false);
    setManual({ customerName: "", mobile: "", address: "", district: "", thana: "", paymentMethod: "cod", paymentStatus: "unpaid", deliveryCharge: "0", discount: "0", notes: "", items: [{ variantId: "", quantity: "1", unitPrice: "" }] });
    load(1);
  }

  async function deleteOrder(o: Order) {
    const warning = o.status === "delivered"
      ? `Delete delivered order ${o.orderNumber} from the list? Stock will not be added back because the product was delivered.`
      : `Delete ${o.orderNumber}? Its reserved stock will be released.`;
    if (!confirm(warning)) return;
    const r = await fetch(`/api/admin/orders?id=${encodeURIComponent(o.id)}`, { method: "DELETE" });
    const d = await r.json();
    if (!r.ok) return alert(d.error || "Could not delete order");
    setSelected(null); load(page);
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    try {
      const r = await fetch("/api/admin/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selected.id,
          status: edit.status,
          reason: edit.reason || null,
          note: edit.note || null,
          trackingId: edit.trackingId || null,
          consignmentId: edit.consignmentId || null,
          courierStatus: edit.courierStatus || null,
          courierId: edit.courierId || null,
          paymentStatus: edit.paymentStatus || null,
          adminNotes: edit.adminNotes || null,
          whatsappStatus: edit.whatsappStatus || null,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Save failed");
      alert("Order updated ✅");
      setSelected(null);
      load(page);
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function waLink(o: Order) {
    const phone = (o.whatsapp || o.mobile || "").replace(/[^0-9]/g, "");
    const num = phone.startsWith("880") ? phone : phone.startsWith("0") ? "880" + phone.slice(1) : phone;
    const msg = `Hello ${o.customerName}! This is PrimeKits Studio regarding your order ${o.orderNumber} (৳${Number(o.grandTotal).toLocaleString("en-IN")}). Please confirm your delivery address: ${o.address}.`;
    return `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;
  }

  function printInvoice(o: Order) {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html><head><title>Invoice ${o.orderNumber}</title><style>body{font-family:sans-serif;padding:24px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ccc;padding:8px;font-size:13px}</style></head><body>
      <h2>PrimeKits Studio</h2><p>Dhaka, Bangladesh • Hotline support</p>
      <h3>Invoice: ${o.orderNumber}</h3>
      <p>Customer: ${o.customerName} (${o.mobile})<br/>Address: ${o.address}, ${o.thana || ""} ${o.district || ""}<br/>Date: ${new Date(o.createdAt).toLocaleString("en-GB")} • Payment: ${o.paymentMethod} (${o.paymentStatus})</p>
      <table><tr><th>#</th><th>Item</th><th>SKU</th><th>Qty</th><th>Price</th><th>Total</th></tr>
      ${o.items.map((it, i) => `<tr><td>${i + 1}</td><td>${it.productName} ${it.variationLabel ? `(${it.variationLabel})` : ""}</td><td>${it.sku || ""}</td><td>${it.quantity}</td><td>${it.unitPrice}</td><td>${it.unitPrice * it.quantity}</td></tr>`).join("")}
      </table>
      <p>Subtotal: ৳${o.subtotal} • Delivery: ৳${o.deliveryCharge} • Discount: ৳${o.discount}<br/><b>Grand Total: ৳${o.grandTotal}</b></p>
      <p>Courier: ${o.courierName || "-"} • Tracking: ${o.trackingId || "-"}</p>
      <script>window.print()</script></body></html>`);
    w.document.close();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-black">Orders ({total})</h1><button onClick={() => setManualOpen(true)} className="ml-auto rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">+ Manual Order</button></div>
      <div className="grid gap-2 rounded-2xl border bg-white p-3 md:grid-cols-6">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order / name / mobile" className="rounded-xl border px-3 py-2 md:col-span-2" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border px-2 py-2">
          <option value="">All statuses</option>
          {["pending_whatsapp", "whatsapp_contacted", "confirmed", "processing", "ready_to_ship", "shipped", "delivered", "cancelled", "rejected", "returned", "expired"].map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>
        <select value={payment} onChange={(e) => setPayment(e.target.value)} className="rounded-xl border px-2 py-2">
          <option value="">All payments</option>
          {["unpaid", "pending", "paid", "partial", "refunded"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-xl border px-2 py-2" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-xl border px-2 py-2" />
        <button onClick={() => { setPage(1); load(1); }} className="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white md:col-span-6">Search / Filter</button>
      </div>

      <div className="space-y-2">
        {orders.map((o) => (
          <div key={o.id} className="rounded-2xl border bg-white p-3">
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => openDetail(o)} className="font-black text-slate-900 hover:underline">{o.orderNumber}</button>
              <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-bold text-white">{statusLabel(o.status)}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold">{o.paymentStatus}</span>
              <span className="ml-auto font-black">৳{Number(o.grandTotal).toLocaleString("en-IN")}</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">{o.customerName} • {o.mobile} • {new Date(o.createdAt).toLocaleString("en-GB")} • {o.items.length} items {o.courierName ? `• ${o.courierName}` : ""}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={() => openDetail(o)} className="rounded-full border px-3 py-1 text-xs font-bold">Manage</button>
              <a href={waLink(o)} target="_blank" className="rounded-full bg-[#25D366] px-3 py-1 text-xs font-bold text-white">WhatsApp</a>
              <button onClick={() => printInvoice(o)} className="rounded-full border px-3 py-1 text-xs font-bold">🖨️ Invoice</button>
              <button onClick={() => deleteOrder(o)} className="rounded-full border border-rose-200 px-3 py-1 text-xs font-bold text-rose-700">Delete</button>
            </div>
          </div>
        ))}
        {orders.length === 0 ? <div className="rounded-2xl border bg-white p-10 text-center text-slate-400">No orders found. Orders from the website will appear here in real time.</div> : null}
      </div>

      <div className="flex items-center justify-center gap-3">
        <button disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); load(p); }} className="rounded-full border bg-white px-4 py-2 text-sm font-bold disabled:opacity-40">← Prev</button>
        <span className="text-sm font-bold">Page {page} / {Math.max(1, Math.ceil(total / 20))}</span>
        <button disabled={page >= Math.ceil(total / 20)} onClick={() => { const p = page + 1; setPage(p); load(p); }} className="rounded-full border bg-white px-4 py-2 text-sm font-bold disabled:opacity-40">Next →</button>
      </div>

      {selected ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
          <div className="mx-auto max-w-2xl rounded-3xl bg-white p-5">
            <div className="flex items-center justify-between">
              <h2 className="font-black">{selected.orderNumber}</h2>
              <button onClick={() => setSelected(null)} className="rounded-full border px-3 py-1 text-sm font-bold">✕</button>
            </div>
            <div className="mt-2 text-sm text-slate-600">{selected.customerName} • {selected.mobile} • {selected.address}</div>
            <div className="mt-2 space-y-1 text-sm">
              {selected.items.map((it, i) => (
                <div key={i} className="flex justify-between border-b py-1"><span>{it.productName} {it.variationLabel ? `(${it.variationLabel})` : ""} × {it.quantity}</span><b>৳{(it.unitPrice * it.quantity).toLocaleString("en-IN")}</b></div>
              ))}
            </div>
            <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><div className="font-black">Courier workflow</div><span className="rounded-full bg-white px-2 py-1 text-xs font-bold">Current: {statusLabel(selected.status)}</span></div>
              <p className="mt-1 text-xs text-slate-600">Select the courier and its latest progress. On save, the order status updates automatically; delivered COD is marked paid, and returned/rejected/cancelled stock is handled safely.</p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <label className="text-xs font-bold">Courier
                <select value={edit.courierId} onChange={(e) => setEdit({ ...edit, courierId: e.target.value })} className="mt-1 w-full rounded-xl border px-2 py-2">
                  <option value="">Select courier</option>
                  {couriers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label className="text-xs font-bold">Tracking ID
                <input value={edit.trackingId} onChange={(e) => setEdit({ ...edit, trackingId: e.target.value })} className="mt-1 w-full rounded-xl border px-2 py-2" />
              </label>
              <label className="text-xs font-bold">Consignment ID
                <input value={edit.consignmentId} onChange={(e) => setEdit({ ...edit, consignmentId: e.target.value })} className="mt-1 w-full rounded-xl border px-2 py-2" />
              </label>
              <label className="text-xs font-bold">Courier Status
                <select value={edit.courierStatus} onChange={(e) => setEdit({ ...edit, courierStatus: e.target.value })} className="mt-1 w-full rounded-xl border px-2 py-2">
                  {["pending", "picked_up", "in_transit", "delivered", "partially_delivered", "returned", "rejected", "lost", "damaged", "cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              </div>
              <button onClick={save} disabled={saving} className="mt-3 w-full rounded-2xl bg-slate-900 px-4 py-3 font-bold text-white disabled:opacity-50">{saving ? "Updating courier…" : "Save courier update"}</button>
            </div>
            <button type="button" onClick={() => setShowAdvanced((v) => !v)} className="mt-3 text-xs font-bold text-slate-600 underline">{showAdvanced ? "Hide" : "Show"} advanced order controls</button>
            {showAdvanced ? <div className="mt-2 grid gap-2 rounded-2xl border bg-slate-50 p-3 sm:grid-cols-2">
              <label className="text-xs font-bold">Order Status (exception only)
                <select value={edit.status} onChange={(e) => setEdit({ ...edit, status: e.target.value })} className="mt-1 w-full rounded-xl border px-2 py-2">
                  {["pending_whatsapp", "whatsapp_contacted", "confirmed", "processing", "ready_to_ship", "shipped", "delivered", "cancelled", "rejected", "returned", "expired"].map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
                </select>
              </label>
              <label className="text-xs font-bold">Payment Status (exception only)
                <select value={edit.paymentStatus} onChange={(e) => setEdit({ ...edit, paymentStatus: e.target.value })} className="mt-1 w-full rounded-xl border px-2 py-2">
                  {["unpaid", "pending", "paid", "partial", "refunded"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="text-xs font-bold">WhatsApp Status
                <select value={edit.whatsappStatus} onChange={(e) => setEdit({ ...edit, whatsappStatus: e.target.value })} className="mt-1 w-full rounded-xl border px-2 py-2">
                  {["link_generated", "opened", "contacted", "verified"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="text-xs font-bold">Reason (for cancel/return/reject)
                <input value={edit.reason} onChange={(e) => setEdit({ ...edit, reason: e.target.value })} placeholder="e.g. Customer refused" className="mt-1 w-full rounded-xl border px-2 py-2" />
              </label>
              <label className="text-xs font-bold sm:col-span-2">Admin Notes
                <textarea value={edit.adminNotes} onChange={(e) => setEdit({ ...edit, adminNotes: e.target.value })} rows={2} className="mt-1 w-full rounded-xl border px-2 py-2" />
              </label>
              <label className="text-xs font-bold sm:col-span-2">Status Note (goes to history)
                <input value={edit.note} onChange={(e) => setEdit({ ...edit, note: e.target.value })} placeholder="Optional note for history" className="mt-1 w-full rounded-xl border px-2 py-2" />
              </label>
              <button onClick={save} disabled={saving} className="sm:col-span-2 rounded-xl border bg-white px-4 py-2 text-sm font-bold disabled:opacity-50">{saving ? "Saving…" : "Save advanced changes"}</button>
            </div> : null}
            <button onClick={() => deleteOrder(selected)} className="mt-2 w-full rounded-2xl border border-rose-200 px-4 py-3 font-bold text-rose-700">Delete Order</button>
          </div>
        </div>
      ) : null}
      {manualOpen ? <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4"><div className="mx-auto max-w-2xl rounded-3xl bg-white p-5"><div className="flex items-center justify-between"><h2 className="font-black">Create Manual Order</h2><button onClick={() => setManualOpen(false)} className="rounded-full border px-3 py-1">×</button></div><p className="mt-1 text-xs text-slate-500">Stock is reserved immediately and a full order history is created.</p><div className="mt-3 grid gap-2 sm:grid-cols-2"><input value={manual.customerName} onChange={(e) => setManual({ ...manual, customerName: e.target.value })} placeholder="Customer name *" className="rounded-xl border px-3 py-2"/><input value={manual.mobile} onChange={(e) => setManual({ ...manual, mobile: e.target.value })} placeholder="Mobile *" className="rounded-xl border px-3 py-2"/><input value={manual.address} onChange={(e) => setManual({ ...manual, address: e.target.value })} placeholder="Full address *" className="rounded-xl border px-3 py-2 sm:col-span-2"/><input value={manual.district} onChange={(e) => setManual({ ...manual, district: e.target.value })} placeholder="District" className="rounded-xl border px-3 py-2"/><input value={manual.thana} onChange={(e) => setManual({ ...manual, thana: e.target.value })} placeholder="Area / Thana" className="rounded-xl border px-3 py-2"/><select value={manual.paymentMethod} onChange={(e) => setManual({ ...manual, paymentMethod: e.target.value })} className="rounded-xl border px-3 py-2"><option value="cod">Cash on delivery</option><option value="bkash">bKash</option><option value="nagad">Nagad</option><option value="cash">Cash</option><option value="bank">Bank</option></select><select value={manual.paymentStatus} onChange={(e) => setManual({ ...manual, paymentStatus: e.target.value })} className="rounded-xl border px-3 py-2"><option value="unpaid">Unpaid</option><option value="pending">Pending</option><option value="paid">Paid</option><option value="partial">Partial</option></select><input type="number" value={manual.deliveryCharge} onChange={(e) => setManual({ ...manual, deliveryCharge: e.target.value })} placeholder="Delivery charge" className="rounded-xl border px-3 py-2"/><input type="number" value={manual.discount} onChange={(e) => setManual({ ...manual, discount: e.target.value })} placeholder="Discount" className="rounded-xl border px-3 py-2"/></div><div className="mt-3 space-y-2">{manual.items.map((item, index) => <div key={index} className="grid gap-2 sm:grid-cols-4"><select value={item.variantId} onChange={(e) => setManual({ ...manual, items: manual.items.map((x, i) => i === index ? { ...x, variantId: e.target.value } : x) })} className="rounded-xl border px-3 py-2 sm:col-span-2"><option value="">Select SKU *</option>{variants.map((v) => <option key={v.id} value={v.id}>{v.sku} — {v.label} (available {v.stockQty - (v.reservedQty || 0)})</option>)}</select><input type="number" min="1" value={item.quantity} onChange={(e) => setManual({ ...manual, items: manual.items.map((x, i) => i === index ? { ...x, quantity: e.target.value } : x) })} placeholder="Qty" className="rounded-xl border px-3 py-2"/><input type="number" min="0" value={item.unitPrice} onChange={(e) => setManual({ ...manual, items: manual.items.map((x, i) => i === index ? { ...x, unitPrice: e.target.value } : x) })} placeholder="Custom price" className="rounded-xl border px-3 py-2"/></div>)}<button onClick={() => setManual({ ...manual, items: [...manual.items, { variantId: "", quantity: "1", unitPrice: "" }] })} className="rounded-xl border px-3 py-2 text-sm font-bold">+ Add item</button></div><textarea value={manual.notes} onChange={(e) => setManual({ ...manual, notes: e.target.value })} placeholder="Order note" className="mt-3 w-full rounded-xl border px-3 py-2"/><button onClick={createManualOrder} className="mt-3 w-full rounded-2xl bg-slate-900 px-4 py-3 font-bold text-white">Create & Reserve Stock</button></div></div> : null}
    </div>
  );
}
