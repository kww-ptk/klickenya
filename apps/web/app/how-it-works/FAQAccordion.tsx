"use client";

import { useState } from "react";

const FAQ_ITEMS = [
  {
    q: "Is it free to list?",
    a: "Yes, listing is completely free during our launch phase.",
  },
  {
    q: "How do I get enquiries?",
    a: "Directly to your email. No middleman, no commission in V1.",
  },
  {
    q: "What types of listings can I add?",
    a: "Stays, experiences, restaurants, events, rentals, services, and real estate.",
  },
  {
    q: "How quickly will my listing go live?",
    a: "Within 24 hours of submitting your request.",
  },
  {
    q: "Do guests need an account?",
    a: "No. Anyone can enquire without creating an account.",
  },
  {
    q: "What about payments?",
    a: "V1 uses enquiry-based contact. M-Pesa and card payments are coming in V2.",
  },
];

export function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  function toggle(i: number) {
    setOpenIndex((prev) => (prev === i ? null : i));
  }

  return (
    <div className="divide-y divide-zinc-200">
      {FAQ_ITEMS.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <div key={i}>
            <button
              type="button"
              onClick={() => toggle(i)}
              className="w-full flex items-center justify-between py-5 text-left group"
            >
              <span className="text-[15px] font-semibold text-zinc-900 pr-4">
                {item.q}
              </span>
              <span
                className={`shrink-0 size-6 flex items-center justify-center rounded-full border border-zinc-200 text-zinc-400 transition-transform duration-200 ${
                  isOpen ? "rotate-45 bg-amber border-amber text-zinc-950" : ""
                }`}
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M6 1V11M1 6H11"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            </button>
            <div
              className={`overflow-hidden transition-all duration-300 ${
                isOpen ? "max-h-[200px] pb-5" : "max-h-0"
              }`}
            >
              <p className="text-[14px] text-zinc-500 leading-[1.65]">
                {item.a}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
