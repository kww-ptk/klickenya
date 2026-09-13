import type { Metadata } from "next";
import { RiderApp } from "./RiderApp";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Rider",
  robots: { index: false, follow: false },
};

/**
 * /rider — the whole rider app.
 *
 * One route, three states (signed out, no job, a job in hand). A rider is
 * standing next to a bike holding a phone in one hand; anything that needs
 * navigating is anything too much.
 */
export default function RiderPage() {
  return <RiderApp />;
}
