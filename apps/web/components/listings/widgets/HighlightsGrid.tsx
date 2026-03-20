interface Highlight {
  emoji: string;
  title: string;
  description: string;
}

interface HighlightsGridProps {
  highlights: Highlight[];
}

function HighlightsGrid({ highlights }: HighlightsGridProps) {
  if (highlights.length === 0) return null;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-7">
        {highlights.map((h) => (
          <div key={h.title} className="flex gap-3.5">
            <span className="text-[26px] shrink-0 mt-0.5">{h.emoji}</span>
            <div>
              <p className="text-[14.5px] font-semibold text-text">
                {h.title}
              </p>
              <p className="text-[13px] text-text2 leading-[1.5]">
                {h.description}
              </p>
            </div>
          </div>
        ))}
      </div>
      <hr className="border-border mb-7" />
    </>
  );
}

export { HighlightsGrid };
export type { HighlightsGridProps, Highlight };
