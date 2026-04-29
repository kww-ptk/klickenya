import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "POS Terminal · Klickenya",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#16130C",
};

/**
 * The POS terminal lives in its own layout with no dashboard chrome:
 * no sidebar, no listing nav, no MobileBottomNav (filtered in
 * MobileBottomNav.tsx via the /pos prefix). Tablet-optimised, full screen.
 */
export default function PosLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0F0D08] text-[#F4F1EC] antialiased select-none">
      {children}
    </div>
  );
}
