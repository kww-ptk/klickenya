import { getPartnerBySlug } from "@/lib/partner/resolve";
import { StorefrontShell } from "@/components/storefront/StorefrontShell";

export default async function WStorefrontLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const partner = await getPartnerBySlug(slug);
  if (!partner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-4 text-center">
        <p className="text-text2">This site isn&apos;t available.</p>
      </div>
    );
  }
  return <StorefrontShell partner={partner}>{children}</StorefrontShell>;
}
