import type { Metadata } from "next";

// Embed routes opt out of search-engine indexing — no point indexing thousands
// of copies of the same form across embedder sites.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  // No header, footer, or MobileBottomNav. The root layout still wraps this
  // in <html>/<body>/SavedListings/CityCounts providers (Next.js App Router
  // requirement), but MobileBottomNav hides itself when pathname starts with
  // /embed (see components/home/MobileBottomNav.tsx HIDDEN_ROUTES).
  return <>{children}</>;
}
