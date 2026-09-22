/**
 * Put a starter construction timeline on a new-development property.
 *
 * Run it:
 *   cd apps/web
 *   SANITY_WRITE_TOKEN=<write-token> npx tsx scripts/seed-construction-milestones.ts --dry-run
 *   SANITY_WRITE_TOKEN=<write-token> npx tsx scripts/seed-construction-milestones.ts --slug=nuri-residence-watamu
 *
 * WRITES A DRAFT, NOT A PUBLISHED DOCUMENT, and that is deliberate.
 *
 * The dataset is `production` — klickenya.com serves from it. These listings are
 * real properties being sold to real buyers, and nobody running this script
 * knows when the roof actually went on. Publishing an invented "Roofing
 * completed March 2026" onto a live listing is publishing a claim about someone
 * else's building. So the script writes to `drafts.<id>`, which shows up in
 * Studio with everything filled in and shows up nowhere on the site. Correct the
 * dates and statuses to what is true, then press Publish.
 *
 * Pass --publish only once the dates are real. There is no undo on the live
 * site beyond editing the document again.
 *
 * Idempotent. It writes to the draft of a specific existing property, so a
 * second run replaces that draft's milestones rather than creating anything new.
 * It never touches a published document unless --publish is passed.
 *
 * Stage values must match CONSTRUCTION_STAGES in lib/real-estate/progress.ts.
 * A test enforces that (lib/real-estate/__tests__/progress.test.ts), so if this
 * script's stages drift from the schema the suite goes red rather than the
 * percentage quietly reading low.
 */

import { createClient } from "next-sanity";

/* ── Config ────────────────────────────────────────── */

const DRY_RUN = process.argv.includes("--dry-run");
const PUBLISH = process.argv.includes("--publish");
const SLUG =
  process.argv.find((a) => a.startsWith("--slug="))?.split("=")[1] ??
  "nuri-residence-watamu";
/** Stage currently under way. Everything before it is done, everything after upcoming. */
const AT = process.argv.find((a) => a.startsWith("--at="))?.split("=")[1];
/** Target handover date, YYYY-MM-DD. */
const HANDOVER = process.argv.find((a) => a.startsWith("--handover="))?.split("=")[1];

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "b9zd8u9f",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production",
  apiVersion: "2024-01-01",
  useCdn: false,
  token: process.env.SANITY_WRITE_TOKEN,
});

/**
 * Placeholder programme. Every date here is a guess and is meant to be edited.
 * The shape is what matters: which stages exist, which carry a date, where a
 * note earns its place.
 */
const MILESTONES = [
  {
    _type: "constructionMilestone",
    _key: "m-groundbreaking",
    stage: "groundbreaking",
    status: "done",
    completedDate: "2025-02-10",
  },
  {
    _type: "constructionMilestone",
    _key: "m-foundation",
    stage: "foundation",
    status: "done",
    completedDate: "2025-05-05",
  },
  {
    _type: "constructionMilestone",
    _key: "m-superstructure",
    stage: "superstructure",
    status: "done",
    completedDate: "2025-11-20",
  },
  {
    _type: "constructionMilestone",
    _key: "m-roofing",
    stage: "roofing",
    status: "in-progress",
    targetDate: "2026-04-01",
    note: "CHECK THIS — placeholder text, replace with the real position.",
  },
  {
    _type: "constructionMilestone",
    _key: "m-walling-plaster",
    stage: "walling-plaster",
    status: "upcoming",
    targetDate: "2026-06-01",
  },
  {
    _type: "constructionMilestone",
    _key: "m-services",
    stage: "services",
    status: "upcoming",
    targetDate: "2026-08-01",
  },
  {
    _type: "constructionMilestone",
    _key: "m-finishes",
    stage: "finishes",
    status: "upcoming",
    targetDate: "2026-10-01",
  },
  {
    _type: "constructionMilestone",
    _key: "m-handover",
    stage: "handover",
    status: "upcoming",
    targetDate: "2026-12-01",
  },
];

const STAGE_ORDER = [
  "groundbreaking",
  "foundation",
  "superstructure",
  "roofing",
  "walling-plaster",
  "services",
  "finishes",
  "handover",
];

/**
 * Build a programme from where the site actually is, without inventing history.
 *
 * Knowing a development is "at the door stage" tells you which stages are behind
 * it. It does not tell you when each of them finished. So completed stages are
 * marked done with NO completedDate — the rail renders a ticked label and no
 * date line, which is the truth. Fill the dates in Studio if you know them.
 */
function programmeFrom(at: string, handover?: string) {
  const i = STAGE_ORDER.indexOf(at);
  if (i === -1) {
    console.error(`Unknown stage "${at}". One of: ${STAGE_ORDER.join(", ")}`);
    process.exit(1);
  }
  return STAGE_ORDER.map((stage, j) => {
    const status = j < i ? "done" : j === i ? "in-progress" : "upcoming";
    const entry: Record<string, unknown> = {
      _type: "constructionMilestone",
      _key: `m-${stage}`,
      stage,
      status,
    };
    if (stage === "handover" && handover && status !== "done") {
      entry.targetDate = handover;
    }
    return entry;
  });
}

async function main() {
  if (!process.env.SANITY_WRITE_TOKEN && !DRY_RUN) {
    console.error("SANITY_WRITE_TOKEN is not set. Nothing written.");
    process.exit(1);
  }

  const property = await client.fetch<{
    _id: string;
    title: string;
    isNewDevelopment?: boolean;
  } | null>(
    `*[_type == "property" && slug.current == $slug][0]{ _id, title, isNewDevelopment }`,
    { slug: SLUG }
  );

  if (!property) {
    console.error(`No property with slug "${SLUG}".`);
    process.exit(1);
  }

  // The timeline only renders when this flag is on — seeding milestones onto a
  // listing without it produces data nobody will ever see.
  if (!property.isNewDevelopment) {
    console.error(
      `"${property.title}" is not flagged as a new development, so the timeline ` +
        `would not render. Turn on "New development / off-plan" in Studio first.`
    );
    process.exit(1);
  }

  // A listing that exists only as a draft comes back with its drafts. prefix
  // already attached. Prefixing again writes to drafts.drafts.<id>, a document
  // nothing reads — silent, and exactly the kind of thing that looks like the
  // write simply did not happen.
  const publishedId = property._id.replace(/^drafts\./, "");
  const targetId = PUBLISH ? publishedId : `drafts.${publishedId}`;

  const milestones = AT ? programmeFrom(AT, HANDOVER) : MILESTONES;

  console.log(`Property : ${property.title} (${property._id})`);
  console.log(`Target   : ${targetId}`);
  console.log(`Stages   : ${milestones.length}${AT ? ` (in progress at "${AT}")` : " (placeholder dates)"}`);
  console.log(
    `Mode     : ${PUBLISH ? "PUBLISHED — goes live on klickenya.com" : "draft — invisible on the site until you publish it in Studio"}`
  );

  if (DRY_RUN) {
    console.log("\n--dry-run, nothing written.");
    return;
  }

  if (PUBLISH) {
    await client.patch(property._id).set({ constructionMilestones: milestones }).commit();
    console.log("\nPublished. The timeline is live. Check the dates.");
    return;
  }

  // createOrReplace on the draft: a second run overwrites the same draft rather
  // than stacking up, and the published document is left alone either way.
  const existingDraft = await client.fetch<Record<string, unknown> | null>(
    `*[_id == $id][0]`,
    { id: targetId }
  );
  const base =
    existingDraft ??
    (await client.fetch<Record<string, unknown>>(`*[_id == $id][0]`, {
      id: publishedId,
    }));

  await client.createOrReplace({
    ...base,
    _id: targetId,
    constructionMilestones: milestones,
  } as never);

  console.log(
    "\nDraft written. Open the property in Studio, correct every date to what " +
      "is actually true, then press Publish. Nothing is live yet."
  );
}

main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
