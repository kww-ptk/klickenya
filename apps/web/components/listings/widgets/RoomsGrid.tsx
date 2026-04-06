"use client";

import { useRouter, usePathname } from "next/navigation";
import { RoomCard } from "./RoomCard";

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

interface RoomsGridProps {
  rooms: RoomType[];
  listingTitle: string;
  roomAvailability?: Record<string, boolean>;
  roomPriceOverrides?: Record<string, number>;
  listingSlug?: string;
  onRoomBooking?: (roomKey: string) => void;
}

export function RoomsGrid({ rooms, listingTitle, roomAvailability, roomPriceOverrides, listingSlug, onRoomBooking }: RoomsGridProps) {
  const router = useRouter();
  const pathname = usePathname();

  if (!rooms || rooms.length === 0) return null;

  const handleEnquire = (roomName: string) => {
    const encoded = encodeURIComponent(roomName);
    router.replace(pathname + "?room=" + encoded, { scroll: false });
    const form = document.getElementById("contact-form");
    if (form) {
      form.scrollIntoView({ behavior: "smooth" });
      form.classList.add("ring-2", "ring-[#E8A020]", "ring-offset-2");
      setTimeout(() => {
        form.classList.remove("ring-2", "ring-[#E8A020]", "ring-offset-2");
      }, 1000);
    }
  };

  return (
    <div id="rooms-grid">
      <h2 className="font-display text-[22px] font-bold tracking-[-0.02em] text-dark mb-5">
        Rooms &amp; Rates
      </h2>
      <div className="flex flex-col gap-4 sm:grid sm:grid-cols-2 mt-4">
        {rooms.map((room) => (
          <RoomCard
            key={room._key}
            room={room}
            onEnquire={handleEnquire}
            realAvailability={roomAvailability?.[room._key]}
            priceOverride={roomPriceOverrides?.[room._key]}
            listingSlug={listingSlug}
            onRoomBooking={onRoomBooking}
          />
        ))}
      </div>
    </div>
  );
}
