import {
  pgTable,
  uuid,
  text,
  varchar,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// ---------- Admin users ----------
export const adminUsers = pgTable("admin_users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 160 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 30 }).notNull().default("admin"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------- Categories ----------
export const categories = pgTable(
  "categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    slug: varchar("slug", { length: 140 }).notNull().unique(),
    description: text("description"),
    image: text("image"),
    parentId: uuid("parent_id"),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    sizeChartImage: text("size_chart_image"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("categories_slug_idx").on(t.slug)]
);

// ---------- Products ----------
export const products = pgTable(
  "products",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 200 }).notNull(),
    slug: varchar("slug", { length: 220 }).notNull().unique(),
    shortDescription: text("short_description"),
    description: text("description"),
    categoryId: uuid("category_id"),
    brand: varchar("brand", { length: 120 }),
    thumbnail: text("thumbnail"),
    images: jsonb("images").$type<string[]>().notNull().default([]),
    videoUrl: text("video_url"),
    specifications: jsonb("specifications").$type<Record<string, string>>().notNull().default({}),
    features: jsonb("features").$type<string[]>().notNull().default([]),
    material: varchar("material", { length: 120 }),
    purchaseCost: numeric("purchase_cost", { precision: 12, scale: 2 }).notNull().default("0"),
    sellingPrice: numeric("selling_price", { precision: 12, scale: 2 }).notNull().default("0"),
    discountPrice: numeric("discount_price", { precision: 12, scale: 2 }),
    sku: varchar("sku", { length: 80 }).notNull().unique(),
    barcode: varchar("barcode", { length: 80 }),
    status: varchar("status", { length: 20 }).notNull().default("draft"),
    isFeatured: boolean("is_featured").notNull().default(false),
    isNewArrival: boolean("is_new_arrival").notNull().default(false),
    isBestSeller: boolean("is_best_seller").notNull().default(false),
    lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
    sizeChartImage: text("size_chart_image"),
    sizeChartNote: text("size_chart_note"),
    seoTitle: varchar("seo_title", { length: 200 }),
    seoDescription: text("seo_description"),
    keywords: text("keywords"),
    views: integer("views").notNull().default(0),
    soldCount: integer("sold_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    index("products_status_idx").on(t.status),
    index("products_category_idx").on(t.categoryId),
    index("products_slug_idx").on(t.slug),
  ]
);

// ---------- Product variants ----------
export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productId: uuid("product_id").notNull(),
    size: varchar("size", { length: 40 }),
    color: varchar("color", { length: 60 }),
    design: varchar("design", { length: 80 }),
    material: varchar("material", { length: 80 }),
    label: varchar("label", { length: 160 }),
    sku: varchar("sku", { length: 80 }).notNull().unique(),
    purchaseCost: numeric("purchase_cost", { precision: 12, scale: 2 }).notNull().default("0"),
    sellingPrice: numeric("selling_price", { precision: 12, scale: 2 }).notNull().default("0"),
    discountPrice: numeric("discount_price", { precision: 12, scale: 2 }),
    stockQty: integer("stock_qty").notNull().default(0),
    reservedQty: integer("reserved_qty").notNull().default(0),
    damagedQty: integer("damaged_qty").notNull().default(0),
    lostQty: integer("lost_qty").notNull().default(0),
    returnedQty: integer("returned_qty").notNull().default(0),
    lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
    barcode: varchar("barcode", { length: 80 }),
    image: text("image"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("variants_product_idx").on(t.productId)]
);

// ---------- Customers ----------
export const customers = pgTable(
  "customers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 120 }).notNull(),
    mobile: varchar("mobile", { length: 20 }).notNull(),
    whatsapp: varchar("whatsapp", { length: 20 }),
    email: varchar("email", { length: 160 }),
    address: text("address"),
    division: varchar("division", { length: 80 }),
    district: varchar("district", { length: 80 }),
    thana: varchar("thana", { length: 80 }),
    postal: varchar("postal", { length: 20 }),
    riskOverride: varchar("risk_override", { length: 20 }),
    riskNote: text("risk_note"),
    internalNotes: text("internal_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("customers_mobile_idx").on(t.mobile)]
);

// ---------- Couriers ----------
export const couriers = pgTable("couriers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  phone: varchar("phone", { length: 30 }),
  website: text("website"),
  trackingUrlPattern: text("tracking_url_pattern"),
  contactPerson: varchar("contact_person", { length: 120 }),
  isActive: boolean("is_active").notNull().default(true),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------- Coupons ----------
export const coupons = pgTable("coupons", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: varchar("code", { length: 40 }).notNull().unique(),
  type: varchar("type", { length: 20 }).notNull().default("fixed"),
  value: numeric("value", { precision: 12, scale: 2 }).notNull().default("0"),
  minOrder: numeric("min_order", { precision: 12, scale: 2 }).notNull().default("0"),
  maxDiscount: numeric("max_discount", { precision: 12, scale: 2 }),
  usageLimit: integer("usage_limit"),
  usedCount: integer("used_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------- Orders ----------
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderNumber: varchar("order_number", { length: 30 }).notNull().unique(),
    customerId: uuid("customer_id"),
    customerName: varchar("customer_name", { length: 120 }).notNull(),
    mobile: varchar("mobile", { length: 20 }).notNull(),
    whatsapp: varchar("whatsapp", { length: 20 }),
    email: varchar("email", { length: 160 }),
    address: text("address").notNull(),
    division: varchar("division", { length: 80 }),
    district: varchar("district", { length: 80 }),
    thana: varchar("thana", { length: 80 }),
    postal: varchar("postal", { length: 20 }),
    deliveryZone: varchar("delivery_zone", { length: 30 }),
    notes: text("notes"),
    paymentMethod: varchar("payment_method", { length: 40 }).notNull().default("cod"),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
    deliveryCharge: numeric("delivery_charge", { precision: 12, scale: 2 }).notNull().default("0"),
    discount: numeric("discount", { precision: 12, scale: 2 }).notNull().default("0"),
    grandTotal: numeric("grand_total", { precision: 12, scale: 2 }).notNull().default("0"),
    couponCode: varchar("coupon_code", { length: 40 }),
    status: varchar("status", { length: 40 }).notNull().default("pending_whatsapp"),
    whatsappStatus: varchar("whatsapp_status", { length: 40 }).notNull().default("link_generated"),
    paymentStatus: varchar("payment_status", { length: 30 }).notNull().default("unpaid"),
    courierId: uuid("courier_id"),
    courierName: varchar("courier_name", { length: 120 }),
    trackingId: varchar("tracking_id", { length: 100 }),
    consignmentId: varchar("consignment_id", { length: 100 }),
    courierStatus: varchar("courier_status", { length: 40 }).notNull().default("pending"),
    courierCharge: numeric("courier_charge", { precision: 12, scale: 2 }).notNull().default("0"),
    courierAssignedAt: timestamp("courier_assigned_at", { withTimezone: true }),
    courierDeliveredAt: timestamp("courier_delivered_at", { withTimezone: true }),
    courierReturnedAt: timestamp("courier_returned_at", { withTimezone: true }),
    courierRejectReason: text("courier_reject_reason"),
    courierNotes: text("courier_notes"),
    adminNotes: text("admin_notes"),
    returnReason: text("return_reason"),
    rejectReason: text("reject_reason"),
    reservedUntil: timestamp("reserved_until", { withTimezone: true }),
    ipAddress: varchar("ip_address", { length: 60 }),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("orders_number_unique").on(t.orderNumber),
    index("orders_mobile_idx").on(t.mobile),
    index("orders_status_idx").on(t.status),
    index("orders_created_idx").on(t.createdAt),
  ]
);

// ---------- Order items ----------
export const orderItems = pgTable("order_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull(),
  productId: uuid("product_id"),
  variantId: uuid("variant_id"),
  productName: varchar("product_name", { length: 200 }).notNull(),
  sku: varchar("sku", { length: 80 }),
  variationLabel: varchar("variation_label", { length: 160 }),
  quantity: integer("quantity").notNull(),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  discount: numeric("discount", { precision: 12, scale: 2 }).notNull().default("0"),
  purchaseCostBasis: numeric("purchase_cost_basis", { precision: 12, scale: 2 }).notNull().default("0"),
  cogs: numeric("cogs", { precision: 12, scale: 2 }).notNull().default("0"),
  grossProfit: numeric("gross_profit", { precision: 12, scale: 2 }).notNull().default("0"),
  image: text("image"),
});

// ---------- Order status history ----------
export const orderStatusHistory = pgTable("order_status_history", {
  id: uuid("id").defaultRandom().primaryKey(),
  orderId: uuid("order_id").notNull(),
  prevStatus: varchar("prev_status", { length: 40 }),
  newStatus: varchar("new_status", { length: 40 }).notNull(),
  changedBy: varchar("changed_by", { length: 120 }),
  reason: text("reason"),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------- Inventory transactions ----------
export const inventoryTransactions = pgTable("inventory_transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id"),
  variantId: uuid("variant_id"),
  type: varchar("type", { length: 40 }).notNull(),
  quantity: integer("quantity").notNull(),
  prevStock: integer("prev_stock").notNull(),
  newStock: integer("new_stock").notNull(),
  referenceType: varchar("reference_type", { length: 40 }),
  referenceId: varchar("reference_id", { length: 120 }),
  reason: text("reason"),
  createdBy: varchar("created_by", { length: 120 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------- Suppliers ----------
export const suppliers = pgTable("suppliers", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  phone: varchar("phone", { length: 30 }),
  address: text("address"),
  email: varchar("email", { length: 160 }),
  company: varchar("company", { length: 160 }),
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------- Purchases ----------
export const purchases = pgTable("purchases", {
  id: uuid("id").defaultRandom().primaryKey(),
  purchaseNo: varchar("purchase_no", { length: 40 }).notNull().unique(),
  supplierId: uuid("supplier_id"),
  purchaseDate: timestamp("purchase_date", { withTimezone: true }).defaultNow().notNull(),
  subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull().default("0"),
  paidAmount: numeric("paid_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  dueAmount: numeric("due_amount", { precision: 12, scale: 2 }).notNull().default("0"),
  paymentStatus: varchar("payment_status", { length: 30 }).notNull().default("unpaid"),
  invoiceNo: varchar("invoice_no", { length: 80 }),
  invoiceFile: text("invoice_file"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const purchaseItems = pgTable("purchase_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  purchaseId: uuid("purchase_id").notNull(),
  productId: uuid("product_id"),
  variantId: uuid("variant_id"),
  sku: varchar("sku", { length: 80 }),
  quantity: integer("quantity").notNull(),
  unitCost: numeric("unit_cost", { precision: 12, scale: 2 }).notNull(),
  totalCost: numeric("total_cost", { precision: 12, scale: 2 }).notNull(),
});

// ---------- Expenses ----------
export const expenses = pgTable("expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 160 }).notNull(),
  category: varchar("category", { length: 80 }).notNull().default("general"),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  expenseDate: timestamp("expense_date", { withTimezone: true }).defaultNow().notNull(),
  paymentMethod: varchar("payment_method", { length: 40 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------- Reviews ----------
export const reviews = pgTable("reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  productId: uuid("product_id").notNull(),
  customerName: varchar("customer_name", { length: 120 }).notNull(),
  rating: integer("rating").notNull().default(5),
  comment: text("comment"),
  isApproved: boolean("is_approved").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------- Settings (key-value) ----------
export const settings = pgTable("settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  key: varchar("key", { length: 80 }).notNull().unique(),
  value: jsonb("value"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------- Contact messages ----------
export const contactMessages = pgTable("contact_messages", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  mobile: varchar("mobile", { length: 20 }),
  email: varchar("email", { length: 160 }),
  subject: varchar("subject", { length: 200 }),
  message: text("message").notNull(),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
