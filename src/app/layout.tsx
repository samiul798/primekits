import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { CartProvider } from "@/components/CartProvider";

export const metadata: Metadata = {
  title: {
    default: "PrimeKits Studio — Premium Apparel in Bangladesh",
    template: "%s | PrimeKits Studio",
  },
  description:
    "PrimeKits Studio — Premium Jersey, T-Shirt, Shirt, Hoodie & High-Neck in Bangladesh. Cash on Delivery, WhatsApp order confirmation.",
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
