import { redirect } from "next/navigation";

/** Was a single station; now /tablet/<slug>/stations/<station>. */
export default async function LegacyStationRedirect({
  params,
}: {
  params: Promise<{ slug: string; station: string }>;
}) {
  const { slug, station } = await params;
  redirect(`/tablet/${slug}/stations/${station}`);
}
