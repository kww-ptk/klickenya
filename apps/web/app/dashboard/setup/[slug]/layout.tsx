import type { ReactNode } from "react";
import { resolveWizardMenu } from "./_lib/resolveWizardMenu";

/**
 * Wizard layout. Performs the slug → owner-scoped menu resolution once at
 * the layout level so unauthenticated and unauthorised users get redirected
 * before any step page renders. resolveWizardMenu itself owns the redirect.
 */

export default async function WizardLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  await resolveWizardMenu(slug);
  return <div>{children}</div>;
}
