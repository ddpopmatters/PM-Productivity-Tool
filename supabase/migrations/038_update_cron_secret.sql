-- Re-schedule the Telegram digest cron job with the rotated CRON_SECRET.
-- __CRON_SECRET__ is substituted by setup-telegram.sh before this is applied.
-- Do not commit this file with a materialized secret.

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
