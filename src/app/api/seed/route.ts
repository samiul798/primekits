import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  adminUsers,
  categories,
  products,
  productVariants,
  couriers,
  suppliers,
  coupons,
  settings,
} from "@/db/schema";
import { hashPassword } from "@/lib/auth";
import { slugify } from "@/lib/utils";

const IMGS: Record<string, string[]> = {
  jersey: [
    "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80",
    "https://images.unsplash.com/photo-1522778119026-d647f0596c20?w=800&q=80",
  ],
  tshirt: [
    "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800&q=80",
    "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=800&q=80",
    "https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800&q=80",
  ],
  shirt: [
    "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80",
    "https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=800&q=80",
  ],
  hoodie: [
    "https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800&q=80",
    "https://images.unsplash.com/photo-1611312449408-fcece27cdbb7?w=800&q=80",
  ],
  highneck: [
    "https://images.unsplash.com/photo-1571945153237-4929e783af4a?w=800&q=80",
    "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?w=800&q=80",
  ],
};

export async function POST(req: NextRequest) {
  // Seeding can create an administrator and sample data, so it must always be
  // explicitly authorized. Development environments are frequently exposed
  // through tunnels, where an open seed endpoint is just as dangerous.
  const seedSecret = process.env.SEED_SECRET;
  if (!seedSecret || req.headers.get("x-seed-secret") !== seedSecret) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const initialAdminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!initialAdminPassword) {
    return NextResponse.json({ error: "SEED_ADMIN_PASSWORD is required in production" }, { status: 500 });
  }
  try {
    // admin
    const admins = await db.select().from(adminUsers).limit(1);
    if (admins.length === 0) {
      await db.insert(adminUsers).values({
        name: "PrimeKits Admin",
        email: "admin@primekits.studio",
        passwordHash: await hashPassword(initialAdminPassword),
        role: "super_admin",
        isActive: true,
      });
    }

    // settings
    const defaults: [string, unknown][] = [
      ["businessName", "PrimeKits Studio"],
      ["tagline", "Premium Apparel — Jersey, T-Shirt, Shirt, Hoodie & High-Neck"],
      ["logo", ""],
      ["phone", "01812345678"],
      ["whatsapp", "8801812345678"],
      ["email", "support@primekits.studio"],
      ["address", "House 12, Road 5, Dhanmondi, Dhaka 1205, Bangladesh"],
      ["facebook", "https://facebook.com/primekits.studio"],
      ["instagram", ""],
      ["youtube", ""],
      ["tiktok", ""],
      ["deliveryInsideDhaka", 60],
      ["deliverySubDhaka", 100],
      ["deliveryOutsideDhaka", 130],
      ["freeDeliveryAbove", 0],
      ["reservationExpiryMinutes", 120],
      ["riskSuccessLow", 80],
      ["riskSuccessMedium", 50],
      ["riskRejectHigh", 40],
      ["announcement", "Cash on Delivery available all over Bangladesh — Order on website & confirm on WhatsApp"],
    ];
    for (const [k, v] of defaults) {
      const ex = await db.select().from(settings).limit(100);
      void ex;
      try {
        await db.insert(settings).values({ key: k, value: v as never });
      } catch {}
    }

    // categories
    const catDefs = [
      { name: "Jersey", slug: "jersey", description: "Premium sports & fan jerseys", image: IMGS.jersey[0] },
      { name: "T-Shirt", slug: "t-shirt", description: "Comfortable premium cotton t-shirts", image: IMGS.tshirt[0] },
      { name: "Shirt", slug: "shirt", description: "Casual & formal shirts", image: IMGS.shirt[0] },
      { name: "Hoodie", slug: "hoodie", description: "Warm winter hoodies", image: IMGS.hoodie[0] },
      { name: "High-Neck", slug: "high-neck", description: "Stylish high-neck winter wear", image: IMGS.highneck[0] },
    ];
    const catMap = new Map<string, string>();
    for (let i = 0; i < catDefs.length; i++) {
      const c = catDefs[i];
      const ex = await db.select().from(categories).limit(50);
      const found = ex.find((x) => x.slug === c.slug);
      if (found) {
        catMap.set(c.slug, found.id);
      } else {
        const ins = await db
          .insert(categories)
          .values({ name: c.name, slug: c.slug, description: c.description, image: c.image, sortOrder: i, isActive: true })
          .returning({ id: categories.id });
        catMap.set(c.slug, ins[0].id);
      }
    }

    // couriers
    const courierDefs = [
      { name: "Steadfast", phone: "09678-045045", website: "https://steadfast.com.bd", trackingUrlPattern: "https://steadfast.com.bd/t/{trackingId}" },
      { name: "Pathao Courier", phone: "09643-454545", website: "https://courier.pathao.com", trackingUrlPattern: "https://courier.pathao.com/track/{trackingId}" },
      { name: "RedX", phone: "09611-737777", website: "https://redx.com.bd", trackingUrlPattern: "https://redx.com.bd/track/{trackingId}" },
      { name: "Paperfly", phone: "09611-646975", website: "https://paperfly.com.bd", trackingUrlPattern: "https://paperfly.com.bd/tracking/{trackingId}" },
      { name: "Sundarban Courier", phone: "02-9002463", website: "https://sundarbancourierltd.com", trackingUrlPattern: "" },
      { name: "SA Paribahan", phone: "02-8370151", website: "https://saparibahan.com", trackingUrlPattern: "" },
    ];
    for (const c of courierDefs) {
      const ex = await db.select().from(couriers).limit(30);
      if (!ex.find((x) => x.name === c.name)) {
        await db.insert(couriers).values({ ...c, contactPerson: "", isActive: true, notes: "" });
      }
    }

    // supplier
    const supEx = await db.select().from(suppliers).limit(1);
    let supplierId = supEx[0]?.id;
    if (!supplierId) {
      const ins = await db
        .insert(suppliers)
        .values({ name: "Dhaka Garments Supplier", phone: "01711111111", company: "DG Apparels Ltd", address: "Gazipur, Dhaka", isActive: true })
        .returning({ id: suppliers.id });
      supplierId = ins[0].id;
    }
    void supplierId;

    // coupon
    const coupEx = await db.select().from(coupons).limit(10);
    if (!coupEx.find((x) => x.code === "WELCOME50")) {
      await db.insert(coupons).values({ code: "WELCOME50", type: "fixed", value: "50", minOrder: "1000", isActive: true });
    }

    // products
    const existingProducts = await db.select().from(products).limit(1);
    if (existingProducts.length === 0) {
      const defs: {
        name: string;
        cat: string;
        short: string;
        desc: string;
        brand: string;
        material: string;
        cost: number;
        price: number;
        disc: number | null;
        sku: string;
        imgs: string[];
        featured?: boolean;
        best?: boolean;
        isNew?: boolean;
        sizes: string[];
        colors: string[];
      }[] = [
        {
          name: "Brazil Home Jersey 2026 — Premium Fan Edition",
          cat: "jersey",
          short: "Breathable dry-fit fan jersey with premium sublimation print.",
          desc: "Premium quality football fan jersey made with breathable dry-fit fabric. Comfortable for summer, perfect fitting, export-quality stitching. Ideal for playing and casual wear.\n\nFabric: 160 GSM Polyester Dry-Fit\nFit: Regular\nCare: Machine wash cold",
          brand: "PrimeKits",
          material: "Polyester Dry-Fit",
          cost: 280,
          price: 650,
          disc: 550,
          sku: "PKS-JSY-001",
          imgs: IMGS.jersey,
          featured: true,
          best: true,
          isNew: true,
          sizes: ["M", "L", "XL", "XXL"],
          colors: ["Yellow", "Blue"],
        },
        {
          name: "Argentina Away Jersey — Premium Edition",
          cat: "jersey",
          short: "Lightweight away jersey with official-style design.",
          desc: "Premium away jersey with soft dry-fit fabric and sharp finishing. Perfect for supporters and sports lovers.",
          brand: "PrimeKits",
          material: "Polyester Dry-Fit",
          cost: 280,
          price: 650,
          disc: 549,
          sku: "PKS-JSY-002",
          imgs: IMGS.jersey,
          best: true,
          sizes: ["M", "L", "XL", "XXL"],
          colors: ["White", "Black"],
        },
        {
          name: "Essential Cotton T-Shirt — Black",
          cat: "t-shirt",
          short: "220 GSM combed cotton solid t-shirt. Bio-washed.",
          desc: "Heavyweight 220 GSM combed cotton t-shirt. Bio-washed, pre-shrunk, no color fade. Ribbed crew neck with perfect stitching.\n\nFabric: 100% Cotton\nGSM: 220\nFit: Regular",
          brand: "PrimeKits Basics",
          material: "100% Cotton",
          cost: 180,
          price: 450,
          disc: 380,
          sku: "PKS-TSH-001",
          imgs: IMGS.tshirt,
          featured: true,
          isNew: true,
          sizes: ["S", "M", "L", "XL", "XXL"],
          colors: ["Black", "White", "Olive"],
        },
        {
          name: "Oversized Drop-Shoulder T-Shirt",
          cat: "t-shirt",
          short: "Trendy oversized fit drop-shoulder tee for streetwear look.",
          desc: "Trendy oversized drop-shoulder t-shirt made with premium cotton. Streetwear style, comfortable all-day wear.",
          brand: "PrimeKits Street",
          material: "Cotton Blend",
          cost: 220,
          price: 550,
          disc: 480,
          sku: "PKS-TSH-002",
          imgs: IMGS.tshirt,
          featured: true,
          sizes: ["M", "L", "XL"],
          colors: ["Beige", "Black", "White"],
        },
        {
          name: "Premium Oxford Casual Shirt",
          cat: "shirt",
          short: "Smart casual oxford shirt — perfect for office & outings.",
          desc: "Premium oxford cotton casual shirt with button-down collar. Wrinkle-resistant finish, comfortable slim-regular fit.",
          brand: "PrimeKits",
          material: "Oxford Cotton",
          cost: 350,
          price: 950,
          disc: 850,
          sku: "PKS-SHT-001",
          imgs: IMGS.shirt,
          best: true,
          sizes: ["M", "L", "XL", "XXL"],
          colors: ["White", "Sky Blue", "Black"],
        },
        {
          name: "Flannel Check Shirt — Winter Special",
          cat: "shirt",
          short: "Warm flannel check shirt for winter style.",
          desc: "Soft brushed flannel check shirt. Warm and stylish for winter season in Bangladesh.",
          brand: "PrimeKits",
          material: "Flannel Cotton",
          cost: 380,
          price: 1050,
          disc: null,
          sku: "PKS-SHT-002",
          imgs: IMGS.shirt,
          sizes: ["M", "L", "XL"],
          colors: ["Red Check", "Blue Check"],
        },
        {
          name: "Premium Fleece Hoodie — 400 GSM",
          cat: "hoodie",
          short: "Heavy 400 GSM brushed fleece hoodie. Super warm.",
          desc: "Bangladesh winter essential! 400 GSM brushed fleece hoodie with kangaroo pocket, ribbed cuffs and premium drawstrings. One-side brushed, ultra soft inside.\n\nFabric: Fleece 400 GSM\nFit: Regular\nPocket: Kangaroo",
          brand: "PrimeKits Winter",
          material: "Fleece Cotton",
          cost: 550,
          price: 1350,
          disc: 1150,
          sku: "PKS-HDD-001",
          imgs: IMGS.hoodie,
          featured: true,
          best: true,
          isNew: true,
          sizes: ["M", "L", "XL", "XXL"],
          colors: ["Black", "Grey", "Navy"],
        },
        {
          name: "High-Neck Full Sleeve — Winter Baselayer",
          cat: "high-neck",
          short: "Stretchable high-neck for winter layering & biking.",
          desc: "Stretchable ribbed high-neck full sleeve t-shirt. Perfect for winter layering, biking and office wear under blazer.",
          brand: "PrimeKits Winter",
          material: "Ribbed Cotton",
          cost: 200,
          price: 550,
          disc: 450,
          sku: "PKS-HNK-001",
          imgs: IMGS.highneck,
          isNew: true,
          sizes: ["M", "L", "XL", "XXL"],
          colors: ["Black", "White", "Maroon"],
        },
      ];

      for (const d of defs) {
        const slug = slugify(d.name);
        const ins = await db
          .insert(products)
          .values({
            name: d.name,
            slug,
            shortDescription: d.short,
            description: d.desc,
            categoryId: catMap.get(d.cat) || null,
            brand: d.brand,
            thumbnail: d.imgs[0],
            images: d.imgs,
            specifications: { Material: d.material, Fit: "Regular", "Care": "Machine wash" },
            features: ["Premium fabric", "Export quality stitching", "Comfortable fit", "Cash on Delivery"],
            material: d.material,
            purchaseCost: String(d.cost),
            sellingPrice: String(d.price),
            discountPrice: d.disc != null ? String(d.disc) : null,
            sku: d.sku,
            status: "published",
            isFeatured: !!d.featured,
            isNewArrival: !!d.isNew,
            isBestSeller: !!d.best,
            lowStockThreshold: 5,
            seoTitle: d.name + " — PrimeKits Studio",
            seoDescription: d.short,
            keywords: `${d.cat}, apparel, primekits, ${d.name}`,
          })
          .returning({ id: products.id });
        const pid = ins[0].id;
        for (const size of d.sizes) {
          for (const color of d.colors) {
            const vsku = `${d.sku}-${size}-${color.slice(0, 3).toUpperCase()}`;
            const stock = 15 + Math.floor(Math.random() * 30);
            await db.insert(productVariants).values({
              productId: pid,
              size,
              color,
              label: `${size} / ${color}`,
              sku: vsku,
              purchaseCost: String(d.cost),
              sellingPrice: String(d.price),
              discountPrice: d.disc != null ? String(d.disc) : null,
              stockQty: stock,
              reservedQty: 0,
              lowStockThreshold: 5,
              isActive: true,
              image: d.imgs[0],
            });
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      message: process.env.NODE_ENV === "production"
        ? "Seeded. Sign in with the administrator password supplied through SEED_ADMIN_PASSWORD."
        : "Seeded. Sign in with the administrator password supplied through SEED_ADMIN_PASSWORD.",
    });
  } catch (e: unknown) {
    console.error(e);
    return NextResponse.json({ error: "Seed failed", detail: String(e) }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}
