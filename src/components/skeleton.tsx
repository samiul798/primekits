import type { HTMLAttributes } from "react";

export function Skeleton({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={`animate-pulse rounded-xl bg-slate-200/80 ${className}`} {...props} />;
}

export function InlineSkeleton({ className = "" }: { className?: string }) {
  return <Skeleton className={`inline-block h-4 align-middle ${className}`} />;
}

export function PageSkeleton({ cards = 4 }: { cards?: number }) {
  return <div className="space-y-5 p-4 sm:p-8"><Skeleton className="h-8 w-52" /><Skeleton className="h-4 w-80 max-w-full" /><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Array.from({ length: cards }, (_, i) => <Skeleton key={i} className="h-32" />)}</div><Skeleton className="h-64 w-full" /></div>;
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{Array.from({ length: count }, (_, i) => <div key={i} className="overflow-hidden rounded-2xl border bg-white p-3"><Skeleton className="aspect-square w-full" /><Skeleton className="mt-3 h-4 w-4/5" /><Skeleton className="mt-2 h-4 w-2/5" /></div>)}</div>;
}
