import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { adminUsers } from "@/db/schema";
import { requireAdmin } from "@/lib/admin-guard";
import { hashPassword, signAdminToken, verifyPassword, ADMIN_COOKIE } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { z } from "zod";

const profileSchema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(160),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).max(200).optional(),
}).refine((v) => !v.newPassword || !!v.currentPassword, { message: "Current password is required to set a new password" });

export async function GET() {
  const { admin, response } = await requireAdmin();
  if (response || !admin) return response!;
  const user = (await db.select().from(adminUsers).where(eq(adminUsers.id, admin.id)).limit(1))[0];
  if (!user) return NextResponse.json({ error: "Admin not found" }, { status: 404 });
  return NextResponse.json({ profile: { name: user.name, email: user.email, role: user.role, createdAt: user.createdAt } });
}

export async function PUT(req: NextRequest) {
  const { admin, response } = await requireAdmin();
  if (response || !admin) return response!;
  const parsed = profileSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid profile" }, { status: 400 });
  const current = (await db.select().from(adminUsers).where(eq(adminUsers.id, admin.id)).limit(1))[0];
  if (!current) return NextResponse.json({ error: "Admin not found" }, { status: 404 });
  if (parsed.data.newPassword && !(await verifyPassword(parsed.data.currentPassword!, current.passwordHash))) {
    return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase();
  if (email !== current.email) {
    const existing = (await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1))[0];
    if (existing) return NextResponse.json({ error: "This email is already in use" }, { status: 409 });
  }
  const patch: { name: string; email: string; passwordHash?: string } = { name: parsed.data.name, email };
  if (parsed.data.newPassword) patch.passwordHash = await hashPassword(parsed.data.newPassword);
  await db.update(adminUsers).set(patch).where(eq(adminUsers.id, current.id));
  const token = await signAdminToken({ id: current.id, name: patch.name, email, role: current.role });
  const res = NextResponse.json({ ok: true, profile: { name: patch.name, email, role: current.role } });
  res.cookies.set(ADMIN_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 7 * 24 * 3600 });
  return res;
}
