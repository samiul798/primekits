import { InfoPage } from "@/components/info";

export default async function ReturnsPage() {
  return (
    <InfoPage title="Return & Refund Policy">
      <p><b>7-day easy exchange policy:</b></p>
      <ul className="list-disc pl-5">
        <li>Size exchange available within 3 days of delivery (product must be unused with tags).</li>
        <li>Damaged / wrong item: full replacement or refund — send unboxing photo/video on WhatsApp within 24 hours.</li>
        <li>Used, washed or altered products are not eligible.</li>
      </ul>
      <p><b>How to request:</b> Message us on WhatsApp with your order number + photo of the issue. We will arrange courier pickup or resend.</p>
      <p><b>Refunds:</b> For advance payments, refunds are sent via bKash/Nagad/Bank within 3–5 working days after we receive the returned product.</p>
      <p>Return courier charge is borne by the customer unless the fault is ours.</p>
    </InfoPage>
  );
}
