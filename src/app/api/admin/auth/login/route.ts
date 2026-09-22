import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword, signAdminToken, ADMIN_COOKIE } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const attempts = new Map<string, { count: number; startedAt: number }>();

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const previous = attempts.get(ip);
  const entry = !previous || now - previous.startedAt >= 15 * 60_000
    ? { count: 0, startedAt: now }
    : previous;
  if (entry.count >= 10) {
    return NextResponse.json({ error: "Too many sign-in attempts. Please try again in 15 minutes." }, { status: 429 });
  }
  attempts.set(ip, { ...entry, count: entry.count + 1 });
  const body = await req.json().catch(() => ({}));
  const p = schema.safeParse(body);
  if (!p.success) return NextResponse.json({ error: "Invalid credentials" }, { status: 400 });
  const rows = await db.select().from(adminUsers).where(eq(adminUsers.email, p.data.email.toLowerCase())).limit(1);
  const u = rows[0];
  if (!u || !u.isActive) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  const ok = await verifyPassword(p.data.password, u.passwordHash);
  if (!ok) return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  attempts.delete(ip);
  const token = await signAdminToken({ id: u.id, email: u.email, role: u.role || "admin", name: u.name });
  const res = NextResponse.json({ ok: true, user: { name: u.name, email: u.email, role: u.role } });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 3600,
  });
  return res;
}
