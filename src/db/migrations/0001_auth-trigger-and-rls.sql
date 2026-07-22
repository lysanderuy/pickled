-- Custom migration: wire profiles to Supabase Auth + lock down PostgREST.
-- Delete this file (and 0000_*) before first migrate if your project
-- does not need the profiles table.

-- 1. Integrity: profile rows belong to auth users, die with them.
ALTER TABLE "profiles"
  ADD CONSTRAINT "profiles_id_auth_users_fk"
  FOREIGN KEY ("id") REFERENCES auth.users("id") ON DELETE CASCADE;
--> statement-breakpoint

-- 2. Enable RLS with NO policies: blocks all PostgREST (/rest/v1) access via
-- the anon key. Drizzle is unaffected (connects as postgres, bypasses RLS).
-- Do this for EVERY table this template adds.
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

-- 3. Auto-create a profile row on signup.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;
--> statement-breakpoint

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
