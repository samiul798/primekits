import { InfoPage } from "@/components/info";

export default async function TermsPage() {
  return (
    <InfoPage title="Terms & Conditions">
      <ul className="list-disc pl-5">
        <li>All prices are in Bangladeshi Taka (BDT/৳) including VAT where applicable.</li>
        <li>Placing an order on the website creates a pending order; it is confirmed only after WhatsApp verification by our team.</li>
        <li>Stock is reserved for a limited time; unpaid/unconfirmed orders may expire automatically.</li>
        <li>Product colors may vary slightly due to screen settings.</li>
        <li>Repeated fake orders / courier rejections may lead to advance-payment requirement for future orders.</li>
        <li>By ordering, you agree to our Delivery & Return policies.</li>
      </ul>
    </InfoPage>
  );
}
