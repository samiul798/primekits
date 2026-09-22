import { InfoPage } from "@/components/info";

const FAQS: [string, string][] = [
  ["How do I order?", "Add products to cart → Checkout with your name, mobile & address → Tap 'Confirm on WhatsApp' and press Send. We confirm on WhatsApp."],
  ["Is Cash on Delivery available?", "Yes! COD is available all over Bangladesh. You can also pay via bKash / Nagad / Bank."],
  ["How long is delivery?", "Inside Dhaka 24–48h. Outside Dhaka 2–4 days depending on courier."],
  ["How do I track my order?", "Go to Track Order page and enter your order number (PKS-...) or mobile number."],
  ["What if the size doesn't fit?", "We offer size exchange within 3 days (unused with tags). Message us on WhatsApp with your order number."],
  ["Do you have a physical shop?", "We are primarily online. Contact us on WhatsApp for pickup options in Dhaka."],
];

export default async function FaqPage() {
  return (
    <InfoPage title="Frequently Asked Questions">
      {FAQS.map(([q, a]) => (
        <div key={q} className="rounded-xl bg-slate-50 p-3">
          <div className="font-bold">❓ {q}</div>
          <div className="mt-1">{a}</div>
        </div>
      ))}
    </InfoPage>
  );
}
