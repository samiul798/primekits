"use client";

import { useEffect, useState } from "react";
import { ImageUploadButton } from "@/components/admin-image-upload";
import { SafeImage } from "@/components/safe-image";

type Category = { id: string; name: string; slug: string; description?: string | null; image?: string | null; sizeChartImage?: string | null; sortOrder: number };
const empty = { name: "", description: "", image: "", sizeChartImage: "", sortOrder: "0" };

export default function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<Category | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const response = await fetch("/api/admin/categories");
    const data = await response.json().catch(() => null);
    if (response.ok) setCategories(data?.categories || []);
    else setError(data?.error || "Could not load categories.");
  }

  useEffect(() => { void load(); }, []);

  async function save() {
    if (!form.name.trim()) { setError("Category name is required."); return; }
    setError("");
    const payload = { ...form, description: form.description || null, image: form.image || null, sizeChartImage: form.sizeChartImage || null, sortOrder: Number(form.sortOrder || 0) };
    const response = await fetch("/api/admin/categories", { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editing ? { id: editing.id, ...payload } : payload) });
    const data = await response.json().catch(() => null);
    if (!response.ok) { setError(data?.error || "Could not save category."); return; }
    setEditing(null); setForm(empty); await load();
  }

  return <div className="space-y-4">
    <h1 className="text-xl font-black">Categories</h1>
    {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}
    <div className="rounded-2xl border bg-white p-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs font-bold">Name<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
        <label className="text-xs font-bold">Sort order<input type="number" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
        <label className="text-xs font-bold sm:col-span-2">Description<input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2"><ImageUploadButton label="Upload category image" onUploaded={(url) => setForm((f) => ({ ...f, image: url }))} /><ImageUploadButton label="Upload category size chart" onUploaded={(url) => setForm((f) => ({ ...f, sizeChartImage: url }))} /></div>
      <button onClick={() => void save()} className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white">{editing ? "Update category" : "Add category"}</button>
      {editing ? <button onClick={() => { setEditing(null); setForm(empty); setError(""); }} className="ml-2 rounded-xl border px-4 py-2 text-sm font-bold">Cancel</button> : null}
    </div>
    <div className="grid gap-2">{categories.map((category) => <div key={category.id} className="flex items-center gap-3 rounded-2xl border bg-white p-3">
      {category.image ? <SafeImage src={category.image} alt={`${category.name} category image`} className="h-14 w-14 shrink-0 rounded-xl border bg-slate-50 object-contain p-1" fallback="" /> : <span className="h-14 w-14 shrink-0 rounded-xl bg-slate-100" />}
      <div className="flex-1"><b>{category.name}</b><div className="text-xs text-slate-500">/{category.slug}</div></div>
      <button onClick={() => { setEditing(category); setError(""); setForm({ name: category.name, description: category.description || "", image: category.image || "", sizeChartImage: category.sizeChartImage || "", sortOrder: String(category.sortOrder) }); }} className="rounded-full border px-3 py-1 text-xs font-bold">Edit</button>
    </div>)}</div>
  </div>;
}
