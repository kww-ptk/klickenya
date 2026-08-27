# Real estate SEO plan
# Created: August 26, 2026
# Focus: rank for "real estate Watamu", "property for sale Watamu", "plots for sale Watamu",
#        then repeat the pattern for Diani, Kilifi and Nairobi.

## Where we already were

The technical layer was in good shape before this work and is not the bottleneck:

- Canonicals pinned to `https://klickenya.com` via `SITE_URL`, never to a preview origin
- `RealEstateListing` + `Product` schema carrying beds, baths, floor size, lot size, geo,
  availability and the listing agent
- `BreadcrumbList` on every real-estate page, `ItemList` on every results page, `FAQPage`
  on every page with an FAQ block
- Sold and let listings noindexed but still crawlable at their own URL
- Empty `/[category]/[city]` pages 404 rather than rendering an indexable soft 404
- Sitemap regenerating hourly so listings published from Sanity appear without a deploy
- `property.currency` respected everywhere a price is rendered

## What was actually blocking the head term

1. **No page for the area query.** "real estate watamu" wants the whole town, not one
   category. The closest URL was `/real-estate/for-sale/watamu`.
2. **Templated copy.** `categoryIntro("land", "Watamu")` returned Nairobi's paragraph with
   one word swapped. Safe for the long tail, too generic to beat BuyRentKenya or Property24
   on a head term, and the pattern Google's scaled-content systems discount.
3. **Supply.** No listings means no page and no ranking. Still the binding constraint
   outside Watamu.
4. **The neighbourhood layer was unused on the coast**, where the high-intent long tail lives.
5. **A Watamu content cluster existed and was stranded.** Six published journal posts plus a
   destination page, none of them linked to or from the property pages.

## What shipped (branch `feat/re-seo-watamu`)

### Town hubs at `/real-estate/<town>`

New landing page answering the area query in full, built to be terminal: a visitor arriving
cold from search should not need a second page.

Sections, in order: hero with quick facts, category shortcuts with counts, the full
filterable inventory for the town, a market panel, sub-areas, long-form buying guidance,
journal guides, agents with local stock, FAQs, what Klickenya is, valuation CTA, join CTAs,
internal-link rails.

Live for **Watamu, Diani, Kilifi, Nairobi**.

The URL sits at the top level rather than under `/area/` because the shorter URL is the
stronger one for a head term. The cost is that town slugs share a namespace with property
slugs under `/real-estate/[slug]`, so both are reserved words. `RESERVED_REAL_ESTATE_SEGMENTS`
plus `PLACE_SLUGS` keep them apart in `generateStaticParams` and in the sitemap: a property
slugged `watamu` is dropped rather than shipped as a URL that renders a different page.

### Place-specific copy

`lib/real-estate/places.ts` is the registry. A town in it gets copy only that town could
have: its sub-areas, its tenure quirks, its pricing currency, its buying process. A town not
in it falls back to the template in `content.ts` and nothing breaks.

The registry also overrides the per-category copy on `/real-estate/[category]/[town]`, so
`/real-estate/land/watamu` now talks about the foreshore reserve, Land Control Board consent
and salinity rather than generic Kenyan land advice.

Watamu, Diani and Kilifi cover coastal specifics (foreshore setback, leasehold, Land Control
Board, borehole water, euro pricing). Nairobi covers what actually decides a deal there:
service charge, sectional title versus share certificate, and the satellite belt.

### Journal posts pull in automatically

Guides on each hub are fetched, not hardcoded. Two ways a post qualifies:

- `location` on the blogPost matches the town (`watamu`, `diani`, `kilifi`, `nairobi`).
  This is an existing enum, so every published guide qualified with no retagging.
- A `realestate-<town>` keyword on the post. This is the explicit opt in, and these posts
  are ranked first in the list.

**To promote a post onto a town hub:** open it in the Studio, Content Strategy group, add
`realestate-watamu` (or the matching town) to **Keywords**. Nothing else needed.

Curated non-journal links, currently the destination page, are reserved a slot so a town
with six articles does not push them out.

### Empty hubs are noindexed, not shipped

Diani, Kilifi and Nairobi have no listings yet. Their hubs render, stay useful and stay
crawlable, but carry `noindex, follow` and are excluded from the sitemap until stock exists.
They flip to indexable on their own the moment a property is published, with no code change.
A page about a property market with no property on it is thin however good the copy is.

### Internal linking

- `/real-estate` hub gained a "Browse by town" rail
- `/real-estate/[category]/[town]` links up to the town hub and puts the town in its breadcrumb
- Property detail breadcrumbs read Real Estate > Watamu > For Sale where a hub exists
- Town hubs link out to the journal guides and the destination page, closing the loop with
  the existing content cluster
- Nearby-town links are resolved against live data, so an empty market is dropped rather
  than shipped as a 404

### Other

- `categoryHeading("land")` now reads "Land and plots for sale", since "plots" is the actual
  Kenyan search term
- `AreaStats` medians each currency separately instead of skipping non-shilling stock, which
  is what `MarketDataStrip` does and is wrong on the euro-priced coast
- `AGENTS_BY_CITY_QUERY` counts an agent's stock in the town, not their whole portfolio
- Sub-area counts match by containment, because `neighbourhood` is free text and hosts fill
  it in as a street address ("New Road, Watamu")

## What still has to happen

Ranked by impact.

1. **Supply into Sanity.** Watamu has 8 listings and that is the floor, not a market. 10 to
   15 per category per town is where these pages start reading as real. Diani, Kilifi and
   Nairobi have none and their hubs stay noindexed until they do. This is a business action,
   not a code change, and it gates everything else.

2. **Neighbourhood documents for the coast.** `/real-estate/neighbourhood/[slug]` is built,
   sitemapped and unused outside Nairobi. The high-intent long tail lives there: beachfront
   plot Watamu, land Mida Creek, house for sale Galu, Bofa, Mnarani. Create documents for the
   sub-areas already named in `places.ts`.

3. **Fix the free-text neighbourhood join.** `queries.ts` matches neighbourhoods by string
   equality on a free-text field (`lower(neighbourhood) == lower(^.name)`). One typo in the
   Studio and a page silently empties. Convert to a reference before scaling this.

4. **Tag the journal.** Add `realestate-<town>` keywords to the posts that should lead each
   hub. Write property-angle posts per town: cost of buying, title and process, which area to
   buy in. Those are the ones worth promoting.

5. **`/real-estate/[slug]` renders dynamically.** Pre-existing, not introduced here: the
   route has `generateStaticParams` but no `force-static`, so it is server-rendered on demand
   while `/[category]/[city]` is prerendered. Not an indexing problem, but the hub is the page
   we most want fast. Worth investigating what opts the route out.

6. **Search Console.** Submit the hubs, then watch impressions per town rather than
   positions. Add towns to `places.ts` as stock justifies them.

## Adding a town

1. Add an entry to `PLACES` in `apps/web/lib/real-estate/places.ts`, keyed by its
   `citySlug()` form. The slug must match the `city` value on the properties, lowercased.
2. Set `blogLocation` to the blogPost `location` enum value and `guideTag` to
   `realestate-<slug>`.
3. That is all. The route, the sitemap, the copy overrides, the breadcrumbs and the rails all
   read from `PLACES`. The hub is noindexed until the town has listings.

## Pre-existing issue found, not fixed here

Two React console errors fire on every page including `/about`, so they live in a shared
component (Nav or Footer), not in this work: a missing `key` prop inside a `<ul>`, and a
`<Link>` receiving an undefined `href`. Worth a separate pass.
