-- À exécuter APRÈS avoir déployé weekly-report et défini le secret CRON_SECRET.
-- Remplace <CRON_SECRET> par la même valeur que `supabase secrets set CRON_SECRET=...`
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'tandem-weekly-report',
  '0 17 * * 0',   -- dimanche 17:00 UTC = 18h Paris en hiver (19h en été ; ajuster si besoin)
  $$
  select net.http_post(
    url := 'https://sttsvpqrvzsyqswejrpc.supabase.co/functions/v1/weekly-report',
    headers := '{"Content-Type":"application/json","x-cron-secret":"<CRON_SECRET>"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
