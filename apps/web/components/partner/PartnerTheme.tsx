import { partnerThemeCss } from "@/lib/partner/theme";
import type { Partner } from "@/lib/partner/types";

/**
 * Injects a partner's brand theme: a <style> overriding the CSS custom
 * properties at :root (re-skins every var-based utility), plus an optional
 * webfont <link>. Must be rendered AFTER globals.css in source order so its
 * :root declarations win the cascade — rendering it inside a layout body
 * (which comes after the <head> stylesheet) satisfies this.
 *
 * Renders nothing for the house brand (partner == null) or a partner with no
 * theme overrides.
 */
export function PartnerTheme({ partner }: { partner: Partner | null }) {
  if (!partner) return null;
  const css = partnerThemeCss(partner);
  if (!css && !partner.fontUrl) return null;
  return (
    <>
      {partner.fontUrl ? <link rel="stylesheet" href={partner.fontUrl} /> : null}
      {css ? <style dangerouslySetInnerHTML={{ __html: css }} /> : null}
    </>
  );
}
