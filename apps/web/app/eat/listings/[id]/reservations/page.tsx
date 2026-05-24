/**
 * /eat/listings/[id]/reservations
 *
 * Re-export of the legacy /dashboard/listings/[id]/reservations page. Same
 * params shape, same data fetch, same component tree — only the URL changes
 * so the eat shell (slim sidebar + restaurant-only tabs) stays in scope.
 *
 * If/when the legacy route is retired, this file becomes the canonical home
 * and the import flips.
 */
export { default } from "../../../../dashboard/listings/[id]/reservations/page";
