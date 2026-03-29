import { AddEventButton } from "./AddEventButton";

function OrganizerCTA() {
  return (
    <section className="bg-zinc-950 py-16 md:py-24">
      <div className="max-w-[1280px] mx-auto px-5 md:px-10">
        <div
          className="relative rounded-[32px] overflow-hidden p-10 md:p-16 text-center"
          style={{
            background:
              "radial-gradient(ellipse 90% 80% at 50% 100%, rgba(232,160,32,0.15) 0%, transparent 60%)",
          }}
        >
          <div className="absolute inset-0 rounded-[32px] border border-white/[0.08]" />

          <div className="relative z-10">
            <h2
              className="font-display font-bold text-white tracking-[-0.03em] leading-[1.1] mb-4"
              style={{ fontSize: "clamp(28px, 4vw, 44px)" }}
            >
              Organising an event in{" "}
              <span className="text-amber-500">Kenya</span>?
            </h2>
            <p className="text-white/50 text-[16px] leading-[1.7] max-w-[520px] mx-auto mb-8">
              List it free on Klickenya — reach thousands of visitors, travellers
              and locals looking for things to do.
            </p>
            <AddEventButton label="Add your event" />
          </div>
        </div>
      </div>
    </section>
  );
}

export { OrganizerCTA };
