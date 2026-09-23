"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@primekits.studio");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isSubmitting = useRef(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting.current) return;
    isSubmitting.current = true;
    setError("");
    setLoading(true);
    try {
      const r = await fetch("/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      // A platform-level 5xx response may have an empty or HTML body. Do not
      // mask the useful login error with a JSON parsing exception.
      const d = await r.json().catch(() => null) as { error?: string } | null;
      if (!r.ok) throw new Error(d?.error || "Login failed");
      router.push("/admin");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      isSubmitting.current = false;
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-white p-6">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-xl font-black text-amber-400">P</div>
          <h1 className="mt-2 text-lg font-black">PrimeKits Studio Admin</h1>
          <p className="text-xs text-slate-500">Secure sign-in • Asia/Dhaka</p>
        </div>
        <label className="mt-4 block text-sm font-bold">Email
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required className="mt-1 w-full rounded-xl border px-3 py-2.5" />
        </label>
        <label className="mt-3 block text-sm font-bold">Password
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required className="mt-1 w-full rounded-xl border px-3 py-2.5" placeholder="••••••••" />
        </label>
        {error ? <div className="mt-3 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-sm font-bold text-rose-700">{error}</div> : null}
        <button disabled={loading} className="mt-4 w-full rounded-2xl bg-slate-900 px-4 py-3 font-bold text-white disabled:opacity-50">
          {loading ? "Signing in…" : "Sign In"}
        </button>
        <p className="mt-3 text-center text-[11px] text-slate-400">Use your administrator credentials to continue.</p>
      </form>
    </div>
  );
}
