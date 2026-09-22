import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { expenses } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-guard";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(2).max(160),
  category: z.string().max(80).default("general"),
  amount: z.number().min(1),
  expenseDate: z.string().optional().nullable(),
  paymentMethod: z.string().max(40).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;
  const rows = await db.select().from(expenses).orderBy(desc(expenses.expenseDate)).limit(500);
  return NextResponse.json({ expenses: rows });
}

export async function POST(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;
  const body = await req.json().catch(() => null);
  const p = schema.safeParse(body);
  if (!p.success) return NextResponse.json({ error: p.error.issues[0]?.message || "Invalid expense" }, { status: 400 });
  if (p.data.expenseDate && Number.isNaN(new Date(p.data.expenseDate).getTime())) return NextResponse.json({ error: "Invalid expense date" }, { status: 400 });
  const ins = await db.insert(expenses).values({
    title: p.data.title,
    category: p.data.category,
    amount: String(p.data.amount),
    expenseDate: p.data.expenseDate ? new Date(p.data.expenseDate) : new Date(),
    paymentMethod: p.data.paymentMethod || null,
    notes: p.data.notes || null,
  }).returning();
  return NextResponse.json({ expense: ins[0] });
}

export async function DELETE(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await db.delete(expenses).where(eq(expenses.id, id));
  return NextResponse.json({ ok: true });
}
