-- Agenda a rotina diária (lembretes, expiração, remoção e limpeza LGPD).
-- Antes, ative a extensão pg_cron em Database > Extensions no painel do Supabase.
-- 06:00 UTC = 03:00 no horário de Brasília.
create extension if not exists pg_cron;
select cron.schedule('rotina-diaria', '0 6 * * *', $$select public.rotina_diaria()$$);
