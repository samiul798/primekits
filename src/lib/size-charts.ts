// Central size-chart data for PrimeKits Studio apparel (measurements in inches)
// Based on standard Bangladeshi ready-made garment sizing.

export type SizeRow = {
  size: string;
  chest: string;
  length: string;
  shoulder?: string;
  sleeve?: string;
  note?: string;
};

export type SizeChart = {
  category: string;
  title: string;
  unit: string;
  headers: string[];
  rows: SizeRow[];
  howTo: string[];
  tipBn: string;
};

export const SIZE_CHARTS: Record<string, SizeChart> = {
  jersey: {
    category: "jersey",
    title: "Jersey Size Chart",
    unit: "inch",
    headers: ["Size", "Chest", "Length", "Shoulder"],
    rows: [
      { size: "M", chest: "38", length: "27", shoulder: "17" },
      { size: "L", chest: "40", length: "28", shoulder: "18" },
      { size: "XL", chest: "42", length: "29", shoulder: "19" },
      { size: "XXL", chest: "44", length: "30", shoulder: "20" },
    ],
    howTo: [
      "Chest: measure around the fullest part of your chest, tape under arms.",
      "Length: from highest shoulder point straight down to hem.",
      "Jerseys are regular athletic fit — take one size up for loose fit.",
    ],
    tipBn: "জার্সি সাধারণত রেগুলার ফিট হয়। লুজ পড়তে চাইলে এক সাইজ বড় নিন।",
  },
  "t-shirt": {
    category: "t-shirt",
    title: "T-Shirt Size Chart",
    unit: "inch",
    headers: ["Size", "Chest", "Length", "Shoulder"],
    rows: [
      { size: "S", chest: "36", length: "26", shoulder: "16.5" },
      { size: "M", chest: "38", length: "27", shoulder: "17.5" },
      { size: "L", chest: "40", length: "28", shoulder: "18.5" },
      { size: "XL", chest: "42", length: "29", shoulder: "19.5" },
      { size: "XXL", chest: "44", length: "30", shoulder: "20.5" },
    ],
    howTo: [
      "Chest: fullest part of chest, tape level around body.",
      "Length: highest shoulder point to bottom hem.",
      "Oversized tees: models show one size up from regular.",
    ],
    tipBn: "টি-শার্ট বায়ো-ওয়াশ করা, সামান্য সংকোচন হতে পারে — পারফেক্ট ফিটের জন্য চার্ট মিলিয়ে নিন।",
  },
  shirt: {
    category: "shirt",
    title: "Shirt Size Chart",
    unit: "inch",
    headers: ["Size", "Chest", "Length", "Sleeve"],
    rows: [
      { size: "M", chest: "39", length: "28", sleeve: "23" },
      { size: "L", chest: "41", length: "29", sleeve: "24" },
      { size: "XL", chest: "43", length: "30", sleeve: "25" },
      { size: "XXL", chest: "45", length: "31", sleeve: "25.5" },
    ],
    howTo: [
      "Chest: button the shirt and lay flat, pit-to-pit × 2.",
      "Sleeve: shoulder seam to cuff end.",
      "Office fit: if between sizes, take the larger.",
    ],
    tipBn: "শার্ট অফিস ফিট — দুই সাইজের মাঝামাঝি হলে বড়টা নিন।",
  },
  hoodie: {
    category: "hoodie",
    title: "Hoodie Size Chart",
    unit: "inch",
    headers: ["Size", "Chest", "Length", "Sleeve"],
    rows: [
      { size: "M", chest: "40", length: "26", sleeve: "23" },
      { size: "L", chest: "42", length: "27", sleeve: "24" },
      { size: "XL", chest: "44", length: "28", sleeve: "25" },
      { size: "XXL", chest: "46", length: "29", sleeve: "26" },
    ],
    howTo: [
      "Hoodies are worn over inner — 400 GSM fleece has roomy fit.",
      "Chest: pit-to-pit flat × 2.",
      "Winter layering: take your regular size, no need to upsize.",
    ],
    tipBn: "হুডি ভেতরে গেঞ্জি পরে মাপুন। ৪০০ GSM ফ্লিস একটু রুমি ফিট হয়।",
  },
  "high-neck": {
    category: "high-neck",
    title: "High-Neck Size Chart",
    unit: "inch",
    headers: ["Size", "Chest", "Length", "Sleeve"],
    rows: [
      { size: "M", chest: "36", length: "26", sleeve: "23" },
      { size: "L", chest: "38", length: "27", sleeve: "24" },
      { size: "XL", chest: "40", length: "28", sleeve: "24.5" },
      { size: "XXL", chest: "42", length: "29", sleeve: "25" },
    ],
    howTo: [
      "Ribbed stretch fabric — fits 1–2 inch flex.",
      "Chest: relaxed flat measurement × 2.",
      "Bikers: take regular size for wind-proof snug fit.",
    ],
    tipBn: "হাই-নেক স্ট্রেচ ফ্যাব্রিক — টানলে ১-২ ইঞ্চি বাড়ে।",
  },
};

export const DEFAULT_SIZE_CHART: SizeChart = {
  category: "default",
  title: "Apparel Size Chart",
  unit: "inch",
  headers: ["Size", "Chest", "Length", "Shoulder"],
  rows: [
    { size: "S", chest: "36", length: "26", shoulder: "16.5" },
    { size: "M", chest: "38", length: "27", shoulder: "17.5" },
    { size: "L", chest: "40", length: "28", shoulder: "18.5" },
    { size: "XL", chest: "42", length: "29", shoulder: "19.5" },
    { size: "XXL", chest: "44", length: "30", shoulder: "20.5" },
  ],
  howTo: [
    "Chest: around fullest part of chest.",
    "Length: shoulder point to hem.",
    "When between sizes, choose the larger size.",
  ],
  tipBn: "দুই সাইজের মাঝে থাকলে বড় সাইজটি নিন।",
};

export function getSizeChart(categorySlug?: string | null): SizeChart {
  if (!categorySlug) return DEFAULT_SIZE_CHART;
  const key = categorySlug.toLowerCase();
  return SIZE_CHARTS[key] ?? DEFAULT_SIZE_CHART;
}

export const DEFAULT_SIZE_GUIDE_IMAGE = "/images/size-guide.svg";
