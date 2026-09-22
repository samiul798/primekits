export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function formatBDT(n: number | string | null | undefined): string {
  const num = Number(n ?? 0);
  if (Number.isNaN(num)) return "৳0";
  return "৳" + num.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export function toNum(v: unknown): number {
  const n = Number(v ?? 0);
  return Number.isNaN(n) ? 0 : n;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\u0980-\u09FF]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 200);
}

export function normalizeBDPhone(raw: string): string {
  let p = (raw || "").replace(/[\s-]/g, "");
  if (p.startsWith("+880")) p = "0" + p.slice(4);
  else if (p.startsWith("880")) p = "0" + p.slice(3);
  return p;
}

export function isValidBDPhone(raw: string): boolean {
  const p = normalizeBDPhone(raw);
  return /^01[3-9]\d{8}$/.test(p);
}

export function generateOrderNumber(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 9000) + 1000);
  return `PKS-${y}${m}${d}-${rand}`;
}

export function effectivePrice(selling: number, discount?: number | string | null): number {
  const d = discount == null || discount === "" ? 0 : Number(discount);
  if (d > 0) return d;
  return selling;
}

export const DIVISIONS = [
  "Dhaka",
  "Chattogram",
  "Rajshahi",
  "Khulna",
  "Barishal",
  "Sylhet",
  "Rangpur",
  "Mymensingh",
];

export const ORDER_STATUSES = [
  { value: "pending_whatsapp", label: "Pending WhatsApp Confirmation" },
  { value: "whatsapp_contacted", label: "WhatsApp Contacted" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "ready_to_ship", label: "Ready to Ship" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "rejected", label: "Rejected" },
  { value: "returned", label: "Returned" },
  { value: "expired", label: "Expired" },
];

export const PAYMENT_METHODS = [
  { value: "cod", label: "Cash on Delivery" },
  { value: "bkash", label: "bKash" },
  { value: "nagad", label: "Nagad" },
  { value: "bank", label: "Bank Transfer" },
  { value: "cash", label: "Cash" },
  { value: "advance", label: "Advance Payment" },
  { value: "partial", label: "Partial Payment" },
];

export const COURIER_STATUSES = [
  "pending",
  "picked_up",
  "in_transit",
  "delivered",
  "partially_delivered",
  "returned",
  "rejected",
  "lost",
  "damaged",
  "cancelled",
];

export function statusLabel(v: string): string {
  const f = ORDER_STATUSES.find((s) => s.value === v);
  return f ? f.label : v;
}
