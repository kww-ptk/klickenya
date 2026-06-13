import { getPartnerByHost } from "@/lib/partner/resolve";

export default async function StorefrontNotFound() {
  const partner = await getPartnerByHost();
  return (
    <div className="max-w-5xl mx-auto px-4 py-24 text-center">
      <h1 className="font-display text-3xl font-bold text-dark">Page not found</h1>
      <p className="mt-3 text-text2">
        {partner ? `This page isn't available on ${partner.name} yet.` : "This page isn't available."}
      </p>
    </div>
  );
}
