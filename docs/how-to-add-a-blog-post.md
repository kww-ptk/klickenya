# How to add a blog post

Blog posts are Sanity `blogPost` documents. They render at **`/journal`** (index) and
**`/journal/[slug]`** (detail). There is no Supabase side to a blog post — it is pure content.

Two ways to create one:

| Route | When to use |
|-------|-------------|
| **Sanity Studio** (`apps/studio`, run `pnpm dev` there → localhost:3333) | Short posts, quick edits, adding cover images, fixing typos |
| **Seed script** (`apps/web/scripts/seed-blog-*.ts`) | Long guides with rich blocks. Version-controlled, idempotent, re-runnable |

Most Klickenya guides are written as scripts. This doc covers that path.

---

## 1. Where things live

```
apps/studio/schemas/blogPost.ts      # the document schema — field names + allowed values
apps/studio/schemas/blocks/*.ts      # the 19 custom body blocks (field shapes)
apps/web/scripts/seed-blog-*.ts      # seed scripts (auto-run by GitHub Action on main)
apps/web/scripts/push-blog-*.ts      # same thing, but NOT auto-run — manual only
apps/web/scripts/push-blog-post.ts   # generic: takes a JSON file, pushes as a DRAFT
apps/web/scripts/upload-blog-covers.ts  # attaches generated SVG covers to posts
apps/web/lib/sanity/queries.ts       # BLOG_POSTS_QUERY etc. — filters status == "published"
apps/web/app/journal/                # index, [slug], category/[tag], loading
apps/web/app/api/webhooks/sanity/route.ts  # revalidates /journal + /journal/[slug]
```

Naming matters: **`seed-blog-*.ts` is auto-executed by `.github/workflows/seed-blog.yml`
when pushed to `main`.** `push-blog-*.ts` is not. Use `seed-` if you want the Action to
publish it for you; use `push-` if you'd rather run it yourself.

---

## 2. Write the script

Copy an existing one — [push-blog-watamu-nightlife-guide.ts](apps/web/scripts/push-blog-watamu-nightlife-guide.ts)
is a good, current template. Skeleton:

```ts
import { createClient } from 'next-sanity'

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN!,   // must be a WRITE token
  useCdn: false,
})

function key() {
  return Math.random().toString(36).slice(2, 12)
}

function textBlock(text: string, style: string = 'normal'): any {
  return {
    _type: 'block',
    _key: key(),
    style,                                 // 'normal' | 'h2' | 'h3' | 'h4' | 'blockquote'
    children: [{ _type: 'span', _key: key(), text, marks: [] }],
  }
}

function richTextBlock(children: Array<{ text: string; bold?: boolean }>): any {
  return {
    _type: 'block',
    _key: key(),
    style: 'normal',
    children: children.map((c) => ({
      _type: 'span', _key: key(), text: c.text, marks: c.bold ? ['strong'] : [],
    })),
  }
}

const postBody = [
  { _type: 'quickFactsBlock', _key: key(), title: '✦ Quick Facts', accentColor: 'amber',
    items: [{ icon: '🌙', label: 'Best nights', value: 'Fri + Sat' }] },
  textBlock('First H2 heading', 'h2'),
  textBlock('Body paragraph…'),
  { _type: 'tipCardBlock', _key: key(), variant: 'tip', icon: '📅',
    label: 'Best months', text: 'Peaks Jul–Aug and Dec–Jan.' },
]

async function push() {
  await client.createOrReplace({
    _id: 'blog-my-post-slug',              // stable id → re-runs update, never duplicate
    _type: 'blogPost',
    title: 'Full Title With Year 2026',
    slug: { _type: 'slug', current: 'my-post-slug' },
    status: 'published',                   // 'draft' until you're ready
    excerpt: 'Card preview + fallback meta description. Keep under 200 chars.',
    author: { _type: 'reference', _ref: 'author-klickenya' },
    primaryCategory: 'destination_guide',
    postType: 'guide',
    location: 'watamu',
    series: 'Kenya Destination Guides',    // optional — links related posts
    focusKeyword: 'best restaurants watamu 2026',
    keywords: ['budget', 'family'],
    readingTime: 7,
    publishedAt: '2026-03-13T08:00:00Z',
    seoTitle: 'Under 60 characters',
    seoDescription: 'Under 160 characters.',
    body: postBody,
  })
  console.log('✓ Done')
}

push().catch((err) => { console.error(err); process.exit(1) })
```

### Required fields
`title` · `slug` · `author` · `excerpt` · `primaryCategory` · `postType`
(plus `coverImage` — enforced by Studio validation once `status: 'published'`).

### Allowed values (from `blogPost.ts` — don't invent new ones)
- **status** — `draft` · `published` · `archived`
- **primaryCategory** — `destination_guide` · `food_restaurants` · `where_to_stay` ·
  `safari_wildlife` · `beaches_coast` · `travel_tips` · `events_nightlife` · `living_in_kenya`
- **postType** — `guide` · `listicle` · `review` · `news` · `tips`
- **location** — `watamu` · `kilifi` · `diani` · `nairobi` · `lamu` · `mombasa` ·
  `malindi` · `maasai_mara` · `amboseli` · `kenya_general`
- **subcategory** — see the schema; e.g. `city_guide`, `restaurant_review`, `best_of_list`

---

## 3. Body block reference

Every block needs `_type` and a unique `_key`. Field shapes verified against
`apps/studio/schemas/blocks/`:

| Block | Fields |
|-------|--------|
| `quickFactsBlock` | `title`, `accentColor`, `items[]{icon,label,value}` |
| `statRowBlock` | `stats[]{number,label}` — **`number`, not `value`** |
| `tipCardBlock` | `variant` (`tip`/`warning`), `icon`, `label`, `text` — **`text`, not `tip`** |
| `pullQuoteBlock` | `text`, `attribution`, `accentColor` |
| `compareTableBlock` | `columns[]{label,color}`, `rows[]{criterion,values[]}` |
| `budgetTableBlock` | `columns[]` (strings), `rows[]{label,values[]}`, `totalRow[]` |
| `verdictCardBlock` | `variant` (`teal`/`blue`/`purple`/`amber`), `label`, `title`, `pros[]`, `cons[]` |
| `whoIsItForBlock` | `title`, `items[]{icon,text}` |
| `packingListBlock` | `title`, `items[]{icon,text}` |
| `distanceChipsBlock` | `chips[]{icon,label,value}` |
| `deciderGridBlock` | `cards[]{label,color,title,items[]}` |
| `destinationSectionBlock` | `number`, `pill`, `pillColor`, `title` |
| `dayCardBlock` | `dayNumber`, `location`, `title`, `meta`, `timeline[]{time,title,description,badge}`, `costs` |
| `photoRowBlock` | `layout`, `photos[]{alt,aspectRatio,caption}` |
| `inlineListingBlock` | `listing` (reference), `label` |
| `listingSliderBlock` | `heading`, `listings[]` (references) |
| `eventSliderBlock` | `heading`, `events`, `filterCity`, `ctaText`, `ctaLink` |
| `exchangeRateBlock` / `windChartBlock` | `placeholder` — live data, no config |

---

## 4. Run it

**This agent environment cannot reach `api.sanity.io` — run locally.**

```bash
cd ~/Desktop/"CLAUDE CODE"/klickenya/apps/web && SANITY_API_TOKEN=<write-token> npx tsx scripts/seed-blog-my-post.ts
```

The token must be the **write/Editor** token, not the read-only one.
`createOrReplace` means re-running is safe — no duplicates.

Alternative: push a `seed-blog-*.ts` to `main` and the GitHub Action runs it automatically
using the `SANITY_API_TOKEN` repo secret.

---

## 5. Cover image

A published post needs one. Either:
- Upload a real photo in Sanity Studio (**recommended** — 1800×1000 or 1600×900, set alt text), or
- Run [upload-blog-covers.ts](apps/web/scripts/upload-blog-covers.ts) to attach a generated
  brand-gradient SVG placeholder by document `_id`.

Also worth doing in Studio after seeding: add up to 3 `relatedListings` for the sidebar,
and drop inline images between sections.

---

## 6. Going live

- Only `status: "published"` posts appear — `BLOG_POSTS_QUERY` and `BLOG_POST_SLUGS_QUERY`
  both filter on it. A draft is invisible on the site even though it exists in Sanity.
- `/journal/[slug]` is `force-static` with `revalidate = 60`; `/journal` is `revalidate = 3600`.
- The Sanity webhook (`/api/webhooks/sanity`) revalidates `/journal/<slug>` and `/journal`
  on every create/update/delete, so changes normally appear within seconds in production.
- **New post not showing?** Wait out the revalidate window before debugging. Check
  `status`, then check the webhook fired. Not a bug for the first 60 seconds.

---

## 7. Writing guide (house rules)

These are non negotiable. Every new post follows them.

1. **Never use dashes in prose.** No em dashes, no en dashes, no ` - `. Rewrite the sentence
   instead. `tuk-tuk` is the one accepted hyphenated word, because published posts use it.
2. **Every link must be real and must work when clicked.** Never write a plausible looking
   path like `/stays/watamu` for a specific hotel. Listing URLs are
   `/{type-plural}/{city-lowercased-hyphenated}/{slug}`, so verify the slug in Sanity first:
   ```bash
   curl -s "https://b9zd8u9f.apicdn.sanity.io/v2024-01-01/data/query/production?query=*%5B_type%3D%3D%22listing%22%5D%7B%22s%22%3Aslug.current%2Ctype%2Ccity%7D"
   ```
   Same for `/journal/<slug>` internal links. Check internal linking on every post.
3. **Research current information** before writing, and weave the supplied brief through the
   post naturally. Make it read as genuine local knowledge that actually helps the reader,
   not as generic travel copy.
4. **Write for SEO and for AI search (GEO/AEO).** Strong hook and title, focus keyword in the
   first 100 words, a direct answer paragraph up top that an AI can lift, keywords used
   naturally throughout, question style H2s and H3s, and a real FAQ section.
5. **Add a placeholder image gradient after each main section**, so the post has visual rhythm
   before real photography exists. Swap for real photos in Studio later.
6. **Match the established tone** from the existing posts. Honest, warm, specific, happy to
   say what is not great about a place. Read
   [seed-blog-best-beaches-watamu.ts](apps/web/scripts/seed-blog-best-beaches-watamu.ts)
   before writing a new one. Avoid the word "refined".
7. **Link every business mentioned to its Klickenya listing** if one exists, or to a relevant
   Klickenya blog post if it does not.
8. **Use the custom blocks.** A wall of paragraphs is not the house style. Use quick facts,
   tip cards, compare and budget tables, verdict cards, decider grids and pull quotes.

---

## 8. Gotchas

- **`_key` on every block and every span.** Missing keys cause Studio array errors.
- **`tipCardBlock` uses `text`, not `tip`. `statRowBlock` uses `number`, not `value`.**
  Both were real bugs in earlier seed scripts.
- **Stable `_id`** (`blog-<slug>`) — random ids create duplicates on every re-run. If you
  do end up with duplicates, see [delete-wrong-blog-duplicates.ts](apps/web/scripts/delete-wrong-blog-duplicates.ts).
- **`author-klickenya` must exist** in Sanity as an `author` document with that exact `_id`.
- **Slug ≠ `_id`.** `_id` is `blog-watamu-nightlife-guide`; the URL is `/journal/watamu-nightlife-guide`.
- **Branching:** feature branch → `dev` → `main`, even for a one-line copy edit. Pushing a
  `seed-blog-*.ts` to `main` triggers the Action, so make sure the content is final first.

---

## Related

- [BLOG_SEEDS_README.md](apps/web/scripts/BLOG_SEEDS_README.md) — the three 2026 destination
  guides specifically, with their SEO and block-coverage checklists.
- `CLAUDE.md` → "Blog publishing (Sanity CMS)" — short version of section 4.
