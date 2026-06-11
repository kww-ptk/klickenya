import { notFound } from "next/navigation";
import { getPartnerByHost } from "@/lib/partner/resolve";
import { PartnerTheme } from "@/components/partner/PartnerTheme";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const partner = await getPartnerByHost();
  if (!partner) notFound();

  return (
    <div className="min-h-screen flex flex-col bg-canvas text-text">
      <PartnerTheme partner={partner} />
      <header className="border-b border-border bg-white/80 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center">
          {partner.logo?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={partner.logo.url} alt={partner.name} className="h-9 w-auto" />
          ) : (
            <span className="font-display text-xl font-bold text-dark">{partner.name}</span>
          )}
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border bg-surface mt-12">
        <div className="max-w-5xl mx-auto px-4 py-8 text-sm text-text2 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>{partner.footerText || `© ${partner.name}`}</span>
          {partner.poweredByKlickenya ? (
            <a href="https://klickenya.com" className="text-text3 hover:text-amber">Powered by Klickenya</a>
          ) : null}
        </div>
      </footer>
    </div>
  );
}
