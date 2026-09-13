/**
 * Deleting orders — the confirmation phrase and what it is for.
 *
 * Orders are financial records. Deleting one loses the revenue line, the
 * rider's cash record, and the reporting history, and it does NOT put back
 * stock that migration 062 already deducted when the kitchen started cooking.
 * This exists so test data can be cleared during setup, not as routine
 * housekeeping.
 *
 * The phrase is checked on the SERVER. A confirmation dialog in the browser
 * stops a slip of the thumb and nothing else — anyone who can call the
 * endpoint can skip a dialog, so the check has to live where the delete
 * happens.
 */

/**
 * Typed in full to confirm a delete. Case-sensitive on purpose.
 *
 * NEXT_PUBLIC_ deliberately: this module is imported by the confirmation UI
 * as well as the endpoint, and a server-only variable would be undefined in
 * the browser — the page would ask for one phrase while the server demanded
 * another, and every delete would fail with no clue why.
 *
 * Being readable in the bundle costs nothing. The phrase is not a secret; it
 * is a speed bump that makes deleting a deliberate act rather than a mis-tap.
 * Authorisation is the session and the menu-ownership check, not this.
 */
export const DELETE_CONFIRM_PHRASE =
  process.env.NEXT_PUBLIC_ORDER_DELETE_PHRASE || "deletekes!!!";

export function confirmPhraseMatches(given: unknown): boolean {
  return typeof given === "string" && given === DELETE_CONFIRM_PHRASE;
}

/**
 * Bulk deletes are capped. "Clear everything" is the shape of request that
 * is catastrophic when it is a mistake, and a limit turns an accident into a
 * partial one the operator notices.
 */
export const MAX_BULK_DELETE = 200;
