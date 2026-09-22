"use client";

import { useEffect, useState } from "react";
import { ImageUploadButton } from "@/components/admin-image-upload";
import { SafeImage } from "@/components/safe-image";

type Product = {
  id: string;
  name: string;
  slug: string;
  sku: string;
  status: string;
  sellingPrice: string;
  discountPrice?: string | null;
  purchaseCost: string;
  thumbnail?: string | null;
  images?: string[];
  categoryId?: string | null;
  isFeatured: boolean;
  isNewArrival: boolean;
  isBestSeller: boolean;
  variantCount: number;
  availableStock: number;
  description?: string | null;
  shortDescription?: string | null;
  brand?: string | null;
  material?: string | null;
  sizeChartImage?: string | null;
  sizeChartNote?: string | null;
  specifications?: Record<string, string> | null;
  features?: string[] | null;
};

type Variant = {
  id: string;
  size?: string | null;
  color?: string | null;
  sku: string;
  sellingPrice: string;
  discountPrice?: string | null;
  purchaseCost: string;
  stockQty: number;
  reservedQty: number;
  returnedQty: number;
  soldQty: number;
  available: number;
  isActive: boolean;
  label?: string | null;
  image?: string | null;
};

export default function AdminProducts() {
  const [items, setItems] = useState<Product[]>([]);
  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: "", sku: "", sellingPrice: "", discountPrice: "", purchaseCost: "0", status: "draft", categoryId: "", brand: "PrimeKits", material: "", shortDescription: "", description: "", thumbnail: "", images: [] as string[], sizeChartImage: "", sizeChartNote: "", specificationsText: "", featuresText: "", isFeatured: false, isNewArrival: false, isBestSeller: false });
  const [variants, setVariants] = useState<Variant[]>([]);
  const [manageFor, setManageFor] = useState<Product | null>(null);
  const [vform, setVform] = useState({ size: "M", color: "Black", sku: "", sellingPrice: "", discountPrice: "", purchaseCost: "0", stockQty: "20", image: "" });
  const [stockAdj, setStockAdj] = useState({ variantId: "", type: "purchase", quantity: "10", reason: "", direction: "add", unitCost: "" });
  const [stockSaving, setStockSaving] = useState(false);

  async function load() {
    const r = await fetch(`/api/admin/products?q=${encodeURIComponent(q)}`);
    const d = await r.json();
    if (r.ok) setItems(d.products || []);
    const c = await fetch("/api/admin/categories").then((x) => x.json()).catch(() => ({ categories: [] }));
    setCats(c.categories || []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openNew() {
    setEditing(null);
    setForm({ name: "", sku: "", sellingPrice: "", discountPrice: "", purchaseCost: "0", status: "draft", categoryId: "", brand: "PrimeKits", material: "", shortDescription: "", description: "", thumbnail: "", images: [], sizeChartImage: "", sizeChartNote: "", specificationsText: "", featuresText: "", isFeatured: false, isNewArrival: false, isBestSeller: false });
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setForm({
      name: p.name,
      sku: p.sku,
      sellingPrice: String(p.sellingPrice),
      discountPrice: p.discountPrice ? String(p.discountPrice) : "",
      purchaseCost: String(p.purchaseCost || 0),
      status: p.status,
      categoryId: p.categoryId || "",
      brand: p.brand || "",
      material: p.material || "",
      shortDescription: p.shortDescription || "",
      description: p.description || "",
      thumbnail: p.thumbnail || "",
      images: p.images || (p.thumbnail ? [p.thumbnail] : []),
      sizeChartImage: p.sizeChartImage || "",
      sizeChartNote: p.sizeChartNote || "",
      specificationsText: Object.entries(p.specifications || {}).map(([key, value]) => `${key}: ${value}`).join("\n"),
      featuresText: (p.features || []).join("\n"),
      isFeatured: !!p.isFeatured,
      isNewArrival: !!p.isNewArrival,
      isBestSeller: !!p.isBestSeller,
    });
    setShowForm(true);
  }

  async function save() {
    if (!form.name || !form.sku || !form.sellingPrice) return alert("Name, SKU and selling price are required.");
    const specifications = Object.fromEntries(form.specificationsText.split("\n").map((line) => line.split(/:(.+)/)).filter(([key, value]) => key.trim() && value?.trim()).map(([key, value]) => [key.trim(), value.trim()]));
    const payload = {
      name: form.name,
      sku: form.sku,
      sellingPrice: Number(form.sellingPrice),
      discountPrice: form.discountPrice ? Number(form.discountPrice) : null,
      purchaseCost: Number(form.purchaseCost || 0),
      status: form.status,
      categoryId: form.categoryId || null,
      brand: form.brand || null,
      material: form.material || null,
      shortDescription: form.shortDescription || null,
      description: form.description || null,
      thumbnail: form.thumbnail || null,
      images: form.images,
      sizeChartImage: form.sizeChartImage || null,
      sizeChartNote: form.sizeChartNote || null,
      specifications,
      features: form.featuresText.split("\n").map((item) => item.trim()).filter(Boolean),
      isFeatured: form.isFeatured,
      isNewArrival: form.isNewArrival,
      isBestSeller: form.isBestSeller,
    };
    const r = await fetch("/api/admin/products", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editing ? { id: editing.id, ...payload } : payload),
    });
    const d = await r.json();
    if (!r.ok) return alert(d.error || "Save failed");
    setShowForm(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm("Delete this product and all its variants?")) return;
    const r = await fetch(`/api/admin/products?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    const d = await r.json().catch(() => null);
    if (!r.ok) return alert(d?.error || "Could not delete product");
    alert("Product deleted successfully.");
    load();
  }

  async function openVariants(p: Product) {
    setManageFor(p);
    const r = await fetch(`/api/admin/variants?productId=${p.id}`);
    const d = await r.json();
    setVariants(d.variants || []);
    setVform({ size: "M", color: "Black", sku: `${p.sku}-M-BLA`, sellingPrice: String(p.sellingPrice), discountPrice: p.discountPrice ? String(p.discountPrice) : "", purchaseCost: String(p.purchaseCost || 0), stockQty: "20", image: "" });
  }

  async function addVariant() {
    if (!manageFor || !vform.sku || !vform.sellingPrice) return alert("SKU and price required");
    const r = await fetch("/api/admin/variants", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: manageFor.id,
        size: vform.size || null,
        color: vform.color || null,
        sku: vform.sku,
        sellingPrice: Number(vform.sellingPrice),
        discountPrice: vform.discountPrice ? Number(vform.discountPrice) : null,
        purchaseCost: Number(vform.purchaseCost || 0),
        stockQty: Number(vform.stockQty || 0),
        image: vform.image || null,
      }),
    });
    const d = await r.json();
    if (!r.ok) return alert(d.error || "Failed");
    openVariants(manageFor);
    load();
  }

  async function adjustStock() {
    const quantity = Number(stockAdj.quantity);
    if (!stockAdj.variantId || !Number.isInteger(quantity) || quantity < 1) return alert("Select a variant and enter a whole quantity.");
    if ((stockAdj.type === "damage" || stockAdj.type === "lost" || (stockAdj.type === "adjustment" && stockAdj.direction === "reduce")) && !stockAdj.reason.trim()) return alert("Add a short reason for stock removal so the inventory audit stays clear.");
    if (stockAdj.type === "purchase" && stockAdj.unitCost !== "" && (!Number.isFinite(Number(stockAdj.unitCost)) || Number(stockAdj.unitCost) < 0)) return alert("Enter a valid purchase cost.");
    setStockSaving(true);
    try {
    const r = await fetch("/api/admin/variants", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        variantId: stockAdj.variantId,
        type: stockAdj.type,
        quantity,
        reason: stockAdj.reason,
        direction: stockAdj.direction,
        unitCost: stockAdj.unitCost ? Number(stockAdj.unitCost) : null,
      }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || "Failed");
    alert(`Stock updated: ${d.prevStock} → ${d.newStock}`);
    setStockAdj({ variantId: "", type: "purchase", quantity: "10", reason: "", direction: "add", unitCost: "" });
    if (manageFor) await openVariants(manageFor);
    await load();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Stock update failed");
    } finally { setStockSaving(false); }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-black">Products ({items.length})</h1>
        <button onClick={openNew} className="ml-auto rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white">+ New Product</button>
      </div>
      <div className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name / SKU…" className="w-full rounded-xl border bg-white px-3 py-2" />
        <button onClick={load} className="rounded-xl border bg-white px-4 font-bold">Search</button>
      </div>
      <div className="grid gap-2">
        {items.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-2xl border bg-white p-3">
            {p.thumbnail ? (
              <SafeImage src={p.thumbnail} alt={`${p.name} thumbnail`} className="h-12 w-12 rounded-xl bg-slate-100 object-cover" fallback="👕" />
            ) : (
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-2xl">👕</span>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-black">{p.name}</div>
              <div className="text-xs text-slate-500">{p.sku} • {p.status} • {p.variantCount} variants • <b className={p.availableStock <= 5 ? "text-rose-600" : ""}>{p.availableStock} pcs</b> • ৳{p.sellingPrice}</div>
            </div>
            <div className="flex flex-wrap gap-1">
              <button onClick={() => openEdit(p)} className="rounded-full border px-3 py-1 text-xs font-bold">Edit</button>
              <button onClick={() => openVariants(p)} className="rounded-full border px-3 py-1 text-xs font-bold">Variants</button>
              <button onClick={() => remove(p.id)} className="rounded-full border border-rose-200 px-3 py-1 text-xs font-bold text-rose-600">Del</button>
            </div>
          </div>
        ))}
        {items.length === 0 ? <div className="rounded-2xl border bg-white p-10 text-center text-slate-400">No products. Click “+ New Product” or run seed.</div> : null}
      </div>

      {showForm ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
          <div className="mx-auto max-w-2xl rounded-3xl bg-white p-5">
            <div className="flex items-center justify-between"><h2 className="font-black">{editing ? "Edit Product" : "New Product"}</h2><button onClick={() => setShowForm(false)} className="rounded-full border px-3 py-1 text-sm font-bold">✕</button></div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <label className="text-xs font-bold sm:col-span-2">Name *<input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
              <label className="text-xs font-bold">SKU *<input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
              <label className="text-xs font-bold">Status
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2">
                  {["draft", "published", "unpublished", "archived"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="text-xs font-bold">Selling Price (৳) *<input type="number" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
              <label className="text-xs font-bold">Discount Price (৳)<input type="number" value={form.discountPrice} onChange={(e) => setForm({ ...form, discountPrice: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
              <label className="text-xs font-bold">Purchase Cost (৳)<input type="number" value={form.purchaseCost} onChange={(e) => setForm({ ...form, purchaseCost: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
              <label className="text-xs font-bold">Category
                <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2">
                  <option value="">— none —</option>
                  {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
              <label className="text-xs font-bold">Brand<input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
              <label className="text-xs font-bold">Material<input value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
              <div className="rounded-2xl border p-3 sm:col-span-2">
                <div className="text-xs font-black">Product images</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <ImageUploadButton label="Upload thumbnail" onUploaded={(url) => setForm((f) => ({ ...f, thumbnail: url, images: f.images.includes(url) ? f.images : [url, ...f.images] }))} />
                  <ImageUploadButton label="Add gallery image" onUploaded={(url) => setForm((f) => ({ ...f, thumbnail: f.thumbnail || url, images: [...f.images, url].slice(0, 12) }))} />
                </div>
                <label className="mt-2 block text-xs font-bold">Thumbnail URL (optional external image)
                  <input value={form.thumbnail} onChange={(e) => setForm({ ...form, thumbnail: e.target.value })} placeholder="https://… or /uploads/…" className="mt-1 w-full rounded-xl border px-3 py-2" />
                </label>
                {form.images.length ? <div className="mt-2 flex flex-wrap gap-2">{form.images.map((url, index) => <div key={`${url}-${index}`} className="relative"><img src={url} alt="Product preview" className="h-16 w-16 rounded-lg border object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} /><button type="button" onClick={() => setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== index), thumbnail: f.thumbnail === url ? f.images.filter((_, i) => i !== index)[0] || "" : f.thumbnail }))} className="absolute -right-1 -top-1 rounded-full bg-rose-600 px-1 text-xs text-white">×</button></div>)}</div> : null}
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 sm:col-span-2">
                <div className="text-xs font-black">📏 Size Chart (shows beside “Select size” on product page)</div>
                <div className="mt-2"><ImageUploadButton label="Upload size chart image" onUploaded={(url) => setForm((f) => ({ ...f, sizeChartImage: url }))} /></div>
                <label className="mt-2 block text-xs font-bold">Size Chart Image URL (optional — blank = global default)
                  <input value={form.sizeChartImage} onChange={(e) => setForm({ ...form, sizeChartImage: e.target.value })} placeholder="https://… or /images/size-guide.jpg" className="mt-1 w-full rounded-xl border bg-white px-3 py-2" />
                </label>
                {form.sizeChartImage ? (
                  <SafeImage src={form.sizeChartImage} alt="Size chart preview" className="mt-2 max-h-40 w-full rounded-xl border object-contain" fallback="Size chart image unavailable" />
                ) : null}
                <label className="mt-2 block text-xs font-bold">Size Note for customers (optional)
                  <input value={form.sizeChartNote} onChange={(e) => setForm({ ...form, sizeChartNote: e.target.value })} placeholder="e.g. Jersey regular fit — লুজ চাইলে এক সাইজ বড় নিন" className="mt-1 w-full rounded-xl border bg-white px-3 py-2" />
                </label>
              </div>
              <label className="text-xs font-bold sm:col-span-2">Short Description<textarea value={form.shortDescription} onChange={(e) => setForm({ ...form, shortDescription: e.target.value })} rows={2} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
              <label className="text-xs font-bold sm:col-span-2">Description<textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
              <div className="rounded-2xl border bg-slate-50 p-3 sm:col-span-2">
                <div className="text-xs font-black">Product details shown on the product page</div>
                <label className="mt-2 block text-xs font-bold">Specifications <span className="font-normal text-slate-500">(one per line: Label: Value)</span>
                  <textarea value={form.specificationsText} onChange={(e) => setForm({ ...form, specificationsText: e.target.value })} placeholder={"Fit: Regular\nCare: Machine wash\nMaterial: Premium dry-fit"} rows={4} className="mt-1 w-full rounded-xl border bg-white px-3 py-2" />
                </label>
                <label className="mt-2 block text-xs font-bold">Feature checklist <span className="font-normal text-slate-500">(one feature per line)</span>
                  <textarea value={form.featuresText} onChange={(e) => setForm({ ...form, featuresText: e.target.value })} placeholder={"Premium fabric\nBreathable\nCash on Delivery"} rows={4} className="mt-1 w-full rounded-xl border bg-white px-3 py-2" />
                </label>
              </div>
              <div className="flex gap-4 text-sm font-bold sm:col-span-2">
                <label><input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm({ ...form, isFeatured: e.target.checked })} /> Featured</label>
                <label><input type="checkbox" checked={form.isNewArrival} onChange={(e) => setForm({ ...form, isNewArrival: e.target.checked })} /> New Arrival</label>
                <label><input type="checkbox" checked={form.isBestSeller} onChange={(e) => setForm({ ...form, isBestSeller: e.target.checked })} /> Best Seller</label>
              </div>
            </div>
            <button onClick={save} className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-3 font-bold text-white">Save Product</button>
            <p className="mt-2 text-[11px] text-slate-500">Only “published” products appear on the website. Add size/color variants after saving.</p>
          </div>
        </div>
      ) : null}

      {manageFor ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4">
          <div className="mx-auto max-w-2xl rounded-3xl bg-white p-5">
            <div className="flex items-center justify-between"><h2 className="font-black">Variants — {manageFor.name}</h2><button onClick={() => setManageFor(null)} className="rounded-full border px-3 py-1 text-sm font-bold">✕</button></div>
            <div className="mt-3 space-y-2">
              {variants.map((v) => (
                <div key={v.id} className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-white p-3 text-sm shadow-sm">
                  <span><b>{v.label || `${v.size} / ${v.color}`}</b> <span className="text-slate-500">{v.sku}</span></span>
                  <span className="font-bold">৳{Number(v.discountPrice || v.sellingPrice).toLocaleString("en-IN")} <span className="font-normal text-slate-400">•</span> Stock {v.stockQty} <span className="font-normal text-slate-400">•</span> Return {v.returnedQty || 0} <span className="font-normal text-slate-400">•</span> Sold {v.soldQty || 0} <span className="font-normal text-slate-400">•</span> <span className={v.available <= 5 ? "text-rose-600" : "text-emerald-600"}>{v.available} avail</span></span>
                </div>
              ))}
              {variants.length === 0 ? <div className="text-sm text-slate-400">No variants yet — add size/color combos below. Each variation tracks its own stock.</div> : null}
            </div>
            <div className="mt-4 rounded-2xl bg-slate-50 p-3">
              <div className="text-sm font-black">+ Add Variation</div>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <input value={vform.size} onChange={(e) => setVform({ ...vform, size: e.target.value })} placeholder="Size (M)" className="rounded-xl border px-2 py-2 text-sm" />
                <input value={vform.color} onChange={(e) => setVform({ ...vform, color: e.target.value })} placeholder="Color" className="rounded-xl border px-2 py-2 text-sm" />
                <input value={vform.sku} onChange={(e) => setVform({ ...vform, sku: e.target.value })} placeholder="SKU" className="rounded-xl border px-2 py-2 text-sm" />
                <input type="number" value={vform.sellingPrice} onChange={(e) => setVform({ ...vform, sellingPrice: e.target.value })} placeholder="Sell ৳" className="rounded-xl border px-2 py-2 text-sm" />
                <input type="number" value={vform.discountPrice} onChange={(e) => setVform({ ...vform, discountPrice: e.target.value })} placeholder="Disc ৳" className="rounded-xl border px-2 py-2 text-sm" />
                <input type="number" min="0" value={vform.purchaseCost} onChange={(e) => setVform({ ...vform, purchaseCost: e.target.value })} placeholder="Cost ৳" className="rounded-xl border px-2 py-2 text-sm" />
                <input type="number" value={vform.stockQty} onChange={(e) => setVform({ ...vform, stockQty: e.target.value })} placeholder="Stock" className="rounded-xl border px-2 py-2 text-sm" />
                <div className="col-span-2 sm:col-span-3"><ImageUploadButton label="Upload variant image" onUploaded={(url) => setVform((f) => ({ ...f, image: url }))} />{vform.image ? <img src={vform.image} alt="Variant preview" className="ml-2 inline-block h-9 w-9 rounded object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} /> : null}</div>
              </div>
              <button onClick={addVariant} className="mt-2 w-full rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white">Add Variant</button>
            </div>
            <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <div className="text-sm font-black">📦 Stock Adjustment</div>
              <p className="mt-1 text-xs text-slate-600">Every movement is saved in Inventory. Purchase updates weighted average cost; customer return increases both stock and return count. Reserved stock cannot be removed.</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <select value={stockAdj.variantId} onChange={(e) => setStockAdj({ ...stockAdj, variantId: e.target.value })} className="rounded-xl border px-2 py-2 text-sm sm:col-span-2">
                  <option value="">Select variant</option>
                  {variants.map((v) => <option key={v.id} value={v.id}>{v.label || v.sku} — {v.sku} (available {v.available})</option>)}
                </select>
                <select value={stockAdj.type} onChange={(e) => {
                  const type = e.target.value;
                  const selectedVariant = variants.find((v) => v.id === stockAdj.variantId);
                  setStockAdj({ ...stockAdj, type, direction: "add", unitCost: type === "purchase" ? String(selectedVariant?.purchaseCost || "") : "" });
                }} className="rounded-xl border px-2 py-2 text-sm">
                  <option value="purchase">Purchase / stock received</option>
                  <option value="return">Customer return</option>
                  <option value="adjustment">Stock adjustment</option>
                  <option value="damage">Damaged stock</option>
                  <option value="lost">Lost stock</option>
                </select>
                <select disabled={stockAdj.type !== "adjustment"} value={stockAdj.direction} onChange={(e) => setStockAdj({ ...stockAdj, direction: e.target.value })} className="rounded-xl border px-2 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-400">
                  <option value="add">Add</option>
                  <option value="reduce">Reduce</option>
                </select>
                <input type="number" value={stockAdj.quantity} onChange={(e) => setStockAdj({ ...stockAdj, quantity: e.target.value })} placeholder="Qty" className="rounded-xl border px-2 py-2 text-sm" />
                <input type="number" min="0" disabled={stockAdj.type !== "purchase"} value={stockAdj.unitCost} onChange={(e) => setStockAdj({ ...stockAdj, unitCost: e.target.value })} placeholder="Unit cost (purchase)" className="rounded-xl border px-2 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-400" />
                <input value={stockAdj.reason} onChange={(e) => setStockAdj({ ...stockAdj, reason: e.target.value })} placeholder="Reason" className="rounded-xl border px-2 py-2 text-sm sm:col-span-2" />
              </div>
              <div className="mt-2 rounded-xl bg-white/70 px-3 py-2 text-xs text-slate-600">{stockAdj.type === "purchase" ? "Purchase adds stock and recalculates the variant's weighted-average cost." : stockAdj.type === "return" ? "Customer return adds sellable stock and increases this variant's return count." : stockAdj.type === "adjustment" ? `Adjustment will ${stockAdj.direction === "reduce" ? "remove only available stock" : "add stock"}.` : `${stockAdj.type === "damage" ? "Damage" : "Lost stock"} is removed from available inventory and logged.`}</div>
              <button onClick={adjustStock} disabled={stockSaving} className="mt-3 w-full rounded-xl bg-amber-400 px-3 py-2 text-sm font-extrabold disabled:opacity-50">{stockSaving ? "Updating…" : "Save stock movement"}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
