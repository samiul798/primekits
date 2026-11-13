import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-guard";
import { eq } from "drizzle-orm";

const KEY = "productDisplayOrder";

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;
  const row = (await db.select({ value: settings.value }).from(settings).where(eq(settings.key, KEY)).limit(1))[0];
  return NextResponse.json({ order: Array.isArray(row?.value) ? row.value : [] });
}

export async function PUT(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;
  const body = await req.json().catch(() => null) as { order?: unknown } | null;
  const order = body?.order;
  if (!Array.isArray(order) || order.length > 500 || order.some((id) => typeof id !== "string" || !id.trim())) {
    return NextResponse.json({ error: "Invalid product order" }, { status: 400 });
  }
  const unique = [...new Set(order)];
  const existing = await db.select({ id: settings.id }).from(settings).where(eq(settings.key, KEY)).limit(1);
  if (existing.length) await db.update(settings).set({ value: unique, updatedAt: new Date() }).where(eq(settings.id, existing[0].id));
  else await db.insert(settings).values({ key: KEY, value: unique });
  return NextResponse.json({ ok: true, order: unique });
}
