"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SafeImage } from "@/components/safe-image";

export type LookbookImage = { src: string; productName: string; slug: string; available: boolean };

export function LookbookClient({ images }: { images: LookbookImage[] }) {
  const [active, setActive] = useState<number | null>(null);
  useEffect(() => {
    if (active === null) return;
    const keys = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActive(null);
      if (event.key === "ArrowRight") setActive((i) => i === null ? null : (i + 1) % images.length);
      if (event.key === "ArrowLeft") setActive((i) => i === null ? null : (i - 1 + images.length) % images.length);
    };
    window.addEventListener("keydown", keys);
    return () => window.removeEventListener("keydown", keys);
  }, [active, images.length]);
  if (!images.length) return <div className="rounded-2xl border border-dashed p-10 text-center text-sm text-slate-500">No published jersey photos are available for the lookbook yet.</div>;
  const item = active === null ? null : images[active];
  return <><div className="columns-2 gap-3 sm:columns-3 lg:columns-4">{images.map((image, index) => <button key={`${image.slug}-${index}`} onClick={() => setActive(index)} className="group relative mb-3 block w-full overflow-hidden bg-slate-100 text-left"><SafeImage src={image.src} alt={`${image.productName} gallery photograph`} className="h-auto w-full object-cover transition duration-300 group-hover:scale-[1.03]" fallback="Image unavailable" /><span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-10 text-xs font-bold text-white opacity-0 transition group-hover:opacity-100">{image.productName}</span></button>)}</div>
    {item ? <div role="dialog" aria-modal="true" aria-label={`${item.productName} photo viewer`} className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={() => setActive(null)}><div className="relative max-h-full max-w-5xl" onClick={(event) => event.stopPropagation()}><SafeImage src={item.src} alt={`${item.productName} gallery photograph`} className="max-h-[78vh] max-w-full object-contain" fallback="Image unavailable" /><div className="mt-3 flex items-center justify-between gap-3 text-white"><div><p className="font-black">{item.productName}</p><Link href={`/product/${item.slug}`} className="text-sm text-lime-300 underline">{item.available ? "View product" : "View archive item"}</Link></div><div className="flex gap-2"><button onClick={() => setActive((i) => i === null ? null : (i - 1 + images.length) % images.length)} className="border border-white/30 px-3 py-2 text-sm font-bold">Previous</button><button onClick={() => setActive((i) => i === null ? null : (i + 1) % images.length)} className="border border-white/30 px-3 py-2 text-sm font-bold">Next</button><button onClick={() => setActive(null)} className="bg-white px-3 py-2 text-sm font-bold text-slate-950">Close</button></div></div></div></div> : null}
  </>;
}
