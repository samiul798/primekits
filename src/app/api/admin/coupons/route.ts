import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { coupons } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-guard";
import { eq } from "drizzle-orm";
import { z } from "zod";

const schema = z.object({
  code: z.string().min(2).max(40),
  type: z.enum(["fixed", "percent"]).default("fixed"),
  value: z.number().min(0),
  minOrder: z.number().min(0).default(0),
  maxDiscount: z.number().min(0).optional().nullable(),
  usageLimit: z.number().int().min(1).optional().nullable(),
  isActive: z.boolean().default(true),
  expiresAt: z.string().optional().nullable(),
});

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;
  const rows = await db.select().from(coupons).limit(200);
  return NextResponse.json({ coupons: rows });
}

export async function POST(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;
  const body = await req.json().catch(() => null);
  const p = schema.safeParse(body);
  if (!p.success) return NextResponse.json({ error: p.error.issues[0]?.message || "Invalid coupon" }, { status: 400 });
  if (p.data.type === "percent" && p.data.value > 100) return NextResponse.json({ error: "Percentage discount cannot exceed 100%" }, { status: 400 });
  if (p.data.expiresAt && Number.isNaN(new Date(p.data.expiresAt).getTime())) return NextResponse.json({ error: "Invalid expiry date" }, { status: 400 });
  const ins = await db.insert(coupons).values({
    code: p.data.code.trim().toUpperCase(),
    type: p.data.type,
    value: String(p.data.value),
    minOrder: String(p.data.minOrder || 0),
    maxDiscount: p.data.maxDiscount != null ? String(p.data.maxDiscount) : null,
    usageLimit: p.data.usageLimit || null,
    isActive: p.data.isActive,
    expiresAt: p.data.expiresAt ? new Date(p.data.expiresAt) : null,
  }).returning();
  return NextResponse.json({ coupon: ins[0] });
}

export async function PUT(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid coupon update" }, { status: 400 });
  const { id, ...rest } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const patch: Record<string, unknown> = {};
  if (rest.code) patch.code = String(rest.code).trim().toUpperCase();
  if (rest.type) patch.type = rest.type;
  if (rest.value != null) patch.value = String(rest.value);
  if (rest.minOrder != null) patch.minOrder = String(rest.minOrder);
  if (rest.maxDiscount !== undefined) patch.maxDiscount = rest.maxDiscount == null ? null : String(rest.maxDiscount);
  if (rest.usageLimit !== undefined) patch.usageLimit = rest.usageLimit;
  if (rest.isActive !== undefined) patch.isActive = rest.isActive;
  if (rest.expiresAt !== undefined) patch.expiresAt = rest.expiresAt ? new Date(rest.expiresAt) : null;
  await db.update(coupons).set(patch as never).where(eq(coupons.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await db.delete(coupons).where(eq(coupons.id, id));
  return NextResponse.json({ ok: true });
}
