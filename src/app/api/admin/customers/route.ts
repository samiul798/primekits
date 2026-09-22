import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { customers, orders } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-guard";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";
import { normalizeBDPhone } from "@/lib/utils";

const customerSchema = z.object({
  name: z.string().min(2).max(120),
  mobile: z.string().min(8).max(20),
  whatsapp: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  address: z.string().max(500).optional().nullable(),
  district: z.string().max(80).optional().nullable(),
  thana: z.string().max(80).optional().nullable(),
});

export async function GET(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") || "").toLowerCase();
  let rows = await db.select().from(customers).orderBy(desc(customers.createdAt)).limit(1000);
  if (q) rows = rows.filter((c) => c.name.toLowerCase().includes(q) || c.mobile.includes(q));
  const allOrders = await db.select().from(orders).limit(5000);
  const data = rows.slice(0, 200).map((c) => {
    const co = allOrders.filter((o) => o.mobile === c.mobile);
    return {
      ...c,
      totalOrders: co.length,
      totalValue: co.reduce((s, o) => s + Number(o.grandTotal || 0), 0),
      delivered: co.filter((o) => o.status === "delivered").length,
      lastOrder: co.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))[0]?.createdAt || null,
    };
  });
  return NextResponse.json({ customers: data, total: rows.length });
}

export async function PUT(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;
  const body = await req.json();
  const { id, ...rest } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await db.update(customers).set(rest as never).where(eq(customers.id, id));
  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;
  const parsed = customerSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid customer" }, { status: 400 });
  const data = parsed.data;
  const mobile = normalizeBDPhone(data.mobile);
  const existing = (await db.select().from(customers).where(eq(customers.mobile, mobile)).limit(1))[0];
  if (existing) return NextResponse.json({ error: "A customer with this mobile number already exists" }, { status: 409 });
  const inserted = await db.insert(customers).values({ name: data.name, mobile, whatsapp: data.whatsapp ? normalizeBDPhone(data.whatsapp) : null, email: data.email || null, address: data.address || null, district: data.district || null, thana: data.thana || null }).returning();
  return NextResponse.json({ customer: inserted[0] }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing customer id" }, { status: 400 });
  const customer = (await db.select().from(customers).where(eq(customers.id, id)).limit(1))[0];
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  // Preserve past orders while removing the customer profile from the list.
  await db.update(orders).set({ customerId: null }).where(eq(orders.customerId, id));
  await db.delete(customers).where(eq(customers.id, id));
  return NextResponse.json({ ok: true });
}
