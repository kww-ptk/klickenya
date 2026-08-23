"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface GalleryPhoto {
  url: string;
  alt?: string;
}

/**
 * The old gallery was a fixed grid-cols-4 at every breakpoint, so on a phone it
 * rendered four thumbnails about 80px wide and there was no way to view a photo
 * full size. This is a mosaic on desktop, a swipeable strip on mobile, and a
 * keyboard-navigable lightbox on both.
 */
function PropertyGallery({
  photos,
  title,
}: {
  photos: GalleryPhoto[];
  title: string;
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const open = lightboxIndex !== null;

  const close = useCallback(() => setLightboxIndex(null), []);
  const step = useCallback(
    (delta: number) =>
      setLightboxIndex((current) =>
        current === null ? null : (current + delta + photos.length) % photos.length
      ),
    [photos.length]
  );

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    }
    window.addEventListener("keydown", onKey);
    // Stop the page behind the lightbox from scrolling with it.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, close, step]);

  if (photos.length === 0) {
    return (
      <div className="flex aspect-[16/9] items-center justify-center rounded-[32px] bg-surface2">
        <span className="text-[48px]" aria-hidden="true">
          🏠
        </span>
      </div>
    );
  }

  const hasMosaic = photos.length >= 3;

  return (
    <>
      {/* ── Mobile: swipeable strip ────────── */}
      <div className="md:hidden">
        <div className="-mx-5 flex snap-x snap-mandatory gap-2 overflow-x-auto px-5 scrollbar-none">
          {photos.map((photo, i) => (
            <button
              key={photo.url}
              type="button"
              onClick={() => setLightboxIndex(i)}
              className="relative aspect-[4/3] w-[85%] shrink-0 snap-center overflow-hidden rounded-[20px] bg-surface2"
              aria-label={`View photo ${i + 1} of ${photos.length}`}
            >
              <Image
                src={photo.url}
                alt={photo.alt || `${title} photo ${i + 1}`}
                fill
                className="object-cover"
                sizes="85vw"
                priority={i === 0}
              />
            </button>
          ))}
        </div>
        <p className="mt-2.5 flex items-center gap-1.5 text-[13px] font-semibold text-text3">
          <Images className="size-3.5" />
          {photos.length} {photos.length === 1 ? "photo" : "photos"}, swipe to browse
        </p>
      </div>

      {/* ── Desktop: mosaic ────────────────── */}
      <div className="relative hidden overflow-hidden rounded-[32px] md:block">
        <div
          className={cn(
            "grid h-[480px] gap-1.5",
            hasMosaic ? "grid-cols-4 grid-rows-2" : "grid-cols-1"
          )}
        >
          <button
            type="button"
            onClick={() => setLightboxIndex(0)}
            className={cn(
              "group relative bg-surface2",
              hasMosaic ? "col-span-2 row-span-2" : "col-span-1"
            )}
            aria-label={`View photo 1 of ${photos.length}`}
          >
            <Image
              src={photos[0].url}
              alt={photos[0].alt || title}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
            />
          </button>

          {hasMosaic &&
            photos.slice(1, 5).map((photo, i) => (
              <button
                key={photo.url}
                type="button"
                onClick={() => setLightboxIndex(i + 1)}
                className="group relative bg-surface2"
                aria-label={`View photo ${i + 2} of ${photos.length}`}
              >
                <Image
                  src={photo.url}
                  alt={photo.alt || `${title} photo ${i + 2}`}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  sizes="25vw"
                />
              </button>
            ))}
        </div>

        <button
          type="button"
          onClick={() => setLightboxIndex(0)}
          className="absolute bottom-5 right-5 flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[13.5px] font-bold text-dark shadow-lg transition-transform hover:scale-105"
        >
          <Images className="size-4" />
          Show all {photos.length} photos
        </button>
      </div>

      {/* ── Lightbox ───────────────────────── */}
      {open && lightboxIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${title} photo viewer`}
          className="fixed inset-0 z-[300] flex flex-col bg-dark/95"
        >
          <div className="flex items-center justify-between px-5 py-4 text-white">
            <span className="text-[14px] font-semibold">
              {lightboxIndex + 1} / {photos.length}
            </span>
            <button
              type="button"
              onClick={close}
              aria-label="Close photo viewer"
              className="flex size-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20"
            >
              <X className="size-5" />
            </button>
          </div>

          <div className="relative flex-1">
            <Image
              src={photos[lightboxIndex].url}
              alt={photos[lightboxIndex].alt || `${title} photo ${lightboxIndex + 1}`}
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>

          {photos.length > 1 && (
            <div className="flex items-center justify-center gap-4 py-5">
              <button
                type="button"
                onClick={() => step(-1)}
                aria-label="Previous photo"
                className="flex size-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                onClick={() => step(1)}
                aria-label="Next photo"
                className="flex size-12 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <ChevronRight className="size-5" />
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export { PropertyGallery };
