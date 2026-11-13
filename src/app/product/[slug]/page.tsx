"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { SiteHeader, SiteFooter, ProductCard } from "@/components/store";
import { useCart } from "@/components/CartProvider";
import { getSizeChart, DEFAULT_SIZE_GUIDE_IMAGE } from "@/lib/size-charts";
import { SafeImage } from "@/components/safe-image";
import { PRODUCT_SIZES, sortProductSizes } from "@/lib/utils";

type Variant = {
  id: string;
  size?: string | null;
  color?: string | null;
  design?: string | null;
  label?: string | null;
  sku: string;
  sellingPrice: number;
  discountPrice?: number | null;
  available: number;
  stockQty: number;
  image?: string | null;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  shortDescription?: string | null;
  sellingPrice: number;
  discountPrice?: number | null;
  sku: string;
  thumbnail?: string | null;
  images?: string[];
  specifications?: Record<string, string>;
  features?: string[];
  material?: string | null;
  brand?: string | null;
  isBestSeller?: boolean;
  isNewArrival?: boolean;
  sizeChartImage?: string | null;
  sizeChartNote?: string | null;
};

function SelectedSizeHint({ size, categorySlug }: { size: string; categorySlug?: string | null }) {
  const chart = getSizeChart(categorySlug);
  const row = chart.rows.find((r) => r.size.toLowerCase() === size.toLowerCase());
  if (!row) return null;
  return (
    <div className="mt-2 rounded-xl bg-slate-900 px-3 py-2 text-[12px] font-bold text-white">
      Size {row.size}: Chest approximately {row.chest}&quot;, Length approximately {row.length}&quot;
      {row.sleeve ? `, Sleeve ~${row.sleeve}"` : ""}
      {row.shoulder ? `, Shoulder ~${row.shoulder}"` : ""} — {(chart.unit === "inch") ? "all in inches" : ""}
    </div>
  );
}

function SizeChartModal({
  open,
  onClose,
  categorySlug,
  categoryName,
  productImage,
  categoryImage,
  globalImage,
  productNote,
}: {
  open: boolean;
  onClose: () => void;
  categorySlug?: string | null;
  categoryName?: string | null;
  productImage?: string | null;
  categoryImage?: string | null;
  globalImage?: string | null;
  productNote?: string | null;
}) {
  if (!open) return null;
  const chart = getSizeChart(categorySlug);
  const img = productImage || categoryImage || globalImage || DEFAULT_SIZE_GUIDE_IMAGE;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 p-3" onClick={onClose}>
      <div
        className="size-chart-modal mx-auto max-w-2xl overflow-hidden rounded-3xl bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between bg-slate-950 px-5 py-3 text-white">
          <div>
            <div className="font-black">{chart.title}</div>
            <div className="text-[11px] text-slate-300">{categoryName || "PrimeKits Studio"} • all measurements in inches</div>
          </div>
          <button onClick={onClose} className="rounded-full border border-white/30 px-3 py-1 text-sm font-bold hover:bg-white/10">✕ Close</button>
        </div>
        <div className="size-chart-body max-h-[80vh] overflow-y-auto p-4">
          {/* Chart image */}
          <div className="overflow-hidden rounded-2xl border bg-slate-50">
            { }
            <SafeImage src={img} alt="Size measurement guide" className="max-h-72 w-full bg-slate-100 object-contain" fallback="Size chart image unavailable" />
          </div>
          <p className="mt-1 text-center text-[11px] text-slate-400">How to measure: chest, length, shoulder & sleeve — see diagram above</p>

          {/* Measurement table */}
          <div className="mt-3 overflow-x-auto rounded-2xl border">
            <table className="w-full min-w-[420px] text-sm">
              <thead>
                <tr className="bg-slate-900 text-white">
                  {chart.headers.map((h) => (
                    <th key={h} className="px-3 py-2 text-left text-xs font-extrabold uppercase tracking-wide">{h} (″)</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {chart.rows.map((r, i) => (
                  <tr key={r.size} className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-3 py-2 font-black">{r.size}</td>
                    <td className="px-3 py-2 font-bold">{r.chest}</td>
                    <td className="px-3 py-2">{r.length}</td>
                    <td className="px-3 py-2">{r.shoulder || r.sleeve || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* How to measure */}
          <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-[13px]">
            <div className="font-extrabold">How to measure (কীভাবে মাপবেন)</div>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-slate-700">
              {chart.howTo.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
            <p className="mt-2 rounded-xl bg-white/70 px-2 py-1.5 font-bold text-slate-800">{productNote || chart.tipBn}</p>
          </div>

          <button onClick={onClose} className="mt-3 w-full rounded-2xl bg-slate-900 px-4 py-3 text-sm font-extrabold text-white">
            Got it — Choose My Size
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductPage() {
  const params = useParams() as { slug: string };
  const { addItem } = useCart();
  const [settings, setSettings] = useState<Record<string, string>>({ businessName: "PrimeKits Studio" });
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [related, setRelated] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<{ customerName: string; rating: number; comment?: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [imgIdx, setImgIdx] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [viewer, setViewer] = useState(false);
  const touchStart = useRef<number | null>(null);
  const [size, setSize] = useState("");
  const [qty, setQty] = useState(1);
  const [msg, setMsg] = useState("");
  const [revName, setRevName] = useState("");
  const [revRating, setRevRating] = useState(5);
  const [revComment, setRevComment] = useState("");
  const [reviewMsg, setReviewMsg] = useState("");
  const [category, setCategory] = useState<{ name: string; slug: string; sizeChartImage?: string | null } | null>(null);
  const [showSizeChart, setShowSizeChart] = useState(false);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => d.settings && setSettings(d.settings)).catch(() => {});
    if (!params.slug) return;
    (async () => {
      try {
        const r = await fetch(`/api/products/${params.slug}`);
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Not found");
        setProduct(d.product);
        setVariants(d.variants || []);
        setRelated(d.related || []);
        setReviews(d.reviews || []);
        setCategory(d.category || null);
        // recently viewed
        try {
          const raw = localStorage.getItem("pks_recent") || "[]";
          const arr = JSON.parse(raw) as string[];
          const next = [d.product.slug, ...arr.filter((s) => s !== d.product.slug)].slice(0, 10);
          localStorage.setItem("pks_recent", JSON.stringify(next));
        } catch {}
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [params.slug]);

  useEffect(() => {
    if (!viewer) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setViewer(false);
      if (event.key === "ArrowRight") setImgIdx((i) => images.length ? (i + 1) % images.length : 0);
      if (event.key === "ArrowLeft") setImgIdx((i) => images.length ? (i - 1 + images.length) % images.length : 0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewer, product?.images?.length, product?.thumbnail]);

  if (loading) return <div className="p-10 text-center">Loading product…</div>;
  if (error || !product) {
    return (
      <div className="min-h-screen">
        <SiteHeader settings={settings as never} />
        <div className="mx-auto max-w-xl px-4 py-16 text-center">
          <h1 className="mt-2 text-xl font-black">Product not found</h1>
          <Link href="/shop" className="mt-4 inline-block border border-slate-900 bg-slate-900 px-5 py-2 text-sm font-bold text-white">Back to Shop</Link>
        </div>
        <SiteFooter settings={settings as never} />
      </div>
    );
  }

  const images = (product.images?.length ? product.images : product.thumbnail ? [product.thumbnail] : []) as string[];
  const sizes = sortProductSizes(variants.map((v) => v.size));
  const hasVariants = variants.length > 0;
  const exactSelected = hasVariants ? variants.find((v) => sizes.length === 0 || v.size === size) : null;
  const activeVariant = exactSelected || null;
  const unitPrice = activeVariant
    ? activeVariant.discountPrice && activeVariant.discountPrice > 0 ? activeVariant.discountPrice : activeVariant.sellingPrice
    : product.discountPrice && product.discountPrice > 0 ? product.discountPrice : product.sellingPrice;
  const basePrice = activeVariant ? activeVariant.sellingPrice : product.sellingPrice;
  const avail = activeVariant ? activeVariant.available : 999;
  const outOfStock = hasVariants ? !activeVariant || avail <= 0 : false;

  function handleAdd(buyNow = false) {
    setMsg("");
    if (hasVariants) {
      if (sizes.length > 0 && !size) return setMsg("Please select a size.");
      if (!activeVariant) return setMsg("This combination is unavailable. Please choose another.");
      if (avail <= 0) return setMsg("This variation is out of stock.");
    }
    if (qty < 1) return setMsg("Quantity must be at least 1.");
    if (qty > avail && hasVariants) return setMsg(`Only ${avail} pcs available.`);
    addItem({
      productId: product!.id,
      variantId: activeVariant?.id || null,
      name: product!.name,
      slug: product!.slug,
      image: activeVariant?.image || images[0] || null,
      sku: activeVariant?.sku || product!.sku,
       variationLabel: activeVariant?.label || (size || null),
      unitPrice,
      maxStock: hasVariants ? Math.max(0, avail) : 99,
      quantity: qty,
    });
    if (buyNow) window.location.href = "/checkout";
    else setMsg("Added to cart.");
  }

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    setReviewMsg("");
    if (!revName.trim()) return setMsg("Enter your name for review.");
    try {
      const r = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product!.id, customerName: revName.trim(), rating: revRating, comment: revComment.trim() || null }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Could not submit review");
      setReviewMsg(data.message || "Review submitted for approval.");
      setRevName("");
      setRevComment("");
    } catch (err) {
      setReviewMsg(err instanceof Error ? err.message : "Could not submit review");
    }
  }

  return (
    <div className="premium-product-page min-h-screen pb-20">
      <SiteHeader settings={settings as never} />
      <div className="product-shell mx-auto max-w-7xl px-4 py-6">
        <div className="text-xs text-slate-500"><Link href="/">Home</Link> / <Link href="/shop">Shop</Link> / {product.name}</div>
        <div className="product-top mt-5 grid gap-7 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)] lg:gap-10">
          <div className="product-gallery">
            <div
              className="product-media group relative aspect-[4/5] cursor-zoom-in overflow-hidden border border-slate-200 bg-white"
              onClick={() => setViewer(true)}
              onTouchStart={(e) => { touchStart.current = e.touches[0]?.clientX ?? null; }}
              onTouchEnd={(e) => { const start = touchStart.current; const end = e.changedTouches[0]?.clientX; if (start != null && end != null && Math.abs(start - end) > 45 && images.length > 1) setImgIdx((i) => start > end ? (i + 1) % images.length : (i - 1 + images.length) % images.length); touchStart.current = null; }}
            >
              {images[imgIdx] ? (
                 
                <SafeImage src={images[imgIdx]} alt={product.name} className={`h-full w-full bg-slate-100 object-contain object-center transition duration-200 ease-out md:group-hover:scale-105 ${zoom ? "scale-105" : ""}`} fallback="Image unavailable" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm font-bold text-slate-500">Product image unavailable</div>
              )}
              {product.discountPrice && product.discountPrice < basePrice ? (
                <span className="absolute left-3 top-3 bg-rose-700 px-3 py-1.5 text-[11px] font-bold tracking-wide text-white">
                  SAVE BDT {(basePrice - unitPrice).toLocaleString("en-IN")}
                </span>
              ) : null}
              {images.length > 1 ? <><button type="button" aria-label="Previous image" onClick={(e) => { e.stopPropagation(); setImgIdx((i) => (i - 1 + images.length) % images.length); }} className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 px-3 py-2 text-sm font-black text-slate-900 shadow hover:bg-white">←</button><button type="button" aria-label="Next image" onClick={(e) => { e.stopPropagation(); setImgIdx((i) => (i + 1) % images.length); }} className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 px-3 py-2 text-sm font-black text-slate-900 shadow hover:bg-white">→</button></> : null}
              <span className="absolute bottom-3 right-3 bg-slate-950/80 px-2 py-1 text-[10px] font-bold text-white">Click to expand{images.length > 1 ? ` · ${imgIdx + 1}/${images.length}` : ""}</span>
            </div>
            {images.length > 1 ? (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {images.map((im, i) => (
                    <button key={i} onClick={() => setImgIdx(i)} className={`h-16 w-16 shrink-0 overflow-hidden border-2 ${i === imgIdx ? "border-slate-900" : "border-transparent"}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={im} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="product-info">
            <p className="text-[11px] font-bold tracking-[.16em] text-sky-700">{product.brand || "PRIMEKITS STUDIO"}</p>
            <h1 className="product-title mt-2 text-2xl font-black sm:text-3xl">{product.name}</h1>
            {product.shortDescription ? <p className="mt-1 text-sm text-slate-600">{product.shortDescription}</p> : null}
            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-2xl font-black">BDT {unitPrice.toLocaleString("en-IN")}</span>
              {unitPrice < basePrice ? <span className="text-sm text-slate-400 line-through">BDT {basePrice.toLocaleString("en-IN")}</span> : null}
            </div>
            <div className="mt-2 text-xs text-slate-500">SKU {activeVariant?.sku || product.sku}<span className="mx-2 text-slate-300">|</span>{product.material || "Premium fabric"}</div>

            {sizes.length > 0 ? (
              <div className="product-choices mt-6 border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-extrabold">
                    Size: {size ? <span className="text-slate-900">{size}</span> : <span className="text-rose-600">Select size</span>}
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSizeChart(true)}
                    className="border border-slate-300 bg-white px-3 py-2 text-xs font-extrabold text-slate-800 hover:border-slate-900 hover:bg-slate-900 hover:text-white"
                  >
                    Size chart
                  </button>
                </div>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {sizes.map((s) => {
                    const sizeAvail = variants
                       .filter((v) => v.size === s)
                      .reduce((sum, v) => sum + Math.max(0, v.available), 0);
                    const soldOut = sizeAvail <= 0;
                    const isSel = size === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => !soldOut && setSize(s)}
                        disabled={soldOut}
                        title={soldOut ? `${s} — out of stock` : `${s} — ${sizeAvail} pcs available`}
                        className={`relative min-w-14 border px-4 py-2.5 text-sm font-extrabold transition ${
                          isSel
                            ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                            : soldOut
                              ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400 line-through"
                              : "border-slate-200 bg-white hover:border-slate-900"
                        }`}
                      >
                        <span className="block">{s}</span>
                        <span className={`mt-1 block text-[9px] leading-none ${isSel ? "text-white/80" : soldOut ? "text-rose-600" : "text-emerald-700"}`}>{soldOut ? "Out" : `${sizeAvail} left`}</span>
                        <span
                          className={`absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white ${
                            soldOut ? "bg-rose-500" : sizeAvail <= 5 ? "bg-amber-400" : "bg-emerald-500"
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 text-[11px] text-slate-500">Each size shows its live available quantity. “Out” sizes cannot be selected.</div>
                {size ? (
                  <SelectedSizeHint size={size} categorySlug={category?.slug} />
                ) : (
                  <p className="mt-2 text-[11px] leading-5 text-slate-500">Compare a shirt that fits you well with the size chart before selecting.</p>
                )}
              </div>
            ) : (
              <div className="product-choices mt-6 border border-slate-200 bg-white p-5">
                <div className="flex items-center justify-between gap-2"><div className="text-sm font-extrabold">Size: {size || <span className="text-rose-600">Select size</span>}</div><button type="button" onClick={() => setShowSizeChart(true)} className="border border-slate-300 bg-white px-3 py-2 text-xs font-extrabold text-slate-800">Size chart</button></div>
                <div className="mt-3 flex flex-wrap gap-2">{PRODUCT_SIZES.map((s) => <button key={s} type="button" onClick={() => setSize(s)} className={`min-w-14 border px-4 py-2.5 text-sm font-extrabold ${size === s ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white hover:border-slate-900"}`}>{s}</button>)}</div>
                <p className="mt-3 text-[11px] leading-5 text-slate-500">Choose your usual size and check the size chart before ordering. Size-level inventory has not yet been configured for this product.</p>
              </div>
            )}

            <div className="mt-4 border-l-4 border-slate-300 bg-slate-50 px-4 py-3 text-sm">
              {hasVariants ? (
                activeVariant ? (
                  avail > 0 ? (
                    avail <= 5 ? <span className="font-bold text-amber-600">Only {avail} pieces left in stock.</span> : <span className="font-bold text-emerald-600">In stock ({avail} pieces available)</span>
                  ) : (
                    <span className="font-bold text-rose-600">Out of stock for this variation</span>
                  )
                ) : (
                  <span className="text-slate-500">Select variations to see availability</span>
                )
              ) : <span className="font-bold text-amber-700">Select a size to continue. Exact size stock is not configured for this product.</span>}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <div className="flex items-center border border-slate-300 bg-white">
                <button onClick={() => setQty((x) => Math.max(1, x - 1))} className="px-4 py-2 text-lg font-bold">−</button>
                <span className="min-w-8 text-center font-bold">{qty}</span>
                <button onClick={() => setQty((x) => Math.min(20, x + 1))} className="px-4 py-2 text-lg font-bold">+</button>
              </div>
              <span className="text-xs text-slate-500">Click the image for a closer view.</span>
            </div>

            {msg ? <div className="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-sm font-bold">{msg}</div> : null}

            <div className="product-actions mt-4 grid grid-cols-2 gap-3">
              <button onClick={() => handleAdd(false)} disabled={outOfStock} className="border border-slate-900 px-4 py-3.5 text-sm font-extrabold hover:bg-slate-100 disabled:opacity-40">
                Add to Cart
              </button>
              <button onClick={() => handleAdd(true)} disabled={outOfStock} className="bg-amber-300 px-4 py-3.5 text-sm font-extrabold text-slate-950 hover:bg-amber-200 disabled:opacity-40">
                Buy Now
              </button>
            </div>

            <div className="product-assurance mt-5 grid gap-3 border border-slate-200 bg-slate-50 p-4 text-[13px] sm:grid-cols-3 sm:gap-4">
              <div><b>Delivery</b><span className="mt-1 block">Inside Dhaka BDT 60; outside Dhaka BDT 130 (2–4 days)</span></div>
              <div><b>Exchange:</b> For a size issue, contact us on WhatsApp within 3 days.</div>
              <div><b>Payment:</b> Cash on Delivery, bKash and Nagad are available.</div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="product-details mt-10 grid gap-6 md:grid-cols-2">
          <div className="h-full border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-extrabold">Product Description</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-slate-600">{product.description || product.shortDescription || "Premium quality apparel from PrimeKits Studio."}</p>
            {product.features?.length ? (
              <ul className="mt-3 space-y-1 text-sm">
                {product.features.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            ) : null}
          </div>
          <div className="h-full border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-extrabold">Specifications</h2>
            <dl className="mt-2 space-y-1.5 text-sm">
              {Object.entries(product.specifications || {}).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2 border-b border-slate-100 pb-1"><dt className="text-slate-500">{k}</dt><dd className="font-bold">{v}</dd></div>
              ))}
              <div className="flex justify-between gap-2 border-b border-slate-100 pb-1"><dt className="text-slate-500">SKU</dt><dd className="font-bold">{product.sku}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-slate-500">Brand</dt><dd className="font-bold">{product.brand}</dd></div>
            </dl>
          </div>
        </div>

        {/* Reviews */}
        <div className="product-reviews mt-8 border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="font-extrabold">Customer Reviews ({reviews.length})</h2>
          {reviews.length === 0 ? <p className="mt-2 text-sm text-slate-500">No reviews yet. Be the first to review!</p> : (
            <div className="mt-3 space-y-3">
              {reviews.map((r, i) => (
                <div key={i} className="border-l-2 border-amber-300 bg-slate-50 p-4 text-sm">
                  <div className="font-bold">{r.customerName} <span className="text-amber-500">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span></div>
                  {r.comment ? <div className="mt-1 text-slate-600">{r.comment}</div> : null}
                </div>
              ))}
            </div>
          )}
          <form onSubmit={submitReview} className="mt-4 grid gap-2 sm:grid-cols-2">
            <input required minLength={2} value={revName} onChange={(e) => setRevName(e.target.value)} placeholder="Your name" className="border px-3 py-2" />
            <select value={revRating} onChange={(e) => setRevRating(Number(e.target.value))} className="border px-3 py-2">
              {[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{n} Star</option>)}
            </select>
            <textarea value={revComment} onChange={(e) => setRevComment(e.target.value)} placeholder="Your review…" className="border px-3 py-2 sm:col-span-2" rows={3} />
            <button className="bg-slate-900 px-4 py-3 text-sm font-bold text-white sm:col-span-2">Submit Review</button>
          </form>
          {reviewMsg ? <p className="mt-2 text-sm font-medium text-slate-600">{reviewMsg}</p> : null}
        </div>

        {related.length > 0 ? (
          <div className="mt-8">
            <h2 className="font-extrabold">Related Products</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {related.map((p) => (
                <ProductCard key={p.id} p={{ ...p, images: [] } as never} />
              ))}
            </div>
          </div>
        ) : null}
      </div>
      <SiteFooter settings={settings as never} />
      {viewer ? <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4" role="dialog" aria-modal="true" aria-label={`${product.name} image viewer`} onClick={() => setViewer(false)}><button type="button" onClick={() => setViewer(false)} className="absolute right-5 top-5 z-10 border border-white/30 px-4 py-2 text-sm font-bold text-white">Close ×</button>{images[imgIdx] ? <SafeImage src={images[imgIdx]} alt={`${product.name} image ${imgIdx + 1}`} className="max-h-[88vh] max-w-[92vw] object-contain" fallback="Image unavailable" /> : null}{images.length > 1 ? <><button type="button" onClick={(e) => { e.stopPropagation(); setImgIdx((i) => (i - 1 + images.length) % images.length); }} className="absolute left-4 top-1/2 -translate-y-1/2 border border-white/40 bg-black/30 px-4 py-3 text-xl text-white">←</button><button type="button" onClick={(e) => { e.stopPropagation(); setImgIdx((i) => (i + 1) % images.length); }} className="absolute right-4 top-1/2 -translate-y-1/2 border border-white/40 bg-black/30 px-4 py-3 text-xl text-white">→</button></> : null}</div> : null}
      {/* size chart modal with image + measurement table */}
      <SizeChartModal
        open={showSizeChart}
        onClose={() => setShowSizeChart(false)}
        categorySlug={category?.slug}
        categoryName={category?.name}
        productImage={product.sizeChartImage}
        categoryImage={category?.sizeChartImage}
        globalImage={(settings as Record<string, string>).sizeChartImage}
        productNote={product.sizeChartNote || (settings as Record<string, string>).sizeChartNote}
      />
      {/* sticky mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white/95 p-3 backdrop-blur md:hidden">
        <div className="flex gap-2">
          <button onClick={() => handleAdd(false)} className="flex-1 border border-slate-900 py-3 text-sm font-extrabold">Add to Cart</button>
          <button onClick={() => handleAdd(true)} className="flex-1 bg-amber-300 py-3 text-sm font-extrabold">Buy now BDT {(unitPrice * qty).toLocaleString("en-IN")}</button>
        </div>
      </div>
    </div>
  );
}
