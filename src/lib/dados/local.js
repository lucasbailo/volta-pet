// Implementação LOCAL da camada de dados: grava tudo em .dados-locais/banco.json.
// Serve para desenvolver sem Supabase. Depois, criaremos supabase.js com as mesmas
// funções e trocaremos a importação em ./index.js. As telas não mudam.

import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { cookies } from "next/headers";
import localidades from "./localidades.json";
import { gerarExemplos } from "./exemplos";
import { distanciaMetros, pontoAproximado } from "../geo";
import { REGRAS_EXPIRACAO, JANELA_AVISO_ANONIMO_DIAS, LIMITE_FOTOS, zonasPara } from "../regras";

export const MODO = "local";
const PASTA = path.join(process.cwd(), ".dados-locais");
const ARQUIVO = path.join(PASTA, "banco.json");
const PASTA_FOTOS = path.join(PASTA, "fotos");
const DIA = 86400000;

const cidadesPorId = new Map(localidades.cidades.map((c) => [c.id, c]));
const novoId = () => crypto.randomUUID();
const agoraIso = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Leitura e gravação do arquivo (gravações enfileiradas para não se atropelarem)
// ---------------------------------------------------------------------------
let fila = Promise.resolve();

async function lerBanco() {
  try {
    return JSON.parse(await fs.readFile(ARQUIVO, "utf8"));
  } catch (erro) {
    if (erro.code !== "ENOENT") throw erro;
    const banco = gerarExemplos();
    await gravarBanco(banco);
    return banco;
  }
}

async function gravarBanco(banco) {
  await fs.mkdir(PASTA, { recursive: true });
  const temporario = `${ARQUIVO}.${crypto.randomUUID()}.tmp`;
  await fs.writeFile(temporario, JSON.stringify(banco, null, 2));
  await fs.rename(temporario, ARQUIVO);
}

// Leituras e gravações passam por uma fila, uma de cada vez.
function naFila(fn) {
  const tarefa = fila.then(fn);
  fila = tarefa.catch(() => {});
  return tarefa;
}

// Executa uma alteração com exclusividade e já aplica a rotina diária.
function alterar(fn) {
  return naFila(async () => {
    const banco = await lerBanco();
    rotinaDiaria(banco);
    const resultado = await fn(banco);
    await gravarBanco(banco);
    return resultado;
  });
}

function ler() {
  return naFila(async () => {
    const banco = await lerBanco();
    if (rotinaDiaria(banco)) await gravarBanco(banco); // persiste expirações pendentes
    return banco;
  });
}

// ---------------------------------------------------------------------------
// RN02: lembrete, expiração e remoção (no Supabase isso roda pelo pg_cron)
// ---------------------------------------------------------------------------
function rotinaDiaria(banco) {
  const agora = Date.now();
  let mudou = false;
  for (const a of banco.anuncios) {
    const r = REGRAS_EXPIRACAO[a.tipo];
    const expira = new Date(a.expira_em).getTime();
    if (a.status === "ativo" && !a.lembrete_enviado_em && agora >= expira - (r.validade - r.lembrete) * DIA) {
      a.lembrete_enviado_em = agoraIso();
      notificar(banco, a.dono_id, "lembrete", a.id);
      mudou = true;
    }
    if (a.status === "ativo" && agora > expira) {
      a.status = "expirado";
      notificar(banco, a.dono_id, "expirado", a.id);
      mudou = true;
    }
  }
  const antes = banco.anuncios.length;
  banco.anuncios = banco.anuncios.filter(
    (a) => !(a.status === "expirado" && agora > new Date(a.expira_em).getTime() + REGRAS_EXPIRACAO[a.tipo].remocao * DIA),
  );
  if (banco.anuncios.length !== antes) {
    removerOrfaos(banco);
    mudou = true;
  }
  // LGPD: IP guardado no máximo 30 dias
  for (const lista of [banco.avisos_encontrei, banco.denuncias]) {
    for (const r of lista) {
      if (r.ip_hash && agora - new Date(r.criado_em).getTime() > 30 * DIA) {
        r.ip_hash = null;
        mudou = true;
      }
    }
  }
  return mudou;
}

function removerOrfaos(banco) {
  const ids = new Set(banco.anuncios.map((a) => a.id));
  for (const chave of ["avistamentos", "avisos_encontrei", "pedidos_adocao", "denuncias", "notificacoes"]) {
    banco[chave] = banco[chave].filter((r) => !r.anuncio_id || ids.has(r.anuncio_id));
  }
  banco.irmaos = banco.irmaos.filter(([a, b]) => ids.has(a) && ids.has(b));
  for (const id of Object.keys(banco.locaisPrivados)) if (!ids.has(id)) delete banco.locaisPrivados[id];
}

function notificar(banco, usuarioId, tipo, anuncioId, dados = {}) {
  banco.notificacoes.push({ id: novoId(), usuario_id: usuarioId, tipo, anuncio_id: anuncioId, dados, lida_em: null, criado_em: agoraIso() });
}

// ---------------------------------------------------------------------------
// Usuário (modo local: Ana, a ONG de exemplo ou visitante sem conta)
// ---------------------------------------------------------------------------
export const COOKIE_MODO_LOCAL = "modo_local";
// Ordem em que o botão "Modo local" alterna. null = visitante sem conta.
const MODOS_LOCAIS = [
  { valor: "ana", usuarioId: "demo-ana" },
  { valor: "ong", usuarioId: "ong-patas" },
  { valor: "visitante", usuarioId: null },
];

async function modoLocalAtual() {
  const c = await cookies();
  const valor = c.get(COOKIE_MODO_LOCAL)?.value;
  return MODOS_LOCAIS.find((m) => m.valor === valor) ?? MODOS_LOCAIS[0];
}

export async function obterUsuarioAtual() {
  const { usuarioId } = await modoLocalAtual();
  if (!usuarioId) return null;
  const banco = await ler();
  return banco.perfis.find((p) => p.id === usuarioId) ?? null;
}

// ---------------------------------------------------------------------------
// Localidades
// ---------------------------------------------------------------------------
export function listarEstados() {
  return localidades.estados;
}

export function listarCidades(uf) {
  return localidades.cidades.filter((c) => c.uf === uf).map(({ id, nome, lat, lng }) => ({ id, nome, lat, lng }));
}

export function obterCidade(id) {
  return cidadesPorId.get(Number(id)) ?? null;
}

// ---------------------------------------------------------------------------
// Anúncios: leitura
// ---------------------------------------------------------------------------
const VISIVEIS = new Set(["ativo", "resolvido", "expirado"]);

// Irmãos ainda disponíveis: o vínculo vale nos dois sentidos e adotados somem.  [RN08]
// (No Supabase: função irmaos_disponiveis.)
function irmaosDisponiveis(banco, id) {
  const ids = banco.irmaos.filter((par) => par.includes(id)).map(([x, y]) => (x === id ? y : x));
  return banco.anuncios.filter((x) => ids.includes(x.id) && x.status === "ativo");
}

function resumo(a, banco, referencia) {
  const cidade = obterCidade(a.cidade_id);
  return {
    id: a.id, tipo: a.tipo, status: a.status, especie: a.especie, nome: a.nome, raca: a.raca, sexo: a.sexo,
    idade_meses: a.idade_meses, porte: a.porte, cor: a.cor, data_evento: a.data_evento, recompensa: a.recompensa,
    animal_comigo: a.animal_comigo, vacinado: a.vacinado, castrado: a.castrado, sinalizado: a.sinalizado,
    criado_em: a.criado_em, resolvido_em: a.resolvido_em, expira_em: a.expira_em,
    foto: a.fotos[0] ?? null,
    cidade: cidade ? { id: cidade.id, nome: cidade.nome, uf: cidade.uf } : null,
    dono: (() => {
      const p = banco.perfis.find((x) => x.id === a.dono_id);
      return p ? { id: p.id, nome: p.nome, tipo: p.tipo, ong_status: p.ong_status ?? null } : null;
    })(),
    distancia_m: referencia && a.ponto_publico ? distanciaMetros(referencia, a.ponto_publico) : null,
    total_irmaos: a.tipo === "doacao" ? irmaosDisponiveis(banco, a.id).length : 0, // RF23: "tem 2 irmãos disponíveis"
  };
}

/**
 * Filtros: tipo, status ("ativo" | "expirado" | "resolvido"), uf, cidadeId, especie,
 * perto ({lat, lng}) para ordenar por distância, raioKm, pagina, porPagina.
 */
export async function listarAnuncios(filtros = {}) {
  const { tipo, tipos, status = "ativo", uf, cidadeId, especie, perto, raioKm = 50, pagina = 1, porPagina = 24 } = filtros;
  const banco = await ler();
  let lista = banco.anuncios.filter((a) => a.status === status);
  if (tipo) lista = lista.filter((a) => a.tipo === tipo);
  if (tipos) lista = lista.filter((a) => tipos.includes(a.tipo));
  if (especie) lista = lista.filter((a) => a.especie === especie);
  if (cidadeId) lista = lista.filter((a) => a.cidade_id === Number(cidadeId));
  else if (uf) lista = lista.filter((a) => obterCidade(a.cidade_id)?.uf === uf);

  let itens = lista.map((a) => resumo(a, banco, perto));
  if (perto) {
    itens = itens.filter((a) => a.distancia_m != null && a.distancia_m <= raioKm * 1000);
    itens.sort((x, y) => x.distancia_m - y.distancia_m);
  } else {
    const chave = status === "resolvido" ? "resolvido_em" : "criado_em";
    itens.sort((x, y) => (y[chave] ?? "").localeCompare(x[chave] ?? ""));
  }
  const total = itens.length;
  const inicio = (pagina - 1) * porPagina;
  return { itens: itens.slice(inicio, inicio + porPagina), total, pagina, temMais: inicio + porPagina < total };
}

// RF14: desaparecidos da mesma espécie, a até 5 km, publicados nos últimos 60 dias.
function parecidosCom(banco, especie, ponto) {
  const limite = Date.now() - 60 * DIA;
  return banco.anuncios
    .filter((x) => x.tipo === "desaparecido" && x.status === "ativo" && x.especie === especie && x.ponto_publico
      && new Date(x.criado_em).getTime() > limite)
    .map((x) => resumo(x, banco, ponto))
    .filter((x) => x.distancia_m <= 5000)
    .sort((x, y) => x.distancia_m - y.distancia_m)
    .slice(0, 4);
}

// RF14: usada no formulário, antes de publicar um animal encontrado.
export async function buscarDesaparecidosParecidos(especie, ponto) {
  return parecidosCom(await ler(), especie, ponto);
}

export async function obterAnuncio(id, usuarioId = null) {
  const banco = await ler();
  const a = banco.anuncios.find((x) => x.id === id);
  if (!a) return null;
  const eDono = usuarioId === a.dono_id;
  const perfilUsuario = banco.perfis.find((p) => p.id === usuarioId);
  if (!VISIVEIS.has(a.status) && !eDono && !perfilUsuario?.e_admin) return null;

  const dono = banco.perfis.find((p) => p.id === a.dono_id);
  const avistamentos = banco.avistamentos
    .filter((v) => v.anuncio_id === id)
    .sort((x, y) => y.visto_em.localeCompare(x.visto_em));

  // Zonas a partir do avistamento mais recente  [RF10]
  let zonas = null;
  if (a.tipo === "desaparecido") {
    const z = zonasPara(a.especie, a.perfil_saida);
    // O dono vê as zonas a partir do ponto exato; o público, a partir do ponto público (RN04).
    const pontoBase = eDono ? banco.locaisPrivados[id] ?? a.ponto_publico : a.ponto_publico;
    const centro = avistamentos[0]?.ponto ?? pontoBase;
    if (z && centro) {
      zonas = {
        ...z, centro, apartirDeAvistamento: Boolean(avistamentos[0]),
        centroAproximado: !avistamentos[0] && !eDono && a.precisao === "aproximado",
      };
    }
  }

  // Irmãos ainda disponíveis  [RN08]
  const irmaos = irmaosDisponiveis(banco, id).map((x) => resumo(x, banco));

  const parecidos = a.tipo === "encontrado" && a.ponto_publico ? parecidosCom(banco, a.especie, a.ponto_publico) : [];

  return {
    ...resumo(a, banco),
    sinais_particulares: a.sinais_particulares, descricao: a.descricao, perfil_saida: a.perfil_saida,
    vermifugado: a.vermifugado, convive_criancas: a.convive_criancas, convive_caes: a.convive_caes, convive_gatos: a.convive_gatos,
    precisao: a.precisao, ponto_publico: a.ponto_publico, fotos: a.fotos, renovacoes: a.renovacoes,
    ponto_exato: eDono ? banco.locaisPrivados[id] ?? a.ponto_publico : null, // RN04: só o dono vê
    dono: dono && {
      id: dono.id, nome: dono.nome, tipo: dono.tipo, instagram: dono.instagram, facebook: dono.facebook, site: dono.site,
      ong_status: dono.ong_status ?? null, ong_chave_pix: dono.ong_status === "aprovada" ? dono.ong_chave_pix : null,
    },
    eDono,
    avistamentos,
    zonas,
    irmaos,
    parecidos,
  };
}

// ---------------------------------------------------------------------------
// Anúncios: escrita (só o dono)
// ---------------------------------------------------------------------------
const CAMPOS_ANUNCIO = [
  "tipo", "especie", "nome", "raca", "sexo", "idade_meses", "porte", "cor", "sinais_particulares", "descricao",
  "vacinado", "castrado", "vermifugado", "convive_criancas", "convive_caes", "convive_gatos",
  "data_evento", "perfil_saida", "recompensa", "animal_comigo", "cidade_id",
];

export async function criarAnuncio(dados, usuarioId, { ponto, precisao, fotos = [] }) {
  return alterar((banco) => {
    const id = novoId();
    const criado = agoraIso();
    const anuncio = {
      id, dono_id: usuarioId, status: "ativo", sinalizado: false, renovacoes: 0, lembrete_enviado_em: null, resolvido_em: null,
      criado_em: criado, atualizado_em: criado,
      expira_em: new Date(Date.now() + REGRAS_EXPIRACAO[dados.tipo].validade * DIA).toISOString(),
      fotos: fotos.slice(0, LIMITE_FOTOS),
      precisao, ponto_publico: precisao === "aproximado" ? pontoAproximado(ponto) : ponto,
    };
    for (const campo of CAMPOS_ANUNCIO) anuncio[campo] = dados[campo] ?? null;
    banco.anuncios.push(anuncio);
    banco.locaisPrivados[id] = ponto;
    return id;
  });
}

function anuncioDoDono(banco, id, usuarioId) {
  const a = banco.anuncios.find((x) => x.id === id && x.dono_id === usuarioId);
  if (!a) throw new Error("Anúncio não encontrado ou você não é o responsável por ele.");
  return a;
}

export async function adicionarAvistamento(anuncioId, { ponto, vistoEm, observacao }, usuarioId) {
  return alterar((banco) => {
    const a = anuncioDoDono(banco, anuncioId, usuarioId);
    if (a.tipo !== "desaparecido") throw new Error("Avistamentos só valem para animais desaparecidos.");
    banco.avistamentos.push({ id: novoId(), anuncio_id: anuncioId, ponto, visto_em: vistoEm, observacao: observacao || null, criado_em: agoraIso() });
  });
}

export async function marcarResolvido(anuncioId, usuarioId) {
  return alterar((banco) => {
    const a = anuncioDoDono(banco, anuncioId, usuarioId);
    if (!["ativo", "expirado"].includes(a.status)) throw new Error("Este anúncio não pode mais ser alterado.");
    a.status = "resolvido";
    a.resolvido_em = agoraIso();
  });
}

export async function renovarAnuncio(anuncioId, usuarioId) {
  return alterar((banco) => {
    const a = anuncioDoDono(banco, anuncioId, usuarioId);
    if (!["ativo", "expirado"].includes(a.status)) throw new Error("Este anúncio não pode ser renovado.");
    a.status = "ativo";
    a.expira_em = new Date(Date.now() + REGRAS_EXPIRACAO[a.tipo].validade * DIA).toISOString();
    a.renovacoes += 1;
    a.lembrete_enviado_em = null;
  });
}

// ---------------------------------------------------------------------------
// ONGs: lista e página pública  [RF02, RF22]
// ---------------------------------------------------------------------------
function cidadeResumida(id) {
  const c = obterCidade(id);
  return c ? { id: c.id, nome: c.nome, uf: c.uf } : null;
}

// Só ONGs aprovadas pelo administrador aparecem na lista.
export async function listarOngs() {
  const banco = await ler();
  return banco.perfis
    .filter((p) => p.tipo === "ong" && p.ong_status === "aprovada")
    .map((p) => ({
      id: p.id, nome: p.nome, descricao: p.ong_descricao ?? null, cidade: cidadeResumida(p.cidade_id),
      paraAdocao: banco.anuncios.filter((a) => a.dono_id === p.id && a.tipo === "doacao" && a.status === "ativo").length,
    }))
    .sort((x, y) => x.nome.localeCompare(y.nome, "pt-BR"));
}

// Página pública da ONG. ONG recusada não tem página; a pendente aparece sem selo e sem PIX.
export async function obterOng(id) {
  const banco = await ler();
  const p = banco.perfis.find((x) => x.id === id && x.tipo === "ong");
  if (!p || p.ong_status === "recusada") return null;
  const verificada = p.ong_status === "aprovada";
  const recentes = (lista, chave) => lista.sort((x, y) => (y[chave] ?? "").localeCompare(x[chave] ?? ""));
  const daOng = banco.anuncios.filter((a) => a.dono_id === id);
  const adotados = recentes(daOng.filter((a) => a.tipo === "doacao" && a.status === "resolvido"), "resolvido_em");
  return {
    id: p.id, nome: p.nome, descricao: p.ong_descricao ?? null, cidade: cidadeResumida(p.cidade_id),
    instagram: p.instagram, facebook: p.facebook, site: p.site,
    verificada,
    chave_pix: verificada ? p.ong_chave_pix ?? null : null, // PIX só com o selo de verificada
    paraAdocao: recentes(daOng.filter((a) => a.tipo === "doacao" && a.status === "ativo"), "criado_em").map((a) => resumo(a, banco)),
    outrosAtivos: recentes(daOng.filter((a) => a.tipo !== "doacao" && a.status === "ativo"), "criado_em").map((a) => resumo(a, banco)),
    adotados: adotados.slice(0, 6).map((a) => resumo(a, banco)),
    totalAdotados: adotados.length,
  };
}

// ---------------------------------------------------------------------------
// Irmãos para adoção conjunta  [RF23, RN08]
// O vínculo é guardado uma vez só, como par ordenado [menor, maior], igual à
// tabela irmaos do Supabase (check anuncio_a < anuncio_b).
// ---------------------------------------------------------------------------
const parOrdenado = (a, b) => (a < b ? [a, b] : [b, a]);

// Confere se o anúncio é de doação, da ONG e pertence a quem está logado.
function doacaoDaOng(banco, id, usuarioId) {
  const a = banco.anuncios.find((x) => x.id === id && x.dono_id === usuarioId);
  const dono = banco.perfis.find((p) => p.id === usuarioId);
  if (!a || a.tipo !== "doacao" || dono?.tipo !== "ong") throw new Error("Os anúncios precisam ser de doação e da sua ONG.");
  return a;
}

// Dados da tela de vínculo: o anúncio e os outros animais da ONG ainda para adoção.
export async function obterVinculosIrmaos(anuncioId, usuarioId) {
  const banco = await ler();
  let anuncio;
  try {
    anuncio = doacaoDaOng(banco, anuncioId, usuarioId);
  } catch {
    return null;
  }
  const vinculados = new Set(banco.irmaos.filter((par) => par.includes(anuncioId)).map(([x, y]) => (x === anuncioId ? y : x)));
  const candidatos = banco.anuncios
    .filter((x) => x.id !== anuncioId && x.dono_id === usuarioId && x.tipo === "doacao" && x.status === "ativo")
    .sort((x, y) => y.criado_em.localeCompare(x.criado_em))
    .map((x) => ({ ...resumo(x, banco), vinculado: vinculados.has(x.id) }));
  return { anuncio: resumo(anuncio, banco), candidatos };
}

// Espelha vincular_irmaos(p_a, p_b) do SQL.
export async function vincularIrmaos(idA, idB, usuarioId) {
  return alterar((banco) => {
    if (idA === idB) throw new Error("Um animal não pode ser irmão de si mesmo.");
    doacaoDaOng(banco, idA, usuarioId);
    doacaoDaOng(banco, idB, usuarioId);
    const [a, b] = parOrdenado(idA, idB);
    if (!banco.irmaos.some(([x, y]) => x === a && y === b)) banco.irmaos.push([a, b]);
  });
}

// Espelha desvincular_irmaos(p_a, p_b) do SQL.
export async function desvincularIrmaos(idA, idB, usuarioId) {
  return alterar((banco) => {
    anuncioDoDono(banco, idA, usuarioId);
    const [a, b] = parOrdenado(idA, idB);
    banco.irmaos = banco.irmaos.filter(([x, y]) => !(x === a && y === b));
  });
}

// ---------------------------------------------------------------------------
// Contatos: "Encontrei o animal", "Quero adotar", denúncias
// ---------------------------------------------------------------------------
const hashCodigo = (codigo) => crypto.createHash("sha256").update(String(codigo)).digest("hex");

// RN07: gera código de 6 dígitos. No modo local o código é devolvido para aparecer na tela.
// Limite de 3 pedidos por e-mail por hora, para ninguém usar o site para encher a caixa de outra pessoa.
export async function criarCodigoVerificacao(email) {
  const codigo = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
  await alterar((banco) => {
    const recentes = banco.codigos_verificacao.filter((c) => c.email === email.toLowerCase() && Date.now() - new Date(c.criado_em).getTime() < 3600000);
    if (recentes.length >= 3) throw new Error("Você já pediu 3 códigos na última hora. Use o último que chegou ou tente mais tarde.");
    banco.codigos_verificacao = banco.codigos_verificacao.filter((c) => Date.now() - new Date(c.criado_em).getTime() < DIA);
    banco.codigos_verificacao.push({
      id: novoId(), email: email.toLowerCase(), codigo_hash: hashCodigo(codigo), tentativas: 0,
      expira_em: new Date(Date.now() + 15 * 60000).toISOString(), usado_em: null, criado_em: agoraIso(),
    });
  });
  return codigo;
}

async function consumirCodigo(banco, email, codigo) {
  const c = banco.codigos_verificacao
    .filter((x) => x.email === email.toLowerCase() && !x.usado_em)
    .sort((x, y) => y.criado_em.localeCompare(x.criado_em))[0];
  if (!c || new Date(c.expira_em) < new Date()) return "Código expirado. Peça um novo código.";
  if (c.tentativas >= 5) return "Muitas tentativas. Peça um novo código.";
  if (c.codigo_hash !== hashCodigo(codigo)) {
    c.tentativas += 1;
    return "Código incorreto. Confira o e-mail e tente de novo.";
  }
  c.usado_em = agoraIso();
  return null;
}

function anuncioPublicoAtivo(banco, id) {
  const a = banco.anuncios.find((x) => x.id === id);
  if (!a || a.status !== "ativo") throw new Error("Este anúncio não está mais ativo.");
  return a;
}

export async function registrarAvisoEncontrei(dados, { usuarioId, ipHash, codigo }) {
  return alterar(async (banco) => {
    const a = anuncioPublicoAtivo(banco, dados.anuncio_id);
    if (a.tipo === "doacao") throw new Error("Este anúncio não recebe avisos de encontro.");

    if (!usuarioId) {
      // RN07: um aviso sem conta por e-mail, telefone ou IP a cada 30 dias
      const desde = Date.now() - JANELA_AVISO_ANONIMO_DIAS * DIA;
      const repetido = banco.avisos_encontrei.some((v) => !v.autor_id && new Date(v.criado_em).getTime() > desde && (
        v.email.toLowerCase() === dados.email.toLowerCase()
        || (dados.telefone && v.telefone === dados.telefone)
        || (ipHash && v.ip_hash === ipHash)));
      if (repetido) return { ok: false, exigeConta: true, erro: "Você já enviou um aviso sem conta nos últimos 30 dias. Crie uma conta para enviar outro." };
      const erroCodigo = await consumirCodigo(banco, dados.email, codigo);
      if (erroCodigo) return { ok: false, erro: erroCodigo, campo: "codigo" };
    }

    const id = novoId();
    banco.avisos_encontrei.push({
      id, ...dados, autor_id: usuarioId ?? null, consentimento: true,
      email_verificado_em: usuarioId ? null : agoraIso(), ip_hash: usuarioId ? null : ipHash, criado_em: agoraIso(),
    });
    notificar(banco, a.dono_id, "aviso_encontrei", a.id, { registro_id: id });
    return { ok: true };
  });
}

export async function registrarPedidoAdocao(dados, { usuarioId }) {
  return alterar((banco) => {
    const a = anuncioPublicoAtivo(banco, dados.anuncio_id);
    if (a.tipo !== "doacao") throw new Error("Este anúncio não é de adoção.");
    const id = novoId();
    banco.pedidos_adocao.push({ id, ...dados, autor_id: usuarioId ?? null, consentimento: true, criado_em: agoraIso() });
    notificar(banco, a.dono_id, "pedido_adocao", a.id, { registro_id: id });
    return { ok: true };
  });
}

// RN06: uma denúncia já coloca o selo de alerta e vai para análise
export async function registrarDenuncia(dados, { usuarioId, ipHash }) {
  return alterar((banco) => {
    const a = banco.anuncios.find((x) => x.id === dados.anuncio_id);
    if (!a) throw new Error("Anúncio não encontrado.");
    const desde = Date.now() - DIA;
    if (ipHash && banco.denuncias.some((d) => d.anuncio_id === a.id && d.ip_hash === ipHash && new Date(d.criado_em).getTime() > desde)) {
      return { ok: true }; // já denunciado por este visitante hoje: não duplica
    }
    banco.denuncias.push({
      id: novoId(), ...dados, autor_id: usuarioId ?? null, ip_hash: ipHash ?? null, status: "pendente",
      revisado_por: null, revisado_em: null, criado_em: agoraIso(),
    });
    a.sinalizado = true;
    return { ok: true };
  });
}

// ---------------------------------------------------------------------------
// LGPD: quem enviou um aviso ou pedido sem conta pode apagar os próprios dados  [RN03, RNF03]
// A pessoa prova que é dona do e-mail com o mesmo código de 6 dígitos da RN07.
// No Supabase: o servidor apaga com a chave de serviço (as tabelas não têm política de delete).
// ---------------------------------------------------------------------------
export async function excluirDadosDeContato(email, codigo) {
  const fotos = [];
  const r = await alterar(async (banco) => {
    const alvo = email.toLowerCase();
    const erro = await consumirCodigo(banco, alvo, codigo);
    if (erro) return { ok: false, erro };
    const doEmail = (x) => x.email?.toLowerCase() === alvo;
    const avisos = banco.avisos_encontrei.filter(doEmail);
    const pedidos = banco.pedidos_adocao.filter(doEmail);
    const ids = new Set([...avisos, ...pedidos].map((x) => x.id));
    fotos.push(...avisos.map((x) => x.foto).filter(Boolean));
    banco.avisos_encontrei = banco.avisos_encontrei.filter((x) => !doEmail(x));
    banco.pedidos_adocao = banco.pedidos_adocao.filter((x) => !doEmail(x));
    // As notificações ao dono do anúncio apontavam para esses registros: saem também.
    banco.notificacoes = banco.notificacoes.filter((n) => !ids.has(n.dados?.registro_id));
    banco.codigos_verificacao = banco.codigos_verificacao.filter((c) => c.email !== alvo);
    return { ok: true, avisos: avisos.length, pedidos: pedidos.length };
  });
  for (const f of fotos) await apagarFoto(f);
  return r;
}

// ---------------------------------------------------------------------------
// Moderação: fila de denúncias e aprovação de ONGs  [RF21, RF22, RN06]
// ---------------------------------------------------------------------------
function exigirAdmin(banco, usuarioId) {
  if (!banco.perfis.find((p) => p.id === usuarioId)?.e_admin) throw new Error("Apenas administradores.");
}

// Pendências que aparecem na fila. Quem denunciou não é exibido (só o motivo).
export async function filaModeracao(usuarioId) {
  const banco = await ler();
  exigirAdmin(banco, usuarioId);
  const nomeDe = (id) => banco.perfis.find((p) => p.id === id)?.nome ?? "Usuário removido";
  const anuncioDe = (id) => {
    const a = banco.anuncios.find((x) => x.id === id);
    return a ? { ...resumo(a, banco), descricao: a.descricao } : null;
  };
  const porData = (x, y) => x.criado_em.localeCompare(y.criado_em); // a mais antiga primeiro
  const denuncia = (d) => ({
    id: d.id, anuncio_id: d.anuncio_id, motivo: d.motivo, detalhes: d.detalhes, status: d.status, criado_em: d.criado_em,
    revisado_em: d.revisado_em, revisado_por: d.revisado_por ? nomeDe(d.revisado_por) : null, anuncio: anuncioDe(d.anuncio_id),
  });
  return {
    denuncias: banco.denuncias.filter((d) => d.status === "pendente").sort(porData).map(denuncia),
    ongs: banco.perfis.filter((p) => p.tipo === "ong" && p.ong_status === "pendente").sort((x, y) => (x.criado_em ?? "").localeCompare(y.criado_em ?? ""))
      .map((p) => ({
        id: p.id, nome: p.nome, cnpj: p.ong_cnpj ?? null, descricao: p.ong_descricao ?? null, chave_pix: p.ong_chave_pix ?? null,
        cidade: cidadeResumida(p.cidade_id), instagram: p.instagram, site: p.site, criado_em: p.criado_em ?? null,
      })),
    revisadas: banco.denuncias.filter((d) => d.status !== "pendente")
      .sort((x, y) => (y.revisado_em ?? "").localeCompare(x.revisado_em ?? "")).slice(0, 10).map(denuncia),
  };
}

// Número exibido ao lado do link "Moderação" no cabeçalho.
export async function contarPendenciasModeracao(usuarioId) {
  const banco = await ler();
  if (!banco.perfis.find((p) => p.id === usuarioId)?.e_admin) return 0;
  return banco.denuncias.filter((d) => d.status === "pendente").length
    + banco.perfis.filter((p) => p.tipo === "ong" && p.ong_status === "pendente").length;
}

// Espelha revisar_denuncia(p_denuncia, p_confirmar) do SQL.
// Confirmar oculta o anúncio; descartar tira o selo se não houver outra denúncia pendente.
export async function revisarDenuncia(denunciaId, confirmar, usuarioId) {
  return alterar((banco) => {
    exigirAdmin(banco, usuarioId);
    const d = banco.denuncias.find((x) => x.id === denunciaId && x.status === "pendente");
    if (!d) throw new Error("Denúncia não encontrada ou já revisada.");
    d.status = confirmar ? "confirmada" : "descartada";
    d.revisado_por = usuarioId;
    d.revisado_em = agoraIso();
    const a = banco.anuncios.find((x) => x.id === d.anuncio_id);
    if (!a) return;
    if (confirmar) a.status = "oculto";
    else if (!banco.denuncias.some((x) => x.anuncio_id === a.id && x.status === "pendente")) a.sinalizado = false;
    notificar(banco, a.dono_id, confirmar ? "denuncia_confirmada" : "denuncia_descartada", a.id); // o dono é avisado
  });
}

// Espelha revisar_ong(p_perfil, p_aprovar) do SQL. Aprovada ganha o selo e mostra o PIX.
export async function revisarOng(perfilId, aprovar, usuarioId) {
  return alterar((banco) => {
    exigirAdmin(banco, usuarioId);
    const p = banco.perfis.find((x) => x.id === perfilId && x.tipo === "ong");
    if (!p) throw new Error("ONG não encontrada.");
    p.ong_status = aprovar ? "aprovada" : "recusada";
  });
}

// ---------------------------------------------------------------------------
// Painel do usuário
// ---------------------------------------------------------------------------
export async function painelDoUsuario(usuarioId) {
  const banco = await ler();
  const meus = banco.anuncios
    .filter((a) => a.dono_id === usuarioId)
    .sort((x, y) => y.criado_em.localeCompare(x.criado_em));
  const ids = new Set(meus.map((a) => a.id));
  const nomeDe = (id) => {
    const a = banco.anuncios.find((x) => x.id === id);
    return a?.nome || (a ? `${a.especie} encontrado` : "Anúncio removido");
  };
  return {
    anuncios: meus.map((a) => ({
      ...resumo(a, banco),
      novosAvisos: banco.avisos_encontrei.filter((v) => v.anuncio_id === a.id).length,
      novosPedidos: banco.pedidos_adocao.filter((v) => v.anuncio_id === a.id).length,
    })),
    avisos: banco.avisos_encontrei.filter((v) => ids.has(v.anuncio_id))
      .sort((x, y) => y.criado_em.localeCompare(x.criado_em))
      .map((v) => ({ ...v, ip_hash: undefined, anuncio_nome: nomeDe(v.anuncio_id) })),
    pedidos: banco.pedidos_adocao.filter((v) => ids.has(v.anuncio_id))
      .sort((x, y) => y.criado_em.localeCompare(x.criado_em))
      .map((v) => ({ ...v, anuncio_nome: nomeDe(v.anuncio_id) })),
    naoLidas: banco.notificacoes.filter((n) => n.usuario_id === usuarioId && !n.lida_em).length,
    // RF12, RF19, RN06: novidades ainda não vistas, da mais recente para a mais antiga
    novidades: banco.notificacoes.filter((n) => n.usuario_id === usuarioId && !n.lida_em)
      .sort((x, y) => y.criado_em.localeCompare(x.criado_em))
      .map((n) => ({ id: n.id, tipo: n.tipo, anuncio_id: n.anuncio_id, anuncio_nome: n.anuncio_id ? nomeDe(n.anuncio_id) : null, criado_em: n.criado_em })),
  };
}

export async function marcarNotificacoesLidas(usuarioId) {
  return alterar((banco) => {
    for (const n of banco.notificacoes) if (n.usuario_id === usuarioId && !n.lida_em) n.lida_em = agoraIso();
  });
}

// Modo local: passa para o próximo perfil (Ana → ONG → visitante → Ana).
export async function alternarModoLocal() {
  const atual = await modoLocalAtual();
  const proximo = MODOS_LOCAIS[(MODOS_LOCAIS.indexOf(atual) + 1) % MODOS_LOCAIS.length];
  const c = await cookies();
  c.set(COOKIE_MODO_LOCAL, proximo.valor, { httpOnly: true, sameSite: "lax", path: "/" });
}

export async function contarNaoLidas(usuarioId) {
  const banco = await ler();
  return banco.notificacoes.filter((n) => n.usuario_id === usuarioId && !n.lida_em).length;
}

// ---------------------------------------------------------------------------
// Fotos (no Supabase: Storage)
// ---------------------------------------------------------------------------
const NOME_FOTO = /^[a-f0-9-]{36}\.(webp|jpg|png)$/;

export async function salvarFoto(bytes, extensao = "webp") {
  await fs.mkdir(PASTA_FOTOS, { recursive: true });
  const nome = `${novoId()}.${extensao}`;
  await fs.writeFile(path.join(PASTA_FOTOS, nome), bytes);
  return `/fotos/${nome}`;
}

// Recebe o endereço devolvido por salvarFoto ("/fotos/<nome>"). Ignora se não existir.
export async function apagarFoto(url) {
  const nome = String(url ?? "").replace(/^\/fotos\//, "");
  if (!NOME_FOTO.test(nome)) return;
  await fs.rm(path.join(PASTA_FOTOS, nome), { force: true });
}

// No Supabase, fotos de aviso vão para um bucket privado; no modo local ficam na mesma pasta.
export const salvarFotoAviso = salvarFoto;
export const apagarFotoAviso = apagarFoto;

// ---------------------------------------------------------------------------
// Contas: só existem com o Supabase Auth. No modo local, use o botão "Modo local".
// ---------------------------------------------------------------------------
const SEM_CONTAS = { ok: false, erro: "Cadastro e login funcionam quando o site está conectado ao Supabase. No modo local, use o botão no topo." };
export async function cadastrar() { return SEM_CONTAS; }
export async function entrar() { return SEM_CONTAS; }
export async function sair() {}
export async function enviarLinkNovaSenha() { return SEM_CONTAS; }
export async function definirNovaSenha() { return SEM_CONTAS; }
export async function confirmarSessao() { return false; }

export async function lerFoto(nome) {
  if (!NOME_FOTO.test(nome)) return null;
  try {
    return await fs.readFile(path.join(PASTA_FOTOS, nome));
  } catch {
    return null;
  }
}
