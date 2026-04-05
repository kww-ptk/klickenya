"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { RoomEditPanel, RoomData } from "./RoomEditPanel";

interface RoomManagementSectionProps {
  initialRooms: RoomData[];
  propertyId: string;
  propertyName: string;
}

const ROOM_TYPE_LABELS: Record<string, string> = {
  standard: "Standard",
  deluxe: "Deluxe",
  suite: "Suite",
  studio: "Studio",
  cottage: "Cottage",
  villa: "Villa",
  tent: "Safari Tent",
  dorm: "Dorm",
  entire_place: "Entire Place",
};

const fmt = (n: number) =>
  new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    minimumFractionDigits: 0,
  }).format(n);

export function RoomManagementSection({
  initialRooms,
  propertyId,
  propertyName,
}: RoomManagementSectionProps) {
  const [rooms, setRooms] = useState<RoomData[]>(initialRooms);
  const [editingRoom, setEditingRoom] = useState<RoomData | null | "new">(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Drag-to-reorder state
  const dragIndexRef = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleRoomSaved = (saved: RoomData) => {
    setRooms((prev) => {
      const exists = prev.find((r) => r.id === saved.id);
      if (exists) return prev.map((r) => (r.id === saved.id ? saved : r));
      return [...prev, saved];
    });
    setEditingRoom(null);
  };

  const handleRoomDeleted = (roomId: string) => {
    setRooms((prev) => prev.filter((r) => r.id !== roomId));
  };

  const toggleActive = async (room: RoomData) => {
    setTogglingId(room.id);
    try {
      const res = await fetch(`/api/properties/rooms/${room.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !room.is_active }),
      });
      if (res.ok) {
        setRooms((prev) =>
          prev.map((r) => (r.id === room.id ? { ...r, is_active: !r.is_active } : r))
        );
      }
    } finally {
      setTogglingId(null);
    }
  };

  const handleDragStart = (index: number) => {
    dragIndexRef.current = index;
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = async (dropIndex: number) => {
    const fromIndex = dragIndexRef.current;
    if (fromIndex === null || fromIndex === dropIndex) {
      dragIndexRef.current = null;
      setDragOverIndex(null);
      return;
    }

    const reordered = [...rooms];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(dropIndex, 0, moved);
    const updated = reordered.map((r, i) => ({ ...r, display_order: i }));

    setRooms(updated);
    dragIndexRef.current = null;
    setDragOverIndex(null);

    // Persist new display orders
    await Promise.all(
      updated.map((r, i) =>
        fetch(`/api/properties/rooms/${r.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ display_order: i }),
        })
      )
    );
  };

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display text-[16px] font-bold text-[#16130C] tracking-[-0.02em]">
            Rooms
          </h2>
          <button
            onClick={() => setEditingRoom("new")}
            className="flex items-center gap-1.5 px-3 h-8 rounded-full bg-[#4F46E5] text-white text-[12px] font-bold hover:bg-[#4338CA] transition-colors shadow-sm"
          >
            <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add room
          </button>
        </div>

        {rooms.length === 0 ? (
          <div className="bg-[#F4F1EC] rounded-xl px-4 py-6 text-center">
            <p className="text-[13px] text-[#9C9485]">No rooms yet. Add your first room above.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rooms.map((room, index) => (
              <div
                key={room.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={() => handleDrop(index)}
                onDragLeave={() => setDragOverIndex(null)}
                className={`bg-white rounded-xl border transition-all ${
                  dragOverIndex === index
                    ? "border-[#4F46E5] shadow-md scale-[1.01]"
                    : "border-[#E2DDD5] shadow-sm"
                } ${!room.is_active ? "opacity-60" : ""}`}
              >
                <div className="flex items-center gap-3 p-3">
                  {/* Drag handle */}
                  <div className="shrink-0 cursor-grab active:cursor-grabbing touch-none text-[#C5BFB5] hover:text-[#9C9485]">
                    <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />
                    </svg>
                  </div>

                  {/* Photo thumb */}
                  <div className="shrink-0 w-[52px] h-[52px] rounded-lg overflow-hidden bg-[#F4F1EC] relative">
                    {room.photos?.[0] ? (
                      <Image
                        src={room.photos[0]}
                        alt={room.name}
                        fill
                        sizes="52px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[22px]">🛏️</div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[13px] font-semibold text-[#16130C] truncate">
                        {room.name}
                      </p>
                      {room.room_number && (
                        <span className="shrink-0 text-[10px] text-[#9C9485] font-mono">
                          #{room.room_number}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-[11px] text-[#9C9485]">
                        {ROOM_TYPE_LABELS[room.room_type] ?? room.room_type}
                      </span>
                      <span className="text-[#C5BFB5]">·</span>
                      <span className="text-[11px] text-[#9C9485]">
                        {room.max_guests} guests
                      </span>
                      <span className="text-[#C5BFB5]">·</span>
                      <span className="text-[11px] font-semibold text-[#16130C]">
                        {fmt(room.base_price_kes)}/night
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      {room.amenities?.length > 0 && (
                        <span className="text-[10px] text-[#9C9485]">
                          {room.amenities.length} amenities
                        </span>
                      )}
                      {room.photos?.length > 0 && (
                        <>
                          {room.amenities?.length > 0 && <span className="text-[#C5BFB5]">·</span>}
                          <span className="text-[10px] text-[#9C9485]">
                            {room.photos.length} photos
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 flex items-center gap-2">
                    {/* Active toggle */}
                    <button
                      type="button"
                      disabled={togglingId === room.id}
                      onClick={() => toggleActive(room)}
                      className={`relative w-9 h-5 rounded-full transition-colors duration-200 disabled:opacity-50 ${
                        room.is_active ? "bg-[#16A34A]" : "bg-[#E2DDD5]"
                      }`}
                      title={room.is_active ? "Active — click to deactivate" : "Inactive — click to activate"}
                    >
                      <span
                        className={`absolute top-0.5 size-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                          room.is_active ? "translate-x-[18px]" : "translate-x-0.5"
                        }`}
                      />
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => setEditingRoom(room)}
                      className="size-8 rounded-full bg-[#F4F1EC] flex items-center justify-center hover:bg-[#E2DDD5] transition-colors"
                      title="Edit room"
                    >
                      <svg className="size-3.5 text-[#5E5848]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit panel */}
      {editingRoom !== null && (
        <RoomEditPanel
          room={editingRoom === "new" ? null : editingRoom}
          propertyId={propertyId}
          propertyName={propertyName}
          onClose={() => setEditingRoom(null)}
          onSaved={handleRoomSaved}
          onDeleted={handleRoomDeleted}
        />
      )}
    </>
  );
}
