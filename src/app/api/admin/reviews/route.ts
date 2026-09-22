import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, reviews } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-guard";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;
  const rows = await db
    .select({ id: reviews.id, customerName: reviews.customerName, rating: reviews.rating, comment: reviews.comment, isApproved: reviews.isApproved, createdAt: reviews.createdAt, productName: products.name })
    .from(reviews)
    .leftJoin(products, eq(reviews.productId, products.id))
    .orderBy(desc(reviews.createdAt))
    .limit(300);
  return NextResponse.json({ reviews: rows });
}

export async function PATCH(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;
  const body = await req.json().catch(() => null);
  if (!body?.id || typeof body.isApproved !== "boolean") return NextResponse.json({ error: "Review id and approval state are required" }, { status: 400 });
  await db.update(reviews).set({ isApproved: body.isApproved }).where(eq(reviews.id, body.id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing review id" }, { status: 400 });
  await db.delete(reviews).where(eq(reviews.id, id));
  return NextResponse.json({ ok: true });
}
