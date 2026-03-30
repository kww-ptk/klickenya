import Link from "next/link";
import { ArrowRight, Building2, Calendar, Check } from "lucide-react";
import { Nav } from "@/components/shared/Nav";
import { Footer } from "@/components/shared/Footer";
import { UpgradeButton } from "./UpgradeButton";

export const metadata = {
  title: "Become a Host | Klickenya",
  description: "List your business or create events on Klickenya — reach thousands of visitors, travellers and locals across Kenya.",
};

export default function BecomeAHostPage() {
  return (
    <>
      <Nav />
      <main className="min-h-screen bg-[#FAFAF8]">
        {/* Hero */}
        <section className="bg-[#16130C] pt-[120px] pb-16 px-5">
          <div className="max-w-[800px] mx-auto text-center">
            <h1
              className="font-display font-bold text-white tracking-[-0.04em] leading-[1.05] mb-5"
              style={{ fontSize: "clamp(32px, 5vw, 56px)" }}
            >
              Share your space with{" "}
              <span className="text-[#E8A020]">Kenya</span>
            </h1>
            <p className="text-white/50 text-[16px] leading-[1.7] max-w-[520px] mx-auto">
              Whether you run a hotel, organise events, or offer experiences — Klickenya helps you reach thousands of visitors, travellers and locals.
            </p>
          </div>
        </section>

        {/* Two paths */}
        <section className="max-w-[900px] mx-auto px-5 py-14 md:py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Path 1 — Business */}
            <div className="rounded-[24px] border border-[#E2DDD5] bg-white p-8 flex flex-col">
              <div className="size-12 rounded-xl bg-[#E8A020]/10 flex items-center justify-center mb-5">
                <Building2 className="size-6 text-[#E8A020]" />
              </div>
              <h2 className="text-[20px] font-bold text-[#16130C] mb-2">
                I own a business
              </h2>
              <p className="text-[14px] text-[#5E5848] leading-[1.7] mb-6 flex-1">
                Hotels, villas, restaurants, safari operators, service providers — claim your listing on Klickenya and manage your presence.
              </p>
              <ul className="space-y-2 mb-6">
                {["Get found by travellers", "Manage enquiries", "Show photos & pricing", "Build your reputation"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-[13px] text-[#5E5848]">
                    <Check className="size-4 text-[#16A34A] shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <UpgradeButton label="Get started" redirectTo="/stays" />
            </div>

            {/* Path 2 — Events */}
            <div className="rounded-[24px] border border-[#E2DDD5] bg-white p-8 flex flex-col">
              <div className="size-12 rounded-xl bg-purple-600/10 flex items-center justify-center mb-5">
                <Calendar className="size-6 text-purple-600" />
              </div>
              <h2 className="text-[20px] font-bold text-[#16130C] mb-2">
                I organise events
              </h2>
              <p className="text-[14px] text-[#5E5848] leading-[1.7] mb-6 flex-1">
                Parties, festivals, fitness classes, workshops — create your event and start getting attendees through Klickenya.
              </p>
              <ul className="space-y-2 mb-6">
                {["Reach thousands of people", "Track RSVPs & attendees", "Free to list", "Instant or reviewed publishing"].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-[13px] text-[#5E5848]">
                    <Check className="size-4 text-[#16A34A] shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              <UpgradeButton label="Create an event" redirectTo="/dashboard/events/new" />
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
