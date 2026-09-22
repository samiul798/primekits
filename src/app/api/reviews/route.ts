import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { products, reviews } from "@/db/schema";
import { z } from "zod";
import { eq } from "drizzle-orm";

const schema = z.object({
  productId: z.string().min(1),
  customerName: z.string().min(2).max(120),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional().nullable(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const p = schema.safeParse(body);
  if (!p.success) return NextResponse.json({ error: "Invalid review" }, { status: 400 });
  const product = await db.select({ id: products.id }).from(products).where(eq(products.id, p.data.productId)).limit(1);
  if (!product.length) return NextResponse.json({ error: "Product not found" }, { status: 404 });
  const created = await db.insert(reviews).values({
    productId: p.data.productId,
    customerName: p.data.customerName,
    rating: p.data.rating,
    comment: p.data.comment || null,
    isApproved: true,
  }).returning({ customerName: reviews.customerName, rating: reviews.rating, comment: reviews.comment });
  return NextResponse.json({ ok: true, review: created[0], message: "Thanks! Your review is now published." });
}
