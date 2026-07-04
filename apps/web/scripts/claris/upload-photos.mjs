/**
 * Phase C photos — upload local Claris villa images into Klickenya's Supabase
 * `room-photos` bucket, then set each villa room's `photos` to the public URLs.
 * DEV rehearsal. Hero + up to 5 gallery per villa. Idempotent (upsert:true).
 */
const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const { createClient } = require("@supabase/supabase-js");

const clarisUrl = fs.readFileSync("D:/ClarisAfricanExperience/.env", "utf8")
  .match(/^DATABASE_URL=(.+)$/m)[1].trim();
const kEnv = fs.readFileSync("D:/klickenya/apps/web/.env.local", "utf8");
const SUPA_URL = kEnv.match(/^NEXT_PUBLIC_SUPABASE_URL="?(.+?)"?$/m)[1].trim();
const SUPA_KEY = kEnv.match(/^SUPABASE_SERVICE_ROLE_KEY="?(.+?)"?$/m)[1].trim();
const supa = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });

const BUCKET = "room-photos";
const IMG_DIR = "D:/ClarisAfricanExperience/assets/img/"; // filenames include "rooms/..."
const PER_VILLA = 999;

const ctype = (f) => f.endsWith(".png") ? "image/png" : f.endsWith(".webp") ? "image/webp" : "image/jpeg";

async function main() {
  // Ensure bucket exists + public.
  const { data: buckets } = await supa.storage.listBuckets();
  if (!buckets?.some((b) => b.name === BUCKET)) {
    const { error } = await supa.storage.createBucket(BUCKET, { public: true });
    if (error) throw error;
    console.log(`created bucket ${BUCKET}`);
  }

  const neon = new Client({ connectionString: clarisUrl, connectionTimeoutMillis: 8000 });
  await neon.connect();
  const { rows: villas } = await neon.query(`select id, slug, name from rooms where is_published order by sort_order`);
  const { rows: imgs } = await neon.query(`select room_id, filename, is_hero from room_images order by room_id, is_hero desc, sort_order`);
  await neon.end();
  const byRoom = {};
  for (const i of imgs) (byRoom[i.room_id] ||= []).push(i.filename);

  let villaOk = 0, uploaded = 0, missing = 0;
  for (const v of villas) {
    const files = (byRoom[v.id] || []).slice(0, PER_VILLA);
    const urls = [];
    for (const rel of files) {
      const local = path.join(IMG_DIR, rel);
      if (!fs.existsSync(local)) { missing++; continue; }
      const buf = fs.readFileSync(local);
      const dest = `claris/${v.slug}/${path.basename(rel)}`;
      const { error } = await supa.storage.from(BUCKET).upload(dest, buf, { contentType: ctype(rel), upsert: true });
      if (error) { console.error(`  ✗ ${dest}: ${error.message}`); continue; }
      urls.push(supa.storage.from(BUCKET).getPublicUrl(dest).data.publicUrl);
      uploaded++;
    }
    if (!urls.length) { console.warn(`  ⚠ ${v.slug}: no images`); continue; }

    // Find the Klickenya room via the property booking_slug.
    const { data: prop } = await supa.from("properties").select("id").eq("booking_slug", v.slug).maybeSingle();
    if (!prop) { console.warn(`  ⚠ no property for ${v.slug}`); continue; }
    const { error: uErr } = await supa.from("rooms").update({ photos: urls }).eq("property_id", prop.id);
    if (uErr) { console.error(`  ✗ update ${v.slug}: ${uErr.message}`); continue; }
    villaOk++;
    if (villaOk % 10 === 0) console.log(`  ...${villaOk} villas done`);
  }
  console.log(`\n✅ ${villaOk}/${villas.length} villas updated · ${uploaded} images uploaded · ${missing} local files missing`);
}
main().catch((e) => { console.error("❌", e.message || e); process.exit(1); });
