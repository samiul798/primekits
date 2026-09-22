import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { couriers } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-guard";
import { eq } from "drizzle-orm";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().max(30).optional().nullable(),
  website: z.string().max(500).optional().nullable(),
  trackingUrlPattern: z.string().max(500).optional().nullable(),
  contactPerson: z.string().max(120).optional().nullable(),
  isActive: z.boolean().default(true),
  notes: z.string().optional().nullable(),
});

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;
  const rows = await db.select().from(couriers).limit(100);
  return NextResponse.json({ couriers: rows });
}

export async function POST(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;
  const body = await req.json();
  const p = schema.safeParse(body);
  if (!p.success) return NextResponse.json({ error: "Invalid courier" }, { status: 400 });
  const ins = await db.insert(couriers).values({
    name: p.data.name,
    phone: p.data.phone || null,
    website: p.data.website || null,
    trackingUrlPattern: p.data.trackingUrlPattern || null,
    contactPerson: p.data.contactPerson || null,
    isActive: p.data.isActive,
    notes: p.data.notes || null,
  }).returning();
  return NextResponse.json({ courier: ins[0] });
}

export async function PUT(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;
  const body = await req.json();
  const { id, ...rest } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await db.update(couriers).set(rest as never).where(eq(couriers.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await db.delete(couriers).where(eq(couriers.id, id));
  return NextResponse.json({ ok: true });
}
