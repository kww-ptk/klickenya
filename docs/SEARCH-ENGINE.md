# KlicKenya Search Engine — Architecture & Documentation

> Last updated: 2026-03-19
> Status: Production (v1)

---

## Table of Contents

1. [Overview](#overview)
2. [File Map](#file-map)
3. [Component Architecture](#component-architecture)
4. [SearchEngine Component](#searchengine-component)
5. [SearchDropdown Component](#searchdropdown-component)
6. [useSearch Hook](#usesearch-hook)
7. [CityCountsContext](#citycountscontext)
8. [Search API](#search-api)
9. [Data Flow](#data-flow)
10. [Embedding Guide (Future)](#embedding-guide)
11. [Subcategories & Constants](#subcategories--constants)
12. [Roadmap & Future Improvements](#roadmap--future-improvements)

---

## Overview

The KlicKenya Search Engine is a **self-contained, reusable component** (`SearchEngine`) designed to be placed anywhere on the site and, in the future, embedded as an iframe on external sites.

It provides:

- **3-column search pill**: "Try Me..." (free text) → "Where" (city picker) → "What" (category picker)
- **Live search results** with instant skeleton feedback
- **Two rendering variants**: `hero` (inline dropdowns) and `nav` (fixed overlays)
- **Auto-navigation** when both city + category are selected
- **Keyboard navigation** and full mobile responsiveness
- **Debounced API calls** with client-side caching

---

## File Map

```
apps/web/
├── components/search/
│   ├── SearchEngine.tsx          # Main reusable search component (hero + nav variants)
│   └── SearchDropdown.tsx        # Live search results dropdown
├── hooks/
│   └── useSearch.ts              # Search state, debounce, caching, abort
├── context/
│   └── CityCountsContext.tsx     # React context for city data
├── lib/
│   ├── sanity/
│   │   ├── getCityCounts.ts      # Server function: fetch city counts from Sanity
│   │   └── queries.ts            # GROQ queries (search-related ones listed below)
│   └── constants/
│       └── subcategories.ts      # Type → subcategory mappings, labels, icons
├── app/
│   ├── api/search/
│   │   ├── route.ts              # GET /api/search — main search endpoint
│   │   └── suggestions/route.ts  # GET /api/search/suggestions — popular searches
│   ├── search/
│   │   ├── page.tsx              # /search server page (metadata + params)
│   │   └── SearchPageClient.tsx  # Full search results page (filters, sort, pagination)
│   ├── page.tsx                  # Homepage — uses <SearchEngine variant="hero" />
│   └── layout.tsx                # Root layout — wraps app in CityCountsProvider
└── components/shared/
    └── Nav.tsx                   # Sticky nav — uses <SearchEngine variant="nav" />
```

---

## Component Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Root Layout (layout.tsx)                                │
│  ├── CityCountsProvider  ← getCityCounts() server fetch  │
│  │                                                       │
│  │   ┌─── Nav.tsx ──────────────────────────┐            │
│  │   │  <SearchEngine variant="nav" />      │            │
│  │   │   └── LocationDropdown (fixed)       │            │
│  │   │   └── MegaMenu (fixed)               │            │
│  │   │   └── SearchDropdown (fixed)          │            │
│  │   └──────────────────────────────────────┘            │
│  │                                                       │
│  │   ┌─── page.tsx (Hero) ──────────────────┐            │
│  │   │  <SearchEngine variant="hero" />     │            │
│  │   │   └── LocationDropdown (inline)      │            │
│  │   │   └── MegaMenu (inline)              │            │
│  │   │   └── SearchDropdown (inline)         │            │
│  │   └──────────────────────────────────────┘            │
│  │                                                       │
│  └───────────────────────────────────────────────────────┘
```

### Key Difference: Hero vs Nav

| Feature            | `variant="hero"`              | `variant="nav"`               |
| ------------------ | ----------------------------- | ----------------------------- |
| Dropdowns          | Inline (push content down)    | Fixed position (overlay)      |
| Container          | `max-w-[540px]`, centered     | `max-w-[400px]`, flex in nav  |
| Text size          | `text-[14px]`                 | `text-[13px]`                 |
| Amber button       | `size-10`                     | `size-8`                      |
| Mobile layout      | Always 3-column               | Compact single-line (< `lg`)  |
| Background context | Dark hero image               | White nav bar                 |

---

## SearchEngine Component

**File:** `apps/web/components/search/SearchEngine.tsx`

### Props

```typescript
interface SearchEngineProps {
  variant?: "hero" | "nav";   // Display mode (default: "hero")
  className?: string;         // Additional CSS classes
  onExpandChange?: (expanded: boolean) => void;  // Callback when pill expands/collapses
}
```

### Internal State

| State            | Type              | Purpose                              |
| ---------------- | ----------------- | ------------------------------------ |
| `pillExpanded`   | `boolean`         | Text input is open                   |
| `locationOpen`   | `boolean`         | City picker is visible               |
| `megaOpen`       | `boolean`         | Category mega menu is visible        |
| `selectedCity`   | `string \| null`  | Currently selected city              |
| `selectedType`   | `string \| null`  | Currently selected listing type      |
| `selectedSub`    | `string \| null`  | Currently selected subcategory       |
| `heroFilter`     | `string`          | City filter text (hero variant only) |

### Internal Refs

| Ref              | Purpose                                           |
| ---------------- | ------------------------------------------------- |
| `pillRef`        | Main pill div — click-outside detection            |
| `pillInputRef`   | Search text input — auto-focus                     |
| `locationDropRef`| Location dropdown — click-outside detection        |
| `megaDropRef`    | Mega menu — click-outside detection                |
| `heroFilterRef`  | Hero city filter input — auto-focus                |
| `heroInlineRef`  | Hero inline dropdown area — prevents false close   |

### Internal Sub-Components

#### `LocationDropdown`

Fixed-position dropdown (nav variant) for city selection.

- Filter input with auto-focus
- "Anywhere" option (clears selection)
- City rows with images, counts
- Positioned via `getBoundingClientRect()` relative to pill

#### `MegaMenu`

Fixed-position wrapper (nav variant) for the category/subcategory grid.

- 5-column grid (Stays, Experiences, Events, Services, Real Estate)
- Each column: category header + subcategory list
- Positioned aligned to pill's left edge
- Max width 720px

### User Flow

```
1. User clicks "Try Me..." → pill expands to search input
   - Typing triggers useSearch (250ms debounce)
   - Results appear in SearchDropdown (hero: inline, nav: fixed)

2. User clicks "Where" → location dropdown opens
   - Can filter cities by name
   - Selecting a city closes dropdown
   - If no type selected yet → auto-opens "What" mega menu

3. User clicks "What" → mega menu opens
   - Can select a category or subcategory
   - Selecting closes mega menu
   - If no city selected yet → auto-opens "Where" dropdown

4. Both city + type selected → auto-navigate to /search?city=X&type=Y
```

### Click-Outside Logic

The component uses `mousedown` listeners (via `useEffect`) with `requestAnimationFrame` delay to prevent immediate closure on the same click that opens a dropdown.

Three separate handlers manage:
1. Pill expanded → close if click outside pill OR hero inline area
2. Location dropdown → close if click outside pill AND dropdown
3. Mega menu → close if click outside pill AND mega menu

### Escape Key

Any open state (pill, location, mega) is closed on `Escape`.

### Route Change

All state resets on `pathname` change (via `usePathname()`).

---

## SearchDropdown Component

**File:** `apps/web/components/search/SearchDropdown.tsx`

### Props

```typescript
interface SearchDropdownProps {
  results: any;                    // SearchResults object
  isLoading: boolean;              // Show skeleton
  isOpen: boolean;                 // Visibility
  query: string;                   // Current search text
  onClose: () => void;             // Close callback
  anchorRef?: React.RefObject<HTMLElement | null>;  // Positioning anchor (nav)
  inline?: boolean;                // Render in-flow, no positioning (hero)
}
```

### Result Types

```typescript
interface SearchResults {
  query: string;
  listings: ListingResult[];       // Grouped by type
  posts: Record<string, unknown>[];
  destinations: Destination[];
  total: number;
}

interface ListingResult {
  id: string;
  title: string;
  slug: string;
  type: string;                    // stay | experience | event | service | real_estate | restaurant
  subcategory?: string;
  city?: string;
  price?: number;
  price_unit?: string;
  photos?: string[];
  avg_rating?: number;
}
```

### Rendering States

1. **Loading skeleton** — Shows immediately when `isLoading && !results`
   - "Searching for {query}" header
   - 4 pulsing placeholder rows with staggered animation

2. **Empty state** — When `results.total === 0`
   - "No results for {query}" message
   - Suggestion pills (Nairobi, Safari, Villa, Diani, Watamu, Kilifi)

3. **Results** — Grouped by type
   - Destinations section (amber header)
   - Listings grouped by type (max 3 per type)
   - Each item: image thumbnail, title, city, subcategory label, price
   - Footer: result count + "See all results →" link

### Keyboard Navigation

- `ArrowDown/Up` → move focus through items
- `Enter` → navigate to focused item
- Focused item auto-scrolls into view

### Positioning Modes

| Mode     | Trigger              | Behavior                              |
| -------- | -------------------- | ------------------------------------- |
| `inline` | `inline={true}`      | No positioning, renders in document flow |
| Fixed    | `anchorRef` provided | Uses `getBoundingClientRect()` for position |
| Absolute | Default              | `position: absolute; top: calc(100% + 8px)` |

---

## useSearch Hook

**File:** `apps/web/hooks/useSearch.ts`

### Return Value

```typescript
{
  query: string;            // Current query text
  setQuery: (q: string) => void;
  results: SearchResults | null;
  isLoading: boolean;
  isOpen: boolean;          // Dropdown should be visible
  setIsOpen: (open: boolean) => void;
  clear: () => void;        // Reset all state
}
```

### Behavior

- **Minimum 2 characters** to trigger search
- **250ms debounce** before API call
- **Client-side cache** — `Map<string, SearchResults>` persists for session
- **Request cancellation** — `AbortController` cancels previous in-flight request
- **Instant feedback** — `isOpen` and `isLoading` set immediately when query changes
- **Escape key** closes dropdown globally

### API Call

```
GET /api/search?q={query}&limit=6
```

---

## CityCountsContext

**File:** `apps/web/context/CityCountsContext.tsx`

Simple React context providing city data to all components.

```typescript
interface CityCount {
  city: string;     // City name (e.g., "Watamu")
  count: number;    // Number of listings
  image?: string;   // Destination hero image URL
}
```

### Provider Setup (layout.tsx)

```tsx
// Server component fetches data
const cityCounts = await getCityCounts();

// Wraps entire app
<CityCountsProvider cityCounts={cityCounts}>
  {children}
</CityCountsProvider>
```

### getCityCounts() Server Function

**File:** `apps/web/lib/sanity/getCityCounts.ts`

1. Fetches all published listings from Sanity
2. Counts listings per city
3. Fetches destination hero images
4. Maps images to cities (case-insensitive name matching)
5. Sorts by count descending
6. Cached for 1 hour via `unstable_cache`

---

## Search API

### Main Endpoint

**`GET /api/search`**

| Param      | Type   | Default | Description                    |
| ---------- | ------ | ------- | ------------------------------ |
| `q`        | string | —       | Search query (min 2 chars)     |
| `type`     | string | —       | Filter by listing type         |
| `city`     | string | —       | Filter by city                 |
| `sub`      | string | —       | Filter by subcategory          |
| `limit`    | number | 12      | Max results (max 50)           |
| `checkin`  | string | —       | Check-in date (context only)   |
| `checkout` | string | —       | Check-out date (context only)  |
| `guests`   | number | —       | Guest count (context only)     |

**Rate limit:** 30 requests/minute per IP

### Search Logic

```
1. Parallel queries to Sanity:
   ├── SEARCH_LISTINGS_QUERY    (title, city, county, description, tags)
   ├── SEARCH_DESTINATIONS_QUERY (name, tagline)
   └── SEARCH_BLOG_POSTS_QUERY  (title, excerpt, tags)

2. If < 3 listings found:
   └── SEARCH_LISTINGS_FALLBACK_QUERY (first word of query only)

3. Deduplicate listings by _id

4. Apply filters:
   ├── type filter (exact match)
   ├── city filter (case-insensitive includes)
   └── subcategory filter (exact match)

5. Limit results

6. Async: log search to Supabase (fire-and-forget)
```

### Response Shape

```json
{
  "query": "villa",
  "listings": [
    {
      "id": "abc123",
      "title": "Ocean View Villa",
      "slug": "ocean-view-villa",
      "type": "stay",
      "subcategory": "villa",
      "city": "Diani Beach",
      "price": 15000,
      "price_unit": "night",
      "photos": ["https://cdn.sanity.io/..."],
      "avg_rating": 4.9
    }
  ],
  "destinations": [
    {
      "_id": "def456",
      "name": "Diani Beach",
      "slug": "diani-beach",
      "tagline": "Kenya's best beach destination",
      "heroImage": "https://cdn.sanity.io/..."
    }
  ],
  "posts": [],
  "total": 5,
  "context": {
    "type": null,
    "city": null,
    "subcategory": null
  }
}
```

### Suggestions Endpoint

**`GET /api/search/suggestions`**

Returns top 10 popular searches from last 30 days (via Supabase RPC).

```json
{
  "suggestions": [
    { "query": "nairobi", "count": 42 },
    { "query": "villa", "count": 28 }
  ]
}
```

---

## Data Flow

### Live Search (typing in "Try Me...")

```
User types "villa"
    │
    ▼
useSearch.setQuery("villa")
    │
    ├── Immediately: isOpen=true, isLoading=true
    │   └── SearchDropdown shows skeleton
    │
    ├── 250ms debounce...
    │
    ▼
GET /api/search?q=villa&limit=6
    │
    ├── Sanity GROQ: listings + destinations + posts
    │
    ▼
Response cached in useSearch.cache (Map)
    │
    ▼
SearchDropdown renders grouped results
    │
    ▼
User clicks result → <Link> navigates to listing page
    │
    ▼
Async: search logged to Supabase
```

### City + Category Selection

```
User clicks "Where"
    │
    ▼
LocationDropdown opens (hero: inline, nav: fixed)
    │
    ▼
User selects "Watamu"
    │
    ├── selectedCity = "Watamu"
    ├── locationOpen = false
    │
    ▼
Auto-open MegaMenu (no type selected yet)
    │
    ▼
User selects "Stays > Villa"
    │
    ├── selectedType = "stay"
    ├── selectedSub = "villa"
    ├── megaOpen = false
    │
    ▼
autoSearch() → router.push("/search?city=Watamu&type=stay&sub=villa")
```

---

## Embedding Guide

### Current Usage

```tsx
// Hero (homepage) — inline dropdowns push content down
<SearchEngine variant="hero" />

// Nav (sticky bar) — fixed-position overlay dropdowns
<SearchEngine variant="nav" />
```

### Future: Iframe Embedding

The SearchEngine is designed to be embeddable. Future steps:

#### 1. Create a standalone embed route

```
apps/web/app/embed/search/page.tsx
```

This page would render only the SearchEngine with minimal wrapping:

```tsx
export default function EmbedSearchPage() {
  return (
    <CityCountsProvider cityCounts={cityCounts}>
      <div className="p-4">
        <SearchEngine variant="hero" />
      </div>
    </CityCountsProvider>
  );
}
```

#### 2. Embed via iframe

```html
<iframe
  src="https://klickenya.com/embed/search"
  width="100%"
  height="80"
  frameborder="0"
  style="border-radius: 30px; overflow: hidden;"
></iframe>
```

#### 3. Considerations for embed

| Concern             | Solution                                              |
| -------------------- | ----------------------------------------------------- |
| Cross-origin nav     | Use `window.top.location` or `postMessage` to parent  |
| Dynamic height       | Use `ResizeObserver` + `postMessage` to resize iframe  |
| Theming              | Accept CSS custom properties via URL params            |
| Auth/CORS            | API routes already public, no auth needed              |
| CityCountsProvider   | Fetch within embed page, or pass via props             |

#### 4. PostMessage API (proposed)

```typescript
// Embed → Parent: notify of navigation
window.parent.postMessage({
  type: 'klickenya:navigate',
  url: '/stays/diani-beach/ocean-view-villa'
}, '*');

// Embed → Parent: notify of height change
window.parent.postMessage({
  type: 'klickenya:resize',
  height: document.body.scrollHeight
}, '*');

// Parent → Embed: set theme
iframe.contentWindow.postMessage({
  type: 'klickenya:theme',
  accent: '#E8A020',
  radius: '30px'
}, '*');
```

---

## Subcategories & Constants

**File:** `apps/web/lib/constants/subcategories.ts`

### Categories & Subcategories

| Category       | Type Key        | Subcategories                                                         |
| -------------- | --------------- | --------------------------------------------------------------------- |
| Stays          | `stay`          | Villa, Private Room, Boutique Hotel, Lodge & Camp, Hostel, Unique Stay |
| Experiences    | `experience`    | Safari, Outdoor, Beaches, Restaurants, Cultural, Wellness, Family     |
| Events         | `event`         | Parties, Festival, Art & Culture, Wellness & Sport, Networking, Kids, Other |
| Services       | `service`       | Rentals, Transfers, Private Chef, Wellness, Supermarkets, Pharmacy, Fundis, IT & Marketing, Utility Shops |
| Real Estate    | `real_estate`   | For Sale, Land & Plots, Commercial, New Developments                  |

### Exports

```typescript
// Type → subcategory keys
SUBCATEGORIES_BY_TYPE: Record<string, string[]>

// Subcategory key → human label
SUBCATEGORY_LABELS: Record<string, string>

// Subcategory key → emoji icon
SUBCATEGORY_ICONS: Record<string, string>
```

---

## Roadmap & Future Improvements

### Short Term

- [ ] **Embed route** — `/embed/search` with minimal shell, postMessage API
- [ ] **Search analytics dashboard** — Visualize Supabase search logs
- [ ] **Autocomplete suggestions** — Show popular queries as user types
- [ ] **Recent searches** — localStorage-based history
- [ ] **Voice search** — Web Speech API integration

### Medium Term

- [ ] **Filters in pill** — Date picker for check-in/check-out, guest count
- [ ] **Map integration** — Show results on map alongside list
- [ ] **AI-powered search** — Natural language queries ("beach villa under 10k in Diani")
- [ ] **Search result previews** — Hover cards with more detail
- [ ] **Faceted search** — Dynamic filter counts based on current results

### Long Term

- [ ] **Personalized results** — Based on user history and preferences
- [ ] **Multi-language search** — Swahili + English
- [ ] **Federated search** — Search across external partner inventories
- [ ] **Search SDK** — npm package for third-party integration
- [ ] **White-label embed** — Customizable branding for partner sites

---

## Key Design Decisions

1. **Single component, two variants** — One `SearchEngine` with `variant` prop avoids code duplication while allowing different rendering behaviors (inline vs overlay dropdowns).

2. **Client-side cache** — `useSearch` caches results in a `Map` to avoid redundant API calls when users re-type the same query.

3. **Instant skeleton feedback** — `isOpen` and `isLoading` are set immediately when the query changes (before the 250ms debounce), so the user sees an immediate response.

4. **requestAnimationFrame for click-outside** — Delays adding the `mousedown` listener by one frame to prevent the same click that opens a dropdown from immediately closing it.

5. **Hero background: h-screen, not inset-0** — The hero background image is fixed to viewport height. When inline dropdowns expand the section beyond the image, the dark `bg-[#0a0906]` background continues seamlessly.

6. **heroInlineRef** — A separate ref for the hero's inline dropdown area prevents the click-outside handler from closing the pill when the user clicks search results.

7. **Fire-and-forget search logging** — Search queries are logged to Supabase asynchronously without blocking the API response.

8. **CityCountsProvider at root** — City data is fetched once on the server (with 1-hour cache) and shared via context, avoiding duplicate Sanity queries.
