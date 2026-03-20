"use client";

import Image from "next/image";
import Link from "next/link";

interface EventCardProps {
  title: string;
  date: string;
  month: string;
  day: string;
  location: string;
  time: string;
  price: string;
  attending: number;
  hostInitials: string;
  hostName: string;
  href: string;
  imageUrl?: string;
  imageColor?: string;
}

function EventCard({
  title,
  month,
  day,
  location,
  time,
  price,
  attending,
  hostInitials,
  hostName,
  href,
  imageUrl,
  imageColor = "bg-surface2",
}: EventCardProps) {
  return (
    <Link
      href={href}
      className="shrink-0 w-[296px] rounded-[32px] bg-white border border-border overflow-hidden group hover:shadow-md transition-shadow duration-300 cursor-pointer"
    >
      {/* Cover image */}
      <div className={`h-[160px] ${imageUrl ? "" : imageColor} relative overflow-hidden`}>
        {imageUrl && (
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            sizes="296px"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/10" />
        {/* Date badge */}
        <div className="absolute top-4 left-4 bg-white rounded-[14px] px-3 py-2 text-center shadow-sm min-w-[52px]">
          <span className="block text-[11px] font-bold text-purple uppercase tracking-[0.04em]">
            {month}
          </span>
          <span className="block text-[22px] font-bold text-text leading-none mt-0.5">
            {day}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        {/* Host */}
        <div className="flex items-center gap-2 mb-3">
          <div className="size-6 rounded-full bg-gradient-to-br from-purple to-amber flex items-center justify-center">
            <span className="text-[9px] font-bold text-white">
              {hostInitials}
            </span>
          </div>
          <span className="text-[12px] text-text2 font-medium">{hostName}</span>
        </div>

        {/* Title */}
        <h3 className="text-[15px] font-semibold text-text leading-[1.35] line-clamp-2 mb-2">
          {title}
        </h3>

        {/* Meta */}
        <div className="flex flex-col gap-1 mb-4">
          <span className="text-[12.5px] text-text2">{location}</span>
          <span className="text-[12.5px] text-text3">{time}</span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          {/* Avatars */}
          <div className="flex items-center">
            <div className="flex -space-x-1.5">
              {Array.from({ length: Math.min(attending, 3) }).map((_, i) => (
                <div
                  key={i}
                  className="size-6 rounded-full border-2 border-white bg-surface2"
                />
              ))}
            </div>
            {attending > 3 && (
              <span className="ml-2 text-[11px] text-text3 font-medium">
                +{attending - 3}
              </span>
            )}
          </div>

          {/* Price */}
          <span className="text-[13px] font-semibold text-amber bg-amber-dim px-2.5 py-1 rounded-full">
            {price}
          </span>
        </div>
      </div>
    </Link>
  );
}

export { EventCard };
export type { EventCardProps };
