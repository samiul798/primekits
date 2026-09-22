"use client";

import { useEffect, useState } from "react";
import { ImageUploadButton } from "@/components/admin-image-upload";
import { SafeImage } from "@/components/safe-image";

export default function AdminSettings() {
  const [s, setS] = useState<Record<string, string | number>>({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [profile, setProfile] = useState({ name: "", email: "", currentPassword: "", newPassword: "" });
  const [profileMsg, setProfileMsg] = useState("");

  async function load() {
    const r = await fetch("/api/admin/settings").then((x) => x.json()).catch(() => null);
    if (r?.settings) setS(r.settings);
  }
  useEffect(() => {
    load();
    fetch("/api/admin/auth/profile").then((r) => r.json()).then((d) => d.profile && setProfile((p) => ({ ...p, name: d.profile.name, email: d.profile.email }))).catch(() => {});
  }, []);

  function set(k: string, v: string | number) {
    setS((prev) => ({ ...prev, [k]: v }));
  }

  async function save() {
    setSaving(true);
    setMsg("");
    const payload: Record<string, unknown> = { ...s };
    for (const k of ["deliveryInsideDhaka", "deliverySubDhaka", "deliveryOutsideDhaka", "freeDeliveryAbove", "reservationExpiryMinutes", "riskSuccessLow", "riskSuccessMedium", "riskRejectHigh"]) {
      if (payload[k] != null && payload[k] !== "") payload[k] = Number(payload[k]);
    }
    const r = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSaving(false);
    if (r.ok) setMsg("✅ Settings saved — logo, WhatsApp, delivery charges & risk thresholds are live on the website.");
    else setMsg("❌ Save failed");
  }

  async function saveProfile() {
    setProfileMsg("");
    const r = await fetch("/api/admin/auth/profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(profile) });
    const d = await r.json();
    if (r.ok) { setProfile((p) => ({ ...p, currentPassword: "", newPassword: "" })); setProfileMsg("Profile updated successfully."); }
    else setProfileMsg(d.error || "Profile update failed.");
  }

  const str = (k: string) => String(s[k] ?? "");

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-black">Settings — Brand, WhatsApp, Delivery, Risk</h1>
      {msg ? <div className="rounded-xl border bg-white px-3 py-2 text-sm font-bold">{msg}</div> : null}

      <div className="rounded-2xl border bg-white p-4">
        <div className="font-extrabold">Admin Profile & Password</div>
        <p className="mt-1 text-xs text-slate-500">Update your sign-in name or email. To change the password, enter your current password and a new password of at least 8 characters.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} placeholder="Admin name" className="rounded-xl border px-3 py-2" />
          <input type="email" value={profile.email} onChange={(e) => setProfile({ ...profile, email: e.target.value })} placeholder="Admin email" className="rounded-xl border px-3 py-2" />
          <input type="password" value={profile.currentPassword} onChange={(e) => setProfile({ ...profile, currentPassword: e.target.value })} placeholder="Current password" className="rounded-xl border px-3 py-2" />
          <input type="password" value={profile.newPassword} onChange={(e) => setProfile({ ...profile, newPassword: e.target.value })} placeholder="New password (min. 8 characters)" className="rounded-xl border px-3 py-2" />
        </div>
        {profileMsg ? <p className="mt-2 text-xs font-bold text-slate-600">{profileMsg}</p> : null}
        <button onClick={saveProfile} className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">Save Profile</button>
      </div>

      <div className="rounded-2xl border bg-white p-4">
        <div className="font-extrabold">🏷️ Brand & Contact</div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {[["businessName", "Business Name"], ["tagline", "Tagline"], ["logo", "Logo URL"], ["phone", "Hotline"], ["whatsapp", "WhatsApp Number (8801…)"], ["email", "Email"], ["address", "Address"], ["announcement", "Announcement Bar"]].map(([k, l]) => (
            <label key={k} className="text-xs font-bold">{l}<input value={str(k)} onChange={(e) => set(k, e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
          ))}
        </div>
        <div className="mt-2"><ImageUploadButton label="Upload logo" onUploaded={(url) => set("logo", url)} /></div>
        {str("logo") ? <SafeImage src={str("logo")} alt="Logo preview" className="mt-2 h-16 w-16 rounded-xl border object-contain" fallback="Logo unavailable" /> : null}
      </div>

      <details className="rounded-2xl border bg-white p-4">
        <summary className="cursor-pointer font-extrabold">📱 Social Links</summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {[["facebook", "Facebook"], ["instagram", "Instagram"], ["youtube", "YouTube"], ["tiktok", "TikTok"]].map(([k, l]) => (
            <label key={k} className="text-xs font-bold">{l}<input value={str(k)} onChange={(e) => set(k, e.target.value)} placeholder="https://…" className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
          ))}
        </div>
      </details>

      <div className="rounded-2xl border bg-white p-4">
        <div className="font-extrabold">🚚 Delivery Charges (BDT)</div>
        <div className="mt-2 grid gap-2 sm:grid-cols-4">
          {[["deliveryInsideDhaka", "Inside Dhaka"], ["deliverySubDhaka", "Sub-Dhaka"], ["deliveryOutsideDhaka", "Outside Dhaka"], ["freeDeliveryAbove", "Free above (0=off)"]].map(([k, l]) => (
            <label key={k} className="text-xs font-bold">{l}<input type="number" value={str(k)} onChange={(e) => set(k, e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
          ))}
        </div>
        <label className="mt-2 block text-xs font-bold">Stock reservation expiry (minutes)
          <input type="number" value={str("reservationExpiryMinutes")} onChange={(e) => set("reservationExpiryMinutes", e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 sm:max-w-xs" />
        </label>
      </div>

      <details className="rounded-2xl border bg-white p-4">
        <summary className="cursor-pointer font-extrabold">📏 Global Size Chart <span className="font-normal text-slate-500">(optional)</span></summary>
        <p className="mt-1 text-xs text-slate-500">This image + note appear inside the “Size Chart” popup on every product page beside “Select size”. You can override per product from Products → Edit.</p>
        <label className="mt-2 block text-xs font-bold">Size Chart / Measurement Guide Image URL
          <input value={str("sizeChartImage")} onChange={(e) => set("sizeChartImage", e.target.value)} placeholder="/images/size-guide.jpg" className="mt-1 w-full rounded-xl border px-3 py-2" />
        </label>
        <div className="mt-2"><ImageUploadButton label="Upload global size chart" onUploaded={(url) => set("sizeChartImage", url)} /></div>
        {str("sizeChartImage") ? (
          <SafeImage src={str("sizeChartImage")} alt="Size chart preview" className="mt-2 max-h-52 w-full rounded-2xl border object-contain" fallback="Size chart image unavailable" />
        ) : null}
        <label className="mt-2 block text-xs font-bold">Default Size Note (Bangla + English)
          <input value={str("sizeChartNote")} onChange={(e) => set("sizeChartNote", e.target.value)} placeholder="দুই সাইজের মাঝামাঝি হলে বড় সাইজটি নিন…" className="mt-1 w-full rounded-xl border px-3 py-2" />
        </label>
      </details>

      <details className="rounded-2xl border bg-white p-4">
        <summary className="cursor-pointer font-extrabold">🛡️ Fraud Risk Thresholds <span className="font-normal text-slate-500">(advanced)</span></summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {[["riskSuccessLow", "LOW if success ≥ % (default 80)"], ["riskSuccessMedium", "MEDIUM floor % (default 50)"], ["riskRejectHigh", "HIGH if reject/return above % (default 40)"]].map(([k, l]) => (
            <label key={k} className="text-xs font-bold">{l}<input type="number" value={str(k)} onChange={(e) => set(k, e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
          ))}
        </div>
      </details>

      <button onClick={save} disabled={saving} className="w-full rounded-2xl bg-slate-900 px-4 py-3 font-bold text-white disabled:opacity-50">{saving ? "Saving…" : "Save All Settings"}</button>
    </div>
  );
}
