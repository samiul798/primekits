import { NextResponse } from "next/server";
import { getAdminFromCookies } from "@/lib/auth";

export async function requireAdmin() {
  const a = await getAdminFromCookies();
  if (!a) return { admin: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  return { admin: a, response: null };
}
