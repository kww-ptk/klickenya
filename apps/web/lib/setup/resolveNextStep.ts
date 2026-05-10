/**
 * resolveNextStep — pure function. The "brain" of the dashboard setup banner.
 *
 * Given the menu's current setup state, returns the slug of the next step the
 * owner needs to land on, or null if the banner should be hidden.
 *
 * Source of truth: this module. Both the banner CTA href and the
 * /dashboard/setup/[slug]/welcome → first-step redirect compute their target
 * from this function, so there is one place to reason about the state machine.
 *
 * Returning null when stock has been decided (rather than routing to step 6,
 * "coming-soon") is intentional — once the owner has answered every question
 * that requires a decision, there is nothing left to nag them about. Step 6
 * remains reachable from the wizard footer, but it is not a banner state.
 */

export type SetupStep =
  | "menu"           // step 1: build & publish the menu
  | "reservations"   // step 2: opt in or out of online bookings
  | "table_ordering" // step 3: opt in or out of QR cart
  | "pos"            // step 4: tables + staff PINs (only after table_ordering = true)
  | "stock"          // step 5: opt in or out of Klickenya Kitchen
  | "coming_soon";   // step 6: takeaway / delivery waitlist (informational)

export type SetupState = {
  is_published: boolean;
  reservations_decided_at: string | null;
  table_ordering: boolean;
  table_ordering_decided_at: string | null;
  stock_decided_at: string | null;
  setup_completed_at: string | null;
  setup_dismissed_at: string | null;
  /** ≥1 row in restaurant_tables for this menu_id */
  has_tables: boolean;
  /** ≥1 row in restaurant_staff for this menu_id */
  has_staff: boolean;
};

export function resolveNextStep(s: SetupState): SetupStep | null {
  if (s.setup_completed_at !== null) return null;
  if (s.setup_dismissed_at !== null) return null;

  if (!s.is_published) return "menu";
  if (s.reservations_decided_at === null) return "reservations";
  if (s.table_ordering_decided_at === null) return "table_ordering";

  // Step 4 is only relevant when the owner has said yes to step 3. If they
  // turned table_ordering on but haven't completed POS prerequisites (≥1
  // table AND ≥1 staff PIN), route them back here. If they said no to
  // step 3, skip 4 entirely.
  if (s.table_ordering && (!s.has_tables || !s.has_staff)) return "pos";

  if (s.stock_decided_at === null) return "stock";

  return null;
}
