import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-guard";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { slugify } from "@/lib/utils";
import { imageUrlSchema } from "@/lib/validations";

const schema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().max(140).optional().nullable(),
  description: z.string().optional().nullable(),
  image: imageUrlSchema.optional().nullable(),
  sizeChartImage: imageUrlSchema.optional().nullable(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;
  const rows = await db.select().from(categories).limit(200);
  return NextResponse.json({ categories: rows });
}

export async function POST(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;
  const body = await req.json();
  const p = schema.safeParse(body);
  if (!p.success) return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  const ins = await db.insert(categories).values({
    name: p.data.name,
    slug: p.data.slug ? slugify(p.data.slug) : slugify(p.data.name),
    description: p.data.description || null,
    image: p.data.image || null,
    sizeChartImage: p.data.sizeChartImage || null,
    isActive: p.data.isActive,
    sortOrder: p.data.sortOrder || 0,
  }).returning();
  return NextResponse.json({ category: ins[0] });
}

export async function PUT(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;
  const body = await req.json();
  const { id, ...rest } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const p = schema.partial().safeParse(rest);
  if (!p.success) return NextResponse.json({ error: "Invalid category", issues: p.error.issues }, { status: 400 });
  const patch = p.data;
  if (patch.slug) patch.slug = slugify(patch.slug);
  await db.update(categories).set(patch as never).where(eq(categories.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  await db.delete(categories).where(eq(categories.id, id));
  return NextResponse.json({ ok: true });
}
