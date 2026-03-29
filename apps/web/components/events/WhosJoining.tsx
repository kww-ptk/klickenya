"use client";

import { useState } from "react";
import { JoinEventModal } from "./JoinEventModal";

interface Attendee {
  name: string;
}

interface WhosJoiningProps {
  eventSanityId: string;
  eventTitle: string;
  initialCount: number;
  attendees: Attendee[];
}

export function WhosJoining({
  eventSanityId,
  eventTitle,
  initialCount,
  attendees,
}: WhosJoiningProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [count, setCount] = useState(initialCount);
  const [attendeeList, setAttendeeList] = useState<Attendee[]>(attendees);

  function getInitials(name: string) {
    return name
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  const GRADIENT_COLORS = [
    "from-purple-400 to-amber-300",
    "from-emerald-400 to-teal-300",
    "from-pink-400 to-rose-300",
    "from-blue-400 to-indigo-300",
    "from-amber-400 to-orange-300",
  ];

  return (
    <>
      <div className="rounded-[24px] border border-border bg-white p-5">
        <p className="text-[12px] font-semibold text-text3 uppercase tracking-wide mb-4">
          Who&apos;s joining
        </p>

        {/* Attendee avatars */}
        <div className="flex -space-x-2 mb-3">
          {attendeeList.length > 0 ? (
            <>
              {attendeeList.slice(0, 5).map((a, i) => (
                <div
                  key={i}
                  className={`size-9 rounded-full border-2 border-white bg-gradient-to-br ${GRADIENT_COLORS[i % GRADIENT_COLORS.length]} flex items-center justify-center`}
                >
                  <span className="text-[10px] font-bold text-white">
                    {getInitials(a.name)}
                  </span>
                </div>
              ))}
              {count > 5 && (
                <div className="size-9 rounded-full border-2 border-white bg-surface flex items-center justify-center">
                  <span className="text-[10px] font-bold text-text3">+{count - 5}</span>
                </div>
              )}
            </>
          ) : (
            <>
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`size-9 rounded-full border-2 border-white bg-gradient-to-br ${GRADIENT_COLORS[i]} opacity-40`}
                />
              ))}
              <div className="size-9 rounded-full border-2 border-white bg-surface flex items-center justify-center">
                <span className="text-[10px] font-bold text-text3">+</span>
              </div>
            </>
          )}
        </div>

        {/* Count / CTA text */}
        <p className="text-[13px] text-text2 mb-4">
          {count > 0
            ? `${count} ${count === 1 ? "person" : "people"} going`
            : "Be the first to join — show others you're going!"}
        </p>

        <button
          onClick={() => setModalOpen(true)}
          className="w-full py-2.5 rounded-xl bg-purple-600 text-white font-semibold text-[14px] hover:bg-purple-700 transition-colors"
        >
          I want to join
        </button>
      </div>

      <JoinEventModal
        eventSanityId={eventSanityId}
        eventTitle={eventTitle}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={(newCount, joinerName) => {
          setCount(newCount);
          if (joinerName) {
            setAttendeeList((prev) => [{ name: joinerName }, ...prev]);
          }
        }}
      />
    </>
  );
}
