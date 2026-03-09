-- Email and Automated Monitoring System
-- Created: 2025-02-03
-- Purpose: Add email notifications queue and automated monitoring features

-- Email templates and queue already exist
-- Add function to process email queue
create or replace function process_email_queue()
returns void
language plpgsql
security definer
as $$
begin
  -- This function would be called by a scheduled task
  -- For now, it's a placeholder for future cron job integration
  update email_queue
  set status = 'pending'
  where status = 'pending'
  and created_at < now() - interval '5 minutes';
end;
$$;

-- Function to send welcome email
create or replace function send_welcome_email(user_email text, user_name text)
returns void
language plpgsql
security definer
as $$
begin
  insert into email_queue (
    email_type,
    recipient_email,
    subject,
    body,
    status
  ) values (
    'welcome',
    user_email,
    'Welcome to Scammer''s Knightmare!',
    format(
      'Hi %s,

Welcome to Scammer''s Knightmare - your ultimate protection against online scams and threats!

Your account has been successfully created. Here''s what you can do now:

🔍 Run your first free threat scan
🛡️ Protect yourself from scammers and predators
📊 View your scan history and analytics
💎 Upgrade to Premium for unlimited scans and AI features

Get started: https://your-domain.com/scan

Need help? Reply to this email or contact support.

Stay safe,
The Scammer''s Knightmare Team',
      user_name
    ),
    'pending'
  );
end;
$$;

-- Function to send scan alert email
create or replace function send_scan_alert_email(
  user_email text,
  scan_type text,
  threat_level text,
  input_data text
)
returns void
language plpgsql
security definer
as $$
declare
  severity_emoji text;
  alert_title text;
begin
  -- Set emoji based on threat level
  severity_emoji := case threat_level
    when 'critical' then '🚨'
    when 'high' then '⚠️'
    when 'medium' then '⚡'
    when 'low' then 'ℹ️'
    else '✅'
  end;

  alert_title := case 
    when threat_level in ('critical', 'high') then 'THREAT DETECTED'
    when threat_level = 'medium' then 'Warning'
    else 'Scan Complete'
  end;

  insert into email_queue (
    email_type,
    recipient_email,
    subject,
    body,
    status
  ) values (
    'scan_alert',
    user_email,
    format('%s %s - %s Scan Results', severity_emoji, alert_title, scan_type),
    format(
      'Your scan has been completed.

Scan Type: %s
Input: %s
Threat Level: %s

%s

View full details: https://your-domain.com/history

Stay vigilant,
Scammer''s Knightmare',
      upper(scan_type),
      input_data,
      upper(threat_level),
      case 
        when threat_level in ('critical', 'high') then 'WARNING: This scan detected significant threats. Exercise extreme caution and do not proceed with this contact.'
        when threat_level = 'medium' then 'CAUTION: Some suspicious indicators were found. Proceed carefully.'
        else 'No major threats detected, but always stay vigilant.'
      end
    ),
    'pending'
  );
end;
$$;

-- Trigger to send welcome email on user creation
create or replace function trigger_welcome_email()
returns trigger
language plpgsql
security definer
as $$
begin
  perform send_welcome_email(
    NEW.email,
    coalesce(NEW.username, split_part(NEW.email, '@', 1))
  );
  return NEW;
end;
$$;

drop trigger if exists on_user_created_send_welcome on public.user_profiles;
create trigger on_user_created_send_welcome
  after insert on public.user_profiles
  for each row
  execute function trigger_welcome_email();

-- Automated monitoring improvements
-- Add notification preferences
alter table auto_monitor_config
add column if not exists notify_on_change boolean default true,
add column if not exists notify_email boolean default true,
add column if not exists last_threat_level text;

-- Function to check and notify on threat level changes
create or replace function check_auto_monitors()
returns void
language plpgsql
security definer
as $$
declare
  monitor_rec record;
  scan_result jsonb;
  new_threat_level text;
begin
  -- Find monitors that are due for scanning
  for monitor_rec in
    select 
      am.*,
      up.email,
      up.username
    from auto_monitor_config am
    join user_profiles up on up.id = am.user_id
    where am.is_active = true
    and (
      (am.frequency = 'hourly' and am.last_scan_at < now() - interval '1 hour')
      or (am.frequency = 'daily' and am.last_scan_at < now() - interval '1 day')
      or (am.frequency = 'weekly' and am.last_scan_at < now() - interval '7 days')
      or am.last_scan_at is null
    )
  loop
    -- Note: Actual scanning would be done via edge function
    -- This is a placeholder that updates the scan timestamp
    update auto_monitor_config
    set last_scan_at = now()
    where id = monitor_rec.id;

    -- If threat level changed and notifications enabled, send email
    -- (This would be expanded with actual scan results)
    if monitor_rec.notify_email then
      insert into email_queue (
        user_id,
        email_type,
        recipient_email,
        subject,
        body,
        status
      ) values (
        monitor_rec.user_id,
        'auto_monitor',
        monitor_rec.email,
        format('Auto-Monitor Alert: %s', monitor_rec.target_value),
        format(
          'Your automated monitoring scan has completed.

Target: %s (%s)
Frequency: %s
Last Scanned: %s

View results: https://your-domain.com/history

Scammer''s Knightmare Auto-Monitor',
          monitor_rec.target_value,
          monitor_rec.monitor_type,
          monitor_rec.frequency,
          now()
        ),
        'pending'
      );
    end if;
  end loop;
end;
$$;

-- Add index for email queue processing
create index if not exists idx_email_queue_pending 
  on email_queue(status, created_at) 
  where status = 'pending';

-- Grant necessary permissions
grant execute on function send_welcome_email to service_role;
grant execute on function send_scan_alert_email to service_role;
grant execute on function check_auto_monitors to service_role;

-- Comments
comment on function send_welcome_email is 'Queues welcome email for new users';
comment on function send_scan_alert_email is 'Queues scan result notification email';
comment on function check_auto_monitors is 'Processes automated monitoring scans and notifications';
