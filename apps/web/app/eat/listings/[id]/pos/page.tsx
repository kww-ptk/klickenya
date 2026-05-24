/**
 * /eat/listings/[id]/pos
 * Re-export of the legacy /dashboard/listings/[id]/pos page (POS management:
 * sign-in URL + staff PIN management). The actual terminal lives at /pos/<slug>
 * and is unchanged.
 */
export { default } from "../../../../dashboard/listings/[id]/pos/page";
