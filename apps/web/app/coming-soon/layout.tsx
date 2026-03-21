import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Klickenya — Coming Soon",
  description:
    "Kenya's new marketplace for stays, experiences, events, and more. Coming soon.",
};

export default function ComingSoonLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
