"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
/** The console is a live operation; a server render is a photograph. Re-render every 30 s while the tab is visible. */
export function AutoRefresh({ seconds = 30 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => { if (!document.hidden) router.refresh(); };
    const id = setInterval(tick, seconds * 1000);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(id); document.removeEventListener("visibilitychange", tick); };
  }, [router, seconds]);
  return null;
}
