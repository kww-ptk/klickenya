import type { FaqItem } from "./schema";
import type { PropertyCategory } from "./constants";

/**
 * Place-specific content for the town hub pages.
 *
 * Everything in lib/real-estate/content.ts is a template: categoryIntro("land",
 * "Watamu") returns the same paragraph as categoryIntro("land", "Nairobi") with
 * one word swapped. That is fine as a floor for the long tail of towns, and it
 * is exactly the pattern Google's scaled-content systems discount when a page
 * has to compete for a head term.
 *
 * A place in this registry gets copy that only that place could have: its own
 * sub-areas, its own tenure quirks, its own pricing currency, its own buying
 * process. A place not in this registry falls back to the template and nothing
 * breaks.
 *
 * House style (see docs/how-to-add-a-blog-post.md): no dashes in prose.
 *
 * ADDING A PLACE
 *   1. Add an entry here keyed by its citySlug() form.
 *   2. The town hub at /real-estate/<slug> starts rendering immediately.
 *   3. Nothing else needs changing: the route, the sitemap and the copy
 *      overrides all read from PLACES.
 *   The slug becomes a reserved word under /real-estate, so it must never
 *   collide with a property slug. See RESERVED_PLACE_SLUGS in constants.ts.
 */

export interface PlaceSection {
  heading: string;
  paragraphs: string[];
}

export interface PlaceSubArea {
  name: string;
  blurb: string;
}

export interface PlaceGuide {
  label: string;
  href: string;
  blurb: string;
}

export interface PlaceQuickFact {
  label: string;
  value: string;
}

/** Per-category copy that replaces the generic template on this place's pages. */
export interface PlaceCategoryCopy {
  intro?: string;
  body?: string[];
  faqs?: FaqItem[];
}

export interface PlaceContent {
  /** citySlug() form. Must match the `city` value on properties, lowercased. */
  slug: string;
  /** Display name, exactly as `city` is spelled on the Sanity documents. */
  name: string;
  county: string;
  /** Used in the Place schema and in copy, e.g. "the Kenyan coast". */
  region: string;
  lat: number;
  lng: number;

  metaTitle: string;
  metaDescription: string;

  /** Short line under the H1. */
  tagline: string;
  /** Lead paragraph. Answers the query in the first sentence for AI answers. */
  intro: string;

  quickFacts: PlaceQuickFact[];
  sections: PlaceSection[];
  subAreas: PlaceSubArea[];
  faqs: FaqItem[];

  /**
   * The `location` enum value on blogPost, e.g. "watamu". Every published post
   * carrying it is offered as a guide on this hub, so a new Watamu article
   * appears here without anyone touching this file.
   */
  blogLocation: string;
  /**
   * Explicit opt in keyword, e.g. "realestate-watamu". Add it to a post's
   * keywords in the Studio and the post leads the guides list on this hub,
   * whatever its location field says.
   */
  guideTag: string;
  /**
   * Hand curated links that are not journal posts, e.g. the destination page.
   * Journal posts are fetched, not listed here.
   */
  guides: PlaceGuide[];

  /** Overrides for /real-estate/[category]/[this place]. */
  categoryCopy: Partial<Record<PropertyCategory, PlaceCategoryCopy>>;

  /**
   * Nearby towns, as the `city` value is spelled on the property documents.
   * The hub resolves each to a hub URL, a category/city URL or nothing at all,
   * depending on what actually has stock. Never store an href here: a link to
   * an empty /[category]/[city] is a 404.
   */
  nearby: string[];
}

/* ── Watamu ────────────────────────────────────────── */

const WATAMU: PlaceContent = {
  slug: "watamu",
  name: "Watamu",
  county: "Kilifi County",
  region: "the Kenyan coast",
  lat: -3.3554,
  lng: 40.0219,

  // The root layout appends " | Klickenya", so this has to leave room for it.
  metaTitle: "Real Estate in Watamu: Houses, Villas and Plots",
  metaDescription:
    "Property for sale and rent in Watamu, Kilifi County. Beachfront villas, houses, apartments and plots of land, with asking prices in the currency the seller quotes and free enquiries straight to the agent.",

  tagline: "Beachfront villas, creek plots and holiday rentals on Kenya's north coast",

  intro:
    "Watamu property comes in three broad shapes: beachfront and beach access villas around Turtle Bay and Jacaranda, houses and apartments in the residential belt behind the beach road, and plots of land running inland towards Mida Creek and Gede. Prices here are quoted in euro as often as in shillings, because much of the stock was built for European buyers, and every listing on this page shows the currency the seller actually asked for.",

  quickFacts: [
    { label: "County", value: "Kilifi" },
    { label: "Nearest airport", value: "Malindi, about 30 minutes" },
    { label: "Mombasa", value: "About 2 hours by road" },
    { label: "Common currencies", value: "Euro and Kenyan shillings" },
  ],

  sections: [
    {
      heading: "What property in Watamu actually costs",
      paragraphs: [
        "There is no single Watamu price, because the town is really several markets sitting next to each other. A plot inland towards Gede or Timboni, a three bedroom house in the residential streets behind the beach road, and a villa with direct beach access are three different products with three different buyer pools, and they do not move together.",
        "The clearest way to read the market is per square metre for built property and per acre for land, and then to adjust for how close the parcel sits to the water. Distance from the beach is the single biggest lever on price in Watamu, ahead of size, ahead of finish, and ahead of age. The listings on this page show the live asking range, and the market panel above is computed from what is currently published rather than from an industry average.",
        "Asking prices in Watamu are negotiable, and often meaningfully so. A good deal of coastal stock has been on the market for a long time, particularly larger villas, and sellers who have been waiting are usually the ones who move. Where a seller has already reduced their price we show the previous figure and the percentage cut on the card.",
      ],
    },
    {
      heading: "Beachfront, beach access and the setback rule",
      paragraphs: [
        "Beachfront is the word that does the most work in a Watamu listing and the one worth checking hardest. In Kenya the land between the high and low water mark is public, and a strip of the foreshore above the high water mark is reserved as public beach, commonly cited as sixty metres under the Survey Act. What that means in practice is that no private title runs all the way to the sea, and a plot advertised as beachfront is a plot that sits behind that reserve.",
        "This is not a problem, it is simply how coastal title works here, and it is why the distinction between beachfront and beach access matters. Ask the agent for the deed plan, and have a licensed surveyor confirm where the parcel boundary actually sits relative to the high water mark before you commit to anything. A surveyor's visit costs a fraction of what a boundary dispute does.",
        "The same care applies around Mida Creek. The mangrove fringe is protected, Watamu sits inside a marine park and biosphere reserve, and development close to the creek edge attracts conditions that development a kilometre inland does not. If a plot backs onto the creek, ask what has already been approved.",
      ],
    },
    {
      heading: "Buying as a foreigner, and why prices are in euro",
      paragraphs: [
        "Foreign buyers can hold Kenyan property on leasehold title for up to ninety nine years. Freehold agricultural land is reserved for Kenyan citizens, which is why most foreign purchases in Watamu are either built property on leasehold title or a purchase made through a Kenyan registered company. Your advocate will tell you which route fits your situation, and it is worth asking before you fall in love with a parcel.",
        "Watamu has had a large Italian and wider European community for decades, and a good share of the villa stock was built by and for those buyers. That is the reason so many asking prices are quoted in euro. It is a genuine asking currency, not a conversion, so a villa listed at four hundred and eighty five thousand euro is asking for euro. Klickenya shows each listing in the currency the seller quoted rather than converting everything into shillings, because a converted headline figure at a hand maintained rate is a number nobody actually agreed to.",
        "If the parcel is classified as agricultural, and a fair amount of land around Gede and inland Watamu is, the transaction also needs consent from the Land Control Board before it can be registered. Build that step into your timeline. It is routine, but it is not instant.",
      ],
    },
    {
      heading: "Water, power and the things that decide whether a plot works",
      paragraphs: [
        "Mains water reaches parts of Watamu and is unreliable in others, so most established properties run a borehole, a large storage tank, or both. On an undeveloped plot the first question to ask is not what the view is like, it is whether there is water on the parcel or a realistic prospect of drilling for it, and what the water quality is when you do. Salinity rises as you get closer to the sea.",
        "Grid power comes from Kenya Power and outages are a normal part of coastal life, which is why solar with battery storage is common on newer builds and a generator is common on older ones. Ask what is already installed. It changes the real cost of a property more than most buyers expect.",
        "Access is the third one. A plot on the tarmac carries a clear premium over a plot reached by a murram road that softens in the long rains, and a right of way across somebody else's land is worth confirming in writing rather than on a site visit. The Malindi to Mombasa highway is the spine everything else hangs off.",
      ],
    },
    {
      heading: "Renting out a Watamu property",
      paragraphs: [
        "A large part of the Watamu market is bought with holiday letting in mind, and the seasonality is pronounced. December through March is the high season, July through September is strong, and the long rains from April into June are quiet enough that many smaller places simply close. Any yield figure quoted to you should be checked against how many weeks it assumes are actually let.",
        "Long term rentals do exist here, mostly serving people working in tourism, conservation and the schools, and they are a steadier if lower return than holiday letting. The two strategies suit different properties, and a villa that performs beautifully as a weekly let can sit empty on a twelve month lease.",
        "If you already own here, Klickenya lists both. A holiday property can run as a stay listing with a calendar and direct bookings, and a long term home can run as a rental listing. Both reach the same audience arriving on these pages.",
      ],
    },
  ],

  subAreas: [
    {
      name: "Turtle Bay",
      blurb:
        "The central stretch of Watamu beach, closest to the hotels, restaurants and dive centres. Mostly villas and apartments with beach access, and the busiest part of town in high season.",
    },
    {
      name: "Jacaranda",
      blurb:
        "North along the bay, quieter than the centre, with larger plots and a run of established villas set back behind the dune line.",
    },
    {
      name: "Watamu Beach",
      blurb:
        "The residential streets running back from the beach road. Houses and apartments at a wide range of prices, walkable to the sand without paying beachfront money.",
    },
    {
      name: "Mida Creek",
      blurb:
        "Inland on the tidal creek, mangroves and birdlife rather than surf. Larger parcels, lower prices per acre, and stricter conditions on anything built near the water.",
    },
    {
      name: "Gede",
      blurb:
        "Around the Gede ruins and the highway junction, a few kilometres inland. Where most of the affordable land and local housing sits.",
    },
    {
      name: "Timboni",
      blurb:
        "The village side of Watamu, inland and residential, with the lowest entry prices in the area and mostly local title.",
    },
  ],

  blogLocation: "watamu",
  guideTag: "realestate-watamu",

  guides: [
    {
      label: "Watamu destination guide",
      href: "/destinations/watamu",
      blurb: "Places to stay, eat and dive, and everything listed in town.",
    },
  ],

  faqs: [
    {
      question: "How much does a house cost in Watamu?",
      answer:
        "It depends almost entirely on how close the property sits to the beach. Villas with beach access around Turtle Bay and Jacaranda are the top of the market and are often quoted in euro, houses in the residential streets behind the beach road sit well below that, and property inland towards Gede and Timboni is lower again. The listings on this page show the live asking range across everything currently published in Watamu.",
    },
    {
      question: "How much is a plot of land in Watamu?",
      answer:
        "Land in Watamu is priced by distance from the sea first and size second. An inland plot near Gede or Timboni is a different market from a parcel with beach access, and the gap between them is large. Filter this page to land to see the current asking prices, and check the stated size in acres so you can work out the rate per acre yourself.",
    },
    {
      question: "Can a foreigner buy property in Watamu?",
      answer:
        "Yes. Foreigners can hold Kenyan property on leasehold title for up to ninety nine years. Freehold agricultural land is restricted to Kenyan citizens, so foreign buyers in Watamu typically purchase built property on leasehold title or buy through a Kenyan registered company. Ask your advocate which structure fits before committing to a parcel.",
    },
    {
      question: "Why are Watamu properties priced in euro?",
      answer:
        "Watamu has a long established Italian and European community, and much of the villa stock was built for that market, so euro is a genuine asking currency here rather than a conversion. Klickenya shows every property in the currency the seller quoted. A listing marked in euro is asking for euro.",
    },
    {
      question: "What does beachfront mean on a Watamu listing?",
      answer:
        "No private title in Kenya runs to the water. The land between the high and low water mark is public, and a strip of foreshore above it is reserved as public beach, commonly cited as sixty metres under the Survey Act. A beachfront plot is one sitting behind that reserve with direct access to it. Ask the agent for the deed plan and have a licensed surveyor confirm the boundary before you buy.",
    },
    {
      question: "Do I need Land Control Board consent to buy in Watamu?",
      answer:
        "You do if the parcel is classified as agricultural land, which applies to a fair amount of the land around Gede and inland Watamu. The consent is a routine step but it takes time, so build it into your timeline. Your advocate handles the application alongside the official search at the lands registry.",
    },
    {
      question: "Is there mains water and power in Watamu?",
      answer:
        "Mains water reaches parts of Watamu and is unreliable elsewhere, so most established properties run a borehole and storage tanks. Grid power comes from Kenya Power and outages are normal, so solar with battery storage or a generator is common. On an undeveloped plot, confirm what water is available before anything else.",
    },
    {
      question: "Is it free to enquire about a property in Watamu?",
      answer:
        "Yes. Enquiries on Klickenya are free and go straight to the listing agent or owner with your phone number, so a viewing can be arranged by call or WhatsApp the same day. Klickenya does not charge buyers a commission or a viewing fee.",
    },
  ],

  categoryCopy: {
    "for-sale": {
      intro:
        "Houses, villas and apartments for sale in Watamu, from beach access properties around Turtle Bay and Jacaranda to family homes in the residential streets inland. Every listing shows the asking price in the currency the seller quoted, which on this stretch of coast is as often euro as shillings.",
      body: [
        "Distance from the beach is the biggest single lever on price in Watamu, ahead of size and ahead of finish. Use the price filter to set your ceiling, then narrow by bedrooms and by the features that decide how a coastal house actually lives, which here means a borehole, water storage, solar or a generator, and secure parking behind a gate.",
        "Much of the villa stock in Watamu was built by and for European buyers, which is why euro asking prices are normal rather than unusual. Klickenya never converts a price for display, so what you see is what the seller asked for. Foreign buyers should note that Kenyan property is held on leasehold title of up to ninety nine years, and should ask an advocate early about whether to buy personally or through a Kenyan registered company.",
        "Coastal property often sits on the market for a long time, so there is usually room to negotiate, particularly on larger villas. Send an enquiry through any listing to reach the agent directly and arrange a viewing.",
      ],
    },
    land: {
      intro:
        "Plots and land for sale in Watamu, from inland parcels around Gede and Timboni to land with beach access on the bay. Each listing shows the asking price and its currency and the size in acres, so you can compare plots on the rate per acre rather than on the headline figure.",
      body: [
        "Land in Watamu is priced by distance from the sea first and by size second. A parcel inland towards Gede is a different market from one with beach access, and the gap between the two is wide. Read the description for what services reach the boundary, because a plot with water, power and tarmac access is a very different proposition from one that needs all three brought to it.",
        "Before committing to any plot here, instruct an advocate to run an official search at the lands registry and confirm the registered owner, the tenure and any caveat or charge on the parcel. If the land is classified as agricultural, and much of the land inland from Watamu is, the transfer also needs consent from the Land Control Board. Ask for the title number early and verify it independently rather than taking a copy at face value.",
        "For anything advertised as beachfront, have a licensed surveyor confirm where the boundary sits relative to the high water mark. No private title in Kenya runs to the water, and the foreshore reserve above the high water mark, commonly cited as sixty metres under the Survey Act, is public beach. Near Mida Creek, ask what has already been approved before assuming what can be built.",
      ],
    },
    "for-rent": {
      intro:
        "Houses, apartments and villas to rent in Watamu, both long term homes and furnished properties let by the month. Rent on every listing is shown per month alongside the bedroom count and what is included.",
      body: [
        "Watamu's rental market runs on two clocks. Long term lets serve people working in tourism, conservation and the schools and are steady year round, while furnished coastal properties are shaped by the season, with December through March and July through September the busy stretches and the long rains from April into June much quieter. Which one a landlord is aiming at changes both the rent and the terms.",
        "Confirm what the rent actually covers before you commit. On the coast that means asking specifically about water, because a property on a borehole with its own tanks is in a different position from one waiting on mains supply, and about power, because a house with solar and battery storage rides out an outage that leaves the rest of the street dark.",
        "Most landlords ask for one month of rent as a refundable deposit plus the first month up front. Ask the agent through the enquiry form so you have the terms in writing.",
      ],
    },
    commercial: {
      intro:
        "Commercial property in Watamu, including shops, restaurant and hospitality premises, offices and mixed use space. Each listing shows the asking price or monthly rent, the floor area and the agent handling it.",
      body: [
        "Commercial space in Watamu is overwhelmingly tourism facing, which makes seasonality the first thing to model. A restaurant or dive shop earning through the December to March and July to September peaks has to carry itself through the long rains, and any figures a landlord or outgoing operator quotes should be read against a full twelve months rather than a good quarter.",
        "Position matters more than floor area here. Frontage on the beach road or proximity to the hotels and the marine park entrance drives footfall in a way that a larger unit set back from either will not replace. Ask what the licensing position is for the use you have in mind, particularly for anything food, diving or boat related inside a marine park and biosphere reserve.",
        "Commercial leases in Kenya typically run three to six years with a rent review clause, and fit out costs are usually negotiable on a longer term. Send an enquiry through any listing to reach the agent directly.",
      ],
    },
  },

  nearby: ["Malindi", "Kilifi", "Mombasa", "Diani", "Kilifi Creek", "Vipingo"],
};

/* ── Diani ─────────────────────────────────────────── */

const DIANI: PlaceContent = {
  slug: "diani",
  name: "Diani",
  county: "Kwale County",
  region: "the Kenyan south coast",
  lat: -4.2967,
  lng: 39.5772,

  metaTitle: "Real Estate in Diani: Beach Villas, Apartments and Plots",
  metaDescription:
    "Property for sale and rent in Diani Beach, Kwale County. Beach villas, apartments in gated developments and plots inland, with asking prices in the currency the seller quotes and free enquiries to the agent.",

  tagline: "Kenya's best known beach, and the busiest holiday let market on the coast",

  intro:
    "Diani property splits between the beach road strip, where villas and gated apartment developments trade largely on holiday letting income, and the land behind it running inland towards Ukunda and south towards Galu and Kinondo, where plots are considerably cheaper. Almost everything here is bought with letting in mind, so the numbers that matter are occupancy and season as much as asking price.",

  quickFacts: [
    { label: "County", value: "Kwale" },
    { label: "Nearest airport", value: "Ukunda, in Diani itself" },
    { label: "Mombasa", value: "About an hour via the bypass" },
    { label: "Common currencies", value: "Kenyan shillings, euro and dollars" },
  ],

  sections: [
    {
      heading: "What property in Diani actually costs",
      paragraphs: [
        "Diani is priced off the beach road. A villa or apartment within walking distance of the sand sits in one market, a plot a couple of kilometres inland towards Ukunda sits in a completely different one, and the difference between them is larger than most first time buyers expect. Use the price filter to set your ceiling before anything else, then read the location on each card carefully.",
        "Because so much Diani stock is bought to let, sale prices here track letting potential rather than floor area alone. A three bedroom villa with a pool, staff quarters and a management arrangement already in place carries a premium over the same house without any of that, and the premium is usually justified if the letting history is real. Ask for it in writing rather than as a projection.",
        "Prices are quoted in shillings, euro and dollars depending on who built the property and who it was built for. Klickenya shows each listing in the currency the seller actually asked for rather than converting anything, so compare like with like before you decide something looks cheap.",
      ],
    },
    {
      heading: "Getting here changed, and it changed the market",
      paragraphs: [
        "For decades Diani was defined by the Likoni ferry, which meant an unpredictable queue between the property and Mombasa. The Dongo Kundu bypass now routes traffic around the creek instead, and the drive from Mombasa is both shorter and far more predictable than it used to be. That has pulled Diani closer to Mombasa for anyone thinking about weekday commuting or weekend use.",
        "Ukunda airstrip sits inside Diani itself with scheduled flights from Nairobi, which is the other reason the holiday let market here is deeper than anywhere else on the coast. A guest can be on the beach a couple of hours after leaving Nairobi, and that shows up directly in occupancy.",
        "For a plot, ask specifically how it is reached. The beach road is tarmac and so are the main feeder roads, but plenty of parcels behind them are served by murram that softens in the long rains, and a right of way across a neighbouring parcel is worth confirming on the title rather than on a walk around.",
      ],
    },
    {
      heading: "Beach access, the foreshore reserve and Kwale County",
      paragraphs: [
        "No private title in Kenya runs to the water. The land between the high and low water mark is public, and a strip of foreshore above it is reserved as public beach, commonly cited as sixty metres under the Survey Act. A Diani plot advertised as beachfront is one sitting behind that reserve with access across it, which is normal and fine, but it is worth having a licensed surveyor confirm where the boundary actually falls.",
        "Development approvals in Diani come through Kwale County, and what you can build, how high and how close to the beach is not the same everywhere along the strip. If a plot is being sold on the strength of a particular development plan, ask to see what has actually been approved rather than what is being proposed.",
        "Where the parcel is classified as agricultural, and a good deal of the land inland from the beach road is, the transfer needs consent from the Land Control Board before it can be registered. Your advocate handles that alongside the official search.",
      ],
    },
    {
      heading: "Buying to let in Diani",
      paragraphs: [
        "Diani has the deepest holiday letting market on the Kenyan coast, and the season is less brutal than further north because domestic weekend demand from Nairobi and Mombasa fills part of the gap. December through March is still the peak and July through September is strong, but a well positioned Diani property is not dark for three months the way a purely international market would be.",
        "Management is the variable that decides whether the numbers work. A property with an established manager, a cleaning team and a booking presence performs very differently from an identical house bought cold, and the cost of that management belongs in the yield calculation from the start rather than as an afterthought.",
        "If you already own here, Klickenya lists holiday properties as stays with a live calendar and direct bookings, and long term homes as rentals. Both surface to the same audience landing on these pages.",
      ],
    },
    {
      heading: "Water, power and gated developments",
      paragraphs: [
        "Most established Diani properties run a borehole with storage tanks rather than relying on mains supply, and water quality varies with how close you are to the sea. On an undeveloped plot this is the first question, ahead of the view and ahead of the price per acre.",
        "Grid power comes from Kenya Power and outages are routine, so solar with battery storage on newer builds and a generator on older ones are both common. Ask what is installed and how old it is, because replacing a tired battery bank is a real cost.",
        "A large share of Diani apartment stock sits inside gated developments with a service charge covering security, grounds, pool and sometimes water and power backup. Ask what the current monthly figure is and what it has done over the last three years, not just what it is today.",
      ],
    },
  ],

  subAreas: [
    {
      name: "Diani Beach Road",
      blurb:
        "The central strip, closest to the hotels, restaurants and dive centres. Villas and gated apartment developments, the highest prices in the area and the strongest letting demand.",
    },
    {
      name: "Galu Beach",
      blurb:
        "South of the centre, quieter and less built up, with larger plots and a run of private villas. Popular with buyers who want the beach without the strip.",
    },
    {
      name: "Ukunda",
      blurb:
        "The inland town beside the airstrip. Where most of the affordable land, local housing and commercial property sits, a few minutes from the beach road.",
    },
    {
      name: "Tiwi",
      blurb:
        "North towards Mombasa, less developed than Diani proper and noticeably cheaper. Beach plots here still exist at prices Diani stopped seeing years ago.",
    },
    {
      name: "Kinondo",
      blurb:
        "South past Galu towards the Kinondo sacred forest. Larger parcels, a quieter setting and lower prices per acre than the beach road.",
    },
    {
      name: "Msambweni",
      blurb:
        "Further south again, genuinely rural and priced accordingly. Land buyers looking for acreage rather than a beach house start here.",
    },
  ],

  blogLocation: "diani",
  guideTag: "realestate-diani",

  guides: [
    {
      label: "Diani destination guide",
      href: "/destinations/diani",
      blurb: "Where to stay, eat and dive along the south coast strip.",
    },
  ],

  faqs: [
    {
      question: "How much does a house cost in Diani?",
      answer:
        "It depends on how close it sits to the beach road and whether it comes with a letting history. Villas within walking distance of the sand are the top of the market, apartments in gated developments sit below that, and property inland towards Ukunda is lower again. The listings on this page show the live asking range across everything currently published in Diani.",
    },
    {
      question: "How much is a plot of land in Diani?",
      answer:
        "Land in Diani is priced by distance from the beach first and by access second. A plot on the beach road is a different market from one inland towards Ukunda or south towards Kinondo. Filter this page to land to see current asking prices, and check the stated size so you can work out the rate per acre yourself.",
    },
    {
      question: "Is Diani a good place to buy a holiday let?",
      answer:
        "Diani has the deepest holiday letting market on the Kenyan coast, helped by Ukunda airstrip sitting inside the town and by domestic weekend demand from Nairobi and Mombasa. That makes the season less severe than further north. The variable that decides whether the numbers work is management, so ask for a real letting history rather than a projection.",
    },
    {
      question: "How long does it take to get to Diani from Mombasa?",
      answer:
        "About an hour using the Dongo Kundu bypass, which routes around the creek instead of using the Likoni ferry. That change made the drive both shorter and far more predictable than it used to be. There are also scheduled flights from Nairobi into Ukunda airstrip in Diani itself.",
    },
    {
      question: "Can a foreigner buy property in Diani?",
      answer:
        "Yes. Foreigners can hold Kenyan property on leasehold title for up to ninety nine years. Freehold agricultural land is restricted to Kenyan citizens, so foreign buyers here typically purchase built property on leasehold title or buy through a Kenyan registered company. Ask your advocate which structure fits before committing.",
    },
    {
      question: "What is the service charge on a Diani apartment?",
      answer:
        "It varies by development and usually covers security, grounds, the pool and sometimes water and backup power. Ask the agent for the current monthly figure and for what it has been over the last three years, because the trend matters more than today's number.",
    },
    {
      question: "Is it free to enquire about a property in Diani?",
      answer:
        "Yes. Enquiries on Klickenya are free and go straight to the listing agent or owner with your phone number, so a viewing can be arranged by call or WhatsApp the same day. Klickenya does not charge buyers a commission or a viewing fee.",
    },
  ],

  categoryCopy: {
    "for-sale": {
      intro:
        "Houses, villas and apartments for sale in Diani, from beach road properties with letting histories to family homes inland towards Ukunda. Every listing shows the asking price in the currency the seller quoted, which in Diani may be shillings, euro or dollars.",
      body: [
        "Diani prices track distance from the beach road and, for anything bought to let, the letting income behind it. Use the price filter to set your ceiling, then narrow by bedrooms and by the features that decide how a coastal house works in practice, which here means a borehole and storage tanks, solar or a generator, a pool, and secure parking behind a gate.",
        "A large share of the apartment stock sits inside gated developments with a monthly service charge covering security, grounds and the pool. Ask what the current figure is and what it has done over the last three years, because that number is part of the real cost of ownership and it rarely goes down.",
        "Foreign buyers should note that Kenyan property is held on leasehold title of up to ninety nine years, and should ask an advocate early whether to buy personally or through a Kenyan registered company. Send an enquiry through any listing to reach the agent directly.",
      ],
    },
    land: {
      intro:
        "Plots and land for sale in Diani, from beach road parcels to land inland around Ukunda and south towards Kinondo and Msambweni. Each listing shows the asking price and its currency and the size, so you can compare on the rate per acre.",
      body: [
        "Land in Diani is priced by distance from the beach first and access second. Read the description for what reaches the boundary, because a plot with water, power and tarmac access is a very different proposition from one that needs all three brought to it, and the cost of bringing them can exceed the difference in asking price.",
        "Before committing, instruct an advocate to run an official search at the lands registry and confirm the registered owner, the tenure and any caveat or charge. If the parcel is classified as agricultural, and much of the land behind the beach road is, the transfer also needs consent from the Land Control Board. Ask for the title number early and verify it independently.",
        "For anything advertised as beachfront, have a licensed surveyor confirm the boundary relative to the high water mark, and check what Kwale County has actually approved for the plot rather than what is being proposed for it.",
      ],
    },
    "for-rent": {
      intro:
        "Houses, apartments and villas to rent in Diani, both long term homes and furnished properties let by the month. Rent on every listing is shown per month alongside the bedroom count and what is included.",
      body: [
        "Diani rentals serve two quite different tenants. Long term lets house people working in tourism, diving, conservation and the schools and run year round, while furnished properties follow the season and are priced against what they could earn as a holiday let. Which one a landlord has in mind changes both the rent and the length of term on offer.",
        "Confirm what the rent covers before you commit. On the south coast that means asking about water, since a property on a borehole with its own tanks is in a different position from one waiting on mains supply, about power and what backup exists, and about service charge if the property sits inside a gated development.",
        "Most landlords ask for one month of rent as a refundable deposit plus the first month up front. Ask the agent through the enquiry form so the terms are in writing.",
      ],
    },
    commercial: {
      intro:
        "Commercial property in Diani, including shops, restaurant and hospitality premises, dive and watersports units, offices and mixed use space. Each listing shows the asking price or monthly rent, the floor area and the agent handling it.",
      body: [
        "Commercial space in Diani is tourism facing, so seasonality is the first thing to model. Read any figures an outgoing operator gives you against a full twelve months rather than a strong quarter, and remember that Diani's domestic weekend trade from Nairobi and Mombasa softens the low season here more than it does further north.",
        "Position on or near the beach road drives footfall in a way a larger unit set back from it will not replace. Ask what the licensing position is for the use you have in mind, particularly for anything food, diving or boat related, and confirm what Kwale County has approved for the premises.",
        "Commercial leases in Kenya typically run three to six years with a rent review clause, and fit out costs are usually negotiable on a longer term. Send an enquiry through any listing to reach the agent directly.",
      ],
    },
  },

  nearby: ["Mombasa", "Ukunda", "Tiwi", "Msambweni", "Kilifi", "Watamu"],
};

/* ── Kilifi ────────────────────────────────────────── */

const KILIFI: PlaceContent = {
  slug: "kilifi",
  name: "Kilifi",
  county: "Kilifi County",
  region: "the Kenyan coast",
  lat: -3.6305,
  lng: 39.8499,

  metaTitle: "Real Estate in Kilifi: Creek Plots, Houses and Land",
  metaDescription:
    "Property for sale and rent in Kilifi, Kilifi County. Creek and ocean plots, houses at Bofa and Mnarani, and land towards Vipingo and Takaungu, with free enquiries straight to the listing agent.",

  tagline: "Creek frontage, larger plots and the coast's best value per acre",

  intro:
    "Kilifi property is organised around the creek. Bofa sits on the north side towards the ocean beaches, Mnarani sits on the south side looking back across the water, and the land running inland and along the highway towards Vipingo and Takaungu is where the bigger parcels are. Kilifi is consistently cheaper per acre than Watamu or Diani, which is most of why buyers end up here.",

  quickFacts: [
    { label: "County", value: "Kilifi" },
    { label: "Nearest airport", value: "Malindi or Mombasa, about an hour" },
    { label: "Mombasa", value: "About an hour by road" },
    { label: "Common currencies", value: "Kenyan shillings, some euro" },
  ],

  sections: [
    {
      heading: "Creek frontage and ocean frontage are not the same market",
      paragraphs: [
        "The first thing to get straight about Kilifi is which water a plot faces. Kilifi Creek is a deep tidal inlet running inland from the ocean, spanned by the bridge on the Mombasa to Malindi highway, and creek frontage means calm water, moorings and a view rather than surf and sand. Ocean frontage, mainly out at Bofa and north towards Mtondia, is a different product at a different price.",
        "Both are genuinely desirable and buyers tend to have a firm preference, so read each listing for which one it actually is. A description saying waterfront without saying which water is a description worth a follow up question before you drive out.",
        "The mangrove fringe along the creek is protected and building close to the water attracts conditions that building further back does not. If a plot runs down to the creek edge, ask what has already been approved rather than assuming what can be built.",
      ],
    },
    {
      heading: "Why land here is cheaper, and what that buys",
      paragraphs: [
        "Kilifi is consistently better value per acre than Watamu or Diani, and the reason is straightforward: it has less tourism infrastructure and a smaller holiday letting market, so land is not being bid up by buyers modelling nightly rates. What that buys is size. Parcels that would be unaffordable further north or south are routinely available here.",
        "That balance is shifting. Vipingo Ridge to the south has established a large gated golf estate, the highway is good, and Kilifi has developed a reputation as a place people move to rather than visit. Buyers looking at Kilifi as a long hold rather than a letting business are the ones who tend to be comfortable here.",
        "Prices are mostly quoted in shillings, with some euro pricing on the properties aimed at European buyers. Klickenya shows each listing in the currency the seller quoted rather than converting anything.",
      ],
    },
    {
      heading: "Title, searches and the Land Control Board",
      paragraphs: [
        "Coastal title needs care and Kilifi is no exception. Ask the seller for the title number early, then have your advocate run an official search at the lands registry to confirm the registered owner, the tenure and any caveat or charge sitting on the parcel. Never pay a deposit before the search comes back clean, however good the story around the plot is.",
        "A large share of land around Kilifi is classified as agricultural, which means the transfer needs consent from the Land Control Board before it can be registered. This is routine but it is not instant, and it belongs in your timeline from the start rather than as a surprise at the end.",
        "Foreign buyers can hold Kenyan property on leasehold title for up to ninety nine years. Freehold agricultural land is reserved for Kenyan citizens, so foreign purchases here are usually built property on leasehold title or a purchase through a Kenyan registered company.",
      ],
    },
    {
      heading: "Water, power and access on a Kilifi plot",
      paragraphs: [
        "Most property in Kilifi runs on a borehole with storage tanks. On an undeveloped parcel the first question is whether there is water on it or a realistic prospect of drilling, and what the quality is when you do, because salinity rises the closer you get to the creek and the sea.",
        "Grid power comes from Kenya Power and outages are normal, so solar with battery storage is common on newer builds. Ask what is installed and how far the nearest connection actually is, since bringing power to a remote parcel is a real cost that rarely appears in the asking price.",
        "Access is the third one. The Mombasa to Malindi highway is the spine, and a plot near it is a different proposition from one at the end of several kilometres of murram that softens in the long rains. Confirm any right of way across a neighbouring parcel on the title rather than on a site visit.",
      ],
    },
  ],

  subAreas: [
    {
      name: "Bofa",
      blurb:
        "North side of the creek towards the ocean, with Kilifi's main beach. Houses and plots with ocean access, and the most established residential area in town.",
    },
    {
      name: "Mnarani",
      blurb:
        "South side of the creek, looking back across the water towards town. Creek frontage, moorings and a run of established houses on larger plots.",
    },
    {
      name: "Kilifi Town",
      blurb:
        "The commercial centre either side of the bridge. Local housing, shops and offices, and the lowest entry prices in the area.",
    },
    {
      name: "Mtondia",
      blurb:
        "North of Bofa along the coast, less developed and priced accordingly. Where land buyers looking for acreage near the ocean tend to start.",
    },
    {
      name: "Vipingo",
      blurb:
        "South towards Mombasa, anchored by the Vipingo Ridge golf estate. Gated development stock alongside larger parcels off the highway.",
    },
    {
      name: "Takaungu",
      blurb:
        "An old Swahili settlement south of Kilifi on its own creek. Quiet, historic and genuinely rural, with larger parcels and low prices per acre.",
    },
  ],

  blogLocation: "kilifi",
  guideTag: "realestate-kilifi",

  guides: [
    {
      label: "Kilifi destination guide",
      href: "/destinations/kilifi",
      blurb: "The creek, the beaches and what there is to do in town.",
    },
  ],

  faqs: [
    {
      question: "How much is an acre of land in Kilifi?",
      answer:
        "Kilifi is consistently cheaper per acre than Watamu or Diani, which is why land buyers look here. What you pay depends on whether the parcel has creek frontage, ocean frontage or neither, and on how far it sits from the Mombasa to Malindi highway. Filter this page to land to see current asking prices and check the stated size to work out the rate per acre.",
    },
    {
      question: "What is the difference between creek frontage and ocean frontage in Kilifi?",
      answer:
        "Kilifi Creek is a deep tidal inlet running inland from the ocean. Creek frontage means calm water, moorings and a view across to the other side. Ocean frontage, mainly at Bofa and north towards Mtondia, means surf and sand. They are different products at different prices, so check which one a listing actually offers.",
    },
    {
      question: "How much does a house cost in Kilifi?",
      answer:
        "It depends on the area and on which water it faces. Bofa and Mnarani hold the established residential stock and price accordingly, while property in Kilifi town and inland is lower. The listings on this page show the live asking range across everything currently published in Kilifi.",
    },
    {
      question: "Do I need Land Control Board consent to buy land in Kilifi?",
      answer:
        "You do if the parcel is classified as agricultural, which covers a large share of the land around Kilifi. The consent is routine but it takes time, so build it into your timeline. Your advocate applies for it alongside the official search at the lands registry.",
    },
    {
      question: "Can a foreigner buy property in Kilifi?",
      answer:
        "Yes. Foreigners can hold Kenyan property on leasehold title for up to ninety nine years. Freehold agricultural land is restricted to Kenyan citizens, so foreign buyers here usually purchase built property on leasehold title or buy through a Kenyan registered company. Ask your advocate which route fits before committing to a parcel.",
    },
    {
      question: "Is there mains water in Kilifi?",
      answer:
        "Most property in Kilifi runs on a borehole with storage tanks rather than relying on mains supply. On an undeveloped plot, confirm there is water or a realistic prospect of drilling before anything else, and check the quality, because salinity rises closer to the creek and the sea.",
    },
    {
      question: "Is it free to enquire about a property in Kilifi?",
      answer:
        "Yes. Enquiries on Klickenya are free and go straight to the listing agent or owner with your phone number, so a viewing can be arranged by call or WhatsApp the same day. Klickenya does not charge buyers a commission or a viewing fee.",
    },
  ],

  categoryCopy: {
    land: {
      intro:
        "Plots and land for sale in Kilifi, from creek and ocean frontage at Mnarani and Bofa to larger parcels inland and along the highway towards Vipingo and Takaungu. Each listing shows the asking price, its currency and the size, so you can compare on the rate per acre.",
      body: [
        "Kilifi is where coastal land buyers come for size. It is consistently cheaper per acre than Watamu or Diani because there is less tourism infrastructure bidding prices up, which means parcels that would be out of reach further along the coast are routinely available here. What you pay within Kilifi depends on which water the plot faces, if any, and how far it sits from the Mombasa to Malindi highway.",
        "Before committing to any plot, instruct an advocate to run an official search at the lands registry and confirm the registered owner, the tenure and any caveat or charge. Much of the land around Kilifi is classified as agricultural, so the transfer will also need consent from the Land Control Board. Ask for the title number early and verify it independently rather than accepting a copy.",
        "Check what actually reaches the boundary. Water usually means drilling a borehole, and salinity rises closer to the creek and the sea. Power may be some distance away, and bringing it in is a real cost that rarely shows up in the asking price. Confirm any right of way across a neighbouring parcel on the title.",
      ],
    },
    "for-sale": {
      intro:
        "Houses and apartments for sale in Kilifi, from established homes at Bofa and Mnarani to property in town and out towards Vipingo. Every listing shows the asking price in the currency the seller quoted.",
      body: [
        "Kilifi divides around the creek. Bofa on the north side reaches the ocean beaches, Mnarani on the south side offers creek frontage and moorings, and town either side of the bridge holds the most affordable stock. Which side a property sits on shapes both the price and how the house is used day to day, so read the location on each card rather than the town name alone.",
        "Most Kilifi property runs on a borehole with storage tanks and, increasingly, solar with battery storage against Kenya Power outages. Filter on the features that reflect that, and ask the agent how old the installed kit is, because replacing a tired battery bank or a failing pump is a real cost.",
        "Kilifi tends to attract buyers holding for the long term rather than running a letting business, which shows up in how the market moves. Prices are negotiable, particularly on properties that have been listed a while. Send an enquiry through any listing to reach the agent directly.",
      ],
    },
  },

  nearby: ["Mombasa", "Watamu", "Malindi", "Vipingo", "Takaungu", "Mtwapa"],
};

/* ── Nairobi ───────────────────────────────────────── */

const NAIROBI: PlaceContent = {
  slug: "nairobi",
  name: "Nairobi",
  county: "Nairobi County",
  region: "central Kenya",
  lat: -1.2864,
  lng: 36.8172,

  metaTitle: "Real Estate in Nairobi: Apartments, Houses and Land",
  metaDescription:
    "Property for sale and rent in Nairobi. Apartments in Kilimani and Westlands, houses in Karen, Lavington and Runda, land and commercial space, with transparent asking prices and free enquiries.",

  tagline: "Apartments, gated townhouses and the deepest rental market in the country",

  intro:
    "Nairobi property is a neighbourhood market before it is a city one. An apartment in Kilimani, a townhouse in Lavington and a house on an acre in Karen are three different products with three different buyer pools, and the gap between them is wider than the map suggests. Prices here are quoted in shillings, and the two numbers that decide what a property really costs are the asking price and the monthly service charge.",

  quickFacts: [
    { label: "County", value: "Nairobi" },
    { label: "Airports", value: "JKIA and Wilson" },
    { label: "Typical tenure", value: "Leasehold, often sectional title" },
    { label: "Currency", value: "Kenyan shillings" },
  ],

  sections: [
    {
      heading: "Service charge is the number that decides the deal",
      paragraphs: [
        "In Nairobi the asking price is only half of what a property costs you. Almost every apartment and most gated townhouse schemes carry a monthly service charge covering security, water, common area lighting, rubbish, lifts, the borehole and often a generator. It is charged per unit and it is not small, and two apartments at the same price can differ substantially once you carry the service charge over a few years.",
        "Ask three questions before you commit. What is the current monthly service charge, what has it been for the last three years, and is the management company or the residents association actually collecting it from everyone. A scheme with a large arrears problem is a scheme where the working services eventually stop working.",
        "For rentals the same applies. Service charge is sometimes quoted separately from rent, so confirm the total monthly cost in writing through the enquiry form rather than assuming the headline figure is what leaves your account.",
      ],
    },
    {
      heading: "Sectional title, share certificates and what you are actually buying",
      paragraphs: [
        "Apartments in Nairobi are sold under two very different arrangements. Sectional title gives you a registered title to your specific unit under the Sectional Properties Act, which is the cleaner position and the one banks prefer. The older arrangement is a share in a management company holding the head title, with a share certificate and a long lease, which works but is harder to finance and harder to sell.",
        "Ask which one a unit is on before anything else, and if the answer is that conversion to sectional title is in progress, ask how far along it actually is. This single question separates a straightforward purchase from a long one.",
        "For houses, most urban land in Nairobi is leasehold from the government, commonly ninety nine years, and what matters is how many years are left on the lease and whether the land rent and county land rates are paid up. Your advocate confirms all of this in the official search.",
      ],
    },
    {
      heading: "Reading Nairobi's neighbourhoods",
      paragraphs: [
        "Kilimani, Kileleshwa and parts of Westlands have seen the heaviest apartment construction of the last decade, which means choice and negotiating room for buyers and renters, and it means paying attention to what is going up next door. Lavington, Kitisuru, Muthaiga and Runda hold the lower density housing stock, and Karen sits apart again with the largest plots in the city.",
        "The satellite belt, Syokimau, Athi River, Ruaka, Kikuyu and Ngong, is where most of the new build volume and the land activity is, and where the price per square metre drops sharply. What you trade is commuting time, and the honest way to assess that is to drive the route at the hour you would actually be driving it.",
        "Every listing on this page states its neighbourhood, and the market panel above is computed from the properties currently published rather than from an industry average.",
      ],
    },
    {
      heading: "Buying in Nairobi: costs, searches and timelines",
      paragraphs: [
        "Budget beyond the purchase price. Legal fees run roughly one to two percent of the value, stamp duty is four percent within a municipality, which covers Nairobi, and there are land search and registration costs on top. Your advocate handles the search and the transfer, and instructing one before you pay any deposit is the single most useful thing you can do.",
        "The official search at the lands registry confirms the registered owner, the tenure and any caveat or charge on the property. For an apartment, also ask for the management company accounts and the current service charge schedule, because that is where the real condition of a scheme shows up.",
        "For a new build or off plan purchase, ask what stage the project is actually at, who the developer is, and what has been completed by the same team before. Off plan works well in Nairobi and it also produces the longest delays, and the difference between the two is almost always the developer's track record.",
      ],
    },
    {
      heading: "Renting in Nairobi",
      paragraphs: [
        "Nairobi has the deepest rental market in the country and it moves quickly, so filter to your budget first and sort by newest to see what has just come on. The bedroom and bathroom filters do the heavy lifting when you are sharing, and the feature chips let you insist on parking, a lift, backup power, a borehole or twenty four hour security.",
        "Most landlords ask for one month of rent as a refundable deposit plus the first month up front, though two months is not unusual on furnished or serviced apartments. Water and service charge may or may not be included, so ask for the total monthly cost rather than the rent alone.",
        "Backup power and water are worth more in Nairobi than most listing descriptions suggest. A building with a working generator and a borehole behaves very differently during an outage or a supply interruption from one relying entirely on the grid and the mains.",
      ],
    },
  ],

  subAreas: [
    {
      name: "Kilimani",
      blurb:
        "The densest apartment market in the city, close to the centre and to Yaya. Heavy recent construction means choice and negotiating room, and worth checking what is being built next door.",
    },
    {
      name: "Westlands",
      blurb:
        "Commercial and residential mixed together, with the strongest office market in the city alongside apartment blocks. Good access, high service charges.",
    },
    {
      name: "Lavington",
      blurb:
        "Lower density than Kilimani, with townhouses and older houses on larger plots alongside newer apartment schemes. Popular with families.",
    },
    {
      name: "Kileleshwa",
      blurb:
        "Green, central and heavily redeveloped from houses into apartments over the last decade. Sits between Kilimani and Lavington in price and density.",
    },
    {
      name: "Karen",
      blurb:
        "The largest plots in the city, houses on half an acre and up, and a distinctly suburban feel. A different market from anywhere else in Nairobi.",
    },
    {
      name: "Runda",
      blurb:
        "Gated, low density and quiet, north of the centre near the UN complex. Large houses on generous plots, with a strong diplomatic and expatriate presence.",
    },
    {
      name: "Kitisuru",
      blurb:
        "Low density housing on large plots northwest of the centre, bordering the Karura area. Quieter and greener than the central suburbs.",
    },
    {
      name: "Parklands",
      blurb:
        "Established, central and well served, with a mix of older apartment blocks and newer schemes. Close to Westlands and to the city centre.",
    },
  ],

  blogLocation: "nairobi",
  guideTag: "realestate-nairobi",

  guides: [
    {
      label: "Nairobi destination guide",
      href: "/destinations/nairobi",
      blurb: "Neighbourhoods, food and what there is to do in the city.",
    },
  ],

  faqs: [
    {
      question: "How much does an apartment cost in Nairobi?",
      answer:
        "It varies sharply by neighbourhood and by how new the building is. Kilimani, Kileleshwa and Westlands hold most of the apartment stock and the widest price range, while the satellite belt around Syokimau, Athi River and Ruaka is considerably cheaper per square metre. Use the price filter on this page to see the live range across current listings in Nairobi.",
    },
    {
      question: "What is service charge and how much is it in Nairobi?",
      answer:
        "Service charge is a monthly fee covering security, water, common area lighting, rubbish, lifts, the borehole and often a generator. It is charged per unit and it is a significant part of what a Nairobi apartment actually costs. Ask for the current figure, what it has been over the last three years, and whether the scheme is collecting it from everyone.",
    },
    {
      question: "What is the difference between sectional title and a share certificate?",
      answer:
        "Sectional title gives you a registered title to your specific unit under the Sectional Properties Act, which is cleaner and preferred by banks. The older arrangement is a share in a management company that holds the head title, with a share certificate and a long lease, which is harder to finance and harder to resell. Ask which applies before you commit.",
    },
    {
      question: "How much rent should I expect to pay in Nairobi?",
      answer:
        "Rent depends on neighbourhood, building age and what is included. The price filter on this page shows the live range across current rentals, and each listing states the monthly figure. Ask the agent whether water and service charge are on top, because the headline rent is often not the total monthly cost.",
    },
    {
      question: "What fees should a buyer budget for in Nairobi?",
      answer:
        "On top of the purchase price, budget for legal fees of roughly one to two percent of the value, stamp duty of four percent since Nairobi is within a municipality, plus land search and registration costs. Your advocate handles the official search and the transfer.",
    },
    {
      question: "Can a foreigner buy property in Nairobi?",
      answer:
        "Yes. Foreigners can hold Kenyan property on leasehold title for up to ninety nine years, which covers most urban land in Nairobi anyway. Freehold agricultural land is restricted to Kenyan citizens. Most foreign buyers here purchase apartments or houses on leasehold title, or buy through a Kenyan registered company.",
    },
    {
      question: "Is buying off plan in Nairobi a good idea?",
      answer:
        "It can be, and it also produces the longest delays. The difference is almost always the developer's track record, so ask what stage the project is actually at, who is building it, and what the same team has completed before. Get the answers in writing and have your advocate review the sale agreement before you pay anything.",
    },
    {
      question: "Is it free to enquire about a property in Nairobi?",
      answer:
        "Yes. Enquiries on Klickenya are free and go straight to the listing agent or owner with your phone number, so a viewing can be arranged by call or WhatsApp the same day. Klickenya does not charge buyers a commission or a viewing fee.",
    },
  ],

  categoryCopy: {
    "for-sale": {
      intro:
        "Apartments, townhouses and houses for sale in Nairobi, from the dense apartment market in Kilimani and Kileleshwa to houses on large plots in Karen and Runda. Every listing shows the asking price and the neighbourhood, so you can compare like with like.",
      body: [
        "Nairobi is a neighbourhood market before it is a city one, so set your price ceiling first and then narrow by area, bedrooms and the features that decide how a Nairobi home actually works. Backup power, a borehole, a lift and secure parking are worth more here than listing descriptions usually suggest, and you can filter on all of them.",
        "For any apartment, ask two questions before the price. What is the monthly service charge and what has it done over the last three years, and is the unit on sectional title or on a share certificate. Service charge is a real and recurring part of the cost of ownership, and sectional title is both easier to finance and easier to sell on than the older share arrangement.",
        "Budget beyond the purchase price for legal fees of roughly one to two percent, stamp duty of four percent within the municipality, and search and registration costs. Instruct an advocate before paying any deposit, and send an enquiry through any listing to reach the agent directly.",
      ],
    },
    "for-rent": {
      intro:
        "Apartments, houses and furnished homes to rent in Nairobi, the deepest rental market in Kenya. Rent on every listing is shown per month alongside the bedroom count, the size and what is included.",
      body: [
        "Nairobi rentals move quickly. Filter to your budget first, then sort by newest to see what has just come onto the market, and use the bedroom and bathroom filters when you are sharing. The feature chips let you insist on parking, a lift, backup power, a borehole or twenty four hour security, all of which change daily life here more than they change the rent.",
        "Most landlords ask for one month of rent as a refundable deposit plus the first month up front, and some serviced or furnished apartments ask for two. Service charge and water are sometimes quoted separately from rent, so ask the agent to confirm the total monthly cost in writing before you sign.",
        "A building with a working generator and its own borehole behaves very differently during a power outage or a mains interruption from one that relies entirely on the grid. It is worth asking specifically rather than assuming.",
      ],
    },
    commercial: {
      intro:
        "Commercial property in Nairobi, including offices, retail units, warehouses and mixed use space. Each listing shows the asking price or monthly rent, the floor area and the agent handling it.",
      body: [
        "Nairobi commercial space is compared on cost per square metre, so use the size filter alongside the price range. Westlands and Upper Hill hold the bulk of the grade A office stock, while Industrial Area, Athi River and Mombasa Road carry the warehousing. Parking ratio, backup power and lift access are the three things that most often decide whether a space is workable.",
        "Ask what the service charge is on top of the rent, because in Nairobi office buildings it is substantial and it is quoted separately. Confirm also whether the quoted rent includes VAT, since commercial rent attracts VAT at sixteen percent where the landlord is VAT registered, unlike residential rent which is exempt.",
        "Commercial leases in Kenya typically run three to six years with a rent review clause, and fit out costs and who carries them are usually negotiable on a longer term. Raise it in the first conversation. Send an enquiry through any listing to reach the agent directly.",
      ],
    },
  },

  nearby: ["Kiambu", "Ruaka", "Syokimau", "Athi River", "Ngong", "Kikuyu"],
};

/* ── Registry ──────────────────────────────────────── */

export const PLACES: Record<string, PlaceContent> = {
  watamu: WATAMU,
  diani: DIANI,
  kilifi: KILIFI,
  nairobi: NAIROBI,
};

/** Slugs with a town hub. These are reserved under /real-estate. */
export const PLACE_SLUGS = Object.keys(PLACES);

export function getPlace(slug?: string | null): PlaceContent | null {
  if (!slug) return null;
  return PLACES[slug.toLowerCase()] ?? null;
}

export function isKnownPlace(slug: string): boolean {
  return Object.prototype.hasOwnProperty.call(PLACES, slug.toLowerCase());
}

/** Copy override for one category on one place, if there is one. */
export function placeCategoryCopy(
  slug: string | null | undefined,
  category: PropertyCategory
): PlaceCategoryCopy | null {
  return getPlace(slug)?.categoryCopy[category] ?? null;
}
