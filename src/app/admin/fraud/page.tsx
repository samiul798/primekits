"use client";

import { useEffect, useState } from "react";

type CourierRow = {
  courierName: string;
  totalOrders: number;
  delivered: number;
  rejected: number;
  returned: number;
  cancelled: number;
  pending: number;
  totalValue: number;
  deliveredValue: number;
  rejectedValue: number;
  returnedValue: number;
  successRate: number | null;
  rejectionRate: number;
  returnRate: number;
  riskStatus: string;
  lastOrderDate: string | null;
};

type FOrder = {
  orderNumber: string;
  createdAt: string;
  customerName: string;
  mobile: string;
  courierName: string | null;
  trackingId: string | null;
  itemsText: string;
  quantity: number;
  grandTotal: number;
  paymentStatus: string;
  status: string;
  courierStatus: string;
  rejectReason: string | null;
  returnReason: string | null;
  adminNotes: string | null;
};

export default function FraudPage() {
  const [mobile, setMobile] = useState("");
  const [couriers, setCouriers] = useState<{ id: string; name: string }[]>([]);
  const [courier, setCourier] = useState("");
  const [only, setOnly] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<{ customer?: Record<string, unknown>; summary?: Record<string, number | string | null>; courierRows?: CourierRow[]; orders?: FOrder[]; total?: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/couriers").then((r) => r.json()).then((d) => setCouriers(d.couriers || [])).catch(() => {});
  }, []);

  async function search() {
    if (!mobile.trim()) return setMsg("Enter a customer mobile number (primary field).");
    setLoading(true);
    setMsg("");
    try {
      const p = new URLSearchParams({ mobile: mobile.trim(), limit: "200" });
      if (courier) p.set("courier", courier);
      if (only) p.set("only", only);
      if (from) p.set("from", from);
      if (to) p.set("to", to);
      const r = await fetch(`/api/admin/fraud?${p.toString()}`);
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Search failed");
      setData(d);
      if ((d.total || 0) === 0) setMsg("No orders found for this mobile number.");
    } catch (e: unknown) {
      setMsg(e instanceof Error ? e.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }

  function exportCSV() {
    if (!data?.orders) return;
    const rows = data.orders;
    const header = ["Order", "Date", "Customer", "Mobile", "Courier", "Tracking", "Items", "Qty", "Amount", "Payment", "Status", "CourierStatus", "RejectReason", "ReturnReason"];
    const csv = [header.join(",")].concat(
      rows.map((o) =>
        [o.orderNumber, o.createdAt.slice(0, 10), `"${o.customerName}"`, o.mobile, `"${o.courierName || ""}"`, o.trackingId || "", `"${(o.itemsText || "").replace(/"/g, "'")}"`, o.quantity, o.grandTotal, o.paymentStatus, o.status, o.courierStatus, `"${(o.rejectReason || "").replace(/"/g, "'")}"`, `"${(o.returnReason || "").replace(/"/g, "'")}"`].join(",")
      )
    ).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `fraud-check-${mobile}.csv`;
    a.click();
  }

  const c = data?.customer as Record<string, unknown> | undefined;
  const s = data?.summary as Record<string, number | null> | undefined;

  function riskColor(r?: string) {
    if (r === "LOW") return "bg-emerald-100 text-emerald-800";
    if (r === "MEDIUM") return "bg-amber-100 text-amber-800";
    if (r === "HIGH") return "bg-orange-200 text-orange-900";
    if (r === "CRITICAL") return "bg-rose-600 text-white";
    return "bg-slate-100 text-slate-600";
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-black">🛡️ Fraud Check / Customer Risk Analysis</h1>
      <p className="text-xs text-slate-500">Risk level is an indicator only — never auto-labels anyone as a fraudster. All metrics come from real database orders.</p>

      <div className="grid gap-2 rounded-2xl border bg-white p-3 md:grid-cols-5">
        <input value={mobile} onChange={(e) => setMobile(e.target.value)} placeholder="Customer mobile * e.g. 01812345678" className="rounded-xl border px-3 py-2 font-bold md:col-span-2" />
        <select value={courier} onChange={(e) => setCourier(e.target.value)} className="rounded-xl border px-2 py-2">
          <option value="">All couriers</option>
          {couriers.map((x) => <option key={x.id} value={x.name}>{x.name}</option>)}
        </select>
        <select value={only} onChange={(e) => setOnly(e.target.value)} className="rounded-xl border px-2 py-2">
          <option value="">All orders</option>
          <option value="delivered">Delivered only</option>
          <option value="rejected">Rejected only</option>
          <option value="returned">Returned only</option>
          <option value="cancelled">Cancelled only</option>
        </select>
        <button onClick={search} disabled={loading} className="rounded-xl bg-slate-900 px-4 py-2 font-bold text-white disabled:opacity-50 md:col-span-5">{loading ? "Analyzing…" : "🔍 Run Fraud Check"}</button>
        <div className="flex gap-2 md:col-span-5">
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full rounded-xl border px-2 py-2" />
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full rounded-xl border px-2 py-2" />
          {data?.orders ? (
            <>
              <button onClick={exportCSV} className="rounded-xl border px-3 py-2 text-sm font-bold">⬇ CSV</button>
              <button onClick={() => window.print()} className="rounded-xl border px-3 py-2 text-sm font-bold">🖨️ Print</button>
            </>
          ) : null}
        </div>
      </div>

      {msg ? <div className="rounded-xl border bg-amber-50 px-3 py-2 text-sm font-bold">{msg}</div> : null}

      {c ? (
        <>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {(Object.entries({
              "Total Orders": c.totalOrders,
              Delivered: c.delivered,
              Rejected: c.rejected,
              Returned: c.returned,
              Cancelled: c.cancelled,
              Pending: c.pending,
              "Success Rate": s?.successRate == null ? "Not enough data" : `${Number(s.successRate).toFixed(1)}%`,
              "Rejection Rate": `${Number(s?.rejectionRate || 0).toFixed(1)}%`,
              "Return Rate": `${Number(s?.returnRate || 0).toFixed(1)}%`,
              "Total Value": `৳${Number((c.totalValue as number) || 0).toLocaleString("en-IN")}`,
              "Delivered Value": `৳${Number((c.deliveredValue as number) || 0).toLocaleString("en-IN")}`,
              "Risk Level": String(c.riskLevel || "UNKNOWN"),
            }) as [string, unknown][]).map(([l, v]) => (
              <div key={l} className="rounded-2xl border bg-white p-3">
                <div className="text-sm font-black">{String(v)}</div>
                <div className="text-[11px] text-slate-500">{l}</div>
              </div>
            ))}
          </div>

          <div className={`rounded-2xl border p-4 ${riskColor(String(c.riskLevel))}`}>
            <div className="font-black">Risk: {String(c.riskLevel)} {(c.riskOverride as string) ? "(admin override)" : ""}</div>
            <ul className="mt-1 list-disc pl-5 text-sm">
              {((c.reasons as string[]) || []).map((r, i) => <li key={i}>{r}</li>)}
            </ul>
            <div className="mt-1 text-xs">Customer: {String(c.name)} • {String(c.mobile)} • First: {c.firstOrderDate ? new Date(String(c.firstOrderDate)).toLocaleDateString("en-GB") : "-"} • Last: {c.lastOrderDate ? new Date(String(c.lastOrderDate)).toLocaleDateString("en-GB") : "-"}</div>
          </div>

          <div className="rounded-2xl border bg-white p-3">
            <div className="font-extrabold">Courier-wise Report (real DB records)</div>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full min-w-[800px] text-xs">
                <thead><tr className="border-b text-left text-slate-500"><th className="p-2">Courier</th><th className="p-2">Total</th><th className="p-2">Delivered</th><th className="p-2">Rejected</th><th className="p-2">Returned</th><th className="p-2">Value</th><th className="p-2">Success</th><th className="p-2">Risk</th><th className="p-2">Last Order</th></tr></thead>
                <tbody>
                  {(data?.courierRows || []).map((r) => (
                    <tr key={r.courierName} className="border-b">
                      <td className="p-2 font-bold">{r.courierName}</td>
                      <td className="p-2">{r.totalOrders}</td>
                      <td className="p-2 text-emerald-700 font-bold">{r.delivered}</td>
                      <td className="p-2 text-rose-700 font-bold">{r.rejected}</td>
                      <td className="p-2 text-amber-700 font-bold">{r.returned}</td>
                      <td className="p-2">৳{r.totalValue.toLocaleString("en-IN")}</td>
                      <td className="p-2">{r.successRate == null ? "N/A" : `${r.successRate.toFixed(1)}%`}</td>
                      <td className="p-2"><span className={`rounded-full px-2 py-0.5 font-bold ${riskColor(r.riskStatus)}`}>{r.riskStatus}</span></td>
                      <td className="p-2">{r.lastOrderDate ? new Date(r.lastOrderDate).toLocaleDateString("en-GB") : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-3">
            <div className="font-extrabold">Order History ({data?.total})</div>
            <div className="mt-2 space-y-2">
              {(data?.orders || []).slice(0, 50).map((o) => (
                <div key={o.orderNumber} className="rounded-xl border p-2 text-xs">
                  <div className="flex flex-wrap gap-2 font-bold"><span>{o.orderNumber}</span><span>{new Date(o.createdAt).toLocaleDateString("en-GB")}</span><span className="rounded-full bg-slate-100 px-2">{o.status}</span><span className="rounded-full bg-slate-100 px-2">{o.courierStatus}</span><span className="ml-auto">৳{o.grandTotal.toLocaleString("en-IN")}</span></div>
                  <div className="mt-1 text-slate-600">{o.itemsText}</div>
                  <div className="mt-1 text-slate-500">Courier: {o.courierName || "-"} • Tracking: {o.trackingId || "-"} • Pay: {o.paymentStatus}{o.rejectReason ? ` • Reject: ${o.rejectReason}` : ""}{o.returnReason ? ` • Return: ${o.returnReason}` : ""}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
