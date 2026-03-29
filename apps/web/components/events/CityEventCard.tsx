import Image from "next/image";
import Link from "next/link";

interface CityEventCardProps {
  city: string;
  citySlug: string;
  count: number;
  imageUrl: string | null;
  gradient: string;
}

const CITY_GRADIENTS: Record<string, string> = {
  watamu: "from-[#0D7377] to-[#1a9ca0]",
  kilifi: "from-[#E8A020] to-[#f5c842]",
  diani: "from-[#6B2D8B] to-[#8B4DAB]",
  nairobi: "from-[#16130C] to-[#3d3830]",
  lamu: "from-[#DC2626] to-[#ef4444]",
};

function CityEventCard({ city, citySlug, count, imageUrl, gradient }: CityEventCardProps) {
  return (
    <Link
      href={`/events?city=${citySlug}`}
      className="group relative flex items-end rounded-[20px] overflow-hidden h-[180px] md:h-[220px]"
    >
      {/* Background: image or gradient */}
      {imageUrl ? (
        <Image
          src={imageUrl + "?w=400&h=300&fit=crop&auto=format&q=80"}
          alt={`Events in ${city}`}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      )}

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

      {/* Content */}
      <div className="relative z-10 p-5 w-full">
        <h3 className="text-[18px] font-bold text-white mb-1">{city}</h3>
        <span className="inline-flex items-center rounded-full bg-white/20 backdrop-blur-sm px-2.5 py-0.5 text-[11px] font-semibold text-white">
          {count} {count === 1 ? "event" : "events"}
        </span>
      </div>
    </Link>
  );
}

export { CityEventCard, CITY_GRADIENTS };
export type { CityEventCardProps };
