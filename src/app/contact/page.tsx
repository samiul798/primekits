"use client";

import { useEffect, useState } from "react";
import { SiteHeader, SiteFooter } from "@/components/store";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export default function ContactPage() {
  const [settings, setSettings] = useState<Record<string, string>>({ businessName: "PrimeKits Studio", phone: "", whatsapp: "", address: "" });
  const [form, setForm] = useState({ name: "", mobile: "", email: "", subject: "", message: "" });
  const [done, setDone] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => d.settings && setSettings(d.settings)).catch(() => {});
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setDone("");
    const r = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await r.json().catch(() => ({}));
    setLoading(false);
    if (r.ok) {
      setDone("✅ Message sent! We will reply within 24 hours.");
      setForm({ name: "", mobile: "", email: "", subject: "", message: "" });
      if (data.whatsappUrl) window.location.assign(data.whatsappUrl);
    } else {
      setDone("❌ Failed to send. Please WhatsApp us directly.");
    }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader settings={settings as never} />
      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 md:grid-cols-2">
        <div className="rounded-2xl border bg-white p-6">
          <h1 className="text-2xl font-black">Contact Us</h1>
          <div className="mt-4 space-y-2 text-sm">
            <div>📞 Hotline: <b>{settings.phone}</b></div>
            <div>💬 WhatsApp: <b>{settings.whatsapp}</b></div>
            <div>📧 Email: <b>{settings.email}</b></div>
            <div>📍 {settings.address}</div>
            <div className="pt-2 text-slate-500">Support hours: 9 AM – 11 PM (Asia/Dhaka), 7 days</div>
          </div>
          {(buildWhatsAppUrl(settings.whatsapp, `Hello ${settings.businessName}! I need help.`) || buildWhatsAppUrl(settings.phone, `Hello ${settings.businessName}! I need help.`)) ? (
            <a href={buildWhatsAppUrl(settings.whatsapp, `Hello ${settings.businessName}! I need help.`) || buildWhatsAppUrl(settings.phone, `Hello ${settings.businessName}! I need help.`)} target="_blank" rel="noreferrer" className="mt-4 block rounded-2xl bg-[#25D366] px-4 py-3 text-center font-extrabold text-white">
              Chat on WhatsApp
            </a>
          ) : null}
        </div>
        <form onSubmit={submit} className="rounded-2xl border bg-white p-6">
          <div className="font-extrabold">Send a message</div>
          <div className="mt-3 space-y-2">
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Your name *" className="w-full rounded-xl border px-3 py-2.5" />
            <input value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} placeholder="Mobile (01XXXXXXXXX)" className="w-full rounded-xl border px-3 py-2.5" />
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email (optional)" className="w-full rounded-xl border px-3 py-2.5" />
            <input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Subject" className="w-full rounded-xl border px-3 py-2.5" />
            <textarea required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Your message *" rows={4} className="w-full rounded-xl border px-3 py-2.5" />
            <button disabled={loading} className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-bold text-white disabled:opacity-50">{loading ? "Sending…" : "Send Message"}</button>
            {done ? <div className="text-sm font-bold">{done}</div> : null}
          </div>
        </form>
      </div>
      <SiteFooter settings={settings as never} />
    </div>
  );
}
