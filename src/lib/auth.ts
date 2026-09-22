import bcrypt from "bcryptjs";
import * as jose from "jose";
import { cookies } from "next/headers";

const COOKIE = "pks_admin_token";

function secret(): Uint8Array {
  const configured = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;
  if (process.env.NODE_ENV === "production" && (!configured || configured.length < 32)) {
    throw new Error("ADMIN_JWT_SECRET or JWT_SECRET must be at least 32 characters in production");
  }
  const s = configured || "primekits-studio-dev-secret-change-me-32chars";
  return new TextEncoder().encode(s);
}

export async function hashPassword(pw: string): Promise<string> {
  return bcrypt.hash(pw, 10);
}

export async function verifyPassword(pw: string, hash: string): Promise<boolean> {
  return bcrypt.compare(pw, hash);
}

export async function signAdminToken(payload: { id: string; email: string; role: string; name: string }) {
  return new jose.SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifyAdminToken(token: string) {
  try {
    const { payload } = await jose.jwtVerify(token, secret());
    return payload as { id: string; email: string; role: string; name: string };
  } catch {
    return null;
  }
}

export async function getAdminFromCookies() {
  try {
    const store = await cookies();
    const token = store.get(COOKIE)?.value;
    if (!token) return null;
    return verifyAdminToken(token);
  } catch {
    return null;
  }
}

export const ADMIN_COOKIE = COOKIE;
