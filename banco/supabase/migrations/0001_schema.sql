-- =====================================================================
-- Plataforma de Pets Desaparecidos e Doação — schema do banco (Supabase)
-- Rodar no SQL Editor do Supabase, na ordem: 0001, 0002, 0003, seed.
-- =====================================================================

create extension if not exists postgis with schema extensions;

-- ---------------------------------------------------------------------
-- 1. TIPOS (ENUMS)
-- ---------------------------------------------------------------------
create type public.tipo_perfil     as enum ('pessoa', 'ong');
create type public.status_ong      as enum ('pendente', 'aprovada', 'recusada');
create type public.tipo_anuncio    as enum ('desaparecido', 'encontrado', 'doacao');
create type public.status_anuncio  as enum ('ativo', 'resolvido', 'expirado', 'oculto');
create type public.especie         as enum ('cachorro', 'gato', 'passaro', 'outro');
create type public.sexo_animal     as enum ('macho', 'femea', 'desconhecido');
create type public.porte_animal    as enum ('pequeno', 'medio', 'grande');
create type public.perfil_saida    as enum ('so_dentro_de_casa', 'sai_supervisionado', 'sai_sozinho', 'desconhecido');
create type public.precisao_local  as enum ('exato', 'aproximado');
create type public.motivo_denuncia as enum ('golpe', 'anuncio_falso', 'conteudo_improprio', 'outro');
create type public.status_denuncia as enum ('pendente', 'confirmada', 'descartada');

-- ---------------------------------------------------------------------
-- 2. LOCALIZAÇÃO (país -> estado -> cidade)  [RNF06]
-- ---------------------------------------------------------------------
create table public.paises (
  id      smallint generated always as identity primary key,
  codigo  char(2) not null unique,              -- ISO: BR
  nome    text not null
);

create table public.estados (
  id       int generated always as identity primary key,
  pais_id  smallint not null references public.paises(id),
  sigla    varchar(3) not null,
  nome     text not null,
  unique (pais_id, sigla)
);

create table public.cidades (
  id           int generated always as identity primary key,
  estado_id    int not null references public.estados(id),
  nome         text not null,
  codigo_ibge  int unique,
  centro       extensions.geography(Point, 4326),
  unique (estado_id, nome)
);
create index cidades_estado_idx on public.cidades (estado_id);

-- ---------------------------------------------------------------------
-- 3. PERFIS (1:1 com auth.users do Supabase)
-- ---------------------------------------------------------------------
create table public.perfis (
  id             uuid primary key references auth.users(id) on delete cascade,
  tipo           public.tipo_perfil not null default 'pessoa',
  nome           text not null check (char_length(nome) between 1 and 100),
  cidade_id      int references public.cidades(id),
  foto_url       text,
  instagram      text,
  facebook       text,
  site           text,
  e_admin        boolean not null default false,
  -- campos de ONG
  ong_cnpj       varchar(14) unique check (ong_cnpj ~ '^[0-9]{14}$'),
  ong_descricao  text check (char_length(ong_descricao) <= 2000),
  ong_chave_pix  text,
  ong_status     public.status_ong,
  criado_em      timestamptz not null default now(),
  constraint pessoa_sem_dados_ong check (tipo = 'ong' or (ong_cnpj is null and ong_status is null)),
  constraint ong_com_cnpj         check (tipo = 'pessoa' or (ong_cnpj is not null and ong_status is not null))
);

-- Cria o perfil automaticamente quando alguém se cadastra no Supabase Auth.
-- O front envia nome/tipo/ong_cnpj em options.data no signUp.
create function public.criar_perfil()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_tipo public.tipo_perfil := coalesce(nullif(new.raw_user_meta_data->>'tipo', ''), 'pessoa')::public.tipo_perfil;
begin
  insert into public.perfis (id, nome, tipo, ong_cnpj, ong_status)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'nome', ''), split_part(new.email, '@', 1)),
    v_tipo,
    case when v_tipo = 'ong' then new.raw_user_meta_data->>'ong_cnpj' end,
    case when v_tipo = 'ong' then 'pendente'::public.status_ong end
  );
  return new;
end $$;

create trigger ao_criar_usuario
  after insert on auth.users
  for each row execute function public.criar_perfil();

create function public.e_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select p.e_admin from public.perfis p where p.id = auth.uid()), false)
$$;

-- ---------------------------------------------------------------------
-- 4. CONFIGURAÇÕES AJUSTÁVEIS SEM MEXER NO CÓDIGO  [RNF07, RN01, RN02]
-- ---------------------------------------------------------------------
create table public.zonas_busca (
  especie       public.especie not null,
  perfil_saida  public.perfil_saida not null,
  interna_m     int not null check (interna_m > 0),
  interna_pct   smallint not null check (interna_pct between 1 and 100),
  externa_m     int not null check (externa_m > 0),
  externa_pct   smallint not null check (externa_pct between 1 and 100),
  fonte         text not null,
  primary key (especie, perfil_saida),
  check (externa_m >= interna_m and externa_pct >= interna_pct)
);

create table public.regras_expiracao (
  tipo           public.tipo_anuncio primary key,
  dias_validade  int not null check (dias_validade > 0),
  dias_lembrete  int not null check (dias_lembrete > 0),
  dias_remocao   int not null check (dias_remocao > 0),   -- tempo na aba Expirados antes de apagar
  check (dias_lembrete < dias_validade)
);

-- ---------------------------------------------------------------------
-- 5. ANÚNCIOS (desaparecido, encontrado, doação)
-- ---------------------------------------------------------------------
create table public.anuncios (
  id                   uuid primary key default gen_random_uuid(),
  tipo                 public.tipo_anuncio not null,
  dono_id              uuid not null references public.perfis(id) on delete cascade,
  status               public.status_anuncio not null default 'ativo',

  -- dados do animal
  especie              public.especie not null,
  nome                 text check (char_length(nome) <= 60),
  raca                 text check (char_length(raca) <= 60),
  sexo                 public.sexo_animal not null default 'desconhecido',
  idade_meses          int check (idade_meses between 0 and 400),
  porte                public.porte_animal,
  cor                  text check (char_length(cor) <= 60),
  sinais_particulares  text check (char_length(sinais_particulares) <= 500),
  descricao            text check (char_length(descricao) <= 2000),

  -- doação
  vacinado             boolean,
  castrado             boolean,
  vermifugado          boolean,
  convive_criancas     boolean,
  convive_caes         boolean,
  convive_gatos        boolean,

  -- desaparecido / encontrado
  data_evento          timestamptz,                -- quando sumiu ou quando foi achado
  perfil_saida         public.perfil_saida,
  recompensa           numeric(10,2) check (recompensa >= 0),
  animal_comigo        boolean,                    -- encontrado: o animal está com quem postou?

  -- localização pública (o ponto exato fica em anuncio_local_privado)  [RN04]
  cidade_id            int not null references public.cidades(id),
  precisao             public.precisao_local,
  ponto_publico        extensions.geography(Point, 4326),

  -- ciclo de vida  [RN02, RN06]
  expira_em            timestamptz not null default now(),   -- definido pelo gatilho abaixo
  lembrete_enviado_em  timestamptz,
  renovacoes           int not null default 0,
  resolvido_em         timestamptz,
  sinalizado           boolean not null default false,       -- selo "Cuidado"
  criado_em            timestamptz not null default now(),
  atualizado_em        timestamptz not null default now(),

  constraint desaparecido_campos check (
    tipo <> 'desaparecido' or (nome is not null and data_evento is not null and perfil_saida is not null)),
  constraint encontrado_campos check (
    tipo <> 'encontrado' or (data_evento is not null and animal_comigo is not null)),
  constraint doacao_campos check (
    tipo <> 'doacao' or (nome is not null and vacinado is not null and castrado is not null)),
  constraint recompensa_so_desaparecido check (recompensa is null or tipo = 'desaparecido'),
  constraint evento_nao_futuro check (data_evento is null or data_evento <= now() + interval '1 hour')
);

create index anuncios_feed_idx   on public.anuncios (tipo, status, criado_em desc);
create index anuncios_cidade_idx on public.anuncios (cidade_id);
create index anuncios_dono_idx   on public.anuncios (dono_id);
create index anuncios_ponto_idx  on public.anuncios using gist (ponto_publico);

-- Define validade na criação e mantém atualizado_em.
create function public.anuncios_antes_gravar()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    select now() + make_interval(days => r.dias_validade)
      into new.expira_em
      from public.regras_expiracao r where r.tipo = new.tipo;
  end if;
  new.atualizado_em := now();
  return new;
end $$;

create trigger anuncios_antes_gravar
  before insert or update on public.anuncios
  for each row execute function public.anuncios_antes_gravar();

-- Ponto exato: visível só para o dono.
create table public.anuncio_local_privado (
  anuncio_id   uuid primary key references public.anuncios(id) on delete cascade,
  ponto_exato  extensions.geography(Point, 4326) not null
);

-- Fotos (arquivos ficam no Supabase Storage; aqui só o caminho).
create table public.anuncio_fotos (
  id          uuid primary key default gen_random_uuid(),
  anuncio_id  uuid not null references public.anuncios(id) on delete cascade,
  caminho     text not null,
  ordem       smallint not null default 0,
  criado_em   timestamptz not null default now()
);
create index anuncio_fotos_anuncio_idx on public.anuncio_fotos (anuncio_id, ordem);

create function public.limitar_fotos()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (select count(*) from public.anuncio_fotos where anuncio_id = new.anuncio_id) >= 5 then
    raise exception 'Limite de 5 fotos por anúncio';
  end if;
  return new;
end $$;

create trigger limitar_fotos before insert on public.anuncio_fotos
  for each row execute function public.limitar_fotos();

-- Novos avistamentos adicionados pelo dono.  [RF10]
create table public.avistamentos (
  id          uuid primary key default gen_random_uuid(),
  anuncio_id  uuid not null references public.anuncios(id) on delete cascade,
  ponto       extensions.geography(Point, 4326) not null,
  visto_em    timestamptz not null,
  observacao  text check (char_length(observacao) <= 500),
  criado_em   timestamptz not null default now()
);
create index avistamentos_anuncio_idx on public.avistamentos (anuncio_id, visto_em desc);

-- Irmãos para adoção conjunta (vínculo simétrico: guardado uma vez, a < b).  [RN08]
create table public.irmaos (
  anuncio_a  uuid not null references public.anuncios(id) on delete cascade,
  anuncio_b  uuid not null references public.anuncios(id) on delete cascade,
  primary key (anuncio_a, anuncio_b),
  check (anuncio_a < anuncio_b)
);
create index irmaos_b_idx on public.irmaos (anuncio_b);

-- ---------------------------------------------------------------------
-- 6. CONTATOS RECEBIDOS (gravados pelo servidor, que valida e limita)
-- ---------------------------------------------------------------------
-- "Encontrei o animal"  [RF11, RN03, RN07]
create table public.avisos_encontrei (
  id                   uuid primary key default gen_random_uuid(),
  anuncio_id           uuid not null references public.anuncios(id) on delete cascade,
  autor_id             uuid references public.perfis(id) on delete set null,   -- null = sem conta
  nome                 text not null check (char_length(nome) between 1 and 100),
  email                text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  telefone             text check (char_length(telefone) <= 20),
  ponto                extensions.geography(Point, 4326),
  visto_em             timestamptz not null,
  animal_comigo        boolean not null default false,
  foto_caminho         text,
  mensagem             text check (char_length(mensagem) <= 1000),
  consentimento        boolean not null check (consentimento),
  email_verificado_em  timestamptz,
  ip_hash              text,                       -- apagado após 30 dias (rotina diária)
  criado_em            timestamptz not null default now()
);
create index avisos_anuncio_idx on public.avisos_encontrei (anuncio_id, criado_em desc);
create index avisos_limite_idx  on public.avisos_encontrei (criado_em) where autor_id is null;

-- "Quero adotar"  [RF16]
create table public.pedidos_adocao (
  id             uuid primary key default gen_random_uuid(),
  anuncio_id     uuid not null references public.anuncios(id) on delete cascade,
  autor_id       uuid references public.perfis(id) on delete set null,
  nome           text not null check (char_length(nome) between 1 and 100),
  email          text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  telefone       text check (char_length(telefone) <= 20),
  mensagem       text check (char_length(mensagem) <= 1000),
  consentimento  boolean not null check (consentimento),
  criado_em      timestamptz not null default now()
);
create index pedidos_anuncio_idx on public.pedidos_adocao (anuncio_id, criado_em desc);

-- Denúncias  [RF20, RN06]
create table public.denuncias (
  id            uuid primary key default gen_random_uuid(),
  anuncio_id    uuid not null references public.anuncios(id) on delete cascade,
  autor_id      uuid references public.perfis(id) on delete set null,
  motivo        public.motivo_denuncia not null,
  detalhes      text check (char_length(detalhes) <= 1000),
  ip_hash       text,
  status        public.status_denuncia not null default 'pendente',
  revisado_por  uuid references public.perfis(id),
  revisado_em   timestamptz,
  criado_em     timestamptz not null default now()
);
create index denuncias_pendentes_idx on public.denuncias (criado_em) where status = 'pendente';

-- Códigos de verificação de e-mail para quem não tem conta  [RN07]
create table public.codigos_verificacao (
  id           uuid primary key default gen_random_uuid(),
  email        text not null,
  codigo_hash  text not null,
  tentativas   smallint not null default 0,
  expira_em    timestamptz not null default now() + interval '15 minutes',
  usado_em     timestamptz,
  criado_em    timestamptz not null default now()
);
create index codigos_email_idx on public.codigos_verificacao (lower(email), criado_em desc);

-- Notificações no site  [RF12]
create table public.notificacoes (
  id          uuid primary key default gen_random_uuid(),
  usuario_id  uuid not null references public.perfis(id) on delete cascade,
  tipo        text not null,     -- aviso_encontrei, pedido_adocao, lembrete, expirado, denuncia_*
  anuncio_id  uuid references public.anuncios(id) on delete cascade,
  dados       jsonb not null default '{}',
  lida_em     timestamptz,
  criado_em   timestamptz not null default now()
);
create index notificacoes_usuario_idx on public.notificacoes (usuario_id, criado_em desc);

-- ---------------------------------------------------------------------
-- 7. GATILHOS DE NEGÓCIO
-- ---------------------------------------------------------------------
-- Novo aviso ou pedido -> notifica o dono do anúncio.
create function public.notificar_dono()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.notificacoes (usuario_id, tipo, anuncio_id, dados)
  select a.dono_id,
         case tg_table_name when 'avisos_encontrei' then 'aviso_encontrei' else 'pedido_adocao' end,
         a.id,
         jsonb_build_object('registro_id', new.id)
    from public.anuncios a where a.id = new.anuncio_id;
  return new;
end $$;

create trigger notificar_aviso  after insert on public.avisos_encontrei
  for each row execute function public.notificar_dono();
create trigger notificar_pedido after insert on public.pedidos_adocao
  for each row execute function public.notificar_dono();

-- Uma denúncia já coloca o selo "Cuidado".  [RN06]
create function public.sinalizar_anuncio()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.anuncios set sinalizado = true where id = new.anuncio_id;
  return new;
end $$;

create trigger sinalizar_anuncio after insert on public.denuncias
  for each row execute function public.sinalizar_anuncio();

-- ---------------------------------------------------------------------
-- 8. FUNÇÕES CHAMADAS PELO SITE (RPC)
-- ---------------------------------------------------------------------
-- Grava o ponto exato em privado e o ponto público (deslocado 50–150 m se "aproximado").  [RN04]
create function public.definir_local(p_anuncio uuid, p_lat double precision, p_lng double precision,
                                     p_precisao public.precisao_local)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_ponto extensions.geography;
begin
  if not exists (select 1 from public.anuncios where id = p_anuncio and dono_id = auth.uid()) then
    raise exception 'Anúncio não encontrado ou sem permissão';
  end if;
  if p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'Coordenadas inválidas';
  end if;

  v_ponto := extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography;

  insert into public.anuncio_local_privado (anuncio_id, ponto_exato) values (p_anuncio, v_ponto)
  on conflict (anuncio_id) do update set ponto_exato = excluded.ponto_exato;

  update public.anuncios
     set precisao = p_precisao,
         ponto_publico = case
           when p_precisao = 'exato' then v_ponto
           else extensions.st_project(v_ponto, 50 + random() * 100, random() * 2 * pi())
         end
   where id = p_anuncio;
end $$;

-- Marca como Encontrado / Adotado.  [RF17]
create function public.marcar_resolvido(p_anuncio uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.anuncios set status = 'resolvido', resolvido_em = now()
   where id = p_anuncio and dono_id = auth.uid() and status in ('ativo', 'expirado');
  if not found then raise exception 'Anúncio não encontrado ou não pode ser resolvido'; end if;
end $$;

-- Renova por mais um período.  [RN02]
create function public.renovar_anuncio(p_anuncio uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.anuncios a
     set status = 'ativo',
         expira_em = now() + make_interval(days => r.dias_validade),
         renovacoes = a.renovacoes + 1,
         lembrete_enviado_em = null
    from public.regras_expiracao r
   where a.id = p_anuncio and a.dono_id = auth.uid()
     and a.status in ('ativo', 'expirado') and r.tipo = a.tipo;
  if not found then raise exception 'Anúncio não encontrado ou não pode ser renovado'; end if;
end $$;

-- Vincula dois animais da mesma ONG como irmãos.  [RF23]
create function public.vincular_irmaos(p_a uuid, p_b uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if p_a = p_b then raise exception 'Um animal não pode ser irmão de si mesmo'; end if;
  if (select count(*) from public.anuncios a
        join public.perfis p on p.id = a.dono_id
       where a.id in (p_a, p_b) and a.dono_id = auth.uid()
         and a.tipo = 'doacao' and p.tipo = 'ong') <> 2 then
    raise exception 'Os dois anúncios precisam ser de doação e da sua ONG';
  end if;
  insert into public.irmaos values (least(p_a, p_b), greatest(p_a, p_b)) on conflict do nothing;
end $$;

create function public.desvincular_irmaos(p_a uuid, p_b uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  delete from public.irmaos i
   where i.anuncio_a = least(p_a, p_b) and i.anuncio_b = greatest(p_a, p_b)
     and exists (select 1 from public.anuncios a where a.id = p_a and a.dono_id = auth.uid());
end $$;

-- Irmãos ainda disponíveis (adotados somem da lista).  [RN08]
create function public.irmaos_disponiveis(p_anuncio uuid)
returns setof public.anuncios language sql stable set search_path = '' as $$
  select a.* from public.anuncios a
   where a.status = 'ativo'
     and a.id in (select case when i.anuncio_a = p_anuncio then i.anuncio_b else i.anuncio_a end
                    from public.irmaos i
                   where p_anuncio in (i.anuncio_a, i.anuncio_b))
$$;

-- Feed "Perto de você": anúncios ativos dentro de um raio, do mais perto ao mais longe.  [RF05]
create function public.anuncios_proximos(
  p_lat double precision, p_lng double precision,
  p_tipo public.tipo_anuncio default null, p_especie public.especie default null,
  p_raio_km int default 50, p_limite int default 20, p_offset int default 0)
returns table (anuncio_id uuid, distancia_m double precision)
language sql stable set search_path = '' as $$
  with ref as (
    select extensions.st_setsrid(extensions.st_makepoint(p_lng, p_lat), 4326)::extensions.geography as p
  )
  select a.id, extensions.st_distance(a.ponto_publico, ref.p)
    from public.anuncios a, ref
   where a.status = 'ativo'
     and a.ponto_publico is not null
     and (p_tipo is null or a.tipo = p_tipo)
     and (p_especie is null or a.especie = p_especie)
     and extensions.st_dwithin(a.ponto_publico, ref.p, least(p_raio_km, 500) * 1000)
   order by 2
   limit least(p_limite, 50) offset p_offset
$$;

-- Zonas de busca de um anúncio, a partir do avistamento mais recente.  [RF08, RF10, RN01]
create function public.zonas_do_anuncio(p_anuncio uuid)
returns table (centro_lat double precision, centro_lng double precision,
               interna_m int, interna_pct smallint, externa_m int, externa_pct smallint, fonte text)
language sql stable set search_path = '' as $$
  with a as (select * from public.anuncios where id = p_anuncio and tipo = 'desaparecido'),
  centro as (
    select coalesce(
      (select v.ponto from public.avistamentos v where v.anuncio_id = p_anuncio order by v.visto_em desc limit 1),
      (select a.ponto_publico from a)) as p
  )
  select extensions.st_y(centro.p::extensions.geometry), extensions.st_x(centro.p::extensions.geometry),
         z.interna_m, z.interna_pct, z.externa_m, z.externa_pct, z.fonte
    from a
    join centro on centro.p is not null
    join public.zonas_busca z
      on z.especie = a.especie
     and z.perfil_saida = coalesce(a.perfil_saida, 'desconhecido')
$$;

-- Limite de avisos sem conta: 1 por e-mail, telefone ou IP a cada 30 dias.  [RN07]
-- Usada só pelo servidor (service_role).
create function public.pode_enviar_aviso_anonimo(p_email text, p_telefone text, p_ip_hash text)
returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (
    select 1 from public.avisos_encontrei
     where autor_id is null
       and criado_em > now() - interval '30 days'
       and (lower(email) = lower(p_email)
            or (p_telefone is not null and telefone = p_telefone)
            or (p_ip_hash is not null and ip_hash = p_ip_hash)))
$$;

-- Moderação: confirmar (oculta o anúncio) ou descartar a denúncia.  [RF21]
create function public.revisar_denuncia(p_denuncia uuid, p_confirmar boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_anuncio uuid;
begin
  if not public.e_admin() then raise exception 'Apenas administradores'; end if;

  update public.denuncias
     set status = case when p_confirmar then 'confirmada' else 'descartada' end::public.status_denuncia,
         revisado_por = auth.uid(), revisado_em = now()
   where id = p_denuncia and status = 'pendente'
  returning anuncio_id into v_anuncio;
  if v_anuncio is null then raise exception 'Denúncia não encontrada ou já revisada'; end if;

  if p_confirmar then
    update public.anuncios set status = 'oculto' where id = v_anuncio;
  elsif not exists (select 1 from public.denuncias where anuncio_id = v_anuncio and status = 'pendente') then
    update public.anuncios set sinalizado = false where id = v_anuncio;
  end if;

  insert into public.notificacoes (usuario_id, tipo, anuncio_id)
  select dono_id, case when p_confirmar then 'denuncia_confirmada' else 'denuncia_descartada' end, id
    from public.anuncios where id = v_anuncio;
end $$;

-- Aprovar ou recusar ONG.  [RF22]
create function public.revisar_ong(p_perfil uuid, p_aprovar boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.e_admin() then raise exception 'Apenas administradores'; end if;
  update public.perfis
     set ong_status = case when p_aprovar then 'aprovada' else 'recusada' end::public.status_ong
   where id = p_perfil and tipo = 'ong';
end $$;

-- Rotina diária: lembretes, expiração, remoção e limpeza de dados pessoais.  [RN02, RN07]
create function public.rotina_diaria()
returns void language plpgsql security definer set search_path = '' as $$
begin
  -- lembrete (ex.: dia 30 de 60)
  with lembrar as (
    update public.anuncios a set lembrete_enviado_em = now()
      from public.regras_expiracao r
     where r.tipo = a.tipo and a.status = 'ativo' and a.lembrete_enviado_em is null
       and now() >= a.expira_em - make_interval(days => r.dias_validade - r.dias_lembrete)
    returning a.id, a.dono_id)
  insert into public.notificacoes (usuario_id, tipo, anuncio_id)
  select dono_id, 'lembrete', id from lembrar;

  -- expiração -> aba Expirados
  with expirar as (
    update public.anuncios set status = 'expirado'
     where status = 'ativo' and expira_em < now()
    returning id, dono_id)
  insert into public.notificacoes (usuario_id, tipo, anuncio_id)
  select dono_id, 'expirado', id from expirar;

  -- remoção definitiva
  delete from public.anuncios a using public.regras_expiracao r
   where r.tipo = a.tipo and a.status = 'expirado'
     and a.expira_em + make_interval(days => r.dias_remocao) < now();

  -- LGPD: IP guardado só por 30 dias; códigos vencidos apagados
  update public.avisos_encontrei set ip_hash = null
   where ip_hash is not null and criado_em < now() - interval '30 days';
  update public.denuncias set ip_hash = null
   where ip_hash is not null and criado_em < now() - interval '30 days';
  delete from public.codigos_verificacao where criado_em < now() - interval '1 day';
end $$;

-- ---------------------------------------------------------------------
-- 9. PERMISSÕES POR COLUNA (impede alterar status, selo, validade etc. direto)
-- ---------------------------------------------------------------------
revoke insert, update on public.perfis from anon, authenticated;
grant update (nome, cidade_id, foto_url, instagram, facebook, site, ong_descricao, ong_chave_pix)
  on public.perfis to authenticated;

revoke insert, update on public.anuncios from anon, authenticated;
grant insert (tipo, dono_id, especie, nome, raca, sexo, idade_meses, porte, cor, sinais_particulares,
              descricao, vacinado, castrado, vermifugado, convive_criancas, convive_caes, convive_gatos,
              data_evento, perfil_saida, recompensa, animal_comigo, cidade_id)
  on public.anuncios to authenticated;
grant update (nome, raca, sexo, idade_meses, porte, cor, sinais_particulares, descricao,
              vacinado, castrado, vermifugado, convive_criancas, convive_caes, convive_gatos,
              data_evento, perfil_saida, recompensa, animal_comigo, cidade_id)
  on public.anuncios to authenticated;

revoke update on public.notificacoes from anon, authenticated;
grant update (lida_em) on public.notificacoes to authenticated;

-- funções exclusivas do servidor / da rotina
revoke execute on function public.pode_enviar_aviso_anonimo(text, text, text) from public, anon, authenticated;
revoke execute on function public.rotina_diaria() from public, anon, authenticated;
revoke execute on function public.criar_perfil() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 10. SEGURANÇA POR LINHA (RLS)
-- ---------------------------------------------------------------------
alter table public.paises                enable row level security;
alter table public.estados               enable row level security;
alter table public.cidades               enable row level security;
alter table public.perfis                enable row level security;
alter table public.zonas_busca           enable row level security;
alter table public.regras_expiracao      enable row level security;
alter table public.anuncios              enable row level security;
alter table public.anuncio_local_privado enable row level security;
alter table public.anuncio_fotos         enable row level security;
alter table public.avistamentos          enable row level security;
alter table public.irmaos                enable row level security;
alter table public.avisos_encontrei      enable row level security;
alter table public.pedidos_adocao        enable row level security;
alter table public.denuncias             enable row level security;
alter table public.codigos_verificacao   enable row level security;   -- sem políticas: só o servidor
alter table public.notificacoes          enable row level security;

-- leitura pública de tabelas de referência
create policy "leitura publica" on public.paises           for select using (true);
create policy "leitura publica" on public.estados          for select using (true);
create policy "leitura publica" on public.cidades          for select using (true);
create policy "leitura publica" on public.zonas_busca      for select using (true);
create policy "leitura publica" on public.regras_expiracao for select using (true);
create policy "leitura publica" on public.perfis           for select using (true);

create policy "dono edita o proprio perfil" on public.perfis
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- anúncios
create policy "ver anuncios publicos ou proprios" on public.anuncios for select
  using (status in ('ativo', 'resolvido', 'expirado') or dono_id = auth.uid() or public.e_admin());
create policy "criar o proprio anuncio" on public.anuncios for insert to authenticated
  with check (dono_id = auth.uid());
create policy "editar o proprio anuncio" on public.anuncios for update to authenticated
  using (dono_id = auth.uid() and status <> 'oculto') with check (dono_id = auth.uid());
create policy "apagar o proprio anuncio" on public.anuncios for delete to authenticated
  using (dono_id = auth.uid() or public.e_admin());

create policy "so o dono ve o ponto exato" on public.anuncio_local_privado for select to authenticated
  using (exists (select 1 from public.anuncios a where a.id = anuncio_id and a.dono_id = auth.uid()));

-- fotos e avistamentos: visíveis junto com o anúncio; só o dono mexe
create policy "ver fotos" on public.anuncio_fotos for select
  using (exists (select 1 from public.anuncios a where a.id = anuncio_id));
create policy "dono adiciona fotos" on public.anuncio_fotos for insert to authenticated
  with check (exists (select 1 from public.anuncios a where a.id = anuncio_id and a.dono_id = auth.uid()));
create policy "dono remove fotos" on public.anuncio_fotos for delete to authenticated
  using (exists (select 1 from public.anuncios a where a.id = anuncio_id and a.dono_id = auth.uid()));

create policy "ver avistamentos" on public.avistamentos for select
  using (exists (select 1 from public.anuncios a where a.id = anuncio_id));
create policy "dono adiciona avistamento" on public.avistamentos for insert to authenticated
  with check (exists (select 1 from public.anuncios a
                       where a.id = anuncio_id and a.dono_id = auth.uid() and a.tipo = 'desaparecido'));
create policy "dono remove avistamento" on public.avistamentos for delete to authenticated
  using (exists (select 1 from public.anuncios a where a.id = anuncio_id and a.dono_id = auth.uid()));

create policy "ver irmaos" on public.irmaos for select using (true);

-- contatos recebidos: só o dono do anúncio lê (gravação é feita pelo servidor)  [RN03]
create policy "dono le avisos" on public.avisos_encontrei for select to authenticated
  using (exists (select 1 from public.anuncios a where a.id = anuncio_id and a.dono_id = auth.uid()));
create policy "dono le pedidos" on public.pedidos_adocao for select to authenticated
  using (exists (select 1 from public.anuncios a where a.id = anuncio_id and a.dono_id = auth.uid()));

create policy "admin le denuncias" on public.denuncias for select to authenticated
  using (public.e_admin());

create policy "ler proprias notificacoes" on public.notificacoes for select to authenticated
  using (usuario_id = auth.uid());
create policy "marcar como lida" on public.notificacoes for update to authenticated
  using (usuario_id = auth.uid()) with check (usuario_id = auth.uid());
