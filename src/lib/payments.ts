import "server-only";

type Provider = "bkash" | "nagad";

export function paymentMethodLabel(method: string) {
  return ({ cod: "Cash on Delivery", bkash: "bKash", nagad: "Nagad", bank: "Bank Transfer", cash: "Cash", advance: "Advance Payment", partial: "Partial Payment" } as Record<string, string>)[method] || method;
}

function required(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export function appUrl() {
  const value = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "");
  if (!value || !/^https:\/\//i.test(value)) {
    throw new Error("NEXT_PUBLIC_APP_URL must be your public HTTPS site URL");
  }
  return value;
}

export function paymentCallbackUrl(provider: Provider) {
  return `${appUrl()}/api/payments/${provider}/callback`;
}

export function isPaymentEnabled(provider: Provider) {
  if (provider === "bkash") {
    return Boolean(process.env.NEXT_PUBLIC_APP_URL && process.env.BKASH_BASE_URL && process.env.BKASH_USERNAME && process.env.BKASH_PASSWORD && process.env.BKASH_APP_KEY && process.env.BKASH_APP_SECRET);
  }
  // Nagad requires a merchant-issued PGW signing and verification specification.
  // Do not expose a checkout option until that verified adapter is implemented.
  return false;
}

async function bkashToken() {
  const baseUrl = required("BKASH_BASE_URL").replace(/\/$/, "");
  const response = await fetch(`${baseUrl}/tokenized/checkout/token/grant`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      username: required("BKASH_USERNAME"),
      password: required("BKASH_PASSWORD"),
    },
    body: JSON.stringify({ app_key: required("BKASH_APP_KEY"), app_secret: required("BKASH_APP_SECRET") }),
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.id_token) throw new Error(body.statusMessage || "bKash token request failed");
  return { baseUrl, token: String(body.id_token) };
}

export async function createBkashPayment(order: { id: string; orderNumber: string; mobile: string; grandTotal: string | number }) {
  const { baseUrl, token } = await bkashToken();
  const response = await fetch(`${baseUrl}/tokenized/checkout/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: token,
      "X-App-Key": required("BKASH_APP_KEY"),
    },
    body: JSON.stringify({
      mode: "0011",
      payerReference: order.mobile.replace(/\D/g, "").slice(-11),
      callbackURL: paymentCallbackUrl("bkash"),
      amount: Number(order.grandTotal).toFixed(2),
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: order.orderNumber,
    }),
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.bkashURL || !body.paymentID) throw new Error(body.statusMessage || "bKash payment creation failed");
  return { paymentId: String(body.paymentID), redirectUrl: String(body.bkashURL) };
}

export async function executeBkashPayment(paymentId: string) {
  const { baseUrl, token } = await bkashToken();
  const response = await fetch(`${baseUrl}/tokenized/checkout/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: token, "X-App-Key": required("BKASH_APP_KEY") },
    body: JSON.stringify({ paymentID: paymentId }),
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.transactionStatus !== "Completed") throw new Error(body.statusMessage || "bKash payment was not completed");
  return { invoice: String(body.merchantInvoiceNumber || ""), transactionId: String(body.trxID || paymentId) };
}
