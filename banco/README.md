# Banco de dados

## Diagrama
Cole `diagrama.dbml` em https://dbdiagram.io e exporte a imagem para o artigo (Fonte: Autor, 2026).

## Supabase — ordem de execução (SQL Editor)
1. `supabase/migrations/0001_schema.sql` — tabelas, regras, funções e segurança (RLS)
2. `supabase/migrations/0002_storage.sql` — buckets de fotos
3. Ativar **pg_cron** em Database > Extensions e rodar `supabase/migrations/0003_cron.sql`
4. `supabase/seed.sql` — Brasil, estados, zonas de busca e prazos de expiração
5. `supabase/seed_cidades.sql` — 5.571 municípios com coordenadas (IBGE)

Para virar administrador: `update perfis set e_admin = true where id = '<seu id>';`
