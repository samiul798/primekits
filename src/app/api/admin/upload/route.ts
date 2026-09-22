import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const signatures: { mime: string; extension: string; matches: (bytes: Uint8Array) => boolean }[] = [
  { mime: "image/jpeg", extension: "jpg", matches: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", extension: "png", matches: (b) => b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  { mime: "image/gif", extension: "gif", matches: (b) => b.length >= 6 && (String.fromCharCode(...b.slice(0, 6)) === "GIF87a" || String.fromCharCode(...b.slice(0, 6)) === "GIF89a") },
  { mime: "image/webp", extension: "webp", matches: (b) => b.length >= 12 && String.fromCharCode(...b.slice(0, 4)) === "RIFF" && String.fromCharCode(...b.slice(8, 12)) === "WEBP" },
];

export async function POST(req: NextRequest) {
  const { response } = await requireAdmin();
  if (response) return response;

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose an image file" }, { status: 400 });
    if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "Image must be between 1 byte and 5 MB" }, { status: 400 });
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const detected = signatures.find((type) => type.matches(bytes));
    if (!detected) {
      return NextResponse.json({ error: "Only JPEG, PNG, GIF, and WebP images are allowed" }, { status: 400 });
    }

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    const filename = `${Date.now()}-${randomUUID()}.${detected.extension}`;
    await writeFile(path.join(uploadDir, filename), bytes);
    return NextResponse.json({ url: `/uploads/${filename}`, mime: detected.mime, size: file.size }, { status: 201 });
  } catch (error) {
    console.error("image upload failed", error);
    return NextResponse.json({ error: "Image upload failed" }, { status: 500 });
  }
}
