import { InfoPage } from "@/components/info";

export default async function AboutPage() {
  return (
    <InfoPage title="About PrimeKits Studio">
      <p><b>PrimeKits Studio</b> is a premium apparel brand based in Dhaka, Bangladesh — specializing in Jersey, T-Shirt, Shirt, Hoodie and High-Neck collections.</p>
      <p>We focus on export-quality fabrics, honest pricing in Bangladeshi Taka (৳), Cash on Delivery all over Bangladesh, and fast WhatsApp support.</p>
      <p><b>Why shop with us?</b></p>
      <ul className="list-disc pl-5">
        <li>Premium 160–400 GSM fabrics, quality-checked</li>
        <li>True-to-size fitting for Bangladeshi customers</li>
        <li>Cash on Delivery + bKash / Nagad options</li>
        <li>Easy size-exchange support</li>
      </ul>
      <p>আমরা সারা বাংলাদেশে ক্যাশ অন ডেলিভারিতে প্রিমিয়াম অ্যাপারেল সরবরাহ করি। ওয়েবসাইটে অর্ডার করুন, WhatsApp-এ কনফার্ম করুন।</p>
    </InfoPage>
  );
}
