import { getPartnerByHost } from "@/lib/partner/resolve";
import { StorefrontShell } from "@/components/storefront/StorefrontShell";

export default async function StorefrontLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const partner = await getPartnerByHost();
  if (!partner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4 text-center">
        <p className="text-text2">This site isn&apos;t available.</p>
      </div>
    );
  }
  if (partner.landingHtml && partner.landingHtml.trim()) {
    return <>{children}</>;
  }
  return <StorefrontShell partner={partner}>{children}</StorefrontShell>;
}
