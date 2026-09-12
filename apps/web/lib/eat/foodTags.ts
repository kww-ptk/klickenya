/**
 * Dish tags — pizza, sushi, burgers and so on.
 *
 * Deliberately a standalone module with NO imports. Both the server (building
 * tags from menu rows) and the browser (deciding which section a chosen tag
 * refers to) need this logic, and lib/eat/menus.ts cannot provide it: that
 * module imports the Supabase admin client, so importing anything from it into
 * a client component drags server-only code into the browser bundle and the
 * page dies with "supabaseKey is required".
 *
 * Keep this file free of imports so it stays safe on both sides.
 */

export const FOOD_TAGS: { tag: string; re: RegExp }[] = [
  { tag: "Pizza", re: /\b(pizza|calzone|margherita)/i },
  { tag: "Burgers", re: /\bburger/i },
  { tag: "Pasta", re: /\b(pasta|spaghetti|lasagn|penne|tagliatell|ravioli|gnocchi|linguin)/i },
  { tag: "Sushi", re: /\b(sushi|sashimi|maki|nigiri)/i },
  { tag: "Seafood", re: /\b(prawn|shrimp|octopus|calamari|squid|snapper|lobster|crab|fish|tuna|seafood|oyster)/i },
  { tag: "Grills", re: /\b(grill|bbq|steak|wagyu|fillet|ribs|skewer)/i },
  { tag: "Salads", re: /\bsalad/i },
  { tag: "Desserts", re: /\b(dessert|gelato|tiramis|cake|ice ?cream|brownie|panna)/i },
  { tag: "Vegetarian", re: /\b(vegetarian|vegan|veggie)/i },
  { tag: "Drinks", re: /\b(cocktail|mojito|juice|coffee|beer|wine|smoothie|dawa)/i },
];

/**
 * Does this text belong to a dish tag?
 *
 * Section titles are free text — "Pizza", "Burger", "Burgers", lowercase
 * "sandwiches" — so a title is tested against the same pattern as item names
 * rather than compared literally.
 */
export function matchesFoodTag(text: string, tag: string): boolean {
  const entry = FOOD_TAGS.find((t) => t.tag === tag);
  return entry ? entry.re.test(text) : false;
}
