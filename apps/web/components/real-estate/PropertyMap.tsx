import { ExternalLink, MapPin } from "lucide-react";

/**
 * Location map. `lat` and `lng` have been on the property schema and in the
 * detail query all along, and nothing rendered them.
 *
 * OpenStreetMap's embed needs no API key, which matters because
 * GOOGLE_PLACES_API_KEY is still not in the environment. Swap the iframe for a
 * Google Maps embed if that key ever lands; the directions link below already
 * points at Google.
 */
function PropertyMap({
  lat,
  lng,
  title,
  neighbourhood,
  city,
}: {
  lat: number;
  lng: number;
  title: string;
  neighbourhood?: string;
  city?: string;
}) {
  // Roughly a 1.5km box around the pin.
  const delta = 0.008;
  const bbox = [lng - delta, lat - delta, lng + delta, lat + delta].join("%2C");
  const embedSrc = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
  const directions = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  const place = [neighbourhood, city].filter(Boolean).join(", ");

  return (
    <section className="mb-7">
      <h2 className="font-display mb-4 text-[22px] font-bold tracking-[-0.02em] text-dark">
        Location
      </h2>

      <div className="overflow-hidden rounded-[24px] border border-border">
        <iframe
          src={embedSrc}
          title={`Map showing the location of ${title}`}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="h-[320px] w-full border-0"
        />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface px-5 py-3.5">
          <p className="flex items-center gap-1.5 text-[14px] text-text2">
            <MapPin className="size-4 text-text3" />
            {place || "Kenya"}
          </p>
          <a
            href={directions}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[13.5px] font-semibold text-purple2 hover:underline"
          >
            Open in Google Maps
            <ExternalLink className="size-3.5" />
          </a>
        </div>
      </div>
    </section>
  );
}

export { PropertyMap };
