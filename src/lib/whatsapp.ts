import { formatBDT } from "./utils";

export type WhatsAppOrderPayload = {
  businessName: string;
  orderNumber: string;
  customerName: string;
  mobile: string;
  whatsapp?: string | null;
  address: string;
  division?: string | null;
  district?: string | null;
  thana?: string | null;
  items: { name: string; variation?: string | null; sku?: string | null; qty: number; unitPrice: number }[];
  subtotal: number;
  deliveryCharge: number;
  discount: number;
  grandTotal: number;
  paymentMethod: string;
  notes?: string | null;
};

export function paymentLabel(v: string): string {
  const map: Record<string, string> = {
    cod: "Cash on Delivery",
    bkash: "bKash",
    nagad: "Nagad",
    bank: "Bank Transfer",
    cash: "Cash",
    advance: "Advance Payment",
    partial: "Partial Payment",
  };
  return map[v] ?? v;
}

export function buildWhatsAppMessage(o: WhatsAppOrderPayload): string {
  const lines: string[] = [];
  lines.push(`*${o.businessName}* — New Website Order`);
  lines.push(`Order: ${o.orderNumber}`);
  lines.push(`--------------------------`);
  lines.push(`Name: ${o.customerName}`);
  lines.push(`Mobile: ${o.mobile}`);
  if (o.whatsapp) lines.push(`WhatsApp: ${o.whatsapp}`);
  lines.push(`Address: ${o.address}${o.thana ? ", " + o.thana : ""}${o.district ? ", " + o.district : ""}${o.division ? ", " + o.division : ""}`);
  lines.push(`--------------------------`);
  o.items.forEach((it, i) => {
    lines.push(`${i + 1}. ${it.name}${it.variation ? ` (${it.variation})` : ""}`);
    if (it.sku) lines.push(`   SKU: ${it.sku}`);
    lines.push(`   ${it.qty} x ${formatBDT(it.unitPrice)} = ${formatBDT(it.qty * it.unitPrice)}`);
  });
  lines.push(`--------------------------`);
  lines.push(`Subtotal: ${formatBDT(o.subtotal)}`);
  lines.push(`Delivery: ${formatBDT(o.deliveryCharge)}`);
  if (o.discount > 0) lines.push(`Discount: -${formatBDT(o.discount)}`);
  lines.push(`*Total: ${formatBDT(o.grandTotal)}*`);
  lines.push(`Payment: ${paymentLabel(o.paymentMethod)}`);
  if (o.notes) lines.push(`Note: ${o.notes}`);
  lines.push(`Please confirm my order. Thank you!`);
  return lines.join("\n");
}

export function buildWhatsAppUrl(shopWhatsapp: string, message: string): string {
  let phone = (shopWhatsapp || "").replace(/[^0-9]/g, "");
  // Accept common Bangladeshi formats and normalize for wa.me.
  if (/^01[3-9]\d{8}$/.test(phone)) phone = `88${phone}`;
  if (!/^8801[3-9]\d{8}$/.test(phone)) return "";
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
