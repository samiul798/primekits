import { NextResponse } from "next/server";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET() {
  const rows = await db.select().from(categories).where(eq(categories.isActive, true)).orderBy(asc(categories.sortOrder));
  return NextResponse.json({ categories: rows });
}
