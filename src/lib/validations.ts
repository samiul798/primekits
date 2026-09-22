import { z } from "zod";

export function isValidImageUrl(value: string): boolean {
  if (value.startsWith("/uploads/") || value.startsWith("/images/")) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export const imageUrlSchema = z.string().max(500).refine(isValidImageUrl, {
  message: "Use an uploaded image path or a valid http(s) image URL",
});

const bdPhone = z
  .string()
  .min(1, "Mobile number is required")
  .transform((v) => v.replace(/[\s-]/g, ""))
  .refine(
    (v) => {
      let p = v;
      if (p.startsWith("+880")) p = "0" + p.slice(4);
      else if (p.startsWith("880")) p = "0" + p.slice(3);
      return /^01[3-9]\d{8}$/.test(p);
    },
    { message: "Enter a valid Bangladeshi mobile number (01XXXXXXXXX)" }
  );

export const checkoutItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().nullable().optional(),
  quantity: z.number().int().min(1).max(50),
});

export const checkoutSchema = z.object({
  customerName: z.string().min(3, "Full name is required").max(120),
  mobile: bdPhone,
  whatsapp: z.string().optional().nullable(),
  email: z.string().email("Invalid email").optional().nullable().or(z.literal("")),
  address: z.string().min(8, "Full delivery address is required").max(500),
  division: z.string().min(1, "Division is required"),
  district: z.string().min(1, "District is required"),
  thana: z.string().min(1, "Area/Thana is required"),
  postal: z.string().max(20).optional().nullable(),
  deliveryZone: z.enum(["inside_dhaka", "outside_dhaka", "sub_dhaka"]).default("outside_dhaka"),
  notes: z.string().max(1000).optional().nullable(),
  paymentMethod: z.enum(["cod", "bkash", "nagad", "bank", "cash", "advance", "partial"]).default("cod"),
  couponCode: z.string().max(40).optional().nullable(),
  items: z.array(checkoutItemSchema).min(1, "Cart is empty").max(30),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;

export const productSchema = z.object({
  name: z.string().min(2).max(200),
  slug: z.string().min(2).max(220).optional(),
  shortDescription: z.string().max(500).optional().nullable(),
  description: z.string().optional().nullable(),
  categoryId: z.string().optional().nullable(),
  brand: z.string().max(120).optional().nullable(),
  thumbnail: imageUrlSchema.optional().nullable(),
  images: z.array(imageUrlSchema).max(12, "Maximum 12 gallery images").default([]),
  videoUrl: z.string().max(500).optional().nullable(),
  specifications: z.record(z.string(), z.string()).default({}),
  features: z.array(z.string()).default([]),
  material: z.string().max(120).optional().nullable(),
  purchaseCost: z.number().min(0).default(0),
  sellingPrice: z.number().min(0),
  discountPrice: z.number().min(0).optional().nullable(),
  sku: z.string().min(1).max(80),
  barcode: z.string().max(80).optional().nullable(),
  status: z.enum(["draft", "published", "unpublished", "archived"]).default("draft"),
  isFeatured: z.boolean().default(false),
  isNewArrival: z.boolean().default(false),
  isBestSeller: z.boolean().default(false),
  lowStockThreshold: z.number().int().min(0).default(5),
  sizeChartImage: imageUrlSchema.optional().nullable(),
  sizeChartNote: z.string().max(1000).optional().nullable(),
  seoTitle: z.string().max(200).optional().nullable(),
  seoDescription: z.string().optional().nullable(),
  keywords: z.string().optional().nullable(),
});

export const variantSchema = z.object({
  productId: z.string().min(1),
  size: z.string().max(40).optional().nullable(),
  color: z.string().max(60).optional().nullable(),
  design: z.string().max(80).optional().nullable(),
  material: z.string().max(80).optional().nullable(),
  sku: z.string().min(1).max(80),
  purchaseCost: z.number().min(0).default(0),
  sellingPrice: z.number().min(0),
  discountPrice: z.number().min(0).optional().nullable(),
  stockQty: z.number().int().min(0).default(0),
  lowStockThreshold: z.number().int().min(0).default(5),
  barcode: z.string().max(80).optional().nullable(),
  image: imageUrlSchema.optional().nullable(),
  isActive: z.boolean().default(true),
});

export const orderStatusSchema = z.object({
  status: z.string().min(1),
  reason: z.string().max(500).optional().nullable(),
  note: z.string().max(1000).optional().nullable(),
  courierId: z.string().optional().nullable(),
  trackingId: z.string().max(100).optional().nullable(),
  consignmentId: z.string().max(100).optional().nullable(),
  courierStatus: z.string().optional().nullable(),
  courierCharge: z.number().min(0).optional().nullable(),
  paymentStatus: z.string().optional().nullable(),
  adminNotes: z.string().max(2000).optional().nullable(),
});
