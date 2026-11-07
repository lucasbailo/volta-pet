// Anúncios de exemplo no Supabase, para ver o site com conteúdo.
//   npm run exemplos:criar   → cria 3 contas de exemplo, 13 anúncios com fotos, avistamento, aviso e irmãos
//   npm run exemplos:apagar  → apaga as contas de exemplo e tudo o que é delas (anúncios, fotos, avisos)
// Usa a chave secreta do .env.local (ignora o RLS), por isso roda só na sua máquina.
// Fotos: Wikimedia Commons, CC0 (créditos em docs/creditos-imagens.md).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const PASTA_FOTOS = path.join(path.dirname(fileURLToPath(import.meta.url)), "fotos");
const { NEXT_PUBLIC_SUPABASE_URL: URL_SUPABASE, SUPABASE_SECRET_KEY: CHAVE } = process.env;
if (!URL_SUPABASE || !CHAVE) {
  console.error("Rode com as variáveis do .env.local: npm run exemplos:criar");
  process.exit(1);
}
const adm = createClient(URL_SUPABASE, CHAVE, { auth: { persistSession: false } });

const H = 3600000;
const D = 24 * H;
const quando = (msAtras) => new Date(Date.now() - msAtras).toISOString();
const ponto = (p) => `SRID=4326;POINT(${p.lng} ${p.lat})`;

// RN04: no modo aproximado, o ponto público fica entre 50 e 150 m do real (mesma conta de src/lib/geo.js).
function aproximar({ lat, lng }) {
  const R = 6371008.8, rad = Math.PI / 180, d = (50 + Math.random() * 100) / R, az = Math.random() * 2 * Math.PI;
  const la1 = lat * rad, lo1 = lng * rad;
  const la2 = Math.asin(Math.sin(la1) * Math.cos(d) + Math.cos(la1) * Math.sin(d) * Math.cos(az));
  const lo2 = lo1 + Math.atan2(Math.sin(az) * Math.sin(d) * Math.cos(la1), Math.cos(d) - Math.sin(la1) * Math.sin(la2));
  return { lat: la2 / rad, lng: lo2 / rad };
}

// Endereços de teste do Resend: aceitam e-mail sem entregar a ninguém.
const DONOS = {
  ana: { email: "delivered+exemplo-ana@resend.dev", nome: "Ana Ribeiro", tipo: "pessoa", cidade: 3550308, instagram: "ana.ribeiro" },
  joao: { email: "delivered+exemplo-joao@resend.dev", nome: "João Mendes", tipo: "pessoa", cidade: 3550308, facebook: "joao.mendes" },
  ong: {
    email: "delivered+exemplo-ong@resend.dev", nome: "ONG Patas Unidas", tipo: "ong", cidade: 3509502, instagram: "patasunidas",
    cnpj: "11444777000161", descricao: "Resgate e adoção responsável em Campinas e região. Todos os animais saem vacinados e vermifugados.",
    pix: "patasunidas@exemplo.org",
  },
};

const SP = 3550308;
const CAMPINAS = 3509502;

const ANUNCIOS = [
  // Desaparecidos
  { chave: "mingau", dono: "ana", foto: "gato-rajado-cinza", criado: 3 * D, local: { lat: -23.5671, lng: -46.6930 }, precisao: "aproximado", cidade: SP,
    tipo: "desaparecido", especie: "gato", nome: "Mingau", raca: "Sem raça definida", sexo: "macho", idade_meses: 36, porte: "pequeno",
    cor: "Cinza rajado", sinais_particulares: "Coleira vermelha com guizo e um corte pequeno na orelha esquerda.",
    descricao: "Fugiu pela janela da área de serviço. É medroso e deve estar escondido perto de casa.",
    data_evento: quando(3 * D + 2 * H), perfil_saida: "so_dentro_de_casa", recompensa: 200 },
  { chave: "pacoca", dono: "joao", foto: "cao-preto-caramelo", criado: 26 * H, local: { lat: -23.55897, lng: -46.59901 }, precisao: "exato", cidade: SP,
    tipo: "desaparecido", especie: "cachorro", nome: "Paçoca", raca: "Vira-lata", sexo: "femea", idade_meses: 60, porte: "grande",
    cor: "Preto e caramelo", sinais_particulares: "Orelhas em pé e coleira verde.",
    descricao: "Saiu pelo portão aberto durante uma entrega. É dócil e atende pelo nome.",
    data_evento: quando(27 * H), perfil_saida: "sai_sozinho" },
  { chave: "nina", dono: "ong", foto: "gata-preta", criado: 10 * D, local: { lat: -22.89662, lng: -47.06092 }, precisao: "exato", cidade: CAMPINAS,
    tipo: "desaparecido", especie: "gato", nome: "Nina", sexo: "femea", idade_meses: 24, porte: "pequeno", cor: "Preta",
    sinais_particulares: "Castrada, olhos amarelos.", descricao: "Estava em lar temporário e fugiu pelo muro.",
    data_evento: quando(10 * D + 5 * H), perfil_saida: "sai_sozinho" },
  { chave: "kiwi", dono: "joao", criado: 2 * D, local: { lat: -23.58781, lng: -46.65826 }, precisao: "aproximado", cidade: SP,
    tipo: "desaparecido", especie: "passaro", nome: "Kiwi", raca: "Calopsita", sexo: "macho", idade_meses: 18,
    cor: "Cinza com bochechas laranja", descricao: "Assobia quando ouve o próprio nome e costuma pousar em varais.",
    data_evento: quando(2 * D + 3 * H), perfil_saida: "desconhecido" },
  // Encontrados
  { chave: "gato-no-mato", dono: "ana", foto: "gato-no-mato", criado: 5 * H, local: { lat: -23.5600, lng: -46.6850 }, precisao: "aproximado", cidade: SP,
    tipo: "encontrado", especie: "gato", cor: "Cinza rajado", porte: "pequeno",
    descricao: "Está escondido no jardim do prédio desde ontem. Assusta fácil, mas aceita comida.",
    data_evento: quando(20 * H), animal_comigo: false },
  { chave: "cao-na-estrada", dono: "ana", foto: "cao-na-estrada", criado: 1 * D, local: { lat: -22.9050, lng: -47.0700 }, precisao: "exato", cidade: CAMPINAS,
    tipo: "encontrado", especie: "cachorro", cor: "Caramelo", porte: "medio", sexo: "macho",
    descricao: "Andava sozinho na estrada de terra, sem coleira. Está comigo, bem alimentado.",
    data_evento: quando(30 * H), animal_comigo: true },
  { chave: "gato-quintal", dono: "joao", foto: "gato-cinza-quintal", criado: 2 * D, local: { lat: -23.6012, lng: -46.6713 }, precisao: "aproximado", cidade: SP,
    tipo: "encontrado", especie: "gato", cor: "Cinza", porte: "pequeno", sexo: "macho",
    descricao: "Apareceu no quintal, muito manso. Parece ter dono. Está comigo.",
    data_evento: quando(2 * D + 4 * H), animal_comigo: true },
  // Adoção
  { chave: "tico", dono: "ong", foto: "filhote-caramelo", criado: 4 * D, local: { lat: -22.90921, lng: -47.0611 }, precisao: "aproximado", cidade: CAMPINAS,
    tipo: "doacao", especie: "cachorro", nome: "Tico", sexo: "macho", idade_meses: 3, porte: "medio", cor: "Caramelo com focinho preto",
    descricao: "Filhote brincalhão, resgatado com o irmão Teco.", vacinado: true, castrado: false, vermifugado: true,
    convive_criancas: true, convive_caes: true },
  { chave: "teco", dono: "ong", foto: "filhote-preto-branco", criado: 4 * D, local: { lat: -22.90921, lng: -47.0611 }, precisao: "aproximado", cidade: CAMPINAS,
    tipo: "doacao", especie: "cachorro", nome: "Teco", sexo: "macho", idade_meses: 3, porte: "pequeno", cor: "Preto e branco",
    descricao: "O mais calmo da ninhada, adora colo.", vacinado: true, castrado: false, vermifugado: true,
    convive_criancas: true, convive_caes: true },
  { chave: "luna", dono: "ong", foto: "gata-adulta", criado: 6 * D, local: { lat: -22.90921, lng: -47.0611 }, precisao: "aproximado", cidade: CAMPINAS,
    tipo: "doacao", especie: "gato", nome: "Luna", sexo: "femea", idade_meses: 36, porte: "pequeno", cor: "Rajada com peito branco",
    descricao: "Tranquila, gosta de janela e de rotina. Ideal para apartamento telado.", vacinado: true, castrado: true, vermifugado: true,
    convive_criancas: true, convive_gatos: true, convive_caes: false },
  { chave: "amora", dono: "joao", foto: "gata-tricolor", criado: 7 * D, local: { lat: -23.6012, lng: -46.6713 }, precisao: "aproximado", cidade: SP,
    tipo: "doacao", especie: "gato", nome: "Amora", sexo: "femea", idade_meses: 14, porte: "pequeno", cor: "Tricolor (escaminha)",
    descricao: "Muito carinhosa, dorme abraçada com bichinho de pelúcia.", vacinado: true, castrado: true, vermifugado: true,
    convive_criancas: true, convive_gatos: true, convive_caes: false },
  { chave: "cafe", dono: "ana", foto: "cao-marrom", criado: 9 * D, local: { lat: -23.5733, lng: -46.6417 }, precisao: "aproximado", cidade: SP,
    tipo: "doacao", especie: "cachorro", nome: "Café", raca: "Sem raça definida", sexo: "macho", idade_meses: 48, porte: "grande",
    cor: "Marrom chocolate", descricao: "Adora passear e já anda bem na guia. Precisa de casa com quintal.",
    vacinado: true, castrado: true, vermifugado: true, convive_criancas: true, convive_caes: true, convive_gatos: false },
  // Reencontro (RF18)
  { chave: "bento", dono: "joao", foto: "beagle", criado: 9 * D, local: { lat: -23.5733, lng: -46.6417 }, precisao: "exato", cidade: SP,
    tipo: "desaparecido", especie: "cachorro", nome: "Bento", raca: "Beagle", sexo: "macho", idade_meses: 48, porte: "medio",
    cor: "Tricolor", descricao: "Voltou para casa dois dias depois, graças ao aviso de uma vizinha pelo site.",
    data_evento: quando(9 * D + 1 * H), perfil_saida: "sai_supervisionado", resolvido: 7 * D },
];

const CAMPOS = ["tipo", "especie", "nome", "raca", "sexo", "idade_meses", "porte", "cor", "sinais_particulares", "descricao",
  "vacinado", "castrado", "vermifugado", "convive_criancas", "convive_caes", "convive_gatos", "data_evento", "perfil_saida",
  "recompensa", "animal_comigo"];

function ok({ data, error }, onde) {
  if (error) throw new Error(`${onde}: ${error.message}`);
  return data;
}

async function contasDeExemplo() {
  const { data } = await adm.auth.admin.listUsers({ perPage: 1000 });
  return data.users.filter((u) => u.user_metadata?.exemplo === true);
}

async function idCidade(ibge) {
  return ok(await adm.from("cidades").select("id").eq("codigo_ibge", ibge).single(), "cidade").id;
}

async function criar() {
  if ((await contasDeExemplo()).length) {
    console.log("Os exemplos já existem. Rode npm run exemplos:apagar antes de criar de novo.");
    return;
  }
  const ids = {};
  for (const [chave, d] of Object.entries(DONOS)) {
    const { data, error } = await adm.auth.admin.createUser({
      email: d.email, password: crypto.randomBytes(24).toString("base64url"), email_confirm: true,
      user_metadata: { nome: d.nome, tipo: d.tipo, ong_cnpj: d.cnpj ?? null, exemplo: true },
    });
    if (error) throw new Error(`conta ${chave}: ${error.message}`);
    ids[chave] = data.user.id;
    ok(await adm.from("perfis").update({
      cidade_id: await idCidade(d.cidade), instagram: d.instagram ?? null, facebook: d.facebook ?? null,
      ong_descricao: d.descricao ?? null, ong_chave_pix: d.pix ?? null, ...(d.tipo === "ong" ? { ong_status: "aprovada" } : {}),
    }).eq("id", data.user.id), `perfil ${chave}`);
  }

  const anuncios = {};
  for (const a of ANUNCIOS) {
    const linha = { dono_id: ids[a.dono], cidade_id: await idCidade(a.cidade), criado_em: quando(a.criado) };
    for (const c of CAMPOS) if (a[c] !== undefined) linha[c] = a[c];
    const { id } = ok(await adm.from("anuncios").insert(linha).select("id").single(), `anúncio ${a.chave}`);
    anuncios[a.chave] = id;
    const publico = a.precisao === "aproximado" ? aproximar(a.local) : a.local;
    ok(await adm.from("anuncios").update({
      precisao: a.precisao, ponto_publico: ponto(publico),
      expira_em: new Date(Date.now() - a.criado + 60 * D).toISOString(), // RN02: 60 dias a partir da publicação
      ...(a.resolvido ? { status: "resolvido", resolvido_em: quando(a.resolvido) } : {}),
    }).eq("id", id), `local ${a.chave}`);
    ok(await adm.from("anuncio_local_privado").insert({ anuncio_id: id, ponto_exato: ponto(a.local) }), `ponto exato ${a.chave}`);
    if (a.foto) {
      const caminho = `${ids[a.dono]}/${crypto.randomUUID()}.jpg`;
      ok(await adm.storage.from("fotos").upload(caminho, fs.readFileSync(path.join(PASTA_FOTOS, `${a.foto}.jpg`)), { contentType: "image/jpeg" }), `foto ${a.chave}`);
      ok(await adm.from("anuncio_fotos").insert({ anuncio_id: id, caminho, ordem: 0 }), `registro da foto ${a.chave}`);
    }
    console.log(`✓ ${a.tipo.padEnd(12)} ${a.nome ?? a.chave}`);
  }

  // RF10: avistamento do Paçoca (as zonas passam a partir dele)
  ok(await adm.from("avistamentos").insert({ anuncio_id: anuncios.pacoca, ponto: ponto({ lat: -23.5547, lng: -46.5932 }),
    visto_em: quando(14 * H), observacao: "Vista perto da padaria da esquina." }), "avistamento");
  // RF11: aviso de alguém sem conta para o Mingau (gera a notificação para a Ana)
  ok(await adm.from("avisos_encontrei").insert({ anuncio_id: anuncios.mingau, nome: "Carla", email: "delivered+exemplo-carla@resend.dev",
    telefone: "(11) 90000-0000", ponto: ponto({ lat: -23.5664, lng: -46.6915 }), visto_em: quando(20 * H), animal_comigo: false,
    mensagem: "Vi um gato parecido embaixo de um carro na rua de trás, por volta das 19h.", consentimento: true,
    email_verificado_em: quando(19 * H) }), "aviso");
  // RN08: Tico e Teco são irmãos (par guardado em ordem: anuncio_a < anuncio_b)
  const [a, b] = [anuncios.tico, anuncios.teco].sort();
  ok(await adm.from("irmaos").insert({ anuncio_a: a, anuncio_b: b }), "irmãos");

  console.log(`\nPronto: ${ANUNCIOS.length} anúncios de exemplo. Para remover: npm run exemplos:apagar`);
}

async function apagar() {
  const contas = await contasDeExemplo();
  for (const u of contas) {
    // As fotos não somem junto com a conta: o Storage é separado do banco.
    const arquivos = (await adm.storage.from("fotos").list(u.id, { limit: 1000 })).data ?? [];
    if (arquivos.length) ok(await adm.storage.from("fotos").remove(arquivos.map((f) => `${u.id}/${f.name}`)), "fotos");
    ok(await adm.auth.admin.deleteUser(u.id), "conta"); // apaga perfil, anúncios, avisos e notificações em cascata
  }
  console.log(contas.length ? `Apagadas ${contas.length} contas de exemplo e tudo o que era delas.` : "Não há exemplos para apagar.");
}

const comando = process.argv[2];
if (comando === "criar") await criar();
else if (comando === "apagar") await apagar();
else console.log("Use: npm run exemplos:criar  ou  npm run exemplos:apagar");
