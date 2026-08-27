import Image from "next/image";
import Link from "next/link";
import { Check, MessageCircle, Phone } from "lucide-react";
import { urlForImage } from "@/lib/sanity/image";
import { agentPath } from "@/lib/real-estate/constants";
import { toWhatsAppNumber } from "@/lib/real-estate/format";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Agent block on the property page. The old version offered a tel: link only,
 * and only when the agent had a phone number, which meant some listings had no
 * contact route at all beside the form. WhatsApp is how property enquiries
 * actually happen in Kenya, so it leads.
 */
function AgentContactCard({
  agent,
  propertyTitle,
  propertyUrl,
}: {
  agent: any;
  propertyTitle: string;
  propertyUrl: string;
}) {
  const slug = agent.slug?.current ?? agent.slug ?? "";
  // Independent agents trade under their own name, so displayName and
  // agencyName are often the same string. Printing both just repeats it.
  const agency =
    agent.agencyName && agent.agencyName !== agent.displayName
      ? agent.agencyName
      : null;
  const whatsapp = toWhatsAppNumber(agent.phone);
  const waMessage = encodeURIComponent(
    `Hi ${agent.displayName ?? "there"}, I saw "${propertyTitle}" on Klickenya and would like to arrange a viewing. ${propertyUrl}`
  );

  return (
    <div>
      <div className="mb-3.5 flex items-center gap-3.5">
        <div className="size-14 shrink-0 overflow-hidden rounded-full border-2 border-white bg-surface2 shadow-sm">
          {agent.photo?.asset ? (
            <Image
              src={urlForImage(agent.photo).width(120).height(120).url()}
              alt={agent.displayName ?? "Agent"}
              width={56}
              height={56}
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-[20px] font-bold text-text3">
              {(agent.displayName ?? "A").charAt(0)}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-[15px] font-bold text-text">
              {agent.displayName}
            </p>
            {agent.isVerified && (
              <span
                title="Verified agent"
                className="flex size-[18px] shrink-0 items-center justify-center rounded-full bg-purple2"
              >
                <Check className="size-[10px] text-white" strokeWidth={3} />
                <span className="sr-only">Verified agent</span>
              </span>
            )}
          </div>
          {agency && (
            <p className="truncate text-[12.5px] text-text3">{agency}</p>
          )}
          {agent.licenceNumber && (
            <p className="truncate text-[11.5px] text-text3">
              Licence {agent.licenceNumber}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {whatsapp && (
          <a
            href={`https://wa.me/${whatsapp}?text=${waMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-12 items-center justify-center gap-2 rounded-[16px] bg-[#25D366] text-[14.5px] font-bold text-white transition-transform hover:-translate-y-0.5"
          >
            <MessageCircle className="size-4" />
            WhatsApp the agent
          </a>
        )}

        {agent.phone && (
          <a
            href={`tel:${agent.phone.replace(/\s/g, "")}`}
            className="flex h-12 items-center justify-center gap-2 rounded-[16px] border-[1.5px] border-border bg-white text-[14.5px] font-bold text-text transition-colors hover:border-text3"
          >
            <Phone className="size-4" />
            {agent.phone}
          </a>
        )}
      </div>

      {slug && (
        <Link
          href={agentPath(slug)}
          className="mt-3 block text-center text-[13px] font-semibold text-purple2 hover:underline"
        >
          View all properties by this agent &rarr;
        </Link>
      )}
    </div>
  );
}

export { AgentContactCard };
