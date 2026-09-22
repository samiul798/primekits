"use client";

/** Uses the browser's native Save as PDF flow, so every admin report can be
 * downloaded without a fragile third-party PDF dependency. */
export function AdminPdfButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full border border-white/25 px-3 py-1 text-xs font-bold hover:bg-white/10"
      title="Choose 'Save as PDF' in the print dialog"
    >
      Export PDF
    </button>
  );
}
