import { NextRequest, NextResponse } from "next/server";
import { appUrl } from "@/lib/payments";

// Nagad must be verified through the merchant-specific PGW API before marking
// an order paid. This endpoint is the HTTPS return URL to provide to Nagad.
export async function GET(req: NextRequest) {
  const order = req.nextUrl.searchParams.get("order") || req.nextUrl.searchParams.get("merchantInvoiceNumber") || "";
  const url = new URL(`/order-success?order=${encodeURIComponent(order)}&payment=pending`, appUrl());
  return NextResponse.redirect(url);
}
