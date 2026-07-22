import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config({ path: ".env" });

// One-time per-deployment seed: the singleton facility_profile (placeholder
// values, editable in Facility Settings) + an owner_admin staff row linked to
// the first auth user. Idempotent — safe to re-run.
const sql = postgres(process.env.DIRECT_URL ?? process.env.DATABASE_URL);

const defaultHours = JSON.stringify({
  mon: ["06:00", "22:00"],
  tue: ["06:00", "22:00"],
  wed: ["06:00", "22:00"],
  thu: ["06:00", "22:00"],
  fri: ["06:00", "22:00"],
  sat: ["06:00", "22:00"],
  sun: ["06:00", "22:00"],
});

const [facility] = await sql`
  insert into facility_profile (name, address, contact_phone, contact_email, operating_hours)
  select 'Pickled Demo Facility', 'Cebu City', '', '', ${defaultHours}::jsonb
  where not exists (select 1 from facility_profile)
  returning id, name
`;
console.log(
  facility
    ? `Created facility_profile "${facility.name}" (${facility.id})`
    : "facility_profile already seeded — skipped",
);

const [facilityRow] = await sql`select id from facility_profile limit 1`;

const [authUser] = await sql`
  select id, email from auth.users order by created_at asc limit 1
`;
if (!authUser) {
  console.error("No auth user found — sign in to Supabase Auth first, then re-run.");
  await sql.end();
  process.exit(1);
}

const [staff] = await sql`
  insert into staff (facility_id, auth_user_id, full_name, email, role, status)
  select ${facilityRow.id}, ${authUser.id}, split_part(${authUser.email}, '@', 1),
         ${authUser.email}, 'owner_admin', 'active'
  where not exists (select 1 from staff where email = ${authUser.email})
  returning id, email, role
`;
console.log(
  staff
    ? `Created ${staff.role} staff row for ${staff.email}`
    : `Staff row for ${authUser.email} already exists — skipped`,
);

await sql.end();
