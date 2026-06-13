import { redirect } from "next/navigation";

/**
 * /eat root — restaurant command center entry point.
 * Always punts to the restaurants list. Auth/role gating happens in middleware.
 */
export default function EatRootPage() {
  redirect("/eat/listings");
}
