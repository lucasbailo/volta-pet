-- Buckets de arquivos no Supabase Storage.
-- "fotos": público para leitura; cada usuário só grava/apaga dentro da pasta com o próprio id.
--          Caminho esperado: <id do usuário>/<id do anúncio>/<arquivo>.webp
-- "fotos-avisos": privado; usado só pelo servidor para fotos do "Encontrei o animal".
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('fotos',        'fotos',        true,  1048576, array['image/jpeg', 'image/png', 'image/webp']),
  ('fotos-avisos', 'fotos-avisos', false, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "usuario envia fotos na propria pasta" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "usuario apaga fotos da propria pasta" on storage.objects
  for delete to authenticated
  using (bucket_id = 'fotos' and (storage.foldername(name))[1] = auth.uid()::text);
