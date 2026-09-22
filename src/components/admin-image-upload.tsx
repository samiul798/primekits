"use client";

import { useRef, useState } from "react";

export function ImageUploadButton({ onUploaded, label = "Upload image" }: { onUploaded: (url: string) => void; label?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload(file: File) {
    setBusy(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const response = await fetch("/api/admin/upload", { method: "POST", body });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Upload failed");
      onUploaded(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) void upload(file);
      }} />
      <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold hover:bg-slate-50 disabled:opacity-50">
        {busy ? "Uploading…" : label}
      </button>
      {error ? <span className="text-xs font-medium text-rose-600">{error}</span> : null}
    </span>
  );
}
