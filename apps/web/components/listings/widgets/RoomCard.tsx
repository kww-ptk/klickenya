"use client";

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
}

export function RoomCard({ room, onEnquire }: RoomCardProps) {
  const photo = room.photos?.[0];
  const available = room.isAvailable !== false;
  const amenities = room.roomAmenities ?? [];

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
            {photo?.asset?.url ? (
              <Image
                src={photo.asset.url}
                alt={photo.alt ?? room.roomName}
                fill
                className="object-cover"
                sizes="110px"
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
              <p className="text-[14.5px] font-semibold text-[#16130C] leading-[1.3] line-clamp-1">
                {room.roomName}
              </p>
              <p className="mt-0.5 text-[12px] text-[#9C9485] line-clamp-1">
                {meta.join(" · ")}
              </p>
              {/* Top amenities with tick */}
              {amenities.length > 0 && (
                <div className="mt-1 flex items-center gap-2 text-[11px] text-[#9C9485] line-clamp-1">
                  {amenities.slice(0, 3).map((a: string) => (
                    <span key={a} className="inline-flex items-center gap-0.5">
                      <Check className="size-2.5 text-[#E8A020]" strokeWidth={3} />
                      {a}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13.5px] font-semibold text-[#E8A020]">
                KSh {room.pricePerNight.toLocaleString()}
                <span className="text-[11px] font-normal text-[#9C9485]"> /night</span>
              </p>
              {available && (
                <button
                  type="button"
                  onClick={() => onEnquire(room.roomName)}
                  className="shrink-0 bg-[#E8A020] text-[#16130C] font-bold text-[10px] rounded-full px-3 py-1.5 transition-colors hover:bg-[#d4911c]"
                >
                  Enquire
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── DESKTOP: vertical card ── */}
      <div className="hidden sm:block bg-white rounded-xl border border-[#E2DDD5] overflow-hidden transition-shadow duration-200 hover:shadow-md group">
        {/* Photo */}
        <div className="relative aspect-[4/3] overflow-hidden">
          {photo?.asset?.url ? (
            <Image
              src={photo.asset.url}
              alt={photo.alt ?? room.roomName}
              fill
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
              sizes="(max-width: 1024px) 50vw, 33vw"
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
        </div>

        {/* Body */}
        <div className="p-4">
          <h3 className="font-display text-[16px] font-bold text-[#16130C] leading-[1.3] mb-1.5">
            {room.roomName}
          </h3>

          {/* Meta row */}
          <p className="text-[12.5px] text-[#9C9485] mb-3">
            {meta.join(" · ")}
            {room.quantity != null && room.quantity > 1 && ` · ${room.quantity} available`}
          </p>

          {/* Amenities with tick */}
          {amenities.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1.5 mb-3">
              {amenities.map((a: string) => (
                <span
                  key={a}
                  className="inline-flex items-center gap-1.5 text-[12px] text-[#5E5848]"
                >
                  <Check className="size-3 text-[#E8A020] shrink-0" strokeWidth={3} />
                  {a}
                </span>
              ))}
            </div>
          )}

          {/* Price + CTA */}
          <div className="flex items-center justify-between pt-3 border-t border-[#E2DDD5]">
            <div>
              <span className="text-[18px] font-bold text-[#E8A020]">
                KSh {room.pricePerNight.toLocaleString()}
              </span>
              <span className="text-[12px] text-[#9C9485]"> / night</span>
            </div>
            {available ? (
              <button
                type="button"
                onClick={() => onEnquire(room.roomName)}
                className="bg-[#E8A020] text-[#16130C] font-bold text-[12px] rounded-full px-4 py-2 transition-colors hover:bg-[#d4911c]"
              >
                Enquire
              </button>
            ) : (
              <span className="text-[12px] font-semibold text-[#9C9485]">Unavailable</span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
