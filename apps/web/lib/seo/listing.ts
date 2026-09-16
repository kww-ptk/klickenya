import { urlForImage, getImageDimensions } from "@/lib/sanity/image";
import { SITE_URL, absoluteUrl } from "@/lib/seo/site";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Google will not use an image below roughly this width for a result
 * thumbnail, and Discover requires 1200px outright. A listing whose hero photo
 * is smaller does not simply get a smaller thumbnail — Google goes looking for
 * another image on the page and finds the ones in the "Similar listings" rail,
 * so the listing ends up in the SERP wearing a neighbouring business's photo.
 * That is exactly what happened to /experiences/watamu/captain-sammy-dhow,
 * whose only photo is 520x397: it ranked with the muk-muk Matcha storefront.
 */
export const MIN_SOCIAL_IMAGE_WIDTH = 1200;

/**
 * Sanity's `alt` is usually good copy but a handful of assets were uploaded
 * with the camera's filename still in the field ("DJI 0996 520x397",
 * "marafa klickenya 1 1200x540"). Shipping that as og:image:alt is worse than
 * a generated one, so filename-shaped alts are rejected.
 */
function usableAlt(alt: unknown): string | null {
  if (typeof alt !== "string") return null;
  const text = alt.trim();
  if (text.length < 3) return null;
  if (/\d{3,}\s*x\s*\d{3,}/i.test(text)) return null;
  if (/^(dji|img|dsc|pxl|gopro|screenshot|photo|image)[\s_-]*\d/i.test(text)) return null;
  return text;
}

export interface SocialImage {
  url: string;
  width: number;
  height: number;
  alt: string;
}

const FALLBACK_IMAGE: SocialImage = {
  url: absoluteUrl("/og-image.jpg"),
  width: 1200,
  height: 630,
  alt: "Klickenya — Discover Kenya",
};

/**
 * Pick the photos to advertise as this page's own image, largest first.
 *
 * Photo order in Sanity is an editorial choice about the gallery, not about
 * search. photos[0] is often a phone screenshot at 1170px while photo 4 is a
 * 2500px original, and blindly taking the first one throws the only asset big
 * enough to win the thumbnail. So: prefer every photo at or above
 * MIN_SOCIAL_IMAGE_WIDTH, widest first; if none qualify, fall back to the
 * gallery order rather than showing nothing.
 *
 * Never upscales. Requesting w=1200 from a 520px source returns 520px and
 * declaring it as 1200x630 is a lie that costs the rich result — the declared
 * dimensions here are always the real ones.
 */
export function pickSocialImages(
  photos: any[] | null | undefined,
  alt: string,
  limit = 3,
): SocialImage[] {
  const usable = (photos ?? []).filter((p) => p?.asset);
  if (usable.length === 0) return [FALLBACK_IMAGE];

  const measured = usable.map((photo) => {
    const { width, height } = getImageDimensions(photo);
    return { photo, width, height };
  });

  const bigEnough = measured
    .filter((m) => m.width >= MIN_SOCIAL_IMAGE_WIDTH)
    .sort((a, b) => b.width - a.width);

  const chosen = (bigEnough.length > 0 ? bigEnough : measured).slice(0, limit);

  return chosen.map(({ photo, width, height }) => {
    // Crop to the 1.91:1 social ratio only when the source is genuinely wide
    // enough to give 1200x630 without being stretched. Anything smaller is
    // served at its own size and declared honestly.
    const social =
      width >= MIN_SOCIAL_IMAGE_WIDTH
        ? { w: MIN_SOCIAL_IMAGE_WIDTH, h: 630 }
        : { w: width, h: height };

    return {
      url: urlForImage(photo)
        .width(social.w)
        .height(social.h)
        .fit("crop")
        .auto("format")
        .quality(85)
        .url(),
      width: social.w,
      height: social.h,
      alt: usableAlt(photo?.alt) ?? alt,
    };
  });
}

/**
 * Full-size URLs for schema.org `image`, strongest asset first.
 *
 * Same ordering rule as pickSocialImages: the widest photo at or above
 * MIN_SOCIAL_IMAGE_WIDTH leads, then the rest in gallery order. `image[0]` and
 * primaryImageOfPage both read from the front of this list, so the listing
 * advertises its best asset rather than whichever photo the editor happened to
 * drag to position one.
 */
export function schemaImages(photos: any[] | null | undefined): string[] {
  const usable = (photos ?? []).filter((p) => p?.asset);
  if (usable.length === 0) return [];

  const measured = usable.map((photo, index) => ({
    photo,
    index,
    width: getImageDimensions(photo).width,
  }));

  const ordered = [...measured].sort((a, b) => {
    const aBig = a.width >= MIN_SOCIAL_IMAGE_WIDTH;
    const bBig = b.width >= MIN_SOCIAL_IMAGE_WIDTH;
    if (aBig !== bBig) return aBig ? -1 : 1;
    if (aBig && bBig) return b.width - a.width;
    return a.index - b.index;
  });

  return ordered.slice(0, 6).map(({ photo, width }) =>
    urlForImage(photo)
      .width(Math.min(width, 1600))
      .auto("format")
      .quality(85)
      .url(),
  );
}

/* ── Breadcrumbs ───────────────────────────────────── */

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbJsonLd(crumbs: Crumb[], pageUrl: string) {
  return {
    "@type": "BreadcrumbList",
    "@id": `${pageUrl}#breadcrumb`,
    itemListElement: crumbs.map((crumb, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

/* ── Opening hours ─────────────────────────────────── */

const DAY_NAMES: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

/**
 * `openingHours` is free text in Sanity ("Mon–Sat 8:00–22:00", "Daily 7am–11pm")
 * and schema.org wants a structured OpeningHoursSpecification. Rather than
 * guess at prose and risk shipping wrong hours as structured data, only the
 * unambiguous shapes are converted; anything else is left out. Wrong hours in
 * a rich result are worse than no hours.
 */
export function openingHoursSpecification(raw: unknown) {
  if (typeof raw !== "string" || !raw.trim()) return undefined;

  const spec: { "@type": string; dayOfWeek: string[]; opens: string; closes: string }[] = [];
  const time = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/gi;

  for (const line of raw.split(/[\n;]+/)) {
    const text = line.trim();
    if (!text) continue;

    const days = Object.keys(DAY_NAMES).filter((d) =>
      new RegExp(`\\b${d.slice(0, 3)}`, "i").test(text),
    );
    const daily = /\b(daily|every ?day|all week)\b/i.test(text);
    if (days.length === 0 && !daily) continue;

    time.lastIndex = 0;
    const times: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = time.exec(text)) !== null && times.length < 2) {
      let hour = Number(m[1]);
      const minute = m[2] ?? "00";
      const meridiem = m[3]?.toLowerCase();
      if (meridiem === "pm" && hour < 12) hour += 12;
      if (meridiem === "am" && hour === 12) hour = 0;
      if (hour > 23) continue;
      times.push(`${String(hour).padStart(2, "0")}:${minute}`);
    }
    if (times.length !== 2) continue;

    spec.push({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: (daily ? Object.keys(DAY_NAMES) : days).map((d) => DAY_NAMES[d]),
      opens: times[0],
      closes: times[1],
    });
  }

  return spec.length > 0 ? spec : undefined;
}

export { SITE_URL, absoluteUrl };
