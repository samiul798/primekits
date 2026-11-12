import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";

export const metadata: Metadata = {
  title: {
    default: "PrimeKits Studio | Apparel in Bangladesh",
    template: "%s | PrimeKits Studio",
  },
  description:
    "PrimeKits Studio sells jerseys, T-shirts, shirts, hoodies and high-necks in Bangladesh. Cash on Delivery and WhatsApp order confirmation.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body className="bg-slate-50 text-slate-900 antialiased">
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
