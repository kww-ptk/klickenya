"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/* ---------- Types ---------- */

interface RoomInput {
  name: string;
  room_number: string;
  max_guests: number;
  base_price_kes: number;
}

const PROPERTY_TYPES = [
  { value: "villa", label: "Villa / Holiday Home", icon: "🏡" },
  { value: "hotel", label: "Hotel / Guesthouse", icon: "🏨" },
  { value: "apartment", label: "Apartment", icon: "🏢" },
  { value: "cottage", label: "Beach Cottage", icon: "🏖️" },
  { value: "camp", label: "Safari Camp", icon: "⛺" },
] as const;

/* ---------- Component ---------- */

export default function PropertySetupWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editPropertyId = searchParams.get("edit");

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — Property type
  const [propertyType, setPropertyType] = useState("villa");
  const [isEntireProperty, setIsEntireProperty] = useState(true);

  // Step 2 — Rooms
  const [propertyName, setPropertyName] = useState("");
  const [rooms, setRooms] = useState<RoomInput[]>([
    { name: "", room_number: "", max_guests: 2, base_price_kes: 5000 },
  ]);

  // Step 3 — Settings
  const [checkInTime, setCheckInTime] = useState("14:00");
  const [checkOutTime, setCheckOutTime] = useState("11:00");
  const [minStay, setMinStay] = useState(1);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");

  const addRoom = () => {
    if (rooms.length >= 50) return;
    setRooms([...rooms, { name: "", room_number: "", max_guests: 2, base_price_kes: 5000 }]);
  };

  const updateRoom = (index: number, field: keyof RoomInput, value: string | number) => {
    const updated = [...rooms];
    updated[index] = { ...updated[index], [field]: value };
    setRooms(updated);
  };

  const removeRoom = (index: number) => {
    if (rooms.length <= 1) return;
    setRooms(rooms.filter((_, i) => i !== index));
  };

  const handleFinish = async () => {
    setSaving(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Not authenticated");
        setSaving(false);
        return;
      }

      let propertyId = editPropertyId;

      if (editPropertyId) {
        // Update existing property
        await supabase
          .from("properties")
          .update({
            property_type: propertyType,
            is_entire_property: isEntireProperty,
            name: propertyName.trim() || "My Property",
            check_in_time: checkInTime,
            check_out_time: checkOutTime,
            min_stay_nights: minStay,
            address: address.trim() || null,
            city: city.trim() || null,
            is_active: true,
          })
          .eq("id", editPropertyId)
          .eq("owner_id", user.id);
      } else {
        // Create new property
        const { data: newProp, error: propErr } = await supabase
          .from("properties")
          .insert({
            owner_id: user.id,
            name: propertyName.trim() || "My Property",
            property_type: propertyType,
            is_entire_property: isEntireProperty,
            check_in_time: checkInTime,
            check_out_time: checkOutTime,
            min_stay_nights: minStay,
            address: address.trim() || null,
            city: city.trim() || null,
            is_active: true,
          })
          .select("id")
          .single();

        if (propErr || !newProp) {
          setError(propErr?.message ?? "Failed to create property");
          setSaving(false);
          return;
        }
        propertyId = newProp.id;
      }

      // Create rooms
      const roomInserts = isEntireProperty
        ? [
            {
              property_id: propertyId!,
              name: "Entire Property",
              room_type: "entire_property",
              max_guests: rooms[0].max_guests,
              base_price_kes: rooms[0].base_price_kes,
              display_order: 0,
            },
          ]
        : rooms.map((r, i) => ({
            property_id: propertyId!,
            name: r.name.trim() || `Room ${i + 1}`,
            room_number: r.room_number.trim() || null,
            max_guests: r.max_guests,
            base_price_kes: r.base_price_kes,
            display_order: i,
          }));

      const { error: roomErr } = await supabase.from("rooms").insert(roomInserts);
      if (roomErr) {
        setError(roomErr.message);
        setSaving(false);
        return;
      }

      router.push(`/dashboard/property/${propertyId}`);
    } catch (err) {
      setError("Something went wrong. Please try again.");
      setSaving(false);
    }
  };

  return (
    <div className="max-w-[560px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-[22px] lg:text-[28px] font-bold tracking-[-0.03em] text-[#16130C]">
          {editPropertyId ? "Set up your property" : "Add a new property"}
        </h1>
        <p className="text-[13px] text-[#9C9485] mt-0.5">
          Step {step} of 3
        </p>
        {/* Progress bar */}
        <div className="flex gap-1.5 mt-3">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                s <= step ? "bg-[#4F46E5]" : "bg-[#E2DDD5]"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step 1 — Property type */}
      {step === 1 && (
        <div className="space-y-5">
          <div>
            <h2 className="text-[15px] font-semibold text-[#16130C] mb-3">
              What kind of property is this?
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {PROPERTY_TYPES.map((pt) => (
                <button
                  key={pt.value}
                  onClick={() => setPropertyType(pt.value)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    propertyType === pt.value
                      ? "border-[#4F46E5] bg-[#4F46E5]/5"
                      : "border-[#E2DDD5] hover:border-[#9C9485]"
                  }`}
                >
                  <span className="text-[20px]">{pt.icon}</span>
                  <p className="text-[13px] font-semibold text-[#16130C] mt-1">
                    {pt.label}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-[15px] font-semibold text-[#16130C] mb-3">
              Is this an entire property or individual rooms?
            </h2>
            <div className="flex gap-2">
              <button
                onClick={() => setIsEntireProperty(true)}
                className={`flex-1 p-3 rounded-xl border-2 text-center transition-all ${
                  isEntireProperty
                    ? "border-[#4F46E5] bg-[#4F46E5]/5"
                    : "border-[#E2DDD5] hover:border-[#9C9485]"
                }`}
              >
                <p className="text-[13px] font-semibold text-[#16130C]">
                  Entire property
                </p>
                <p className="text-[11px] text-[#9C9485] mt-0.5">
                  Guests book the whole place
                </p>
              </button>
              <button
                onClick={() => setIsEntireProperty(false)}
                className={`flex-1 p-3 rounded-xl border-2 text-center transition-all ${
                  !isEntireProperty
                    ? "border-[#4F46E5] bg-[#4F46E5]/5"
                    : "border-[#E2DDD5] hover:border-[#9C9485]"
                }`}
              >
                <p className="text-[13px] font-semibold text-[#16130C]">
                  Individual rooms
                </p>
                <p className="text-[11px] text-[#9C9485] mt-0.5">
                  Guests book specific rooms
                </p>
              </button>
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full h-[44px] bg-[#4F46E5] text-white font-bold text-[14px] rounded-xl hover:bg-[#4338CA] transition-colors"
          >
            Continue
          </button>
        </div>
      )}

      {/* Step 2 — Rooms */}
      {step === 2 && (
        <div className="space-y-5">
          {/* Property name */}
          <div>
            <label className="block text-[12px] font-semibold text-[#16130C] mb-1">
              Property name
            </label>
            <input
              type="text"
              value={propertyName}
              onChange={(e) => setPropertyName(e.target.value)}
              className="w-full h-[44px] px-3 rounded-xl border border-[#E2DDD5] text-[14px] text-[#16130C] placeholder:text-[#9C9485] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors"
              placeholder="e.g. Coral Cove Villa"
              autoFocus
            />
          </div>

          {isEntireProperty ? (
            // Entire property — simple form
            <div className="bg-white rounded-xl border border-[#E2DDD5] p-4 space-y-3">
              <p className="text-[13px] font-semibold text-[#16130C]">
                Property details
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold text-[#16130C] mb-1">
                    Max guests
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={rooms[0].max_guests}
                    onChange={(e) =>
                      updateRoom(0, "max_guests", parseInt(e.target.value) || 2)
                    }
                    className="w-full h-[40px] px-3 rounded-lg border border-[#E2DDD5] text-[14px] text-[#16130C] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#16130C] mb-1">
                    Price / night (KSh)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={rooms[0].base_price_kes}
                    onChange={(e) =>
                      updateRoom(0, "base_price_kes", parseFloat(e.target.value) || 0)
                    }
                    className="w-full h-[40px] px-3 rounded-lg border border-[#E2DDD5] text-[14px] text-[#16130C] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          ) : (
            // Individual rooms
            <div className="space-y-3">
              <p className="text-[13px] font-semibold text-[#16130C]">
                Add your rooms
              </p>
              {rooms.map((room, i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-[#E2DDD5] p-3 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <p className="text-[12px] font-bold text-[#9C9485]">
                      Room {i + 1}
                    </p>
                    {rooms.length > 1 && (
                      <button
                        onClick={() => removeRoom(i)}
                        className="text-[11px] text-red-500 hover:text-red-700 font-medium"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-[#9C9485] mb-0.5">
                        Room name
                      </label>
                      <input
                        type="text"
                        value={room.name}
                        onChange={(e) => updateRoom(i, "name", e.target.value)}
                        className="w-full h-[36px] px-2.5 rounded-lg border border-[#E2DDD5] text-[13px] text-[#16130C] placeholder:text-[#9C9485] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors"
                        placeholder="Deluxe Double"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#9C9485] mb-0.5">
                        Room #
                      </label>
                      <input
                        type="text"
                        value={room.room_number}
                        onChange={(e) => updateRoom(i, "room_number", e.target.value)}
                        className="w-full h-[36px] px-2.5 rounded-lg border border-[#E2DDD5] text-[13px] text-[#16130C] placeholder:text-[#9C9485] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors"
                        placeholder="101"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#9C9485] mb-0.5">
                        Max guests
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={room.max_guests}
                        onChange={(e) =>
                          updateRoom(i, "max_guests", parseInt(e.target.value) || 2)
                        }
                        className="w-full h-[36px] px-2.5 rounded-lg border border-[#E2DDD5] text-[13px] text-[#16130C] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-[#9C9485] mb-0.5">
                        KSh / night
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={room.base_price_kes}
                        onChange={(e) =>
                          updateRoom(i, "base_price_kes", parseFloat(e.target.value) || 0)
                        }
                        className="w-full h-[36px] px-2.5 rounded-lg border border-[#E2DDD5] text-[13px] text-[#16130C] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {rooms.length < 50 && (
                <button
                  onClick={addRoom}
                  className="w-full h-[40px] border-2 border-dashed border-[#E2DDD5] rounded-xl text-[13px] font-semibold text-[#9C9485] hover:border-[#4F46E5] hover:text-[#4F46E5] transition-colors"
                >
                  + Add another room
                </button>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setStep(1)}
              className="h-[44px] px-5 border border-[#E2DDD5] text-[14px] font-semibold text-[#5E5848] rounded-xl hover:bg-[#F4F1EC] transition-colors"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 h-[44px] bg-[#4F46E5] text-white font-bold text-[14px] rounded-xl hover:bg-[#4338CA] transition-colors"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 3 — Settings */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-[#16130C] mb-1">
                Check-in time
              </label>
              <input
                type="time"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                className="w-full h-[44px] px-3 rounded-xl border border-[#E2DDD5] text-[14px] text-[#16130C] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#16130C] mb-1">
                Check-out time
              </label>
              <input
                type="time"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                className="w-full h-[44px] px-3 rounded-xl border border-[#E2DDD5] text-[14px] text-[#16130C] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#16130C] mb-1">
              Minimum stay (nights)
            </label>
            <input
              type="number"
              min={1}
              max={30}
              value={minStay}
              onChange={(e) => setMinStay(parseInt(e.target.value) || 1)}
              className="w-full h-[44px] px-3 rounded-xl border border-[#E2DDD5] text-[14px] text-[#16130C] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#16130C] mb-1">
              Address
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full h-[44px] px-3 rounded-xl border border-[#E2DDD5] text-[14px] text-[#16130C] placeholder:text-[#9C9485] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors"
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#16130C] mb-1">
              City
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full h-[44px] px-3 rounded-xl border border-[#E2DDD5] text-[14px] text-[#16130C] placeholder:text-[#9C9485] focus:border-[#4F46E5] focus:ring-1 focus:ring-[#4F46E5] outline-none transition-colors"
              placeholder="e.g. Watamu"
            />
          </div>

          {error && (
            <p className="text-[13px] text-red-600 font-medium">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => setStep(2)}
              className="h-[44px] px-5 border border-[#E2DDD5] text-[14px] font-semibold text-[#5E5848] rounded-xl hover:bg-[#F4F1EC] transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleFinish}
              disabled={saving}
              className="flex-1 h-[44px] bg-[#4F46E5] text-white font-bold text-[14px] rounded-xl hover:bg-[#4338CA] transition-colors disabled:opacity-50"
            >
              {saving ? "Setting up..." : "Finish setup"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
