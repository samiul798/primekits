"use client";

import { useRef, useState } from "react";

export function ImageUploadButton({ onUploaded, label = "Upload image", multiple = false }: { onUploaded: (url: string) => void; label?: string; multiple?: boolean }) {
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

  async function uploadMany(files: FileList | File[]) {
    for (const file of Array.from(files).slice(0, multiple ? 12 : 1)) await upload(file);
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <input ref={inputRef} type="file" multiple={multiple} accept="image/jpeg,image/png,image/gif,image/webp" className="hidden" onChange={(e) => { if (e.target.files?.length) void uploadMany(e.target.files); }} />
      <button type="button" onClick={() => inputRef.current?.click()} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files.length) void uploadMany(e.dataTransfer.files); }} disabled={busy} className="rounded-xl border border-dashed border-slate-300 bg-white px-3 py-2 text-xs font-bold hover:bg-slate-50 disabled:opacity-50">
        {busy ? "Uploading…" : label}
      </button>
      {error ? <span className="text-xs font-medium text-rose-600">{error}</span> : null}
    </span>
  );
}
