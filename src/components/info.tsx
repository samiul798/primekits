import { getSettings } from "@/lib/settings";
import { SiteHeader, SiteFooter } from "@/components/store";

export async function InfoPage({ title, children }: { title: string; children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <div className="min-h-screen">
      <SiteHeader settings={settings as never} />
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-black">{title}</h1>
        <div className="prose-sm mt-4 space-y-3 rounded-2xl border bg-white p-6 text-sm leading-relaxed text-slate-700">
          {children}
        </div>
      </div>
      <SiteFooter settings={settings as never} />
    </div>
  );
}
