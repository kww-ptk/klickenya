import { JsonLd } from "@/components/seo/JsonLd";
import { faqSchema, type FaqItem } from "@/lib/real-estate/schema";

/**
 * Category pages were a heading plus a grid — thin content against
 * BuyRentKenya and Property24, which both run long-form copy on the same
 * queries. Native <details> keeps it crawlable with no client JS.
 */
function PropertyFaq({ items, title = "Frequently asked questions" }: { items: FaqItem[]; title?: string }) {
  if (items.length === 0) return null;

  return (
    <section className="mt-16">
      <JsonLd schema={faqSchema(items)} />
      <h2 className="font-display mb-6 text-[clamp(22px,2.5vw,30px)] font-bold tracking-[-0.02em] text-dark">
        {title}
      </h2>
      <div className="divide-y divide-border overflow-hidden rounded-[24px] border border-border bg-white">
        {items.map((item) => (
          <details key={item.question} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-[15.5px] font-semibold text-text marker:hidden hover:bg-surface">
              {item.question}
              <span
                aria-hidden="true"
                className="shrink-0 text-[20px] font-normal text-text3 transition-transform duration-200 group-open:rotate-45"
              >
                +
              </span>
            </summary>
            <div className="px-6 pb-5 text-[15px] leading-[1.7] text-text2">
              {item.answer}
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}

export { PropertyFaq };
