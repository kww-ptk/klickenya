/**
 * /eat/listings/[id]/kitchen
 *
 * The legacy /dashboard/listings/[id]/kitchen page redirects to the stock
 * pages under /dashboard/menu/<menuId>/stock. We mirror that behaviour here
 * so the eat tab behaves the same; the redirect target stays the legacy
 * route until Klickenya Kitchen migrates under /eat.
 */
export { default } from "../../../../dashboard/listings/[id]/kitchen/page";
