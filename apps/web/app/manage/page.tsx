import { redirect } from "next/navigation";

/**
 * /manage root — restaurant command center entry point.
 * Always punts to the restaurants list. Auth/role gating happens in middleware.
 */
export default function EatRootPage() {
  redirect("/manage/listings");
}
