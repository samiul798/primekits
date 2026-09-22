import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { suppliers } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-guard";
import { eq } from "drizzle-orm";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(2).max(120),
  phone: z.string().max(30).optional().nullable(),
  address: z.string().optional().nullable(),
  email: z.string().email().optional().nullable().or(z.literal("")),
  company: z.string().max(160).optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;
  const rows = await db.select().from(suppliers).limit(200);
  return NextResponse.json({ suppliers: rows });
}

export async function POST(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;
  const body = await req.json();
  const p = schema.safeParse(body);
  if (!p.success) return NextResponse.json({ error: "Invalid supplier" }, { status: 400 });
  const ins = await db.insert(suppliers).values({
    name: p.data.name,
    phone: p.data.phone || null,
    address: p.data.address || null,
    email: p.data.email || null,
    company: p.data.company || null,
    notes: p.data.notes || null,
    isActive: p.data.isActive,
  }).returning();
  return NextResponse.json({ supplier: ins[0] });
}

export async function PUT(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;
  const body = await req.json();
  const { id, ...rest } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await db.update(suppliers).set(rest as never).where(eq(suppliers.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await db.delete(suppliers).where(eq(suppliers.id, id));
  return NextResponse.json({ ok: true });
}
