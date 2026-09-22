import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-guard";
import { getSettings } from "@/lib/settings";
import { eq } from "drizzle-orm";
import { isValidImageUrl } from "@/lib/validations";

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;
  const s = await getSettings();
  return NextResponse.json({ settings: s });
}

export async function PUT(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;
  const body = await req.json();
  const entries = Object.entries(body as Record<string, unknown>);
  for (const key of ["logo", "sizeChartImage"]) {
    const value = body[key];
    if (typeof value === "string" && value && !isValidImageUrl(value)) {
      return NextResponse.json({ error: `${key} must be an uploaded path or a valid http(s) image URL` }, { status: 400 });
    }
  }
  for (const [k, v] of entries) {
    const ex = await db.select().from(settings).where(eq(settings.key, k)).limit(1);
    if (ex.length > 0) {
      await db.update(settings).set({ value: v as never, updatedAt: new Date() }).where(eq(settings.key, k));
    } else {
      await db.insert(settings).values({ key: k, value: v as never });
    }
  }
  const s = await getSettings();
  return NextResponse.json({ ok: true, settings: s });
}
