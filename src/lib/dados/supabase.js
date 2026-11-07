// Implementação da camada de dados com o Supabase (Postgres + PostGIS, Auth e Storage).
// Exporta as MESMAS funções de local.js, então as telas e as ações não mudam.
// As regras que não podem ser burladas ficam no banco (RLS e funções em banco/supabase/);
// aqui só chamamos essas funções e convertemos os dados para o formato das telas.
import "server-only";
import crypto from "crypto";
import { cache } from "react";
import localidades from "./localidades.json";
import { clienteServico, clienteUsuario, SUPABASE_URL } from "../supabase/clientes";
import { distanciaMetros } from "../geo";
import { LIMITE_FOTOS } from "../regras";
import { SITE_URL, emailNovidade, enviarEmail } from "../email";

export const MODO = "supabase";
const DIA = 86400000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const agoraIso = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Utilitários
// ---------------------------------------------------------------------------
// Erro do banco vira mensagem amigável. Exceções das funções SQL (raise exception) já vêm em português.
function ok({ data, error }, mensagem = "Não foi possível acessar o banco de dados. Tente de novo.") {
  if (error) {
    console.error("[supabase]", error.code, error.message);
    throw new Error(error.code === "P0001" ? `${error.message}.` : mensagem);
  }
  return data;
}

// O PostgREST devolve pontos geográficos em EWKB (hexadecimal). Ponto 2D: tipo + SRID + x (lng) + y (lat).
function lerPonto(valor) {
  if (!valor) return null;
  if (valor.coordinates) return { lng: valor.coordinates[0], lat: valor.coordinates[1] }; // GeoJSON
  const b = Buffer.from(valor, "hex");
  const pequeno = b[0] === 1;
  const tipo = pequeno ? b.readUInt32LE(1) : b.readUInt32BE(1);
  const inicio = tipo & 0x20000000 ? 9 : 5; // com SRID, os números começam 4 bytes depois
  const ler = (pos) => (pequeno ? b.readDoubleLE(pos) : b.readDoubleBE(pos));
  return { lng: ler(inicio), lat: ler(inicio + 8) };
}
const escreverPonto = (p) => (p ? `SRID=4326;POINT(${p.lng} ${p.lat})` : null);

const urlFoto = (caminho) => `${SUPABASE_URL}/storage/v1/object/public/fotos/${caminho}`;

// ---------------------------------------------------------------------------
// Localidades: a lista vem do mesmo JSON do modo local (códigos do IBGE).
// No banco, cidades.id é um número próprio; a conversão usa cidades.codigo_ibge.
// ---------------------------------------------------------------------------
const cidadesPorId = new Map(localidades.cidades.map((c) => [c.id, c]));

export function listarEstados() {
  return localidades.estados;
}

export function listarCidades(uf) {
  return localidades.cidades.filter((c) => c.uf === uf).map(({ id, nome, lat, lng }) => ({ id, nome, lat, lng }));
}

export function obterCidade(id) {
  return cidadesPorId.get(Number(id)) ?? null;
}

async function idCidadeNoBanco(sb, codigoIbge) {
  if (!codigoIbge) return null;
  const linha = ok(await sb.from("cidades").select("id").eq("codigo_ibge", Number(codigoIbge)).maybeSingle());
  return linha?.id ?? null;
}

function cidadeResumida(linha) {
  const c = obterCidade(linha?.codigo_ibge);
  return c ? { id: c.id, nome: c.nome, uf: c.uf } : null;
}

// ---------------------------------------------------------------------------
// Usuário atual (Supabase Auth). cache(): uma consulta por requisição, mesmo chamada várias vezes.
// ---------------------------------------------------------------------------
export const obterUsuarioAtual = cache(async () => {
  const sb = await clienteUsuario();
  const { data } = await sb.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) return null;
  const perfil = ok(await sb.from("perfis").select("*").eq("id", id).maybeSingle());
  return perfil ? { ...perfil, email: data.claims.email } : null;
});

// ---------------------------------------------------------------------------
// Anúncios: leitura
// ---------------------------------------------------------------------------
const CAMPOS_BASE = "id,tipo,status,especie,nome,raca,sexo,idade_meses,porte,cor,data_evento,recompensa,animal_comigo,"
  + "vacinado,castrado,sinalizado,criado_em,resolvido_em,expira_em,ponto_publico,dono_id,"
  + "cidade:cidades!inner(codigo_ibge,estado:estados!inner(sigla)),fotos:anuncio_fotos(caminho,ordem)";
const CAMPOS_RESUMO = `${CAMPOS_BASE},dono:perfis(id,nome,tipo,ong_status)`;
const CAMPOS_DETALHE = `${CAMPOS_BASE},sinais_particulares,descricao,perfil_saida,vermifugado,convive_criancas,convive_caes,`
  + "convive_gatos,precisao,renovacoes,dono:perfis(id,nome,tipo,instagram,facebook,site,ong_status,ong_chave_pix)";

function resumo(a, referencia = null, totalIrmaos = 0) {
  const ponto = lerPonto(a.ponto_publico);
  const fotos = [...(a.fotos ?? [])].sort((x, y) => x.ordem - y.ordem).map((f) => urlFoto(f.caminho));
  return {
    id: a.id, tipo: a.tipo, status: a.status, especie: a.especie, nome: a.nome, raca: a.raca, sexo: a.sexo,
    idade_meses: a.idade_meses, porte: a.porte, cor: a.cor, data_evento: a.data_evento,
    recompensa: a.recompensa == null ? null : Number(a.recompensa),
    animal_comigo: a.animal_comigo, vacinado: a.vacinado, castrado: a.castrado, sinalizado: a.sinalizado,
    criado_em: a.criado_em, resolvido_em: a.resolvido_em, expira_em: a.expira_em,
    foto: fotos[0] ?? null, fotos, ponto_publico: ponto,
    cidade: cidadeResumida(a.cidade),
    dono: a.dono ? { id: a.dono.id, nome: a.dono.nome, tipo: a.dono.tipo, ong_status: a.dono.ong_status } : null,
    distancia_m: referencia && ponto ? distanciaMetros(referencia, ponto) : null,
    total_irmaos: totalIrmaos, // RF23: "tem 2 irmãos disponíveis"
  };
}

// Quantos irmãos ainda disponíveis cada anúncio de doação tem.  [RN08]
async function contarIrmaos(sb, linhas) {
  const ids = linhas.filter((a) => a.tipo === "doacao").map((a) => a.id);
  const contagem = new Map();
  if (!ids.length) return contagem;
  const lista = `(${ids.join(",")})`;
  const pares = ok(await sb.from("irmaos").select("anuncio_a,anuncio_b").or(`anuncio_a.in.${lista},anuncio_b.in.${lista}`));
  const outros = [...new Set(pares.flatMap((p) => [p.anuncio_a, p.anuncio_b]))];
  if (!outros.length) return contagem;
  const ativos = new Set(ok(await sb.from("anuncios").select("id").in("id", outros).eq("status", "ativo")).map((x) => x.id));
  const somar = (id) => contagem.set(id, (contagem.get(id) ?? 0) + 1);
  for (const { anuncio_a: x, anuncio_b: y } of pares) {
    if (ids.includes(x) && ativos.has(y)) somar(x);
    if (ids.includes(y) && ativos.has(x)) somar(y);
  }
  return contagem;
}

async function resumos(sb, linhas, referencia = null) {
  const irmaos = await contarIrmaos(sb, linhas);
  return linhas.map((a) => resumo(a, referencia, irmaos.get(a.id) ?? 0));
}

/**
 * Filtros: tipo, tipos, status ("ativo" | "expirado" | "resolvido"), uf, cidadeId (IBGE), especie,
 * perto ({lat, lng}) para ordenar por distância, raioKm, pagina, porPagina.
 */
export async function listarAnuncios(filtros = {}) {
  const { tipo, tipos, status = "ativo", uf, cidadeId, especie, perto, raioKm = 50, pagina = 1, porPagina = 24 } = filtros;
  const sb = await clienteUsuario();
  const listaTipos = tipos ?? (tipo ? [tipo] : null);
  const inicio = (pagina - 1) * porPagina;

  let consulta = sb.from("anuncios").select(CAMPOS_RESUMO, perto ? undefined : { count: "exact" }).eq("status", status);
  if (listaTipos) consulta = consulta.in("tipo", listaTipos);
  if (especie) consulta = consulta.eq("especie", especie);
  if (cidadeId) consulta = consulta.eq("cidade.codigo_ibge", Number(cidadeId));
  else if (uf) consulta = consulta.eq("cidade.estado.sigla", uf);

  if (perto) {
    // RF05: a distância vem da função anuncios_proximos (PostGIS), que devolve no máximo 50 anúncios ativos.
    if (status !== "ativo") return { itens: [], total: 0, pagina, temMais: false };
    const proximos = ok(await sb.rpc("anuncios_proximos", {
      p_lat: Number(perto.lat), p_lng: Number(perto.lng), p_tipo: listaTipos?.length === 1 ? listaTipos[0] : null,
      p_especie: especie || null, p_raio_km: raioKm, p_limite: 50,
    }));
    if (!proximos.length) return { itens: [], total: 0, pagina, temMais: false };
    const linhas = ok(await consulta.in("id", proximos.map((p) => p.anuncio_id)));
    const itens = (await resumos(sb, linhas, perto)).sort((x, y) => x.distancia_m - y.distancia_m);
    return { itens: itens.slice(inicio, inicio + porPagina), total: itens.length, pagina, temMais: inicio + porPagina < itens.length };
  }

  const chave = status === "resolvido" ? "resolvido_em" : "criado_em";
  const { data, count, error } = await consulta.order(chave, { ascending: false, nullsFirst: false }).range(inicio, inicio + porPagina - 1);
  ok({ data, error });
  const total = count ?? 0;
  return { itens: await resumos(sb, data), total, pagina, temMais: inicio + porPagina < total };
}

// RF14: desaparecidos da mesma espécie, a até 5 km, publicados nos últimos 60 dias.
async function parecidosCom(sb, especie, ponto) {
  const proximos = ok(await sb.rpc("anuncios_proximos", {
    p_lat: ponto.lat, p_lng: ponto.lng, p_tipo: "desaparecido", p_especie: especie, p_raio_km: 5, p_limite: 20,
  }));
  if (!proximos.length) return [];
  const desde = new Date(Date.now() - 60 * DIA).toISOString();
  const linhas = ok(await sb.from("anuncios").select(CAMPOS_RESUMO).in("id", proximos.map((p) => p.anuncio_id)).gt("criado_em", desde));
  return (await resumos(sb, linhas, ponto)).sort((x, y) => x.distancia_m - y.distancia_m).slice(0, 4);
}

export async function buscarDesaparecidosParecidos(especie, ponto) {
  return parecidosCom(await clienteUsuario(), especie, ponto);
}

export async function obterAnuncio(id, usuarioId = null) {
  if (!UUID.test(id)) return null;
  const sb = await clienteUsuario();
  // O RLS já esconde anúncios ocultos de quem não é o dono nem administrador.
  const a = ok(await sb.from("anuncios").select(CAMPOS_DETALHE).eq("id", id).maybeSingle());
  if (!a) return null;
  const eDono = Boolean(usuarioId) && usuarioId === a.dono_id;
  const pontoPublico = lerPonto(a.ponto_publico);

  // RN04: o ponto exato fica em outra tabela, que só o dono consegue ler.
  let pontoExato = null;
  if (eDono) {
    const privado = ok(await sb.from("anuncio_local_privado").select("ponto_exato").eq("anuncio_id", id).maybeSingle());
    pontoExato = lerPonto(privado?.ponto_exato) ?? pontoPublico;
  }

  const avistamentos = ok(await sb.from("avistamentos").select("id,ponto,visto_em,observacao,criado_em")
    .eq("anuncio_id", id).order("visto_em", { ascending: false }))
    .map((v) => ({ ...v, anuncio_id: id, ponto: lerPonto(v.ponto) }));

  // Zonas a partir do avistamento mais recente; os valores vêm da tabela zonas_busca.  [RF08, RF10, RN01, RNF07]
  let zonas = null;
  if (a.tipo === "desaparecido") {
    const z = ok(await sb.from("zonas_busca").select("interna_m,interna_pct,externa_m,externa_pct,fonte")
      .eq("especie", a.especie).eq("perfil_saida", a.perfil_saida ?? "desconhecido").maybeSingle());
    const centro = avistamentos[0]?.ponto ?? (eDono ? pontoExato : pontoPublico);
    if (z && centro) {
      zonas = {
        ...z, fonte: z.fonte.replace(/\s*\(.*\)$/, ""), // "Huang et al., 2018 (geral)" -> nome usado nos links
        centro, apartirDeAvistamento: Boolean(avistamentos[0]),
        centroAproximado: !avistamentos[0] && !eDono && a.precisao === "aproximado",
      };
    }
  }

  // Irmãos ainda disponíveis  [RN08]
  const pares = ok(await sb.from("irmaos").select("anuncio_a,anuncio_b").or(`anuncio_a.eq.${id},anuncio_b.eq.${id}`));
  const idsIrmaos = pares.map((p) => (p.anuncio_a === id ? p.anuncio_b : p.anuncio_a));
  const irmaos = idsIrmaos.length
    ? await resumos(sb, ok(await sb.from("anuncios").select(CAMPOS_RESUMO).in("id", idsIrmaos).eq("status", "ativo")))
    : [];

  const parecidos = a.tipo === "encontrado" && pontoPublico ? await parecidosCom(sb, a.especie, pontoPublico) : [];
  const dono = a.dono;

  return {
    ...resumo(a, null, irmaos.length),
    sinais_particulares: a.sinais_particulares, descricao: a.descricao, perfil_saida: a.perfil_saida,
    vermifugado: a.vermifugado, convive_criancas: a.convive_criancas, convive_caes: a.convive_caes, convive_gatos: a.convive_gatos,
    precisao: a.precisao, renovacoes: a.renovacoes,
    ponto_exato: pontoExato, // RN04: só o dono recebe
    dono: dono && {
      id: dono.id, nome: dono.nome, tipo: dono.tipo, instagram: dono.instagram, facebook: dono.facebook, site: dono.site,
      ong_status: dono.ong_status, ong_chave_pix: dono.ong_status === "aprovada" ? dono.ong_chave_pix : null,
    },
    eDono,
    avistamentos,
    zonas,
    irmaos,
    parecidos,
  };
}

// ---------------------------------------------------------------------------
// Anúncios: escrita (como o usuário logado; o RLS confere que ele é o dono)
// ---------------------------------------------------------------------------
const CAMPOS_ANUNCIO = [
  "tipo", "especie", "nome", "raca", "sexo", "idade_meses", "porte", "cor", "sinais_particulares", "descricao",
  "vacinado", "castrado", "vermifugado", "convive_criancas", "convive_caes", "convive_gatos",
  "data_evento", "perfil_saida", "recompensa", "animal_comigo",
];

// RF07, RF13, RF15. Status, selo e validade não são enviados: o banco define (gatilho e permissões por coluna).
export async function criarAnuncio(dados, usuarioId, { ponto, precisao, fotos = [] }) {
  const sb = await clienteUsuario();
  const linha = { dono_id: usuarioId, cidade_id: await idCidadeNoBanco(sb, dados.cidade_id) };
  for (const campo of CAMPOS_ANUNCIO) linha[campo] = dados[campo] ?? null;
  const { id } = ok(await sb.from("anuncios").insert(linha).select("id").single(), "Não foi possível publicar o anúncio.");
  try {
    // RN04: definir_local grava o ponto exato em separado e desloca o público se for "aproximado".
    ok(await sb.rpc("definir_local", { p_anuncio: id, p_lat: ponto.lat, p_lng: ponto.lng, p_precisao: precisao }));
    if (fotos.length) {
      ok(await sb.from("anuncio_fotos").insert(fotos.slice(0, LIMITE_FOTOS).map((caminho, ordem) => ({ anuncio_id: id, caminho, ordem }))),
        "Não foi possível salvar as fotos.");
    }
  } catch (erro) {
    await sb.from("anuncios").delete().eq("id", id); // não deixa anúncio pela metade
    throw erro;
  }
  return id;
}

export async function adicionarAvistamento(anuncioId, { ponto, vistoEm, observacao }) {
  const sb = await clienteUsuario();
  ok(await sb.from("avistamentos").insert({ anuncio_id: anuncioId, ponto: escreverPonto(ponto), visto_em: vistoEm, observacao: observacao || null }),
    "Só o responsável por um anúncio de desaparecido pode adicionar avistamentos.");
}

export async function marcarResolvido(anuncioId) {
  const sb = await clienteUsuario();
  ok(await sb.rpc("marcar_resolvido", { p_anuncio: anuncioId }));
}

export async function renovarAnuncio(anuncioId) {
  const sb = await clienteUsuario();
  ok(await sb.rpc("renovar_anuncio", { p_anuncio: anuncioId }));
}

// ---------------------------------------------------------------------------
// ONGs  [RF02, RF22]
// ---------------------------------------------------------------------------
export async function listarOngs() {
  const sb = await clienteUsuario();
  const ongs = ok(await sb.from("perfis").select("id,nome,ong_descricao,cidade:cidades(codigo_ibge)")
    .eq("tipo", "ong").eq("ong_status", "aprovada").order("nome"));
  if (!ongs.length) return [];
  const anuncios = ok(await sb.from("anuncios").select("dono_id").in("dono_id", ongs.map((o) => o.id)).eq("tipo", "doacao").eq("status", "ativo"));
  return ongs.map((o) => ({
    id: o.id, nome: o.nome, descricao: o.ong_descricao, cidade: cidadeResumida(o.cidade),
    paraAdocao: anuncios.filter((a) => a.dono_id === o.id).length,
  }));
}

// ONG recusada não tem página; a pendente aparece sem selo e sem PIX.
export async function obterOng(id) {
  if (!UUID.test(id)) return null;
  const sb = await clienteUsuario();
  const p = ok(await sb.from("perfis").select("id,nome,ong_descricao,ong_status,ong_chave_pix,instagram,facebook,site,cidade:cidades(codigo_ibge)")
    .eq("id", id).eq("tipo", "ong").maybeSingle());
  if (!p || p.ong_status === "recusada") return null;
  const verificada = p.ong_status === "aprovada";
  const linhas = ok(await sb.from("anuncios").select(CAMPOS_RESUMO).eq("dono_id", id).in("status", ["ativo", "resolvido"])
    .order("criado_em", { ascending: false }));
  const todos = await resumos(sb, linhas);
  const adotados = todos.filter((a) => a.tipo === "doacao" && a.status === "resolvido")
    .sort((x, y) => (y.resolvido_em ?? "").localeCompare(x.resolvido_em ?? ""));
  return {
    id: p.id, nome: p.nome, descricao: p.ong_descricao, cidade: cidadeResumida(p.cidade),
    instagram: p.instagram, facebook: p.facebook, site: p.site,
    verificada,
    chave_pix: verificada ? p.ong_chave_pix : null,
    paraAdocao: todos.filter((a) => a.tipo === "doacao" && a.status === "ativo"),
    outrosAtivos: todos.filter((a) => a.tipo !== "doacao" && a.status === "ativo"),
    adotados: adotados.slice(0, 6),
    totalAdotados: adotados.length,
  };
}

// ---------------------------------------------------------------------------
// Irmãos para adoção conjunta  [RF23, RN08] — funções vincular_irmaos/desvincular_irmaos do SQL
// ---------------------------------------------------------------------------
export async function obterVinculosIrmaos(anuncioId, usuarioId) {
  const usuario = await obterUsuarioAtual();
  if (!UUID.test(anuncioId) || usuario?.tipo !== "ong" || usuario.id !== usuarioId) return null;
  const sb = await clienteUsuario();
  const anuncio = ok(await sb.from("anuncios").select(CAMPOS_RESUMO).eq("id", anuncioId).eq("dono_id", usuarioId).eq("tipo", "doacao").maybeSingle());
  if (!anuncio) return null;
  const pares = ok(await sb.from("irmaos").select("anuncio_a,anuncio_b").or(`anuncio_a.eq.${anuncioId},anuncio_b.eq.${anuncioId}`));
  const vinculados = new Set(pares.map((p) => (p.anuncio_a === anuncioId ? p.anuncio_b : p.anuncio_a)));
  const linhas = ok(await sb.from("anuncios").select(CAMPOS_RESUMO).eq("dono_id", usuarioId).eq("tipo", "doacao")
    .eq("status", "ativo").neq("id", anuncioId).order("criado_em", { ascending: false }));
  const candidatos = (await resumos(sb, linhas)).map((c) => ({ ...c, vinculado: vinculados.has(c.id) }));
  return { anuncio: resumo(anuncio), candidatos };
}

export async function vincularIrmaos(idA, idB) {
  const sb = await clienteUsuario();
  ok(await sb.rpc("vincular_irmaos", { p_a: idA, p_b: idB }));
}

export async function desvincularIrmaos(idA, idB) {
  const sb = await clienteUsuario();
  ok(await sb.rpc("desvincular_irmaos", { p_a: idA, p_b: idB }));
}

// ---------------------------------------------------------------------------
// Contatos: "Encontrei o animal", "Quero adotar", denúncias.
// Gravados com a chave de serviço: essas tabelas não aceitam gravação direta do navegador.
// ---------------------------------------------------------------------------
const hashCodigo = (codigo) => crypto.createHash("sha256").update(String(codigo)).digest("hex");

// RN07: código de 6 dígitos, válido por 15 minutos. Limite de 3 pedidos por e-mail por hora.
export async function criarCodigoVerificacao(email) {
  const adm = clienteServico();
  const alvo = email.toLowerCase();
  const { count } = await adm.from("codigos_verificacao").select("id", { count: "exact", head: true })
    .eq("email", alvo).gt("criado_em", new Date(Date.now() - 3600000).toISOString());
  if (count >= 3) throw new Error("Você já pediu 3 códigos na última hora. Use o último que chegou ou tente mais tarde.");
  const codigo = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
  ok(await adm.from("codigos_verificacao").insert({ email: alvo, codigo_hash: hashCodigo(codigo) }));
  return codigo;
}

async function consumirCodigo(adm, email, codigo) {
  const c = ok(await adm.from("codigos_verificacao").select("id,codigo_hash,tentativas,expira_em")
    .eq("email", email.toLowerCase()).is("usado_em", null).order("criado_em", { ascending: false }).limit(1).maybeSingle());
  if (!c || new Date(c.expira_em) < new Date()) return "Código expirado. Peça um novo código.";
  if (c.tentativas >= 5) return "Muitas tentativas. Peça um novo código.";
  if (c.codigo_hash !== hashCodigo(codigo)) {
    await adm.from("codigos_verificacao").update({ tentativas: c.tentativas + 1 }).eq("id", c.id);
    return "Código incorreto. Confira o e-mail e tente de novo.";
  }
  await adm.from("codigos_verificacao").update({ usado_em: agoraIso() }).eq("id", c.id);
  return null;
}

async function anuncioAtivo(adm, id) {
  const a = UUID.test(id) ? ok(await adm.from("anuncios").select("id,tipo,status,nome,especie,dono_id").eq("id", id).maybeSingle()) : null;
  if (!a || a.status !== "ativo") throw new Error("Este anúncio não está mais ativo.");
  return a;
}

// RF12: além da notificação no site (gatilho notificar_dono), avisa o dono por e-mail.
async function avisarDonoPorEmail(adm, anuncio, tipo) {
  const { data } = await adm.auth.admin.getUserById(anuncio.dono_id);
  if (data?.user?.email) await enviarEmail({ para: data.user.email, ...emailNovidade(tipo, anuncio.nome || "o animal") });
}

export async function registrarAvisoEncontrei(dados, { usuarioId, ipHash, codigo }) {
  const adm = clienteServico();
  const a = await anuncioAtivo(adm, dados.anuncio_id);
  if (a.tipo === "doacao") throw new Error("Este anúncio não recebe avisos de encontro.");

  if (!usuarioId) {
    // RN07: um aviso sem conta por e-mail, telefone ou IP a cada 30 dias
    const pode = ok(await adm.rpc("pode_enviar_aviso_anonimo", { p_email: dados.email, p_telefone: dados.telefone || null, p_ip_hash: ipHash || null }));
    if (!pode) return { ok: false, exigeConta: true, erro: "Você já enviou um aviso sem conta nos últimos 30 dias. Crie uma conta para enviar outro." };
    const erroCodigo = await consumirCodigo(adm, dados.email, codigo);
    if (erroCodigo) return { ok: false, erro: erroCodigo, campo: "codigo" };
  }

  ok(await adm.from("avisos_encontrei").insert({
    anuncio_id: a.id, autor_id: usuarioId ?? null, nome: dados.nome, email: dados.email, telefone: dados.telefone || null,
    ponto: escreverPonto(dados.ponto), visto_em: dados.visto_em, animal_comigo: dados.animal_comigo, foto_caminho: dados.foto ?? null,
    mensagem: dados.mensagem || null, consentimento: true,
    email_verificado_em: usuarioId ? null : agoraIso(), ip_hash: usuarioId ? null : ipHash ?? null,
  }), "Não foi possível enviar o aviso.");
  await avisarDonoPorEmail(adm, a, "aviso_encontrei");
  return { ok: true };
}

export async function registrarPedidoAdocao(dados, { usuarioId }) {
  const adm = clienteServico();
  const a = await anuncioAtivo(adm, dados.anuncio_id);
  if (a.tipo !== "doacao") throw new Error("Este anúncio não é de adoção.");
  ok(await adm.from("pedidos_adocao").insert({
    anuncio_id: a.id, autor_id: usuarioId ?? null, nome: dados.nome, email: dados.email, telefone: dados.telefone || null,
    mensagem: dados.mensagem, consentimento: true,
  }), "Não foi possível enviar o pedido.");
  await avisarDonoPorEmail(adm, a, "pedido_adocao");
  return { ok: true };
}

// RN06: o gatilho sinalizar_anuncio já coloca o selo "Denunciado, em análise".
export async function registrarDenuncia(dados, { usuarioId, ipHash }) {
  const adm = clienteServico();
  const a = UUID.test(dados.anuncio_id) ? ok(await adm.from("anuncios").select("id").eq("id", dados.anuncio_id).maybeSingle()) : null;
  if (!a) throw new Error("Anúncio não encontrado.");
  if (ipHash) {
    const { count } = await adm.from("denuncias").select("id", { count: "exact", head: true })
      .eq("anuncio_id", a.id).eq("ip_hash", ipHash).gt("criado_em", new Date(Date.now() - DIA).toISOString());
    if (count > 0) return { ok: true }; // já denunciado por este visitante hoje: não duplica
  }
  ok(await adm.from("denuncias").insert({
    anuncio_id: a.id, motivo: dados.motivo, detalhes: dados.detalhes || null, autor_id: usuarioId ?? null, ip_hash: ipHash ?? null,
  }), "Não foi possível registrar a denúncia.");
  return { ok: true };
}

// LGPD: apaga avisos, pedidos, fotos e notificações ligadas a um e-mail confirmado por código.  [RN03, RNF03]
export async function excluirDadosDeContato(email, codigo) {
  const adm = clienteServico();
  const alvo = email.toLowerCase();
  const erro = await consumirCodigo(adm, alvo, codigo);
  if (erro) return { ok: false, erro };
  const padrao = alvo.replace(/[\\%_]/g, "\\$&"); // ilike sem curingas: "_" é comum em e-mails
  const avisos = ok(await adm.from("avisos_encontrei").select("id,foto_caminho").ilike("email", padrao));
  const pedidos = ok(await adm.from("pedidos_adocao").select("id").ilike("email", padrao));
  const ids = [...avisos, ...pedidos].map((x) => x.id);
  if (ids.length) {
    ok(await adm.from("notificacoes").delete().in("dados->>registro_id", ids));
    if (avisos.length) ok(await adm.from("avisos_encontrei").delete().in("id", avisos.map((x) => x.id)));
    if (pedidos.length) ok(await adm.from("pedidos_adocao").delete().in("id", pedidos.map((x) => x.id)));
  }
  const fotos = avisos.map((x) => x.foto_caminho).filter(Boolean);
  if (fotos.length) await adm.storage.from("fotos-avisos").remove(fotos);
  await adm.from("codigos_verificacao").delete().eq("email", alvo);
  return { ok: true, avisos: avisos.length, pedidos: pedidos.length };
}

// ---------------------------------------------------------------------------
// Moderação  [RF21, RF22, RN06] — o RLS só deixa o administrador ler denúncias
// ---------------------------------------------------------------------------
const CAMPOS_DENUNCIA = `id,anuncio_id,motivo,detalhes,status,criado_em,revisado_em,revisor:perfis!denuncias_revisado_por_fkey(nome),anuncio:anuncios(${CAMPOS_RESUMO},descricao)`;

async function denunciasComAnuncio(sb, linhas) {
  const brutos = linhas.map((d) => d.anuncio).filter(Boolean);
  const porId = new Map((await resumos(sb, brutos)).map((a, i) => [a.id, { ...a, descricao: brutos[i].descricao }]));
  return linhas.map((d) => ({
    id: d.id, anuncio_id: d.anuncio_id, motivo: d.motivo, detalhes: d.detalhes, status: d.status, criado_em: d.criado_em,
    revisado_em: d.revisado_em, revisado_por: d.revisor?.nome ?? null, anuncio: porId.get(d.anuncio_id) ?? null,
  }));
}

export async function filaModeracao() {
  const usuario = await obterUsuarioAtual();
  if (!usuario?.e_admin) throw new Error("Apenas administradores.");
  const sb = await clienteUsuario();
  const pendentes = ok(await sb.from("denuncias").select(CAMPOS_DENUNCIA).eq("status", "pendente").order("criado_em"));
  const revisadas = ok(await sb.from("denuncias").select(CAMPOS_DENUNCIA).neq("status", "pendente")
    .order("revisado_em", { ascending: false }).limit(10));
  const ongs = ok(await sb.from("perfis").select("id,nome,ong_cnpj,ong_descricao,ong_chave_pix,instagram,site,criado_em,cidade:cidades(codigo_ibge)")
    .eq("tipo", "ong").eq("ong_status", "pendente").order("criado_em"));
  return {
    denuncias: await denunciasComAnuncio(sb, pendentes),
    ongs: ongs.map((p) => ({
      id: p.id, nome: p.nome, cnpj: p.ong_cnpj, descricao: p.ong_descricao, chave_pix: p.ong_chave_pix,
      cidade: cidadeResumida(p.cidade), instagram: p.instagram, site: p.site, criado_em: p.criado_em,
    })),
    revisadas: await denunciasComAnuncio(sb, revisadas),
  };
}

export async function contarPendenciasModeracao() {
  const usuario = await obterUsuarioAtual();
  if (!usuario?.e_admin) return 0;
  const sb = await clienteUsuario();
  const [d, o] = await Promise.all([
    sb.from("denuncias").select("id", { count: "exact", head: true }).eq("status", "pendente"),
    sb.from("perfis").select("id", { count: "exact", head: true }).eq("tipo", "ong").eq("ong_status", "pendente"),
  ]);
  return (d.count ?? 0) + (o.count ?? 0);
}

export async function revisarDenuncia(denunciaId, confirmar) {
  const sb = await clienteUsuario();
  ok(await sb.rpc("revisar_denuncia", { p_denuncia: denunciaId, p_confirmar: confirmar }));
}

export async function revisarOng(perfilId, aprovar) {
  const sb = await clienteUsuario();
  ok(await sb.rpc("revisar_ong", { p_perfil: perfilId, p_aprovar: aprovar }));
}

// ---------------------------------------------------------------------------
// Painel do usuário  [RF12, RN03]
// ---------------------------------------------------------------------------
export async function painelDoUsuario(usuarioId) {
  const sb = await clienteUsuario();
  const meus = await resumos(sb, ok(await sb.from("anuncios").select(CAMPOS_RESUMO).eq("dono_id", usuarioId).order("criado_em", { ascending: false })));
  const ids = meus.map((a) => a.id);
  const [avisos, pedidos, novidades] = await Promise.all([
    ids.length ? sb.from("avisos_encontrei").select("id,anuncio_id,nome,email,telefone,ponto,visto_em,animal_comigo,foto_caminho,mensagem,criado_em")
      .in("anuncio_id", ids).order("criado_em", { ascending: false }) : { data: [] },
    ids.length ? sb.from("pedidos_adocao").select("id,anuncio_id,nome,email,telefone,mensagem,criado_em")
      .in("anuncio_id", ids).order("criado_em", { ascending: false }) : { data: [] },
    sb.from("notificacoes").select("id,tipo,anuncio_id,criado_em").eq("usuario_id", usuarioId).is("lida_em", null).order("criado_em", { ascending: false }),
  ]).then((r) => r.map((x) => ok(x)));

  // Fotos dos avisos ficam num bucket privado: o dono recebe links temporários (1 hora).
  const caminhos = avisos.map((v) => v.foto_caminho).filter(Boolean);
  const assinadas = new Map();
  if (caminhos.length) {
    const { data } = await clienteServico().storage.from("fotos-avisos").createSignedUrls(caminhos, 3600);
    for (const f of data ?? []) if (f.signedUrl) assinadas.set(f.path, f.signedUrl);
  }

  const nomeDe = (id) => {
    const a = meus.find((x) => x.id === id);
    return a?.nome || (a ? `${a.especie} encontrado` : "Anúncio removido");
  };
  return {
    anuncios: meus.map((a) => ({
      ...a,
      novosAvisos: avisos.filter((v) => v.anuncio_id === a.id).length,
      novosPedidos: pedidos.filter((v) => v.anuncio_id === a.id).length,
    })),
    avisos: avisos.map((v) => ({ ...v, ponto: lerPonto(v.ponto), foto: assinadas.get(v.foto_caminho) ?? null, anuncio_nome: nomeDe(v.anuncio_id) })),
    pedidos: pedidos.map((v) => ({ ...v, anuncio_nome: nomeDe(v.anuncio_id) })),
    naoLidas: novidades.length,
    novidades: novidades.map((n) => ({ ...n, anuncio_nome: n.anuncio_id ? nomeDe(n.anuncio_id) : null })),
  };
}

export async function marcarNotificacoesLidas(usuarioId) {
  const sb = await clienteUsuario();
  ok(await sb.from("notificacoes").update({ lida_em: agoraIso() }).eq("usuario_id", usuarioId).is("lida_em", null));
}

export async function contarNaoLidas(usuarioId) {
  const sb = await clienteUsuario();
  const { count } = await sb.from("notificacoes").select("id", { count: "exact", head: true }).eq("usuario_id", usuarioId).is("lida_em", null);
  return count ?? 0;
}

// Só existe no modo local.
export async function alternarModoLocal() {}

// ---------------------------------------------------------------------------
// Fotos (Supabase Storage)
//  - "fotos": público; cada usuário grava só na pasta com o próprio id (política do 0002_storage.sql).
//  - "fotos-avisos": privado; só o servidor grava e gera links temporários para o dono.
// ---------------------------------------------------------------------------
const TIPOS = { webp: "image/webp", jpg: "image/jpeg", png: "image/png" };

export async function salvarFoto(bytes, extensao = "webp") {
  const sb = await clienteUsuario();
  const { data } = await sb.auth.getClaims();
  const caminho = `${data.claims.sub}/${crypto.randomUUID()}.${extensao}`;
  ok(await sb.storage.from("fotos").upload(caminho, bytes, { contentType: TIPOS[extensao] }), "Não foi possível enviar a foto.");
  return caminho;
}

export async function salvarFotoAviso(bytes, extensao = "webp") {
  const caminho = `${crypto.randomUUID()}.${extensao}`;
  ok(await clienteServico().storage.from("fotos-avisos").upload(caminho, bytes, { contentType: TIPOS[extensao] }), "Não foi possível enviar a foto.");
  return caminho;
}

export async function apagarFotoAviso(caminho) {
  if (caminho) await clienteServico().storage.from("fotos-avisos").remove([caminho]);
}

// As fotos vêm direto do Storage; a rota /fotos só serve o modo local.
export async function lerFoto() {
  return null;
}

// ---------------------------------------------------------------------------
// Contas: cadastro, login e senha (Supabase Auth)  [RF01, RF02, RF03, RNF02]
// A senha nunca passa pelo nosso banco: o Supabase Auth guarda só o hash.
// ---------------------------------------------------------------------------
function traduzirErroAuth(erro) {
  const porCodigo = {
    invalid_credentials: "E-mail ou senha incorretos.",
    email_not_confirmed: "Confirme seu e-mail antes de entrar: procure o link que enviamos na sua caixa de entrada.",
    weak_password: "Escolha uma senha mais forte, com pelo menos 8 caracteres.",
    over_email_send_rate_limit: "Enviamos muitos e-mails agora há pouco. Tente de novo em alguns minutos.",
    over_request_rate_limit: "Muitas tentativas seguidas. Espere um pouco e tente de novo.",
    email_address_invalid: "Este e-mail não é aceito. Confira se está correto.",
    same_password: "A nova senha precisa ser diferente da anterior.",
    session_not_found: "O link expirou. Peça um novo.",
  };
  console.error("[auth]", erro.code, erro.message);
  return porCodigo[erro.code] ?? "Não foi possível concluir agora. Tente de novo.";
}

export async function cadastrar(d) {
  const adm = clienteServico();
  if (d.tipo === "ong") {
    const existe = ok(await adm.from("perfis").select("id").eq("ong_cnpj", d.cnpj).maybeSingle());
    if (existe) return { ok: false, campo: "cnpj", erro: "Já existe uma ONG cadastrada com este CNPJ." };
  }
  const sb = await clienteUsuario();
  // nome, tipo e CNPJ vão para o gatilho criar_perfil. O telefone fica nos dados da conta, que não são públicos.
  const { data, error } = await sb.auth.signUp({
    email: d.email, password: d.senha,
    options: {
      emailRedirectTo: `${SITE_URL}/auth/confirmar?proximo=/painel`,
      data: { nome: d.nome, tipo: d.tipo, ong_cnpj: d.tipo === "ong" ? d.cnpj : null, telefone: d.telefone || null },
    },
  });
  if (error) return { ok: false, erro: traduzirErroAuth(error) };
  // E-mail já cadastrado volta sem identidades. Não revelamos isso: a resposta é a mesma.
  if (data.user?.identities?.length) {
    ok(await adm.from("perfis").update({
      cidade_id: await idCidadeNoBanco(adm, d.cidadeId), instagram: d.instagram || null, facebook: d.facebook || null, site: d.site || null,
      ong_descricao: d.tipo === "ong" ? d.descricao || null : null, ong_chave_pix: d.tipo === "ong" ? d.chavePix || null : null,
    }).eq("id", data.user.id));
  }
  return { ok: true, confirmarEmail: !data.session };
}

export async function entrar(email, senha) {
  const sb = await clienteUsuario();
  const { error } = await sb.auth.signInWithPassword({ email, password: senha });
  return error ? { ok: false, erro: traduzirErroAuth(error) } : { ok: true };
}

export async function sair() {
  const sb = await clienteUsuario();
  await sb.auth.signOut();
}

// Sempre responde "ok": não revela se o e-mail tem conta.
export async function enviarLinkNovaSenha(email) {
  const sb = await clienteUsuario();
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: `${SITE_URL}/auth/confirmar?proximo=/nova-senha` });
  if (error?.code?.startsWith("over_")) return { ok: false, erro: traduzirErroAuth(error) };
  return { ok: true };
}

export async function definirNovaSenha(senha) {
  const sb = await clienteUsuario();
  const { error } = await sb.auth.updateUser({ password: senha });
  return error ? { ok: false, erro: traduzirErroAuth(error) } : { ok: true };
}

// Link dos e-mails do Supabase: troca o código (PKCE) ou o token_hash por uma sessão.
export async function confirmarSessao({ code, tokenHash, tipo }) {
  const sb = await clienteUsuario();
  const { error } = code
    ? await sb.auth.exchangeCodeForSession(code)
    : await sb.auth.verifyOtp({ token_hash: tokenHash, type: tipo });
  if (error) console.error("[auth] confirmar:", error.code, error.message);
  return !error;
}
