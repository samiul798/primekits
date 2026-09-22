import { InfoPage } from "@/components/info";

export default async function DeliveryPage() {
  return (
    <InfoPage title="Delivery Information">
      <p><b>Delivery zones & charges:</b></p>
      <ul className="list-disc pl-5">
        <li>Inside Dhaka: ৳60 (24–48 hours)</li>
        <li>Sub-Dhaka / Savar / Gazipur / Narayanganj: ৳100 (2–3 days)</li>
        <li>Outside Dhaka: ৳130 (2–4 days)</li>
      </ul>
      <p>We deliver via Steadfast, Pathao, RedX, Paperfly, Sundarban & SA Paribahan depending on your area.</p>
      <p>Please keep your phone switched on — our courier will call before delivery. Check the product in front of the delivery man for any visible defect.</p>
      <p>Delivery time may extend during Eid, sales campaigns or bad weather.</p>
    </InfoPage>
  );
}
