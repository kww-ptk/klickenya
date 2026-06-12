"use client";

import { useState, useEffect } from "react";
import { RoomsGrid } from "./RoomsGrid";

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

interface RentingToggleProps {
  rentingType: "entire_place" | "by_room" | "both";
  pricePerNight?: number;
  rooms?: RoomType[];
  listingTitle: string;
  onModeChange?: (mode: "entire" | "room") => void;
  roomAvailability?: Record<string, boolean>;
  roomPriceOverrides?: Record<string, number>;
  /** True only when ALL rooms are available. undefined = no PMS data (fallback). */
  entirePropertyAvailable?: boolean;
  listingSlug?: string;
  onRoomBooking?: (roomKey: string) => void;
  /** Opens booking modal for entire property */
  onEntireBooking?: () => void;
}

const LS_KEY = "kk_rent_mode";

function scrollToContactForm() {
  const form = document.getElementById("contact-form");
  if (form) {
    form.scrollIntoView({ behavior: "smooth" });
  }
}

export function RentingToggle({
  rentingType,
  pricePerNight,
  rooms,
  listingTitle,
  onModeChange,
  roomAvailability,
  roomPriceOverrides,
  entirePropertyAvailable,
  listingSlug,
  onRoomBooking,
  onEntireBooking,
}: RentingToggleProps) {
  /* ── CASE 1: entire_place → nothing ── */
  if (rentingType === "entire_place") return null;

  /* ── CASE 2: by_room → rooms only, no toggle ── */
  if (rentingType === "by_room") {
    return (
      <RoomsGrid rooms={rooms ?? []} listingTitle={listingTitle} roomAvailability={roomAvailability} roomPriceOverrides={roomPriceOverrides} listingSlug={listingSlug} onRoomBooking={onRoomBooking} />
    );
  }

  /* ── CASE 3: both → toggle UI ── */
  return <BothToggle
    pricePerNight={pricePerNight}
    rooms={rooms}
    listingTitle={listingTitle}
    onModeChange={onModeChange}
    roomAvailability={roomAvailability}
    roomPriceOverrides={roomPriceOverrides}
    entirePropertyAvailable={entirePropertyAvailable}
    listingSlug={listingSlug}
    onRoomBooking={onRoomBooking}
    onEntireBooking={onEntireBooking}
  />;
}

/* Separate component so hooks are unconditional */
function BothToggle({
  pricePerNight,
  rooms,
  listingTitle,
  onModeChange,
  roomAvailability,
  roomPriceOverrides,
  entirePropertyAvailable,
  listingSlug,
  onRoomBooking,
  onEntireBooking,
}: Omit<RentingToggleProps, "rentingType">) {
  const [mode, setMode] = useState<"entire" | "room">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(LS_KEY);
      if (saved === "entire" || saved === "room") return saved;
    }
    return "room";
  });

  useEffect(() => {
    localStorage.setItem(LS_KEY, mode);
    onModeChange?.(mode);
  }, [mode, onModeChange]);

  const activeClass =
    "bg-amber text-dark font-bold rounded-full px-5 py-2.5 text-sm transition-all duration-200";
  const inactiveClass =
    "bg-transparent text-text2 font-medium border border-border rounded-full px-5 py-2.5 text-sm hover:bg-surface transition-all duration-200";

  return (
    <div>
      {/* Toggle header */}
      <p className="text-sm text-text2 mb-3">How would you like to stay?</p>
      <div className="inline-flex gap-2">
        <button
          type="button"
          onClick={() => setMode("room")}
          className={mode === "room" ? activeClass : inactiveClass}
        >
          🛏 By room
        </button>
        <button
          type="button"
          onClick={() => setMode("entire")}
          className={mode === "entire" ? activeClass : inactiveClass}
        >
          🏠 Entire place
        </button>
      </div>

      {/* Panels */}
      {mode === "entire" ? (
        <div className={`border rounded-xl p-5 mt-4 ${entirePropertyAvailable === false ? "border-red-200 bg-red-50/30" : "border-border"}`}>
          <p className="text-sm text-text2 mb-1">
            Entire property · Private
          </p>
          <p
            className="text-2xl font-bold text-amber mb-1"
            style={{ fontFamily: "var(--font-heading, inherit)" }}
          >
            {pricePerNight != null
              ? <>KSh {pricePerNight.toLocaleString()} <span className="text-sm text-text3 font-normal">/ night</span></>
              : "Price on request"}
          </p>
          {entirePropertyAvailable === false ? (
            <>
              <p className="text-sm text-red-600 font-medium mb-2">
                Not available — one or more rooms are booked
              </p>
              <p className="text-sm text-text3 mb-4">
                Try individual rooms below, or enquire for different dates
              </p>
              <button
                type="button"
                onClick={() => setMode("room")}
                className="w-full bg-border text-text2 font-bold rounded-full py-2.5 text-sm transition-colors hover:bg-[#d4d0c8] mb-2"
              >
                View available rooms →
              </button>
              <button
                type="button"
                onClick={onEntireBooking ?? scrollToContactForm}
                className="w-full border border-border text-text2 font-semibold rounded-full py-2.5 text-sm transition-colors hover:bg-surface"
              >
                Enquire for different dates
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-text3 mb-4">
                Book the entire place for your group
              </p>
              <button
                type="button"
                onClick={onEntireBooking ?? scrollToContactForm}
                className="w-full bg-amber text-dark font-bold rounded-full py-2.5 text-sm transition-colors hover:bg-[#d4911c]"
              >
                {onEntireBooking ? "Check availability" : "Enquire for the whole place →"}
              </button>
            </>
          )}
        </div>
      ) : (
        <>
          {rooms && rooms.length > 0 ? (
            <div className="mt-4">
              <RoomsGrid rooms={rooms} listingTitle={listingTitle} roomAvailability={roomAvailability} roomPriceOverrides={roomPriceOverrides} listingSlug={listingSlug} onRoomBooking={onRoomBooking} />
            </div>
          ) : (
            <div className="border border-border rounded-xl p-5 mt-4 text-center">
              <p className="text-sm text-text3 mb-4">
                Room details coming soon — enquire below.
              </p>
              <button
                type="button"
                onClick={scrollToContactForm}
                className="bg-amber text-dark font-bold rounded-full px-6 py-2.5 text-sm transition-colors hover:bg-[#d4911c]"
              >
                Enquire →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
