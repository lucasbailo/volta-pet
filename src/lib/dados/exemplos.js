// Dados de exemplo usados na primeira vez que o site roda em modo local.
// As datas são relativas ao momento em que o banco local é criado.

const H = 3600000;
const D = 24 * H;

export function gerarExemplos(agora = Date.now()) {
  const quando = (msAtras) => new Date(agora - msAtras).toISOString();
  const expira = (criadoMsAtras, dias = 60) => new Date(agora - criadoMsAtras + dias * D).toISOString();

  const perfis = [
    { id: "demo-ana", tipo: "pessoa", nome: "Ana Ribeiro", cidade_id: 3550308, instagram: "ana.ribeiro", facebook: null, site: null, e_admin: true },
    { id: "joao", tipo: "pessoa", nome: "João Mendes", cidade_id: 3550308, instagram: null, facebook: "joao.mendes", site: null, e_admin: false },
    { id: "ong-patas", tipo: "ong", nome: "ONG Patas Unidas", cidade_id: 3509502, instagram: "patasunidas", facebook: null, site: null, e_admin: false,
      ong_status: "aprovada", ong_cnpj: "11222333000181", ong_descricao: "Resgate e adoção responsável em Campinas e região.", ong_chave_pix: "patasunidas@exemplo.org",
      criado_em: quando(90 * D) },
    // Cadastro esperando aprovação: aparece na fila de moderação (RF22).
    { id: "ong-abrigo", tipo: "ong", nome: "Abrigo Quatro Patas", cidade_id: 3304557, instagram: "abrigoquatropatas", facebook: null, site: null, e_admin: false,
      ong_status: "pendente", ong_cnpj: "11444777000161", ong_descricao: "Abrigo de cães e gatos idosos no Rio de Janeiro.",
      ong_chave_pix: "abrigo4patas@exemplo.org", criado_em: quando(1 * D) },
  ];

  const base = {
    raca: null, sexo: "desconhecido", idade_meses: null, porte: null, cor: null, sinais_particulares: null, descricao: null,
    vacinado: null, castrado: null, vermifugado: null, convive_criancas: null, convive_caes: null, convive_gatos: null,
    data_evento: null, perfil_saida: null, recompensa: null, animal_comigo: null,
    precisao: "exato", status: "ativo", sinalizado: false, renovacoes: 0, lembrete_enviado_em: null, resolvido_em: null, fotos: [],
  };

  const anuncio = (id, criadoMsAtras, campos) => ({
    ...base, id, criado_em: quando(criadoMsAtras), atualizado_em: quando(criadoMsAtras),
    expira_em: expira(criadoMsAtras), ...campos,
  });

  const anuncios = [
    anuncio("mingau", 3 * D, {
      tipo: "desaparecido", dono_id: "demo-ana", especie: "gato", nome: "Mingau", raca: "Sem raça definida", sexo: "macho",
      idade_meses: 36, porte: "pequeno", cor: "Branco com manchas cinza", sinais_particulares: "Coleira vermelha com guizo, orelha esquerda com um corte pequeno.",
      descricao: "Fugiu pela janela da área de serviço. É medroso e deve estar escondido perto de casa.",
      data_evento: quando(3 * D + 2 * H), perfil_saida: "so_dentro_de_casa", recompensa: 200, cidade_id: 3550308,
      precisao: "aproximado", ponto_publico: { lat: -23.56632, lng: -46.69211 },
    }),
    anuncio("pacoca", 26 * H, {
      tipo: "desaparecido", dono_id: "joao", especie: "cachorro", nome: "Paçoca", raca: "Vira-lata caramelo", sexo: "femea",
      idade_meses: 60, porte: "medio", cor: "Caramelo", sinais_particulares: "Mancha branca no peito.",
      descricao: "Saiu pelo portão aberto durante uma entrega. É dócil e atende pelo nome.",
      data_evento: quando(27 * H), perfil_saida: "sai_sozinho", cidade_id: 3550308, ponto_publico: { lat: -23.55897, lng: -46.59901 },
    }),
    anuncio("kiwi", 2 * D, {
      tipo: "desaparecido", dono_id: "joao", especie: "passaro", nome: "Kiwi", raca: "Calopsita", sexo: "macho", idade_meses: 18,
      cor: "Cinza com bochechas laranja", descricao: "Assobia quando ouve o próprio nome e costuma pousar em varais.", data_evento: quando(2 * D + 3 * H),
      perfil_saida: "desconhecido", cidade_id: 3550308, ponto_publico: { lat: -23.58781, lng: -46.65826 },
      sinalizado: true, // tem uma denúncia pendente (RN06)
    }),
    anuncio("nina", 10 * D, {
      tipo: "desaparecido", dono_id: "ong-patas", especie: "gato", nome: "Nina", sexo: "femea", idade_meses: 24, porte: "pequeno",
      cor: "Preta", sinais_particulares: "Castrada, olhos verdes.", data_evento: quando(10 * D + 5 * H), perfil_saida: "sai_sozinho",
      cidade_id: 3509502, ponto_publico: { lat: -22.89662, lng: -47.06092 },
    }),
    anuncio("achado-rua-augusta", 5 * H, {
      tipo: "encontrado", dono_id: "joao", especie: "cachorro", raca: "Poodle", sexo: "macho", porte: "pequeno", cor: "Branco",
      descricao: "Estava andando sozinho perto do metrô, com coleira azul sem plaquinha. Está comigo e bem cuidado.",
      data_evento: quando(6 * H), animal_comigo: true, cidade_id: 3550308, ponto_publico: { lat: -23.55444, lng: -46.65913 },
    }),
    anuncio("tico", 4 * D, {
      tipo: "doacao", dono_id: "ong-patas", especie: "cachorro", nome: "Tico", sexo: "macho", idade_meses: 3, porte: "medio",
      cor: "Preto e branco", descricao: "Filhote brincalhão, resgatado com os irmãos.", vacinado: true, castrado: false, vermifugado: true,
      convive_criancas: true, convive_caes: true, convive_gatos: null, cidade_id: 3509502, ponto_publico: { lat: -22.90921, lng: -47.0611 },
    }),
    anuncio("teco", 4 * D, {
      tipo: "doacao", dono_id: "ong-patas", especie: "cachorro", nome: "Teco", sexo: "macho", idade_meses: 3, porte: "medio",
      cor: "Preto", descricao: "O mais calmo da ninhada, adora colo.", vacinado: true, castrado: false, vermifugado: true,
      convive_criancas: true, convive_caes: true, cidade_id: 3509502, ponto_publico: { lat: -22.90921, lng: -47.0611 },
    }),
    // Da mesma ninhada, mas ainda sem vínculo: serve para testar a tela "Vincular irmãos" (RF23).
    anuncio("pipoca", 2 * D, {
      tipo: "doacao", dono_id: "ong-patas", especie: "cachorro", nome: "Pipoca", sexo: "femea", idade_meses: 3, porte: "medio",
      cor: "Preto e branco", descricao: "A única fêmea da ninhada, curiosa e esperta.", vacinado: true, castrado: false, vermifugado: true,
      convive_criancas: true, convive_caes: true, cidade_id: 3509502, ponto_publico: { lat: -22.90921, lng: -47.0611 },
    }),
    anuncio("amora", 7 * D, {
      tipo: "doacao", dono_id: "joao", especie: "gato", nome: "Amora", sexo: "femea", idade_meses: 14, porte: "pequeno", cor: "Tricolor",
      descricao: "Muito carinhosa, se adapta bem a apartamento telado.", vacinado: true, castrado: true, vermifugado: true,
      convive_criancas: true, convive_gatos: true, convive_caes: false, cidade_id: 3550308, ponto_publico: { lat: -23.6012, lng: -46.6713 },
    }),
    anuncio("bento", 9 * D, {
      tipo: "desaparecido", dono_id: "joao", especie: "cachorro", nome: "Bento", raca: "Beagle", sexo: "macho", idade_meses: 48,
      porte: "medio", cor: "Tricolor", data_evento: quando(9 * D + 1 * H), perfil_saida: "sai_supervisionado", cidade_id: 3550308,
      ponto_publico: { lat: -23.5733, lng: -46.6417 }, status: "resolvido", resolvido_em: quando(7 * D),
      descricao: "Voltou para casa dois dias depois, graças ao aviso de uma vizinha pelo site.",
    }),
  ];

  const locaisPrivados = { mingau: { lat: -23.5671, lng: -46.6930 } };

  const avistamentos = [
    { id: "av-1", anuncio_id: "pacoca", ponto: { lat: -23.5547, lng: -46.5932 }, visto_em: quando(14 * H), observacao: "Vista perto da padaria da esquina.", criado_em: quando(13 * H) },
  ];

  const avisos_encontrei = [
    { id: "aviso-1", anuncio_id: "mingau", autor_id: null, nome: "Carla", email: "carla@exemplo.com", telefone: "(11) 90000-0000",
      ponto: { lat: -23.5664, lng: -46.6915 }, visto_em: quando(20 * H), animal_comigo: false, foto: null,
      mensagem: "Vi um gato parecido embaixo de um carro na rua de trás, por volta das 19h.", consentimento: true,
      email_verificado_em: quando(19 * H), ip_hash: null, criado_em: quando(19 * H) },
  ];

  const notificacoes = [
    { id: "not-1", usuario_id: "demo-ana", tipo: "aviso_encontrei", anuncio_id: "mingau", dados: { registro_id: "aviso-1" }, lida_em: null, criado_em: quando(19 * H) },
  ];

  return {
    versao: 1,
    perfis,
    anuncios,
    locaisPrivados,
    avistamentos,
    irmaos: [["teco", "tico"]],
    avisos_encontrei,
    pedidos_adocao: [],
    denuncias: [
      { id: "den-1", anuncio_id: "kiwi", autor_id: null, motivo: "golpe", detalhes: "Me pediram um PIX adiantado para \"liberar\" a calopsita.",
        ip_hash: null, status: "pendente", revisado_por: null, revisado_em: null, criado_em: quando(5 * H) },
    ],
    codigos_verificacao: [],
    notificacoes,
  };
}
