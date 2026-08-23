import type { FaqItem } from "./schema";
import { CATEGORY_LABELS, type PropertyCategory } from "./constants";

/**
 * On-page copy for the category and city landing pages.
 *
 * These pages were a heading and a grid, which is thin against the incumbents
 * ranking for the same queries. Every string here is written to answer the
 * query directly in the first sentence so an AI answer engine can lift it.
 *
 * House style (see docs/how-to-add-a-blog-post.md): no dashes in prose.
 */

interface CategoryCopy {
  /** Short lead paragraph under the H1. */
  intro: (place: string) => string;
  /** Longer body shown below the results. */
  body: (place: string) => string[];
  faqs: (place: string) => FaqItem[];
}

const CATEGORY_COPY: Record<PropertyCategory, CategoryCopy> = {
  "for-sale": {
    intro: (place) =>
      `Browse houses, apartments and villas for sale in ${place}. Every listing shows the asking price in Kenyan shillings, the size in square metres and the agent handling the sale, so you can compare properties without chasing anyone for basic numbers.`,
    body: (place) => [
      `Buying property in ${place} usually starts with a shortlist and a budget. Use the price filter to set your ceiling, then narrow by bedrooms and by the features that actually change how a home lives, things like a borehole, backup generator, secure parking or a gated compound.`,
      `Prices on Klickenya are asking prices set by the seller or their agent. Kenyan sellers generally expect some negotiation, and properties that have been listed a while often move furthest. Where a seller has dropped their price we show the previous figure and the percentage reduction on the card, so you can see which listings have room in them.`,
      `Once you find something you like, send an enquiry through the listing page. It reaches the listing agent directly along with your phone number, so viewings can be arranged over a call or WhatsApp the same day.`,
    ],
    faqs: (place) => [
      {
        question: `How much does it cost to buy a house in ${place}?`,
        answer: `It depends heavily on the neighbourhood and the size of the property. Use the price filter on this page to see the live range across current listings in ${place}, and open a neighbourhood page to see the average price per square metre for that specific area.`,
      },
      {
        question: "What fees should a buyer budget for in Kenya?",
        answer:
          "On top of the purchase price, budget for legal fees of roughly 1 to 2 percent of the value, stamp duty of 4 percent in urban areas or 2 percent in rural areas, plus land search and registration costs. Your advocate handles the search and the transfer.",
      },
      {
        question: "Can a foreigner buy property in Kenya?",
        answer:
          "Yes. Foreigners can buy property in Kenya on a leasehold basis for up to 99 years. Freehold agricultural land is restricted to Kenyan citizens, so most foreign buyers purchase apartments, houses on leasehold title, or buy through a Kenyan registered company.",
      },
      {
        question: "Is it free to enquire about a property on Klickenya?",
        answer:
          "Yes. Enquiries are free and go straight to the listing agent or owner. Klickenya does not charge buyers a commission or a viewing fee.",
      },
    ],
  },
  "for-rent": {
    intro: (place) =>
      `Find apartments, houses and furnished homes to rent in ${place}. Rent on every listing is shown per month in Kenyan shillings, alongside the bedroom count, the size and the features included.`,
    body: (place) => [
      `Rental hunting in ${place} moves quickly, so filter to your budget first and then sort by newest to see what has just come onto the market. The bedroom and bathroom filters help when you are sharing, and the feature chips let you insist on the things that matter, such as parking, a lift, backup power or 24 hour security.`,
      `Kenyan landlords typically ask for one month of rent as a deposit plus the first month up front, though some ask for two. Service charge is sometimes quoted separately from rent, so confirm what is included before you commit. Ask the agent directly through the enquiry form and you will have it in writing.`,
      `If nothing here fits, save the properties you like and set a wider price range. New rentals are added every week.`,
    ],
    faqs: (place) => [
      {
        question: `How much is rent in ${place}?`,
        answer: `Rent varies by neighbourhood and by how new the building is. The price filter on this page shows the live range across current rentals in ${place}, and each listing states the monthly figure in Kenyan shillings.`,
      },
      {
        question: "What deposit do landlords ask for in Kenya?",
        answer:
          "Most landlords ask for one month of rent as a refundable deposit plus the first month in advance. Some serviced or furnished apartments ask for two months. Confirm the exact terms with the agent before signing.",
      },
      {
        question: "Is service charge included in the rent?",
        answer:
          "Not always. In many Kenyan apartment blocks service charge covers security, water, common area lighting and rubbish collection, and it may be quoted on top of the rent. Ask the agent to confirm the total monthly cost.",
      },
      {
        question: "Are the rentals on Klickenya furnished?",
        answer:
          "Both furnished and unfurnished rentals are listed. The listing description states which, and you can ask the agent directly through the enquiry form on any listing page.",
      },
    ],
  },
  land: {
    intro: (place) =>
      `Browse plots and land for sale in ${place}. Each listing shows the asking price, the size in acres or square metres and the area, so you can compare plots on the numbers that matter.`,
    body: (place) => [
      `Land in ${place} is priced by size and by access. A plot on a tarmac road with power and water at the boundary carries a premium over one that needs a murram access road cut to it, so read the description carefully and ask the agent what services reach the plot.`,
      `Before any land purchase in Kenya, instruct an advocate to run an official search at the lands registry. That confirms who holds the title, whether the parcel carries a caveat or a charge, and whether the title is freehold or leasehold. Ask for the title number early and verify it independently.`,
      `Where a listing includes coordinates we show the plot on a map on the listing page, which makes it far easier to judge the location before you drive out for a site visit.`,
    ],
    faqs: (place) => [
      {
        question: `How much is an acre of land in ${place}?`,
        answer: `Prices per acre depend on the exact location, road access and available services. The listings on this page show live asking prices for plots in ${place}, and each card states the size so you can work out the rate per acre.`,
      },
      {
        question: "How do I verify land ownership in Kenya?",
        answer:
          "Ask the seller for the title number, then have your advocate conduct an official search at the relevant lands registry. The search confirms the registered owner, the tenure and any encumbrance on the parcel. Never pay a deposit before the search comes back clean.",
      },
      {
        question: "What is the difference between freehold and leasehold land?",
        answer:
          "Freehold title is held indefinitely. Leasehold title is granted for a fixed term, commonly 99 years, after which it must be renewed. Most urban land in Kenya is leasehold and most rural agricultural land is freehold.",
      },
      {
        question: "What does stamp duty cost on land in Kenya?",
        answer:
          "Stamp duty is 4 percent of the value for land within a municipality and 2 percent for land outside one. Your advocate calculates it against the government valuation, not necessarily the price you paid.",
      },
    ],
  },
  commercial: {
    intro: (place) =>
      `Commercial property in ${place}, including offices, shops, warehouses and mixed use space. Each listing shows the asking price or monthly rent, the floor area and the agent handling it.`,
    body: (place) => [
      `Commercial space in ${place} is usually compared on cost per square metre, so use the size filter alongside the price range to find units that work for your operation. Parking, backup power and lift access are the features that most often decide whether a space is viable, and you can filter on all three.`,
      `Commercial leases in Kenya are typically longer than residential ones, often three to six years with a rent review clause. Fit out costs and who carries them are usually negotiable, especially on a longer term. Raise it in your first conversation with the agent.`,
      `Send an enquiry through any listing to reach the agent directly and arrange a viewing.`,
    ],
    faqs: (place) => [
      {
        question: `What does commercial space cost in ${place}?`,
        answer: `Commercial rents and sale prices are usually quoted per square metre and vary sharply by location and building grade. The listings on this page show live prices for commercial property in ${place}.`,
      },
      {
        question: "How long is a typical commercial lease in Kenya?",
        answer:
          "Most commercial leases in Kenya run three to six years, with a rent review at agreed intervals. Shorter terms are possible on smaller retail units. The lease terms are set by the landlord and are usually open to negotiation.",
      },
      {
        question: "Is VAT charged on commercial rent in Kenya?",
        answer:
          "Yes. Commercial rent in Kenya attracts VAT at 16 percent where the landlord is VAT registered, unlike residential rent which is exempt. Confirm with the agent whether quoted figures include VAT.",
      },
      {
        question: "Can I view a commercial property before committing?",
        answer:
          "Yes. Send an enquiry through the listing page and the agent will arrange a viewing. Enquiries on Klickenya are free.",
      },
    ],
  },
};

export function categoryIntro(category: PropertyCategory, place: string): string {
  return CATEGORY_COPY[category].intro(place);
}

export function categoryBody(category: PropertyCategory, place: string): string[] {
  return CATEGORY_COPY[category].body(place);
}

export function categoryFaqs(category: PropertyCategory, place: string): FaqItem[] {
  return CATEGORY_COPY[category].faqs(place);
}

/**
 * Lowercase noun phrase for mid-sentence use, e.g. "No properties for sale in
 * Nairobi yet". Lowercasing the H1 instead would produce "in kenya".
 */
export function categoryPhrase(category: PropertyCategory, place?: string): string {
  const base =
    category === "land"
      ? "land for sale"
      : category === "commercial"
        ? "commercial property"
        : category === "for-rent"
          ? "properties to rent"
          : "properties for sale";
  return `${base} in ${place ?? "Kenya"}`;
}

/** H1 copy: "Property For Sale in Nairobi" reads better than "Properties For Sale". */
export function categoryHeading(category: PropertyCategory, place?: string): string {
  const base =
    category === "land"
      ? "Land for sale"
      : category === "commercial"
        ? "Commercial property"
        : `Property ${CATEGORY_LABELS[category].toLowerCase()}`;
  return place ? `${base} in ${place}` : `${base} in Kenya`;
}
