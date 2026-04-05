import { redirect } from "next/navigation";
import { getAuthUser } from "../_lib/auth";

export default async function PropertyListPage() {
  const { user } = await getAuthUser();
  if (!user) redirect("/login");
  redirect("/dashboard/property/calendar");
}
