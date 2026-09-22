import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";

export type BusinessSettings = {
  businessName: string;
  tagline: string;
  logo: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  facebook: string;
  instagram: string;
  youtube: string;
  tiktok: string;
  deliveryInsideDhaka: number;
  deliverySubDhaka: number;
  deliveryOutsideDhaka: number;
  freeDeliveryAbove: number;
  reservationExpiryMinutes: number;
  riskSuccessLow: number;
  riskSuccessMedium: number;
  riskRejectHigh: number;
  announcement: string;
  sizeChartImage: string;
  sizeChartNote: string;
};

export const DEFAULT_SETTINGS: BusinessSettings = {
  businessName: "PrimeKits Studio",
  tagline: "Premium Apparel — Jersey, T-Shirt, Shirt, Hoodie & High-Neck",
  logo: "",
  phone: "01XXXXXXXXX",
  whatsapp: "8801XXXXXXXXX",
  email: "support@primekits.studio",
  address: "Dhaka, Bangladesh",
  facebook: "",
  instagram: "",
  youtube: "",
  tiktok: "",
  deliveryInsideDhaka: 60,
  deliverySubDhaka: 100,
  deliveryOutsideDhaka: 130,
  freeDeliveryAbove: 0,
  reservationExpiryMinutes: 120,
  riskSuccessLow: 80,
  riskSuccessMedium: 50,
  riskRejectHigh: 40,
  announcement: "Cash on Delivery available all over Bangladesh",
  sizeChartImage: "/images/size-guide.svg",
  sizeChartNote: "দুই সাইজের মাঝামাঝি হলে বড় সাইজটি নিন। Measure your best-fitting shirt and match with the chart.",
};

export async function getSettings(): Promise<BusinessSettings> {
  try {
    const rows = await db.select().from(settings);
    const merged: Record<string, unknown> = { ...DEFAULT_SETTINGS };
    for (const r of rows) {
      merged[r.key] = r.value as unknown;
    }
    return merged as unknown as BusinessSettings;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSetting(key: string, value: unknown) {
  const existing = await db.select().from(settings).where(eq(settings.key, key)).limit(1);
  if (existing.length > 0) {
    const { db: _db } = await import("@/db");
    await _db.update(settings).set({ value: value as never, updatedAt: new Date() }).where(eq(settings.key, key));
  } else {
    await db.insert(settings).values({ key, value: value as never });
  }
}
