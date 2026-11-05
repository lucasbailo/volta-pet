"use server";

// Ações chamadas pelos formulários. Aqui ficam a validação e as regras que o
// servidor precisa garantir (limites, consentimento, dono do anúncio).

import crypto from "crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import * as dados from "@/lib/dados";
import { coordenadaValida } from "@/lib/geo";
import { ESPECIES, LIMITE_FOTOS, ROTULOS } from "@/lib/regras";
import { TAMANHO_MAXIMO_FOTO, TIPOS_FOTO } from "@/lib/fotos";

// ---------------------------------------------------------------------------
// Utilitários de validação
// ---------------------------------------------------------------------------
function texto(fd, campo, { max = 200, obrigatorio = false, rotulo = campo } = {}, erros) {
  const valor = String(fd.get(campo) ?? "").trim();
  if (!valor) {
    if (obrigatorio) erros[campo] = `Preencha ${rotulo}.`;
    return null;
  }
  if (valor.length > max) erros[campo] = `${rotulo[0].toUpperCase() + rotulo.slice(1)} pode ter até ${max} caracteres.`;
  return valor;
}

function simNao(fd, campo) {
  const v = fd.get(campo);
  if (v === "sim") return true;
  if (v === "nao") return false;
  return null;
}

function opcao(fd, campo, permitidas) {
  const v = String(fd.get(campo) ?? "");
  return permitidas.includes(v) ? v : null;
}

function emailValido(email) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email ?? "");
}

function pontoDo(fd, prefixo = "") {
  const lat = Number(fd.get(`${prefixo}lat`));
  const lng = Number(fd.get(`${prefixo}lng`));
  return fd.get(`${prefixo}lat`) && coordenadaValida(lat, lng) ? { lat, lng } : null;
}

function dataPassada(fd, campo, erros, rotulo) {
  const bruto = fd.get(campo);
  if (!bruto) {
    erros[campo] = `Informe ${rotulo}.`;
    return null;
  }
  const d = new Date(bruto);
  if (Number.isNaN(d.getTime())) erros[campo] = `Data inválida em ${rotulo}.`;
  else if (d.getTime() > Date.now() + 3600000) erros[campo] = `${rotulo[0].toUpperCase() + rotulo.slice(1)} não pode estar no futuro.`;
  return d.toISOString();
}

// Fotos chegam já comprimidas pelo navegador (src/lib/fotos.js); o servidor confere de novo.  [RNF04]
function arquivosDeFoto(fd, campo) {
  return fd.getAll(campo).filter((f) => typeof f === "object" && f.size > 0);
}

function erroDeFoto(f) {
  if (!TIPOS_FOTO.includes(f.type)) return "Use fotos em JPG, PNG ou WebP.";
  if (f.size > TAMANHO_MAXIMO_FOTO) return "Cada foto pode ter até 1 MB.";
  return null;
}

async function salvarArquivoDeFoto(f) {
  const ext = f.type === "image/png" ? "png" : f.type === "image/jpeg" ? "jpg" : "webp";
  return dados.salvarFoto(Buffer.from(await f.arrayBuffer()), ext);
}

async function ipHash() {
  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "local";
  const sal = process.env.SAL_IP ?? "troque-este-sal-no-env";
  return crypto.createHash("sha256").update(ip + sal).digest("hex");
}

// ---------------------------------------------------------------------------
// Modo local: alternar entre Ana (admin), a ONG de exemplo e um visitante sem conta
// ---------------------------------------------------------------------------
export async function acaoAlternarModoLocal() {
  await dados.alternarModoLocal();
  revalidatePath("/", "layout");
}

// ---------------------------------------------------------------------------
// Localidades
// ---------------------------------------------------------------------------
export async function acaoListarCidades(uf) {
  return dados.listarCidades(String(uf ?? ""));
}

// ---------------------------------------------------------------------------
// Publicar anúncio  [RF07, RF13, RF15]
// ---------------------------------------------------------------------------
export async function acaoPublicarAnuncio(_estado, fd) {
  const usuario = await dados.obterUsuarioAtual();
  if (!usuario) return { erros: { geral: "Entre na sua conta para publicar." } };

  const erros = {};
  const tipo = opcao(fd, "tipo", ["desaparecido", "encontrado", "doacao"]);
  if (!tipo) return { erros: { geral: "Tipo de anúncio inválido." } };

  const anuncio = {
    tipo,
    especie: opcao(fd, "especie", ESPECIES),
    nome: texto(fd, "nome", { max: 60, obrigatorio: tipo !== "encontrado", rotulo: "o nome" }, erros),
    raca: texto(fd, "raca", { max: 60, rotulo: "a raça" }, erros),
    sexo: opcao(fd, "sexo", Object.keys(ROTULOS.sexo)) ?? "desconhecido",
    porte: opcao(fd, "porte", Object.keys(ROTULOS.porte)),
    cor: texto(fd, "cor", { max: 60, rotulo: "a cor" }, erros),
    sinais_particulares: texto(fd, "sinais_particulares", { max: 500, rotulo: "os sinais particulares" }, erros),
    descricao: texto(fd, "descricao", { max: 2000, rotulo: "a descrição" }, erros),
    cidade_id: Number(fd.get("cidade_id")) || null,
  };
  if (!anuncio.especie) erros.especie = "Escolha a espécie.";
  if (!anuncio.cidade_id || !dados.obterCidade(anuncio.cidade_id)) erros.cidade_id = "Escolha o estado e a cidade.";

  const idadeValor = Number(fd.get("idade_valor"));
  if (fd.get("idade_valor")) {
    if (!Number.isInteger(idadeValor) || idadeValor < 0 || idadeValor > 400) erros.idade_valor = "Idade inválida.";
    else anuncio.idade_meses = fd.get("idade_unidade") === "anos" ? idadeValor * 12 : idadeValor;
  }

  if (tipo === "desaparecido") {
    anuncio.data_evento = dataPassada(fd, "data_evento", erros, "quando ele sumiu");
    anuncio.perfil_saida = opcao(fd, "perfil_saida", Object.keys(ROTULOS.perfilSaida));
    if (!anuncio.perfil_saida) erros.perfil_saida = "Diga se o animal costuma sair de casa.";
    const recompensa = String(fd.get("recompensa") ?? "").replace(/\./g, "").replace(",", ".").trim();
    if (recompensa) {
      const valor = Number(recompensa);
      if (!Number.isFinite(valor) || valor < 0 || valor > 100000) erros.recompensa = "Valor de recompensa inválido.";
      else anuncio.recompensa = valor;
    }
  }
  if (tipo === "encontrado") {
    anuncio.data_evento = dataPassada(fd, "data_evento", erros, "quando você o encontrou");
    anuncio.animal_comigo = fd.get("animal_comigo") === "sim";
  }
  if (tipo === "doacao") {
    anuncio.vacinado = simNao(fd, "vacinado");
    anuncio.castrado = simNao(fd, "castrado");
    anuncio.vermifugado = simNao(fd, "vermifugado");
    anuncio.convive_criancas = simNao(fd, "convive_criancas");
    anuncio.convive_caes = simNao(fd, "convive_caes");
    anuncio.convive_gatos = simNao(fd, "convive_gatos");
    if (anuncio.vacinado === null) erros.vacinado = "Informe se é vacinado.";
    if (anuncio.castrado === null) erros.castrado = "Informe se é castrado.";
  }

  const ponto = pontoDo(fd);
  if (!ponto) erros.ponto = tipo === "doacao" ? "Marque no mapa a região do animal." : "Marque no mapa onde o animal foi visto pela última vez.";
  const precisao = opcao(fd, "precisao", ["exato", "aproximado"]) ?? "aproximado";

  const arquivos = arquivosDeFoto(fd, "fotos");
  if (arquivos.length > LIMITE_FOTOS) erros.fotos = `Envie no máximo ${LIMITE_FOTOS} fotos.`;
  for (const f of arquivos) erros.fotos = erroDeFoto(f) ?? erros.fotos;
  if (!erros.fotos) delete erros.fotos;

  if (Object.keys(erros).length) return { erros };

  const fotos = [];
  for (const f of arquivos) fotos.push(await salvarArquivoDeFoto(f));

  const id = await dados.criarAnuncio(anuncio, usuario.id, { ponto, precisao, fotos });
  revalidatePath("/", "layout");
  redirect(`/anuncio/${id}?publicado=1`);
}

// ---------------------------------------------------------------------------
// Ações do dono  [RF10, RF17, RN02]
// ---------------------------------------------------------------------------
// Exige login e transforma erros da camada de dados em mensagem para a tela.
// Quem pode fazer o quê (dono, ONG, administrador) é conferido na camada de dados.
async function comoDono(fn) {
  const usuario = await dados.obterUsuarioAtual();
  if (!usuario) return { erro: "Entre na sua conta." };
  try {
    await fn(usuario.id);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { erro: e.message };
  }
}

export async function acaoMarcarResolvido(anuncioId) {
  return comoDono((uid) => dados.marcarResolvido(anuncioId, uid));
}

export async function acaoRenovar(anuncioId) {
  return comoDono((uid) => dados.renovarAnuncio(anuncioId, uid));
}

export async function acaoAdicionarAvistamento(_estado, fd) {
  const erros = {};
  const ponto = pontoDo(fd);
  if (!ponto) erros.ponto = "Marque no mapa onde o animal foi visto.";
  const vistoEm = dataPassada(fd, "visto_em", erros, "quando ele foi visto");
  const observacao = texto(fd, "observacao", { max: 500, rotulo: "a observação" }, erros);
  if (Object.keys(erros).length) return { erros };
  const r = await comoDono((uid) => dados.adicionarAvistamento(String(fd.get("anuncio_id")), { ponto, vistoEm, observacao }, uid));
  return r.erro ? { erros: { geral: r.erro } } : { ok: true };
}

// Irmãos para adoção conjunta: só a ONG dona dos dois anúncios.  [RF23, RN08]
export async function acaoVincularIrmaos(anuncioId, irmaoId) {
  return comoDono((uid) => dados.vincularIrmaos(String(anuncioId), String(irmaoId), uid));
}

export async function acaoDesvincularIrmaos(anuncioId, irmaoId) {
  return comoDono((uid) => dados.desvincularIrmaos(String(anuncioId), String(irmaoId), uid));
}

// ---------------------------------------------------------------------------
// Moderação  [RF21, RF22]. A camada de dados confere se quem chama é administrador.
// ---------------------------------------------------------------------------
export async function acaoRevisarDenuncia(denunciaId, confirmar) {
  return comoDono((uid) => dados.revisarDenuncia(String(denunciaId), confirmar === true, uid));
}

export async function acaoRevisarOng(perfilId, aprovar) {
  return comoDono((uid) => dados.revisarOng(String(perfilId), aprovar === true, uid));
}

export async function acaoMarcarNotificacoesLidas() {
  return comoDono((uid) => dados.marcarNotificacoesLidas(uid));
}

// ---------------------------------------------------------------------------
// "Encontrei o animal"  [RF11, RN03, RN07]
// ---------------------------------------------------------------------------
export async function acaoEnviarCodigo(email) {
  if (!emailValido(email)) return { erro: "Digite um e-mail válido." };
  const codigo = await dados.criarCodigoVerificacao(String(email));
  // TODO (Supabase): enviar o código por e-mail. Em modo local ele aparece na tela.
  console.log(`[modo local] código de verificação para ${email}: ${codigo}`);
  return { ok: true, codigoLocal: process.env.NODE_ENV !== "production" ? codigo : undefined };
}

export async function acaoEnviarAviso(_estado, fd) {
  const usuario = await dados.obterUsuarioAtual();
  const erros = {};
  const aviso = {
    anuncio_id: String(fd.get("anuncio_id") ?? ""),
    nome: texto(fd, "nome", { max: 100, obrigatorio: true, rotulo: "seu nome" }, erros),
    email: texto(fd, "email", { max: 200, obrigatorio: true, rotulo: "seu e-mail" }, erros),
    telefone: texto(fd, "telefone", { max: 20, rotulo: "o telefone" }, erros),
    mensagem: texto(fd, "mensagem", { max: 1000, rotulo: "a mensagem" }, erros),
    animal_comigo: fd.get("animal_comigo") === "sim",
    ponto: pontoDo(fd),
    foto: null,
  };
  if (aviso.email && !emailValido(aviso.email)) erros.email = "Digite um e-mail válido.";
  aviso.visto_em = dataPassada(fd, "visto_em", erros, "quando você viu o animal");
  if (fd.get("consentimento") !== "on") erros.consentimento = "Para o responsável entrar em contato, autorize o envio dos seus dados.";
  const codigo = String(fd.get("codigo") ?? "").trim();
  if (!usuario && !/^\d{6}$/.test(codigo)) erros.codigo = "Digite o código de 6 números enviado ao seu e-mail.";
  const [arquivo, ...extras] = arquivosDeFoto(fd, "foto"); // seção 3.4: uma foto opcional
  if (extras.length) erros.foto = "Envie só uma foto.";
  else if (arquivo) erros.foto = erroDeFoto(arquivo) ?? undefined;
  if (!erros.foto) delete erros.foto;
  const valores = () => Object.fromEntries([...fd].filter(([, x]) => typeof x === "string"));
  if (Object.keys(erros).length) return { erros, valores: valores() };

  // A foto é gravada antes do registro; se o aviso for recusado (RN07, código), ela é apagada.
  if (arquivo) aviso.foto = await salvarArquivoDeFoto(arquivo);
  try {
    const r = await dados.registrarAvisoEncontrei(aviso, { usuarioId: usuario?.id ?? null, ipHash: await ipHash(), codigo });
    if (!r.ok) {
      await dados.apagarFoto(aviso.foto);
      return { erros: { [r.campo ?? "geral"]: r.erro }, exigeConta: r.exigeConta, valores: valores() };
    }
  } catch (e) {
    await dados.apagarFoto(aviso.foto);
    return { erros: { geral: e.message } };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// LGPD: apagar avisos e pedidos enviados com um e-mail  [RN03, RNF03]
// ---------------------------------------------------------------------------
export async function acaoExcluirMeusDados(_estado, fd) {
  const email = String(fd.get("email") ?? "").trim();
  const codigo = String(fd.get("codigo") ?? "").trim();
  const erros = {};
  if (!emailValido(email)) erros.email = "Digite o e-mail que você usou nos avisos ou pedidos.";
  if (!/^\d{6}$/.test(codigo)) erros.codigo = "Digite o código de 6 números enviado ao seu e-mail.";
  if (fd.get("confirmacao") !== "on") erros.confirmacao = "Confirme que entende que a exclusão não pode ser desfeita.";
  if (Object.keys(erros).length) return { erros };
  const r = await dados.excluirDadosDeContato(email, codigo);
  if (!r.ok) return { erros: { codigo: r.erro } };
  revalidatePath("/", "layout");
  return { ok: true, avisos: r.avisos, pedidos: r.pedidos };
}

// ---------------------------------------------------------------------------
// Desaparecidos parecidos, mostrados antes de publicar um encontrado  [RF14]
// ---------------------------------------------------------------------------
export async function acaoBuscarParecidos(especie, lat, lng) {
  if (!ESPECIES.includes(especie) || !coordenadaValida(Number(lat), Number(lng))) return [];
  return dados.buscarDesaparecidosParecidos(especie, { lat: Number(lat), lng: Number(lng) });
}

// ---------------------------------------------------------------------------
// "Quero adotar"  [RF16]
// ---------------------------------------------------------------------------
export async function acaoPedidoAdocao(_estado, fd) {
  const usuario = await dados.obterUsuarioAtual();
  const erros = {};
  const pedido = {
    anuncio_id: String(fd.get("anuncio_id") ?? ""),
    nome: texto(fd, "nome", { max: 100, obrigatorio: true, rotulo: "seu nome" }, erros),
    email: texto(fd, "email", { max: 200, obrigatorio: true, rotulo: "seu e-mail" }, erros),
    telefone: texto(fd, "telefone", { max: 20, rotulo: "o telefone" }, erros),
    mensagem: texto(fd, "mensagem", { max: 1000, obrigatorio: true, rotulo: "uma mensagem" }, erros),
  };
  if (pedido.email && !emailValido(pedido.email)) erros.email = "Digite um e-mail válido.";
  if (fd.get("consentimento") !== "on") erros.consentimento = "Autorize o envio dos seus dados ao doador.";
  if (Object.keys(erros).length) return { erros, valores: Object.fromEntries(fd) };
  try {
    await dados.registrarPedidoAdocao(pedido, { usuarioId: usuario?.id ?? null });
  } catch (e) {
    return { erros: { geral: e.message } };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Denúncia  [RF20, RN06]
// ---------------------------------------------------------------------------
export async function acaoDenunciar(_estado, fd) {
  const usuario = await dados.obterUsuarioAtual();
  const motivo = opcao(fd, "motivo", Object.keys(ROTULOS.motivoDenuncia));
  if (!motivo) return { erros: { motivo: "Escolha um motivo." } };
  const erros = {};
  const detalhes = texto(fd, "detalhes", { max: 1000, rotulo: "os detalhes" }, erros);
  if (Object.keys(erros).length) return { erros };
  try {
    await dados.registrarDenuncia({ anuncio_id: String(fd.get("anuncio_id")), motivo, detalhes }, { usuarioId: usuario?.id ?? null, ipHash: await ipHash() });
  } catch (e) {
    return { erros: { geral: e.message } };
  }
  revalidatePath("/", "layout");
  return { ok: true };
}
