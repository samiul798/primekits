import { NextResponse } from "next/server";
import { isPaymentEnabled } from "@/lib/payments";

export function GET() {
  return NextResponse.json({
    providers: {
      bkash: { enabled: isPaymentEnabled("bkash") },
      nagad: { enabled: isPaymentEnabled("nagad"), message: "Nagad merchant PGW integration is not configured yet." },
    },
  });
}
