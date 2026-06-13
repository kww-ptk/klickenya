"use client";

import { useState } from "react";
import Image from "next/image";
import { Check } from "lucide-react";

interface RoomPhoto {
  asset?: { _id: string; url: string };
  alt?: string;
}

interface RoomType {
  _key: string;
  roomName: string;
  roomDescription?: unknown;
  photos?: RoomPhoto[];
  pricePerNight: number;
  capacity: number;
  bedType?: string;
  roomSizeSqm?: number;
  roomAmenities?: string[];
  isAvailable: boolean;
  quantity?: number;
}

interface RoomCardProps {
  room: RoomType;
  onEnquire: (roomName: string) => void;
  /** Real availability from Supabase PMS. Overrides room.isAvailable when present. */
  realAvailability?: boolean;
  /** Price from Supabase PMS. Overrides room.pricePerNight when present. */
  priceOverride?: number;
  /** Listing slug for availability check API */
  listingSlug?: string;
  /** Opens the main booking modal with this room pre-selected (reuses sidebar modal) */
  onRoomBooking?: (roomKey: string) => void;
}

/** Check if a URL can be optimized by Next.js Image (known CDN domains) */
function isOptimizableUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === "cdn.sanity.io" || host.endsWith(".supabase.co") || host === "images.unsplash.com";
  } catch {
    return false;
  }
}

export function RoomCard({ room, onEnquire, realAvailability, priceOverride, listingSlug, onRoomBooking }: RoomCardProps) {
  const [slideIndex, setSlideIndex] = useState(0);
  const allPhotos = (room.photos ?? []).map((p) => p.asset?.url).filter(Boolean) as string[];
  const photo = room.photos?.[0];
  const available = realAvailability ?? (room.isAvailable !== false);
  const displayPrice = priceOverride ?? room.pricePerNight;
  const amenities = room.roomAmenities ?? [];
  const photoUrl = photo?.asset?.url;
  const skipOptimize = photoUrl ? !isOptimizableUrl(photoUrl) : false;
  const currentSlideUrl = allPhotos[slideIndex] ?? photoUrl;

  /* Build subtitle parts */
  const meta: string[] = [];
  if (room.capacity) meta.push(`Sleeps ${room.capacity}`);
  if (room.bedType) meta.push(`${room.bedType} bed`);
  if (room.roomSizeSqm) meta.push(`${room.roomSizeSqm} sqm`);

  return (
    <>
      {/* ── MOBILE: horizontal card ── */}
      <div className="sm:hidden">
        <div className="flex gap-3.5 bg-white rounded-[var(--radius-md)] overflow-hidden">
          {/* Thumbnail */}
          <div className="relative w-[110px] h-[110px] shrink-0 rounded-[var(--radius-md)] overflow-hidden">
            {photoUrl ? (
              <Image
                src={photoUrl}
                alt={photo?.alt ?? room.roomName}
                fill
                className="object-cover"
                sizes="110px"
                unoptimized={skipOptimize}
              />
            ) : (
              <div className="absolute inset-0 bg-[#1F1C12] flex items-center justify-center">
                <span className="text-white text-[11px] text-center px-1">{room.roomName}</span>
              </div>
            )}
            {!available && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <span className="text-white text-[10px] font-bold">Unavailable</span>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 py-0.5 flex flex-col justify-between">
            <div>
              <p className="text-[14.5px] font-semibold text-dark leading-[1.3] line-clamp-1">
                {room.roomName}
              </p>
              <p className="mt-0.5 text-[12px] text-text3 line-clamp-1">
                {meta.join(" · ")}
              </p>
              {/* Top amenities with tick */}
              {amenities.length > 0 && (
                <div className="mt-1 flex items-center gap-2 text-[11px] text-text3 line-clamp-1">
                  {amenities.slice(0, 3).map((a: string) => (
                    <span key={a} className="inline-flex items-center gap-0.5">
                      <Check className="size-2.5 text-amber" strokeWidth={3} />
                      {a}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13.5px] font-semibold text-amber">
                KSh {displayPrice.toLocaleString()}
                <span className="text-[11px] font-normal text-text3"> /night</span>
              </p>
              <button
                type="button"
                onClick={() => onRoomBooking ? onRoomBooking(room._key) : onEnquire(room.roomName)}
                className="shrink-0 bg-amber text-dark font-bold text-[10px] rounded-full px-3 py-1.5 transition-colors hover:bg-[#d4911c]"
              >
                {onRoomBooking ? "Check availability" : "Enquire"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── DESKTOP: vertical card ── */}
      <div className="hidden sm:block bg-white rounded-xl border border-border overflow-hidden transition-shadow duration-200 hover:shadow-md group">
        {/* Photo slider */}
        <div className="relative aspect-[4/3] overflow-hidden">
          {currentSlideUrl ? (
            <Image
              src={currentSlideUrl}
              alt={photo?.alt ?? room.roomName}
              fill
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
              sizes="(max-width: 1024px) 50vw, 33vw"
              unoptimized={!isOptimizableUrl(currentSlideUrl)}
            />
          ) : (
            <div className="absolute inset-0 bg-[#1F1C12] flex items-center justify-center">
              <span className="text-white text-sm">{room.roomName}</span>
            </div>
          )}
          {!available && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-white font-bold">Unavailable</span>
            </div>
          )}
          {/* Slider arrows + dots */}
          {allPhotos.length > 1 && (
            <>
              <button type="button" onClick={(e) => { e.stopPropagation(); setSlideIndex((slideIndex - 1 + allPhotos.length) % allPhotos.length); }}
                className="absolute left-1.5 top-1/2 -translate-y-1/2 size-7 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-white">
                <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
              </button>
              <button type="button" onClick={(e) => { e.stopPropagation(); setSlideIndex((slideIndex + 1) % allPhotos.length); }}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 size-7 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-white">
                <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {allPhotos.map((_, i) => (
                  <span key={i} className={`size-1.5 rounded-full transition-colors ${i === slideIndex ? "bg-white" : "bg-white/40"}`} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Body */}
        <div className="p-4">
          <h3 className="font-display text-[16px] font-bold text-dark leading-[1.3] mb-1.5">
            {room.roomName}
          </h3>

          {/* Meta row */}
          <p className="text-[12.5px] text-text3 mb-3">
            {meta.join(" · ")}
            {room.quantity != null && room.quantity > 1 && ` · ${room.quantity} available`}
          </p>

          {/* Amenities with tick */}
          {amenities.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-3">
              {amenities.map((a: string) => (
                <span
                  key={a}
                  className="inline-flex items-center gap-1.5 text-[12px] text-text2"
                >
                  <Check className="size-3 text-amber shrink-0" strokeWidth={3} />
                  {a}
                </span>
              ))}
            </div>
          )}

          {/* Price + CTA */}
          <div className="flex items-center justify-between pt-3 border-t border-border">
            <div>
              <span className="text-[18px] font-bold text-amber">
                KSh {displayPrice.toLocaleString()}
              </span>
              <span className="text-[12px] text-text3"> / night</span>
            </div>
            <button
              type="button"
              onClick={() => onRoomBooking ? onRoomBooking(room._key) : onEnquire(room.roomName)}
              className="bg-amber text-dark font-bold text-[12px] rounded-full px-4 py-2 transition-colors hover:bg-[#d4911c]"
            >
              {onRoomBooking ? "Check availability" : "Enquire"}
            </button>
          </div>
        </div>
      </div>

    </>
  );
}
