-- Create admin users migration
-- This script sets up the two admin accounts

-- Note: Admin users will be created via the AdminLogin.tsx component
-- on first login. This migration ensures the trigger is in place.

-- Update the admin trigger to handle both admin emails
create or replace function public.ensure_admin_user()
returns trigger
language plpgsql
security definer
as $$
begin
  -- Set admin flag for both admin emails
  if new.email in ('admin@scammersknightmare.com', 'backup_admin@scammersknightmare.com', 'jackschitt1134@gmail.com') then
    update public.user_profiles
    set 
      is_admin = true,
      tier = 'family',
      scans_remaining = null
    where id = new.id;
  end if;
  return new;
end;
$$;

-- Ensure trigger exists
drop trigger if exists on_admin_user_created on public.user_profiles;
create trigger on_admin_user_created
  after insert on public.user_profiles
  for each row
  execute function public.ensure_admin_user();

-- Comment for documentation
comment on function public.ensure_admin_user is 'Auto-assigns admin privileges to admin@scammersknightmare.com, backup_admin@scammersknightmare.com, and jackschitt1134@gmail.com';
