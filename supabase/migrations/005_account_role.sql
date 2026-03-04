-- Account level for app-level roles: admin, standard user, test user.
-- Stored on profiles so the app can branch on account_role.

CREATE TYPE public.account_role AS ENUM ('admin', 'user', 'test');

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS account_role public.account_role NOT NULL DEFAULT 'user';

-- Trigger: set account_role from signup metadata when provided
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    meta_role TEXT := NEW.raw_user_meta_data ->> 'account_role';
    role_val  public.account_role := 'user';
BEGIN
    IF meta_role IN ('admin', 'user', 'test') THEN
        role_val := meta_role::public.account_role;
    END IF;
    INSERT INTO public.profiles (id, email, full_name, avatar_url, account_role)
    VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data ->> 'full_name',
        NEW.raw_user_meta_data ->> 'avatar_url',
        role_val
    );
    RETURN NEW;
END;
$$;

COMMENT ON COLUMN public.profiles.account_role IS 'App-level role: admin, user, or test. Used for feature flags and support.';
