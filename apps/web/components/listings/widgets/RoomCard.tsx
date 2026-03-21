"use client";

import Image from "next/image";

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
  const visibleAmenities = amenities.slice(0, 4);
  const extraCount = amenities.length - 4;

  return (
    <div className="bg-white rounded-xl border border-[#E2DDD5] overflow-hidden transition-shadow duration-200 hover:shadow-md">
      {/* Photo */}
      <div className="relative aspect-[4/3]">
        {photo?.asset?.url ? (
          <Image
            src={photo.asset.url}
            alt={photo.alt ?? room.roomName}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 400px"
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
        <h3
          className="text-lg font-bold text-[#16130C] mb-2"
          style={{ fontFamily: "var(--font-heading, inherit)" }}
        >
          {room.roomName}
        </h3>

        {/* Badges */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <span className="text-xs bg-[#F4F1EC] rounded-full px-2.5 py-1 text-[#5E5848]">
            👥 Sleeps {room.capacity}
          </span>
          {room.bedType && (
            <span className="text-xs bg-[#F4F1EC] rounded-full px-2.5 py-1 text-[#5E5848]">
              {room.bedType}
            </span>
          )}
          {room.roomSizeSqm != null && room.roomSizeSqm > 0 && (
            <span className="text-xs bg-[#F4F1EC] rounded-full px-2.5 py-1 text-[#5E5848]">
              {room.roomSizeSqm} sqm
            </span>
          )}
        </div>

        {/* Amenities */}
        {amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {visibleAmenities.map((a: string) => (
              <span
                key={a}
                className="text-[11px] bg-[#F4F1EC] rounded-full px-2 py-0.5 text-[#5E5848]"
              >
                {a}
              </span>
            ))}
            {extraCount > 0 && (
              <span className="text-xs text-[#9C9485]">+{extraCount} more</span>
            )}
          </div>
        )}

        {/* Quantity note */}
        {room.quantity != null && room.quantity > 1 && (
          <p className="text-xs text-[#9C9485]">
            {room.quantity} rooms of this type
          </p>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-[#E2DDD5]">
        <div>
          <span className="text-xl font-bold text-[#E8A020]">
            KSh {room.pricePerNight.toLocaleString()}
          </span>
          <span className="text-sm text-[#9C9485]"> / night</span>
        </div>
        {available ? (
          <button
            type="button"
            onClick={() => onEnquire(room.roomName)}
            className="mt-3 w-full bg-[#E8A020] text-[#16130C] font-bold text-sm rounded-full py-2.5 transition-colors hover:bg-[#d4911c]"
          >
            Enquire about this room →
          </button>
        ) : (
          <button
            type="button"
            disabled
            className="mt-3 w-full bg-[#E2DDD5] text-[#9C9485] font-bold text-sm rounded-full py-2.5 cursor-not-allowed"
          >
            Unavailable
          </button>
        )}
      </div>
    </div>
  );
}
