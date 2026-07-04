# Claris migration scripts (one-off)

Requires: `npm i pg @supabase/supabase-js` in the run environment.

1. `import-villas.mjs` — reads Claris villas from its Neon DB (path in the file:
   `D:\ClarisAfricanExperience\.env` → DATABASE_URL) and creates one Klickenya
   property per villa (booking_slug = villa slug) + a room each, price 0.
2. `upload-photos.mjs` — uploads local Claris images
   (`D:\ClarisAfricanExperience\assets\img\`) to the Supabase `room-photos`
   bucket and sets each villa room's `photos`.

Target Klickenya project is read from `apps/web/.env.local`
(`NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`). Set these to
PRODUCTION before a prod run. Change HOST_EMAIL from `claris-pilot@klickenya.test`
to the real Claris host email first. Run import first, then photos.
See ../../docs/claris-handoff-patrick.md.
