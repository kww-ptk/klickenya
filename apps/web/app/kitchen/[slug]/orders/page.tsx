import { redirect } from "next/navigation";

/** Was the station board; now /tablet/<slug>/stations. */
export default async function LegacyStationsRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/tablet/${slug}/stations`);
}
