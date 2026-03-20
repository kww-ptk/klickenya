"use client";

import { useState, useEffect } from "react";

/**
 * Client-side countdown component for non-recurring events.
 * Currently shows a placeholder since events don't have a date field yet.
 * When a date field is added to the Sanity schema, pass it as a prop
 * and this component will render a live countdown.
 */
function EventCountdown() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Placeholder until events get a proper date field
  return (
    <div>
      <p className="text-[16px] font-semibold text-purple-700 mb-1">
        Date to be announced
      </p>
      <p className="text-[13px] text-text2">
        Check the description below or contact the organiser for exact dates
      </p>
    </div>
  );
}

export { EventCountdown };
