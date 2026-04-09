-- Schedule the Telegram digest edge function for the UK morning.
-- Runs at 08:00 UTC daily. The edge function uses Europe/London timezone
-- internally so dates remain correct across BST/GMT transitions.
-- CRON_SECRET placeholder is substituted by setup.sh before this is applied.

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
DECLARE
    existing_job_id BIGINT;
BEGIN
    SELECT jobid
    INTO existing_job_id
    FROM cron.job
    WHERE jobname = 'telegram-digest-daily';

    IF existing_job_id IS NOT NULL THEN
        PERFORM cron.unschedule(existing_job_id);
    END IF;
END;
$$;

SELECT cron.schedule(
    'telegram-digest-daily',
    '0 8 * * *',
    $$
    SELECT net.http_post(
        url := 'https://jzalaltexmotkusvqoew.supabase.co/functions/v1/telegram-digest',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-cron-secret', '__CRON_SECRET__'
        ),
        body := '{}'::jsonb
    ) AS request_id;
    $$
);
