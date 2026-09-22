import Link from "next/link";
import { SafeImage } from "@/components/safe-image";

export type StoreSettings = {
  businessName: string;
  tagline: string;
  logo: string;
  phone: string;
  whatsapp: string;
  announcement: string;
  facebook: string;
  instagram: string;
  youtube: string;
  tiktok: string;
};

export function SiteHeader({ settings, cartCount }: { settings: StoreSettings; cartCount?: number }) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      {settings.announcement ? (
        <div className="bg-slate-900 px-4 py-1.5 text-center text-[12px] font-medium text-amber-300">
          {settings.announcement}
        </div>
      ) : null}
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          {settings.logo ? (
            <SafeImage src={settings.logo} alt={settings.businessName} className="h-9 w-9 rounded-xl bg-slate-100 object-cover" fallback="P" />
          ) : (
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-lg font-black text-amber-400">
              P
            </span>
          )}
          <span className="leading-tight">
            <span className="block text-[15px] font-extrabold tracking-tight text-slate-900">
              {settings.businessName}
            </span>
            <span className="hidden text-[11px] text-slate-500 sm:block">Premium Apparel • Bangladesh</span>
          </span>
        </Link>
        <nav className="ml-4 hidden items-center gap-5 text-sm font-medium text-slate-700 md:flex">
          <Link href="/" className="hover:text-slate-950">Home</Link>
          <Link href="/shop" className="hover:text-slate-950">Shop</Link>
          <Link href="/categories" className="hover:text-slate-950">Categories</Link>
          <Link href="/track" className="hover:text-slate-950">Track Order</Link>
          <Link href="/contact" className="hover:text-slate-950">Contact</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link
            href="/search"
            className="rounded-full border border-slate-200 p-2 text-slate-700 hover:bg-slate-50"
            aria-label="Search"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
          </Link>
          <Link
            href="/cart"
            className="relative rounded-full bg-slate-900 p-2.5 text-white hover:bg-slate-800"
            aria-label="Cart"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            {(cartCount ?? 0) > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[11px] font-bold text-slate-900">
                {cartCount}
              </span>
            ) : null}
          </Link>
          <Link href="/shop" className="hidden rounded-full bg-amber-400 px-4 py-2 text-sm font-bold text-slate-900 hover:bg-amber-300 sm:block">
            Shop Now
          </Link>
        </div>
      </div>
      <nav className="flex items-center gap-4 overflow-x-auto border-t border-slate-100 px-4 py-2 text-[13px] font-medium text-slate-600 md:hidden">
        <Link href="/">Home</Link>
        <Link href="/shop">Shop</Link>
        <Link href="/categories">Categories</Link>
        <Link href="/track">Track</Link>
        <Link href="/contact">Contact</Link>
        <Link href="/about">About</Link>
      </nav>
    </header>
  );
}

export function SiteFooter({ settings }: { settings: StoreSettings }) {
  return (
    <footer className="mt-8 border-t border-slate-200 bg-slate-950 text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="text-lg font-extrabold text-white">{settings.businessName}</div>
          <p className="mt-2 text-sm text-slate-400">{settings.tagline}</p>
          <p className="mt-3 text-sm">Hotline: <a className="text-amber-300" href={`tel:${settings.phone}`}>{settings.phone}</a></p>
          <p className="text-sm">WhatsApp: <span className="text-amber-300">{settings.whatsapp}</span></p>
        </div>
        <div>
          <div className="text-sm font-bold uppercase tracking-wide text-white">Shop</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/shop" className="hover:text-white">All Products</Link></li>
            <li><Link href="/categories" className="hover:text-white">Categories</Link></li>
            <li><Link href="/track" className="hover:text-white">Track Order</Link></li>
            <li><Link href="/cart" className="hover:text-white">Cart</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-sm font-bold uppercase tracking-wide text-white">Support</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/delivery" className="hover:text-white">Delivery Information</Link></li>
            <li><Link href="/returns" className="hover:text-white">Return & Refund Policy</Link></li>
            <li><Link href="/faq" className="hover:text-white">FAQ</Link></li>
            <li><Link href="/contact" className="hover:text-white">Contact Us</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-sm font-bold uppercase tracking-wide text-white">Legal & Social</div>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link href="/privacy" className="hover:text-white">Privacy Policy</Link></li>
            <li><Link href="/terms" className="hover:text-white">Terms & Conditions</Link></li>
            <li><Link href="/about" className="hover:text-white">About Us</Link></li>
          </ul>
          <div className="mt-3 flex gap-3 text-sm">
            {settings.facebook ? <a href={settings.facebook} target="_blank" className="hover:text-white">Facebook</a> : null}
            {settings.instagram ? <a href={settings.instagram} target="_blank" className="hover:text-white">Instagram</a> : null}
            {settings.youtube ? <a href={settings.youtube} target="_blank" className="hover:text-white">YouTube</a> : null}
            {settings.tiktok ? <a href={settings.tiktok} target="_blank" className="hover:text-white">TikTok</a> : null}
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} {settings.businessName} • Dhaka, Bangladesh • All prices in BDT (৳)
      </div>
    </footer>
  );
}

export function ProductCard({ p }: { p: { name: string; slug: string; thumbnail?: string | null; images?: string[]; sellingPrice: number | string; discountPrice?: number | string | null; isNewArrival?: boolean; isBestSeller?: boolean } }) {
  const sp = Number(p.sellingPrice || 0);
  const dp = p.discountPrice != null && p.discountPrice !== "" ? Number(p.discountPrice) : null;
  const price = dp && dp > 0 ? dp : sp;
  const img = p.thumbnail || p.images?.[0] || "";
  return (
    <Link href={`/product/${p.slug}`} className="group overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-slate-100 p-2">
        {img ? (
          <SafeImage src={img} alt={p.name} className="h-full w-full bg-slate-100 object-contain object-center p-1 transition group-hover:scale-105" fallback="👕" />
        ) : (
          <div className="flex h-full items-center justify-center text-4xl">👕</div>
        )}
        <div className="absolute left-2 top-2 flex gap-1">
          {p.isNewArrival ? <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[11px] font-bold text-white">NEW</span> : null}
          {p.isBestSeller ? <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[11px] font-bold text-slate-900">BEST</span> : null}
          {dp && dp > 0 && dp < sp ? <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[11px] font-bold text-white">-{Math.round((1 - dp / sp) * 100)}%</span> : null}
        </div>
      </div>
      <div className="p-3.5">
        <div className="line-clamp-2 min-h-10 text-sm font-semibold text-slate-900">{p.name}</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-[15px] font-extrabold text-slate-900">৳{price.toLocaleString("en-IN")}</span>
          {dp && dp > 0 && dp < sp ? <span className="text-xs text-slate-400 line-through">৳{sp.toLocaleString("en-IN")}</span> : null}
        </div>
      </div>
    </Link>
  );
}
