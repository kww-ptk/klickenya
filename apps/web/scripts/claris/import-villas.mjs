/**
 * Phase C DEV rehearsal — OPTION B. Each Claris villa becomes its own Klickenya
 * property, keyed by the villa's own slug, with a single room (the villa itself).
 * This lets each villa page embed a widget scoped to just that villa.
 * Idempotent: wipes prior Claris-host properties first. DEV only.
 */
const fs = require("fs");
const { Client } = require("pg");
const { createClient } = require("@supabase/supabase-js");

const clarisUrl = fs.readFileSync("D:/ClarisAfricanExperience/.env", "utf8")
  .match(/^DATABASE_URL=(.+)$/m)[1].trim();
const kEnv = fs.readFileSync("D:/klickenya/apps/web/.env.local", "utf8");
const SUPA_URL = kEnv.match(/^NEXT_PUBLIC_SUPABASE_URL="?(.+?)"?$/m)[1].trim();
const SUPA_KEY = kEnv.match(/^SUPABASE_SERVICE_ROLE_KEY="?(.+?)"?$/m)[1].trim();
const supa = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });

const IMG_BASE = "https://clarisafricanexperience.com/assets/img/";
const HOST_EMAIL = "claris-pilot@klickenya.test";

async function main() {
  // 1. Read villas + images from Neon.
  const neon = new Client({ connectionString: clarisUrl, connectionTimeoutMillis: 8000 });
  await neon.connect();
  const { rows: villas } = await neon.query(
    `select id, slug, name, capacity, bed_count, short_desc, long_desc, features_json, sort_order
     from rooms where is_published order by sort_order`);
  const { rows: imgs } = await neon.query(
    `select room_id, filename, is_hero from room_images order by room_id, is_hero desc, sort_order`);
  await neon.end();
  const imgByRoom = {};
  for (const i of imgs) (imgByRoom[i.room_id] ||= []).push(IMG_BASE + i.filename);
  console.log(`Neon: ${villas.length} villas`);

  // 2. Claris host (reuse existing).
  const { data: list } = await supa.auth.admin.listUsers({ page: 1, perPage: 200 });
  const existing = list.users.find((u) => u.email === HOST_EMAIL);
  let ownerId = existing?.id;
  if (!ownerId) {
    const { data: c, error } = await supa.auth.admin.createUser({
      email: HOST_EMAIL, email_confirm: true, user_metadata: { name: "Claris African Experience" } });
    if (error) throw error; ownerId = c.user.id;
    await supa.from("host_profiles").insert({
      user_id: ownerId, slug: "claris-african-experience",
      display_name: "Claris African Experience", email: HOST_EMAIL });
  }
  // Ensure a public.users row with the host role, so login lands on /dashboard
  // (not /profile). Upsert so it self-heals for an already-existing host too.
  await supa.from("users").upsert(
    { id: ownerId, email: HOST_EMAIL, role: "host", full_name: "Claris African Experience" },
    { onConflict: "id" }
  );
  console.log("host:", ownerId);

  // 3. Wipe prior Claris-host properties (removes option-A setup + any prior B run).
  const { data: old } = await supa.from("properties").select("id").eq("owner_id", ownerId);
  if (old && old.length) {
    await supa.from("properties").delete().eq("owner_id", ownerId);
    console.log(`removed ${old.length} prior properties`);
  }

  // 4. Create one property per villa, each with a single room.
  let ok = 0;
  for (const v of villas) {
    const { data: prop, error: pErr } = await supa.from("properties").insert({
      owner_id: ownerId, name: v.name, property_type: "villa",
      city: "Watamu", county: "Kilifi", renting_type: "by_room",
      booking_slug: v.slug, is_active: true,
    }).select("id").single();
    if (pErr) { console.error(`  ✗ ${v.slug}: ${pErr.message}`); continue; }

    const { error: rErr } = await supa.from("rooms").insert({
      property_id: prop.id, name: v.name, room_type: "villa",
      max_guests: v.capacity || 2, base_price_kes: 0,
      description: v.short_desc || v.long_desc || null,
      amenities: Array.isArray(v.features_json) ? v.features_json.slice(0, 30) : [],
      photos: (imgByRoom[v.id] || []).slice(0, 12),
      is_active: true, display_order: 0,
    });
    if (rErr) { console.error(`  ✗ room ${v.slug}: ${rErr.message}`); continue; }
    ok++;
  }
  console.log(`\n✅ Created ${ok}/${villas.length} villa properties.`);
  console.log(`   Example: http://localhost:3000/embed/booking/${villas[0].slug}`);
}
main().catch((e) => { console.error("❌", e.message || e); process.exit(1); });
