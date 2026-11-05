-- Dados iniciais: país, estados, zonas de busca e regras de expiração.
-- Rodar depois das migrations; em seguida, rodar seed_cidades.sql.

insert into public.paises (codigo, nome) values ('BR', 'Brasil') on conflict do nothing;

insert into public.estados (pais_id, sigla, nome)
select p.id, v.sigla, v.nome
from public.paises p,
(values
  ('AC', 'Acre'), ('AL', 'Alagoas'), ('AM', 'Amazonas'), ('AP', 'Amapá'), ('BA', 'Bahia'),
  ('CE', 'Ceará'), ('DF', 'Distrito Federal'), ('ES', 'Espírito Santo'), ('GO', 'Goiás'),
  ('MA', 'Maranhão'), ('MG', 'Minas Gerais'), ('MS', 'Mato Grosso do Sul'), ('MT', 'Mato Grosso'),
  ('PA', 'Pará'), ('PB', 'Paraíba'), ('PE', 'Pernambuco'), ('PI', 'Piauí'), ('PR', 'Paraná'),
  ('RJ', 'Rio de Janeiro'), ('RN', 'Rio Grande do Norte'), ('RO', 'Rondônia'), ('RR', 'Roraima'),
  ('RS', 'Rio Grande do Sul'), ('SC', 'Santa Catarina'), ('SE', 'Sergipe'), ('SP', 'São Paulo'),
  ('TO', 'Tocantins')
) as v(sigla, nome)
where p.codigo = 'BR'
on conflict do nothing;

-- RN01: zonas de busca.
-- Gatos: Huang et al. (2018) — mediana (50%) e percentil 75.
-- Cães: Kremer (2021) — 42% a menos de ~122 m (400 pés) e 70% a menos de 1 milha.
-- Gato "sai supervisionado" não tem valor próprio no estudo: usa o geral.
insert into public.zonas_busca (especie, perfil_saida, interna_m, interna_pct, externa_m, externa_pct, fonte) values
  ('gato',     'so_dentro_de_casa',  39,  50,  137, 75, 'Huang et al., 2018'),
  ('gato',     'sai_supervisionado', 50,  50,  500, 75, 'Huang et al., 2018 (geral)'),
  ('gato',     'sai_sozinho',        300, 50, 1609, 75, 'Huang et al., 2018'),
  ('gato',     'desconhecido',       50,  50,  500, 75, 'Huang et al., 2018 (geral)'),
  ('cachorro', 'so_dentro_de_casa',  122, 42, 1609, 70, 'Kremer, 2021'),
  ('cachorro', 'sai_supervisionado', 122, 42, 1609, 70, 'Kremer, 2021'),
  ('cachorro', 'sai_sozinho',        122, 42, 1609, 70, 'Kremer, 2021'),
  ('cachorro', 'desconhecido',       122, 42, 1609, 70, 'Kremer, 2021')
on conflict do nothing;
-- Pássaros e outros: sem zona (o mapa mostra só o ponto).

-- RN02: expiração. "encontrado" segue os mesmos prazos (assumido; ajuste se quiser).
insert into public.regras_expiracao (tipo, dias_validade, dias_lembrete, dias_remocao) values
  ('desaparecido', 60, 30, 180),
  ('encontrado',   60, 30, 180),
  ('doacao',       60, 30, 180)
on conflict do nothing;
