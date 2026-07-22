import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });
config({ path: ".env" });

const sql = postgres(process.env.DIRECT_URL ?? process.env.DATABASE_URL);

const users = await sql`
  select email, created_at, confirmation_sent_at, email_confirmed_at, last_sign_in_at
  from auth.users
  order by created_at desc
  limit 10
`;

console.log(JSON.stringify(users, null, 2));
await sql.end();
