import Link from "next/link";
import { Building2, Calendar, Check, Sparkles, MapPin, Users, Zap } from "lucide-react";
import { Nav } from "@/components/shared/Nav";
import { Footer } from "@/components/shared/Footer";
import { UpgradeButton } from "./UpgradeButton";

export const metadata = {
  title: "Become a Host | Klickenya",
  description: "Join the community putting Kenya on the map. List your villa, restaurant, safari or event — and connect with travellers who are actually looking for you.",
};

export default function BecomeAHostPage() {
  return (
    <>
      <Nav />
      <main className="min-h-screen bg-[#FAFAF8]">
        {/* Hero */}
        <section className="relative bg-[#16130C] pt-[120px] pb-20 px-5 overflow-hidden">
          <div
            className="absolute inset-0 z-0"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 30% 80%, rgba(232,160,32,0.1) 0%, transparent 60%), radial-gradient(ellipse 60% 50% at 70% 20%, rgba(107,45,139,0.08) 0%, transparent 60%)",
            }}
          />
          <div className="relative z-10 max-w-[800px] mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 mb-8">
              <Sparkles className="size-3.5 text-[#E8A020]" />
              <span className="text-[13px] font-semibold text-white/80">Join 200+ hosts across Kenya</span>
            </div>

            <h1
              className="font-display font-bold text-white tracking-[-0.04em] leading-[1.05] mb-6"
              style={{ fontSize: "clamp(34px, 5.5vw, 60px)" }}
            >
              You built something{" "}
              <span className="text-[#E8A020]">amazing</span>.
              <br />
              Let the world find it.
            </h1>
            <p className="text-white/50 text-[17px] leading-[1.7] max-w-[560px] mx-auto mb-10">
              Whether it&apos;s a beachfront villa in Watamu, a yoga class in Kilifi, or a
              street food night in Nairobi — travellers are searching for exactly
              what you offer. Help them find you.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <UpgradeButton label="Start listing for free" redirectTo="/dashboard" />
              <Link
                href="#how"
                className="text-[14px] font-semibold text-white/60 hover:text-white transition-colors"
              >
                How does it work? ↓
              </Link>
            </div>
          </div>
        </section>

        {/* Social proof strip */}
        <section className="bg-white border-b border-[#E2DDD5] py-6 px-5">
          <div className="max-w-[900px] mx-auto flex flex-wrap items-center justify-center gap-x-10 gap-y-3 text-center">
            {[
              { value: "Free", label: "to get started" },
              { value: "24h", label: "review for new hosts" },
              { value: "5 min", label: "to create a listing" },
              { value: "100%", label: "you keep your bookings" },
            ].map((stat) => (
              <div key={stat.label}>
                <p className="text-[20px] font-bold text-[#16130C]">{stat.value}</p>
                <p className="text-[11px] text-[#9C9485] font-medium uppercase tracking-wide">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Two paths */}
        <section id="how" className="max-w-[900px] mx-auto px-5 py-14 md:py-20">
          <div className="text-center mb-12">
            <h2 className="font-display text-[clamp(24px,3.5vw,36px)] font-bold text-[#16130C] tracking-[-0.03em] mb-3">
              Two ways to get started
            </h2>
            <p className="text-[15px] text-[#5E5848] max-w-[480px] mx-auto">
              Pick the path that fits you — both are free, both take minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Path 1 — Business */}
            <div className="rounded-[24px] border border-[#E2DDD5] bg-white p-8 flex flex-col hover:shadow-lg hover:border-[#E8A020]/30 transition-all duration-300">
              <div className="size-12 rounded-xl bg-[#E8A020]/10 flex items-center justify-center mb-5">
                <Building2 className="size-6 text-[#E8A020]" />
              </div>
              <h3 className="text-[20px] font-bold text-[#16130C] mb-2">
                I run a place or service
              </h3>
              <p className="text-[14px] text-[#5E5848] leading-[1.7] mb-6 flex-1">
                Villa, hotel, restaurant, safari company, car rental, private chef — if you serve visitors or locals in Kenya, you belong here.
              </p>
              <ul className="space-y-2.5 mb-6">
                {[
                  "Get discovered by real travellers",
                  "Receive enquiries directly",
                  "Showcase your photos & pricing",
                  "Build reviews & reputation",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[13px] text-[#5E5848]">
                    <Check className="size-4 text-[#16A34A] shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <UpgradeButton label="List my business" redirectTo="/stays" />
            </div>

            {/* Path 2 — Events */}
            <div className="rounded-[24px] border border-[#E2DDD5] bg-white p-8 flex flex-col hover:shadow-lg hover:border-purple-300 transition-all duration-300">
              <div className="size-12 rounded-xl bg-purple-600/10 flex items-center justify-center mb-5">
                <Calendar className="size-6 text-purple-600" />
              </div>
              <h3 className="text-[20px] font-bold text-[#16130C] mb-2">
                I organise events
              </h3>
              <p className="text-[14px] text-[#5E5848] leading-[1.7] mb-6 flex-1">
                Beach parties, yoga retreats, food festivals, networking nights, kids workshops — put it on the map and fill your event.
              </p>
              <ul className="space-y-2.5 mb-6">
                {[
                  "Reach thousands across Kenya",
                  "Track who's joining",
                  "Free to list — always",
                  "Recurring events supported",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[13px] text-[#5E5848]">
                    <Check className="size-4 text-[#16A34A] shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
              <UpgradeButton label="Create an event" redirectTo="/dashboard/events/new" />
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="bg-white py-14 md:py-20 px-5">
          <div className="max-w-[900px] mx-auto">
            <div className="text-center mb-12">
              <h2 className="font-display text-[clamp(24px,3.5vw,36px)] font-bold text-[#16130C] tracking-[-0.03em] mb-3">
                From signup to your first booking
              </h2>
              <p className="text-[15px] text-[#5E5848]">
                No fees, no contracts, no headaches.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: Zap,
                  step: "1",
                  title: "Create your account",
                  description: "Sign up with Google in one click. Takes 10 seconds, no forms to fill.",
                },
                {
                  icon: MapPin,
                  step: "2",
                  title: "Add your listing or event",
                  description: "Upload photos, set your prices, describe what makes you special. We'll review and publish within 24 hours.",
                },
                {
                  icon: Users,
                  step: "3",
                  title: "Start getting customers",
                  description: "Travellers and locals find you through search, browse by location, or discover you on the homepage.",
                },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="size-14 rounded-2xl bg-[#E8A020]/10 flex items-center justify-center mx-auto mb-4">
                    <item.icon className="size-6 text-[#E8A020]" />
                  </div>
                  <div className="inline-flex items-center justify-center size-6 rounded-full bg-[#16130C] text-white text-[11px] font-bold mb-3">
                    {item.step}
                  </div>
                  <h3 className="text-[16px] font-bold text-[#16130C] mb-2">{item.title}</h3>
                  <p className="text-[13px] text-[#5E5848] leading-[1.65]">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Quote / personality section */}
        <section className="bg-[#16130C] py-16 md:py-24 px-5">
          <div className="max-w-[700px] mx-auto text-center">
            <p className="text-[clamp(20px,3vw,28px)] font-display font-bold text-white leading-[1.4] tracking-[-0.02em] mb-6">
              &ldquo;We started Klickenya because Kenya deserves better than a
              TripAdvisor page from 2014. Every beach bar, every sunset yoga
              class, every hidden gem — they all deserve to be found.&rdquo;
            </p>
            <p className="text-[14px] text-white/40">
              The Klickenya team, somewhere between Watamu and a Wi-Fi connection
            </p>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-14 md:py-20 px-5">
          <div className="max-w-[600px] mx-auto text-center">
            <h2 className="font-display text-[clamp(24px,3.5vw,36px)] font-bold text-[#16130C] tracking-[-0.03em] mb-3">
              Ready to put yourself on the map?
            </h2>
            <p className="text-[15px] text-[#5E5848] mb-8">
              It&apos;s free, it takes 5 minutes, and you&apos;ll reach people
              who are actually looking for what you offer.
            </p>
            <UpgradeButton label="Get started — it's free" redirectTo="/dashboard" />
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
