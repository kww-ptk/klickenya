"use client";

const DESTINATIONS = [
  "Nairobi",
  "Diani Beach",
  "Maasai Mara",
  "Lamu Island",
  "Mount Kenya",
  "Lake Nakuru",
  "Watamu",
  "Amboseli",
  "Malindi",
  "Naivasha",
  "Nanyuki",
  "Kilifi",
  "Tsavo",
  "Samburu",
  "Mombasa",
  "Kisumu",
];

function MarqueeTicker() {
  const content = DESTINATIONS.map((name, i) => (
    <span key={i} className="flex items-center gap-6 shrink-0">
      <span className="text-[clamp(14px,1.8vw,18px)] font-semibold text-white/70 whitespace-nowrap tracking-[-0.01em]">
        {name}
      </span>
      <span className="size-[5px] rounded-full bg-amber shrink-0" />
    </span>
  ));

  return (
    <section className="bg-[#1A1714] py-4 overflow-hidden">
      <div className="flex items-center gap-6 animate-marquee w-max">
        {content}
        {content}
      </div>
    </section>
  );
}

export { MarqueeTicker };
