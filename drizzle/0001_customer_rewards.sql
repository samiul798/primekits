-- Backward-compatible loyalty reward fields. Apply with your normal Drizzle
-- migration workflow; this file is intentionally not run against production.
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "customer_id" uuid;
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "qualifying_order_id" uuid;
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "redeemed_order_id" uuid;
ALTER TABLE "coupons" ADD COLUMN IF NOT EXISTS "kind" varchar(30) NOT NULL DEFAULT 'standard';
CREATE INDEX IF NOT EXISTS "coupons_customer_idx" ON "coupons" ("customer_id");
CREATE UNIQUE INDEX IF NOT EXISTS "coupons_qualifying_order_unique" ON "coupons" ("qualifying_order_id") WHERE "qualifying_order_id" IS NOT NULL;
