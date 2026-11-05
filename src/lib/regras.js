// Regras de negócio compartilhadas (espelham as tabelas zonas_busca e regras_expiracao do banco).

// RN01: zonas de busca. Interna = onde está a primeira fatia dos casos; externa = fatia maior.
export const ZONAS_BUSCA = {
  gato: {
    so_dentro_de_casa:  { interna_m: 39,  interna_pct: 50, externa_m: 137,  externa_pct: 75, fonte: "Huang et al., 2018" },
    sai_supervisionado: { interna_m: 50,  interna_pct: 50, externa_m: 500,  externa_pct: 75, fonte: "Huang et al., 2018" },
    sai_sozinho:        { interna_m: 300, interna_pct: 50, externa_m: 1609, externa_pct: 75, fonte: "Huang et al., 2018" },
    desconhecido:       { interna_m: 50,  interna_pct: 50, externa_m: 500,  externa_pct: 75, fonte: "Huang et al., 2018" },
  },
  cachorro: Object.fromEntries(
    ["so_dentro_de_casa", "sai_supervisionado", "sai_sozinho", "desconhecido"].map((p) => [
      p,
      { interna_m: 122, interna_pct: 42, externa_m: 1609, externa_pct: 70, fonte: "Kremer, 2021" },
    ]),
  ),
};

export const FONTES = {
  "Huang et al., 2018": "https://pmc.ncbi.nlm.nih.gov/articles/PMC5789300",
  "Kremer, 2021": "https://www.frontiersin.org/articles/10.3389/fvets.2021.669428/full",
};

export function zonasPara(especie, perfilSaida) {
  return ZONAS_BUSCA[especie]?.[perfilSaida || "desconhecido"] ?? null;
}

// RN02: prazos em dias.
export const REGRAS_EXPIRACAO = {
  desaparecido: { validade: 60, lembrete: 30, remocao: 180 },
  encontrado:   { validade: 60, lembrete: 30, remocao: 180 },
  doacao:       { validade: 60, lembrete: 30, remocao: 180 },
};

export const LIMITE_FOTOS = 5;
export const JANELA_AVISO_ANONIMO_DIAS = 30; // RN07

// Rótulos exibidos na tela
export const ROTULOS = {
  tipo: { desaparecido: "Desaparecido", encontrado: "Encontrado", doacao: "Para adoção" },
  especie: { cachorro: "Cachorro", gato: "Gato", passaro: "Pássaro", outro: "Outro" },
  especiePlural: { cachorro: "Cachorros", gato: "Gatos", passaro: "Pássaros", outro: "Outros" },
  sexo: { macho: "Macho", femea: "Fêmea", desconhecido: "Sexo não informado" },
  porte: { pequeno: "Porte pequeno", medio: "Porte médio", grande: "Porte grande" },
  perfilSaida: {
    so_dentro_de_casa: "Vive só dentro de casa",
    sai_supervisionado: "Sai só com supervisão",
    sai_sozinho: "Sai para a rua sozinho",
    desconhecido: "Não sei dizer",
  },
  motivoDenuncia: {
    golpe: "Parece golpe",
    anuncio_falso: "Anúncio falso",
    conteudo_improprio: "Conteúdo impróprio",
    outro: "Outro motivo",
  },
};

export const ESPECIES = ["cachorro", "gato", "passaro", "outro"];
export const EMOJI_ESPECIE = { cachorro: "🐶", gato: "🐱", passaro: "🐦", outro: "🐾" };
