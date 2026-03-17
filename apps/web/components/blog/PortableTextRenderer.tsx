import Image from "next/image";
import Link from "next/link";
import {
  PortableText,
  type PortableTextComponents,
  type PortableTextBlock,
} from "@portabletext/react";
import {
  QuickFactsBlock,
  TipCardBlock,
  DayCardBlock,
  PhotoRowBlock,
  StatRowBlock,
  BudgetTableBlock,
  PackingListBlock,
  PullQuoteBlock,
  InlineListingBlock,
  CompareTableBlock,
  VerdictCardBlock,
  WhoIsItForBlock,
  DestinationSectionBlock,
  DistanceChipsBlock,
  DeciderGridBlock,
} from "./blocks";

function makeComponents(slug?: string): PortableTextComponents {
  return {
    block: {
      normal: ({ children }) => (
        <p className="text-[17px] leading-[1.8] text-[var(--color-text2,#5E5848)] mb-6">
          {children}
        </p>
      ),
      h2: ({ children, value }) => {
        const text =
          (value as { children?: { text?: string }[] })?.children
            ?.map((c) => c.text || "")
            .join("") || "";
        const id = text
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
        return (
        <div id={id} className="mt-12 mb-4 scroll-mt-[88px]">
          <h2 className="font-bold text-[clamp(24px,3vw,32px)] tracking-[-0.03em] text-[var(--color-text,#16130C)] leading-[1.15]">
            {children}
          </h2>
          <svg
            viewBox="0 0 120 8"
            className="mt-2 w-[80px] h-[8px]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2 6C20 2 40 2 60 4C80 6 100 3 118 2"
              stroke="#E8A020"
              strokeWidth="3"
              strokeLinecap="round"
              opacity="0.6"
            />
          </svg>
        </div>
        );
      },
      h3: ({ children }) => (
        <h3 className="font-bold text-[22px] tracking-[-0.02em] text-[var(--color-text,#16130C)] leading-[1.25] mt-9 mb-3">
          {children}
        </h3>
      ),
      h4: ({ children }) => (
        <h4 className="font-bold text-[18px] text-[var(--color-text,#16130C)] leading-[1.3] mt-7 mb-2.5">
          {children}
        </h4>
      ),
      blockquote: ({ children }) => (
        <blockquote className="border-l-[3px] border-[var(--color-purple,#6B2D8B)] pl-6 my-8 italic text-[18px] text-[var(--color-text2,#5E5848)]">
          {children}
        </blockquote>
      ),
    },
    marks: {
      link: ({ children, value }) => {
        const href = value?.href || "#";
        const isExternal = href.startsWith("http");
        const className =
          "text-[var(--color-purple,#6B2D8B)] hover:underline underline-offset-2";
        return isExternal ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={className}
          >
            {children}
          </a>
        ) : (
          <Link href={href} className={className}>
            {children}
          </Link>
        );
      },
      strong: ({ children }) => (
        <strong className="font-semibold text-[var(--color-text,#16130C)]">
          {children}
        </strong>
      ),
      em: ({ children }) => <em className="italic">{children}</em>,
      underline: ({ children }) => <span className="underline">{children}</span>,
      code: ({ children }) => (
        <code className="font-mono text-[0.88em] bg-[var(--color-surface,#F4F1EC)] border border-[var(--color-border,#E2DDD5)] rounded px-1.5 py-0.5">
          {children}
        </code>
      ),
    },
    types: {
      image: ({ value }) => {
        if (!value?.asset) return null;
        return (
          <figure className="my-8">
            <div className="relative aspect-[16/10] rounded-xl overflow-hidden shadow-md">
              <Image
                src={value.asset.url || ""}
                alt={value.alt || ""}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 720px"
              />
            </div>
            {value.caption && (
              <figcaption className="mt-3 text-center text-[13px] text-[var(--color-text3,#9C9485)] italic">
                {value.caption}
              </figcaption>
            )}
          </figure>
        );
      },
      quickFactsBlock: ({ value }) => <QuickFactsBlock value={value} />,
      tipCardBlock: ({ value }) => <TipCardBlock value={value} />,
      dayCardBlock: ({ value }) => <DayCardBlock value={value} />,
      photoRowBlock: ({ value }) => <PhotoRowBlock value={value} />,
      statRowBlock: ({ value }) => <StatRowBlock value={value} />,
      budgetTableBlock: ({ value }) => <BudgetTableBlock value={value} />,
      packingListBlock: ({ value }) => <PackingListBlock value={value} slug={slug} />,
      pullQuoteBlock: ({ value }) => <PullQuoteBlock value={value} />,
      inlineListingBlock: ({ value }) => <InlineListingBlock value={value} />,
      compareTableBlock: ({ value }) => <CompareTableBlock value={value} />,
      verdictCardBlock: ({ value }) => <VerdictCardBlock value={value} />,
      whoIsItForBlock: ({ value }) => <WhoIsItForBlock value={value} />,
      destinationSectionBlock: ({ value }) => <DestinationSectionBlock value={value} />,
      distanceChipsBlock: ({ value }) => <DistanceChipsBlock value={value} />,
      deciderGridBlock: ({ value }) => <DeciderGridBlock value={value} />,
    },
    list: {
      bullet: ({ children }) => (
        <ul className="list-disc pl-6 mb-6 space-y-2 text-[17px] text-[var(--color-text2,#5E5848)]">
          {children}
        </ul>
      ),
      number: ({ children }) => (
        <ol className="list-decimal pl-6 mb-6 space-y-2 text-[17px] text-[var(--color-text2,#5E5848)]">
          {children}
        </ol>
      ),
    },
  };
}

interface PortableTextRendererProps {
  value: PortableTextBlock[];
  className?: string;
  slug?: string;
}

function PortableTextRenderer({ value, className, slug }: PortableTextRendererProps) {
  return (
    <div className={className ?? "max-w-[720px] mx-auto"}>
      <PortableText value={value} components={makeComponents(slug)} />
    </div>
  );
}

export { PortableTextRenderer };
