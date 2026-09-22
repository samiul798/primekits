import { NextResponse } from "next/server";
import { getAdminFromCookies } from "@/lib/auth";

export async function GET() {
  const a = await getAdminFromCookies();
  if (!a) return NextResponse.json({ admin: null }, { status: 401 });
  return NextResponse.json({ admin: a });
}
