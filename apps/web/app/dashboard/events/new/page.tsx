import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AddEventForm } from "./AddEventForm";

export default async function NewEventPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: hostProfile } = await supabase
    .from("host_profiles")
    .select("user_id, display_name, sanity_host_id")
    .eq("user_id", user.id)
    .single();

  if (!hostProfile) redirect("/dashboard");

  return (
    <div>
      <h1 className="font-display text-[clamp(24px,3.5vw,32px)] font-bold text-text tracking-[-0.03em] mb-2">
        Add your event
      </h1>
      <p className="text-text2 text-[15px] mb-8">
        Share what&apos;s happening in Kenya — it only takes a few minutes.
      </p>
      <AddEventForm
        hostDisplayName={hostProfile.display_name ?? ""}
        sanityHostId={hostProfile.sanity_host_id ?? null}
      />
    </div>
  );
}
