"use client";

import { useState } from "react";
import Image from "next/image";
import { Images } from "lucide-react";
import { Lightbox } from "./Lightbox";

interface PhotoGalleryProps {
  photos: string[];
  title: string;
}

/* ── Single mosaic cell ─────────────────────────────── */

function Cell({
  src,
  alt,
  onClick,
  sizes,
  priority = false,
  className = "",
}: {
  src: string;
  alt: string;
  onClick: () => void;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={alt}
      className={`group relative overflow-hidden ${className}`}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        quality={85}
        priority={priority}
        className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
      />
    </button>
  );
}

/* ── Desktop mosaic (Airbnb-style), adapts to photo count ── */

function DesktopMosaic({
  photos,
  title,
  onOpen,
}: {
  photos: string[];
  title: string;
  onOpen: (i: number) => void;
}) {
  const alt = (i: number) => `${title} — photo ${i + 1}`;
  const wrap = "rounded-[24px] overflow-hidden";
  const h = "h-[320px] lg:h-[460px]";

  if (photos.length === 1) {
    return (
      <div className={`${wrap} ${h}`}>
        <Cell src={photos[0]} alt={alt(0)} onClick={() => onOpen(0)} priority sizes="(min-width:1280px) 1280px, 100vw" className="h-full w-full" />
      </div>
    );
  }

  if (photos.length === 2) {
    return (
      <div className={`grid grid-cols-2 gap-2 ${wrap} ${h}`}>
        {photos.slice(0, 2).map((p, i) => (
          <Cell key={i} src={p} alt={alt(i)} onClick={() => onOpen(i)} priority={i === 0} sizes="50vw" />
        ))}
      </div>
    );
  }

  if (photos.length === 3) {
    return (
      <div className={`grid grid-cols-2 grid-rows-2 gap-2 ${wrap} ${h}`}>
        <Cell src={photos[0]} alt={alt(0)} onClick={() => onOpen(0)} priority sizes="50vw" className="row-span-2" />
        <Cell src={photos[1]} alt={alt(1)} onClick={() => onOpen(1)} sizes="50vw" />
        <Cell src={photos[2]} alt={alt(2)} onClick={() => onOpen(2)} sizes="50vw" />
      </div>
    );
  }

  if (photos.length === 4) {
    return (
      <div className={`grid grid-cols-4 grid-rows-2 gap-2 ${wrap} ${h}`}>
        <Cell src={photos[0]} alt={alt(0)} onClick={() => onOpen(0)} priority sizes="50vw" className="col-span-2 row-span-2" />
        <Cell src={photos[1]} alt={alt(1)} onClick={() => onOpen(1)} sizes="50vw" className="col-span-2" />
        <Cell src={photos[2]} alt={alt(2)} onClick={() => onOpen(2)} sizes="25vw" />
        <Cell src={photos[3]} alt={alt(3)} onClick={() => onOpen(3)} sizes="25vw" />
      </div>
    );
  }

  // 5 or more — classic Airbnb hero + 2×2. Extras are reachable via the lightbox.
  return (
    <div className={`grid grid-cols-4 grid-rows-2 gap-2 ${wrap} ${h}`}>
      <Cell src={photos[0]} alt={alt(0)} onClick={() => onOpen(0)} priority sizes="50vw" className="col-span-2 row-span-2" />
      {photos.slice(1, 5).map((p, i) => (
        <Cell key={i} src={p} alt={alt(i + 1)} onClick={() => onOpen(i + 1)} sizes="25vw" />
      ))}
    </div>
  );
}

/* ── Component ──────────────────────────────────────── */

function PhotoGallery({ photos, title }: PhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [current, setCurrent] = useState(0);

  const open = (i: number) => setLightboxIndex(i);
  const close = () => setLightboxIndex(null);

  if (photos.length === 0) {
    return (
      <div className="mb-10 overflow-hidden rounded-[24px] md:rounded-[32px]">
        <div className="flex aspect-[16/9] items-center justify-center bg-surface2">
          <span className="text-[48px]">📷</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ── Mobile: swipeable carousel ── */}
      <div className="-mx-5 mb-8 md:hidden">
        <div className="relative">
          <div
            onScroll={(e) => {
              const el = e.currentTarget;
              setCurrent(Math.round(el.scrollLeft / el.clientWidth));
            }}
            className="flex snap-x snap-mandatory overflow-x-auto scrollbar-none"
          >
            {photos.map((p, i) => (
              <button
                type="button"
                key={i}
                onClick={() => open(i)}
                aria-label={`${title} — photo ${i + 1}, tap to expand`}
                className="relative aspect-[4/3] w-full shrink-0 snap-center"
              >
                <Image
                  src={p}
                  alt={`${title} — photo ${i + 1}`}
                  fill
                  className="object-cover"
                  sizes="100vw"
                  quality={85}
                  priority={i === 0}
                />
              </button>
            ))}
          </div>
          {photos.length > 1 && (
            <div className="pointer-events-none absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-[12px] font-medium tabular-nums text-white">
              {current + 1} / {photos.length}
            </div>
          )}
        </div>
      </div>

      {/* ── Desktop: Airbnb mosaic ── */}
      <div className="relative mb-10 hidden md:block">
        <DesktopMosaic photos={photos} title={title} onOpen={open} />
        {photos.length > 1 && (
          <button
            type="button"
            onClick={() => open(0)}
            className="absolute bottom-4 right-4 flex items-center gap-2 rounded-lg border border-dark/20 bg-white px-4 py-2 text-[14px] font-semibold text-dark shadow-md transition-colors hover:bg-surface"
          >
            <Images className="size-4" />
            Show all photos
          </button>
        )}
      </div>

      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          title={title}
          startIndex={lightboxIndex}
          onClose={close}
        />
      )}
    </>
  );
}

export { PhotoGallery };
export type { PhotoGalleryProps };
