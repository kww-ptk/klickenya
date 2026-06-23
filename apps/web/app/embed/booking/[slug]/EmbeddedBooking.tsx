"use client";

import { useEffect, useRef } from "react";
import { BookingWidget } from "@/components/booking/BookingWidget";

interface WidgetRoom {
  id: string;
  name: string;
  description: string | null;
  photos: string[];
  amenities: string[];
  bedType: string | null;
  sizeSqm: number | null;
  maxGuests: number;
  pricePerNight: number;
  sanityKey: string | null;
}

interface EmbeddedBookingProps {
  propertyId: string;
  propertyName: string;
  propertyCity: string | null;
  listingSlug: string | null;
  bookingSlug: string;
  rentingType: string;
  entirePlacePrice: number | null;
  rooms: WidgetRoom[];
  sourceOrigin: string | null;
  sourceRef: string | null;
  theme: "light" | "dark";
  /** CSS color (with #) */
  accent: string;
  /** "white" | "transparent" | CSS color */
  background: string;
}

/**
 * Client wrapper for the property booking embed — parallel to
 * EmbeddedReservation. Reuses the live <BookingWidget> (availability check +
 * room select + enquiry), pointed at the public /api/properties/booking-enquiry
 * endpoint so submissions actually succeed from a third-party site.
 *
 * Adds the same postMessage height bridge as the other embeds so the embed.js
 * loader (or any parent) can auto-resize the iframe.
 */
export function EmbeddedBooking({
  propertyId,
  propertyName,
  propertyCity,
  listingSlug,
  bookingSlug,
  rentingType,
  entirePlacePrice,
  rooms,
  sourceOrigin,
  sourceRef,
  theme,
  accent,
  background,
}: EmbeddedBookingProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  // postMessage height bridge — same shape as the menu/reservations embeds.
  useEffect(() => {
    if (typeof window === "undefined" || window.parent === window) return;
    const sendHeight = () => {
      window.parent.postMessage(
        { type: "klickenya:resize", height: document.documentElement.scrollHeight },
        "*",
      );
    };
    sendHeight();
    const observer = new ResizeObserver(sendHeight);
    observer.observe(document.documentElement);
    return () => observer.disconnect();
  }, []);

  const cssVars = {
    "--klickenya-accent": accent,
    "--klickenya-bg": background,
  } as React.CSSProperties;

  return (
    <div
      ref={rootRef}
      data-theme={theme}
      style={{ ...cssVars, background, minHeight: "100vh", padding: "16px", margin: 0 }}
    >
      <div style={{ maxWidth: 520, margin: "0 auto" }}>
        <h1 className="font-display text-[20px] font-bold text-dark tracking-[-0.02em] mb-1">
          {propertyName}
        </h1>
        {propertyCity && <p className="text-[13px] text-text3 mb-4">{propertyCity}</p>}

        <BookingWidget
          propertyName={propertyName}
          propertyCity={propertyCity}
          listingSlug={listingSlug}
          bookingSlug={bookingSlug}
          rentingType={rentingType}
          entirePlacePrice={entirePlacePrice}
          rooms={rooms}
          propertyId={propertyId}
          enquiryEndpoint="/api/properties/booking-enquiry"
          sourceOrigin={sourceOrigin}
          sourceRef={sourceRef}
        />

        <p className="text-center text-[11px] text-text3 mt-4">
          Powered by{" "}
          <a href="https://klickenya.com" className="font-semibold text-amber">
            Klickenya
          </a>
        </p>
      </div>
    </div>
  );
}
