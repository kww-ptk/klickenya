import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars"
  );
  process.exit(1);
}

const [email, password] = process.argv.slice(2);

if (!email || !password) {
  console.error("Usage: pnpm create:admin <email> <password>");
  process.exit(1);
}

(async () => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError) {
      console.error("Failed to create auth user:", authError.message);
      process.exit(1);
    }

    console.log("Auth user created:", authData.user.id);

    // 2. Insert into users table
    const { error: dbError } = await supabase.from("users").upsert({
      id: authData.user.id,
      email,
      role: "admin",
    });

    if (dbError) {
      console.error("Failed to insert into users table:", dbError.message);
      process.exit(1);
    }

    console.log(`Admin user created successfully: ${email} (${authData.user.id})`);
  } catch (err) {
    console.error("Unexpected error:", err);
    process.exit(1);
  }
})();
