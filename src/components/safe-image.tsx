"use client";

import { useState } from "react";

export function SafeImage({ src, alt, className, fallback = "Image unavailable" }: { src?: string | null; alt: string; className?: string; fallback?: string }) {
  const [failed, setFailed] = useState(!src);
  if (failed || !src) return <div role="img" aria-label={alt} className={className}>{fallback}</div>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={className} onError={() => setFailed(true)} />;
}
