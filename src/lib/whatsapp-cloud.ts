type WhatsAppCloudConfig = {
  phoneNumberId: string;
  accessToken: string;
  templateName: string;
  templateLanguage: string;
  graphApiVersion: string;
};

export function normalizeWhatsAppPhone(value: string): string {
  const phone = value.replace(/\D/g, "");
  if (phone.startsWith("880")) return phone;
  if (phone.startsWith("0")) return `88${phone}`;
  return phone;
}

export function getWhatsAppCloudConfig(): WhatsAppCloudConfig | null {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const templateName = process.env.WHATSAPP_TEMPLATE_NAME;
  if (!phoneNumberId || !accessToken || !templateName) return null;

  return {
    phoneNumberId,
    accessToken,
    templateName,
    templateLanguage: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en_US",
    graphApiVersion: process.env.WHATSAPP_GRAPH_API_VERSION || "v23.0",
  };
}

export async function sendOrderConfirmationTemplate(input: {
  customerName: string;
  mobile: string;
  orderNumber: string;
  grandTotal: number;
}) {
  const config = getWhatsAppCloudConfig();
  if (!config) return { sent: false as const, reason: "not_configured" as const };

  const response = await fetch(
    `https://graph.facebook.com/${config.graphApiVersion}/${config.phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: normalizeWhatsAppPhone(input.mobile),
        type: "template",
        template: {
          name: config.templateName,
          language: { code: config.templateLanguage },
          components: [{
            type: "body",
            parameters: [
              { type: "text", text: input.customerName },
              { type: "text", text: input.orderNumber },
              { type: "text", text: `BDT ${input.grandTotal.toFixed(2)}` },
            ],
          }],
        },
      }),
    }
  );

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`WhatsApp API rejected the template (${response.status}): ${detail.slice(0, 500)}`);
  }
  return { sent: true as const };
}

export function isConfirmationReply(text: string): boolean {
  const normalized = text.trim().toLowerCase().replace(/[.!?,]/g, "");
  return /^(yes|y|confirm|confirmed|ok|okay|জি|হ্যাঁ|হ্যা|ঠিক|নিশ্চিত)$/.test(normalized);
}
