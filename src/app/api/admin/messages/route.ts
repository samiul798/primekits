import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { contactMessages } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-guard";
import { eq, desc } from "drizzle-orm";

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;
  const rows = await db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt)).limit(200);
  return NextResponse.json({ messages: rows });
}

export async function PUT(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;
  const body = await req.json();
  const { id } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await db.update(contactMessages).set({ isRead: true }).where(eq(contactMessages.id, id));
  return NextResponse.json({ ok: true });
}
