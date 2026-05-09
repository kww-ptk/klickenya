# Klickenya Listing Content Guidelines

## Purpose
These guidelines define quality standards for all business listings on Klickenya.
They are used as the system prompt context when the AI analyses a new listing submission.

---

## Listing Types

- **stay** — Hotels, guesthouses, lodges, camps, Airbnb-style rentals, beach cottages
- **restaurant** — Restaurants, cafés, bars, rooftops, beach clubs, food courts
- **experience** — Tours, safaris, diving, kitesurfing, cooking classes, cultural experiences
- **event** — Music festivals, art shows, sporting events, community events
- **service** — Travel agencies, car hire, photography, wellness, beauty

---

## Title Standards

- 3–8 words maximum
- Proper case (Title Case)
- No ALL CAPS
- Must contain the business name or a clear descriptor
- No emoji or special characters
- No promotional language ("Best", "Amazing", "#1")
- Examples of good titles: "Watamu Beach House", "Ali Barbour's Cave Restaurant", "Diani Reef Beach Resort"
- Examples of bad titles: "BEST HOTEL IN MOMBASA!!!", "amazing place you must visit", "hotel123"

---

## Description Standards

- 80–300 words
- Written in third person ("The restaurant offers...", "Guests can enjoy...")
- No first person ("We offer...", "Our rooms...")
- Focus on what makes the business unique: location, ambience, signature offerings
- Include: what it is, where it is, what visitors can expect
- Avoid: pricing, opening hours (these belong in other fields), generic marketing phrases
- Avoid: "world-class", "luxury" unless truly applicable, "unique experience" (overused)
- Kenyan English is acceptable; British English spelling preferred (colour, flavour)

---

## Location / City Field

- Use the nearest recognisable Kenyan town or area
- Preferred city values: Nairobi, Mombasa, Diani, Watamu, Malindi, Kilifi, Lamu, Nanyuki, Nakuru, Kisumu, Eldoret, Nyeri
- Do not use sub-areas as city (e.g., "Westlands" → city should be "Nairobi")
- Do not use county names (e.g., "Mombasa County" → "Mombasa")

---

## Subcategory Standards

Each listing type has valid subcategories. The AI must pick the closest match.

### Stay subcategories
beach-resort, safari-lodge, boutique-hotel, guesthouse, budget-hotel, apartment, villa, treehouse, eco-camp, hostel

### Restaurant subcategories
fine-dining, casual-dining, cafe, bar-and-grill, beach-bar, rooftop, fast-food, food-court, juice-bar, seafood

### Experience subcategories
safari, diving-and-snorkelling, kitesurfing, boat-trip, hiking, cultural-tour, cooking-class, game-fishing, cycling, yoga-and-wellness

### Event subcategories
music-festival, art-exhibition, sports-event, food-festival, community-event, conference, nightlife

### Service subcategories
car-hire, travel-agency, photography, wellness-spa, hair-and-beauty, laundry, tour-operator, transport

---

## AI Quality Score (0–100)

The AI should score each submission on these weighted criteria:

| Criterion | Weight |
|---|---|
| Title quality (length, format, no spam) | 20 |
| Description quality (length, third person, informative) | 30 |
| City is a known Kenyan location | 15 |
| Subcategory matches listing type | 15 |
| Website or social media URL provided | 10 |
| Contact details (phone or email) present | 10 |

Score interpretation:
- 80–100: Ready to approve — strong submission
- 60–79: Approve with minor review
- 40–59: Needs editing before approval
- 0–39: Poor quality — likely spam or insufficient info

---

## Red Flags (trigger ai_flags array)

The AI should add a flag string for each of the following if detected:

- `"title_too_short"` — title under 3 words
- `"title_too_long"` — title over 8 words
- `"title_all_caps"` — title is all uppercase
- `"description_too_short"` — under 50 words
- `"description_first_person"` — uses "we", "our", "I" extensively
- `"description_promotional"` — heavy use of superlatives / marketing language
- `"no_location"` — city field is empty or unrecognisable
- `"no_contact"` — no phone, email, or website
- `"suspicious_email"` — disposable email domain (mailinator, guerrillamail, etc.)
- `"duplicate_suspected"` — very similar title + city to existing submission in last 30 days
- `"wrong_subcategory"` — subcategory doesn't logically match listing type

---

## Tone for Admin Review Summaries

When the AI writes a summary for the admin panel (ai_summary field), it should:
- Be 1–3 sentences
- State what the business is and where
- Note the strongest positive and any key concern
- Example: "A mid-range guesthouse in Diani Beach offering self-catering cottages near the reef. Good description and valid contact details. Title is slightly generic — consider editing."
