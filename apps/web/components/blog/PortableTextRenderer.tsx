import Image from "next/image";
import Link from "next/link";
import {
  PortableText,
  type PortableTextComponents,
  type PortableTextBlock,
} from "@portabletext/react";
import { SwooshDivider } from "@/components/shared/SwooshDivider";

const components: PortableTextComponents = {
  block: {
    normal: ({ children }) => (
      <p className="font-[Lora,Georgia,serif] text-[18px] text-text2 leading-[1.85] mb-6">
        {children}
      </p>
    ),
    h2: ({ children }) => (
      <div className="mt-12 mb-6">
        <h2 className="font-display text-[28px] font-bold text-text tracking-[-0.02em] leading-[1.2] mb-1">
          {children}
        </h2>
        <SwooshDivider size="sm" opacity={0.4} />
      </div>
    ),
    h3: ({ children }) => (
      <h3 className="font-display text-[22px] font-bold text-text tracking-[-0.02em] leading-[1.25] mt-10 mb-4">
        {children}
      </h3>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-[3px] border-amber pl-5 my-8 italic">
        <p className="font-[Lora,Georgia,serif] text-[18px] text-text leading-[1.8]">
          {children}
        </p>
      </blockquote>
    ),
  },
  marks: {
    link: ({ children, value }) => {
      const href = value?.href || "#";
      const isExternal = href.startsWith("http");
      return isExternal ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-amber underline underline-offset-2 decoration-amber/40 hover:decoration-amber transition-colors"
        >
          {children}
        </a>
      ) : (
        <Link
          href={href}
          className="text-amber underline underline-offset-2 decoration-amber/40 hover:decoration-amber transition-colors"
        >
          {children}
        </Link>
      );
    },
    strong: ({ children }) => (
      <strong className="font-semibold text-text">{children}</strong>
    ),
    em: ({ children }) => <em className="italic">{children}</em>,
  },
  types: {
    image: ({ value }) => {
      if (!value?.asset) return null;
      return (
        <figure className="my-8">
          <div className="relative aspect-[16/10] rounded-[var(--radius-xl)] overflow-hidden bg-surface2">
            <Image
              src={value.asset.url || ""}
              alt={value.alt || ""}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 720px"
            />
          </div>
          {value.caption && (
            <figcaption className="mt-3 text-center text-[13px] text-text3">
              {value.caption}
            </figcaption>
          )}
        </figure>
      );
    },
  },
  list: {
    bullet: ({ children }) => (
      <ul className="list-disc pl-6 mb-6 space-y-2 text-[17px] text-text2 font-[Lora,Georgia,serif]">
        {children}
      </ul>
    ),
    number: ({ children }) => (
      <ol className="list-decimal pl-6 mb-6 space-y-2 text-[17px] text-text2 font-[Lora,Georgia,serif]">
        {children}
      </ol>
    ),
  },
};

interface PortableTextRendererProps {
  value: PortableTextBlock[];
}

function PortableTextRenderer({ value }: PortableTextRendererProps) {
  return (
    <div className="max-w-[720px] mx-auto">
      <PortableText value={value} components={components} />
    </div>
  );
}

export { PortableTextRenderer };
