import { InfoPage } from "@/components/info";

export default async function PrivacyPage() {
  return (
    <InfoPage title="Privacy Policy">
      <p>We collect only the information needed to process your order: name, mobile number, delivery address and order details.</p>
      <ul className="list-disc pl-5">
        <li>Your data is used for order processing, delivery and support only.</li>
        <li>We never sell your personal information.</li>
        <li>Mobile numbers may be used for courier & fraud-check (delivery success analysis) internally.</li>
        <li>Fraud-check reports are internal and never exposed to customers.</li>
      </ul>
      <p>Contact us anytime to update or delete your data.</p>
    </InfoPage>
  );
}
