"use client";

import { useEffect } from "react";
import { useTrack } from "./useTrack";

interface TrackPageViewProps {
  listingSlug: string;
  listingType: string;
  city?: string | null;
  hostUserId?: string | null;
}

export function TrackPageView({ listingSlug, listingType, city, hostUserId }: TrackPageViewProps) {
  const { track } = useTrack({ listingSlug, listingType, city, hostUserId });

  useEffect(() => {
    track("page_view");
  }, [track]);

  return null;
}
