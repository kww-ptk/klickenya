import { Metadata } from "next";
import { SearchPageClient } from "./SearchPageClient";

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    type?: string;
    city?: string;
    sub?: string;
    tags?: string;
  }>;
}

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const params = await searchParams;
  const q = params.q || "";
  return {
    title: q ? `"${q}" — Search Klickenya` : "Search — Klickenya",
    robots: { index: false, follow: false },
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  return (
    <SearchPageClient
      initialQuery={params.q || ""}
      initialType={params.type || ""}
      initialCity={params.city || ""}
      initialSub={params.sub || ""}
      initialTags={params.tags || ""}
    />
  );
}
