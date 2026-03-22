# Blog Seed Scripts — Kenya Destination Guides

## Posts Created

| # | Title | Slug | Words | Category | Location |
|---|-------|------|-------|----------|----------|
| 1 | The Complete Guide to Watamu, Kenya 2026 | `complete-guide-watamu-kenya-2026` | ~2,800 | destination_guide | watamu |
| 2 | The Complete Guide to Kilifi, Kenya 2026 | `complete-guide-kilifi-kenya-2026` | ~2,600 | destination_guide | kilifi |
| 3 | The Complete Guide to Diani Beach, Kenya 2026 | `complete-guide-diani-beach-kenya-2026` | ~2,500 | destination_guide | diani |

All three are part of the **"Kenya Destination Guides"** series.

## How to Run

Each script requires the `SANITY_API_TOKEN` environment variable (an Editor-level Sanity API token).

```bash
cd apps/web

# Run individually:
SANITY_API_TOKEN='your-token' npx tsx scripts/seed-blog-watamu-guide.ts
SANITY_API_TOKEN='your-token' npx tsx scripts/seed-blog-kilifi-guide.ts
SANITY_API_TOKEN='your-token' npx tsx scripts/seed-blog-diani-guide.ts

# Or run all three:
SANITY_API_TOKEN='your-token' npx tsx scripts/seed-blog-watamu-guide.ts && \
SANITY_API_TOKEN='your-token' npx tsx scripts/seed-blog-kilifi-guide.ts && \
SANITY_API_TOKEN='your-token' npx tsx scripts/seed-blog-diani-guide.ts
```

Each script uses `createOrReplace` — safe to re-run without duplicates.

## What to Manually Add After Seeding

1. **Cover images** — Upload a hero photo for each post in Sanity Studio:
   - Watamu: Beach/lagoon shot (recommended 1800×1000px)
   - Kilifi: Creek or Bofa Beach shot
   - Diani: White sand beach aerial or palm trees

2. **Author** — The scripts reference `author-klickenya`. If this author doesn't exist yet, create one in Sanity with `_id: "author-klickenya"`.

3. **Related listings** — In Sanity Studio, add 2-3 related listings to each post's sidebar.

4. **Inline images** — Add photos within the body content where appropriate (between sections).

## SEO Checklist Per Post

| Check | Watamu | Kilifi | Diani |
|-------|--------|--------|-------|
| Focus keyword in first 100 words | ✅ | ✅ | ✅ |
| SEO title under 60 chars | ✅ | ✅ | ✅ |
| Meta description 150-155 chars | ✅ | ✅ | ✅ |
| H2s answer search questions | ✅ | ✅ | ✅ |
| Internal links to /stays, /experiences | ✅ | ✅ | ✅ |
| Real KES prices throughout | ✅ | ✅ | ✅ |
| primaryCategory set | ✅ | ✅ | ✅ |
| location set | ✅ | ✅ | ✅ |
| series set | ✅ | ✅ | ✅ |
| focusKeyword set | ✅ | ✅ | ✅ |

## Custom Blocks Used Per Post

| Block Type | Watamu | Kilifi | Diani |
|------------|--------|--------|-------|
| quickFactsBlock | ✅ | ✅ | ✅ |
| statRowBlock | ✅ | ✅ | ✅ |
| tipCardBlock (tip) | ✅ | ✅ | ✅ |
| tipCardBlock (warning) | ✅ | ✅ | ✅ |
| compareTableBlock | ✅ | ✅ | ✅ |
| budgetTableBlock | ✅ | ✅ | ✅ |
| pullQuoteBlock | ✅ | ✅ | ✅ |
| verdictCardBlock | ✅ | ✅ | ✅ |
| whoIsItForBlock | ✅ | ✅ | ✅ |
| distanceChipsBlock | ✅ | ✅ | ✅ |
| deciderGridBlock | — | — | ✅ |
| packingListBlock | — | — | — |

## Competitive Analysis

Our guides are designed to outrank existing content:

- **Existing top results**: 1,500-3,700 words with basic H2 structure
- **Our guides**: 2,500-2,800 words with 10+ rich custom blocks (compare tables, budget breakdowns, verdict cards, distance chips)
- **Content gaps we fill**: nightlife coverage, area-by-area breakdowns, honest assessments, real KES pricing, FAQ-style headings, series linking

## Notes

- All scripts use `_id` based naming (e.g., `blog-complete-guide-watamu-2026`) for idempotent re-runs
- The `distanceChipsBlock` field structure uses `label` + `value` + `icon` (verified from schema)
- `tipCardBlock` uses `text` field (NOT `tip`) — this was a known bug in earlier seed scripts
- `statRowBlock` uses `number` field (NOT `value`)
