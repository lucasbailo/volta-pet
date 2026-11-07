import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { titulo, textoFaixa } from "@/components/CardAnuncio";
import { painelDoUsuario, obterUsuarioAtual } from "@/lib/dados";
import { acaoMarcarNotificacoesLidas } from "@/app/acoes";
import { dataHora, tempoDesde, diasAte } from "@/lib/formatacao";

export const metadata = { title: "Meu painel" };

export default function Page() {
  return (
    <div className="mx-auto max-w-5xl px-4 pb-10 pt-8">
      <h1 className="text-4xl font-extrabold sm:text-5xl">Meu painel</h1>
      <Suspense fallback={<div className="mt-8 h-96 animate-pulse rounded-2xl bg-folha" />}>
        <Conteudo />
      </Suspense>
    </div>
  );
}

const COR = {
  desaparecido: "bg-cartaz",
  encontrado: "bg-achado",
  doacao: "bg-adocao",
};

// Texto de cada tipo de notificação (os tipos são os mesmos da tabela notificacoes do SQL).
function textoNovidade({ tipo, anuncio_nome: nome }) {
  switch (tipo) {
    case "aviso_encontrei": return `Novo aviso sobre ${nome}`;
    case "pedido_adocao": return `Novo pedido de adoção para ${nome}`;
    case "lembrete": return `${nome} chegou à metade do prazo. Atualize ou renove o anúncio`; // RN02
    case "expirado": return `${nome} expirou e foi para "Expirados". Renove se ainda procura`; // RN02
    case "denuncia_confirmada": return `A moderação confirmou uma denúncia e ocultou ${nome}`; // RN06
    case "denuncia_descartada": return `A denúncia contra ${nome} foi descartada e o selo saiu do anúncio`; // RN06
    default: return nome ? `Novidade em ${nome}` : "Novidade na sua conta";
  }
}

async function Conteudo() {
  await connection();
  const usuario = await obterUsuarioAtual();
  if (!usuario) {
    return (
      <p className="mt-6 text-lg">
        <Link href="/entrar?proximo=/painel" className="font-semibold underline underline-offset-4">Entre na sua conta</Link> para ver seus anúncios.
      </p>
    );
  }
  const { anuncios, avisos, pedidos, naoLidas, novidades } = await painelDoUsuario(usuario.id);

  async function marcarLidas() {
    "use server";
    await acaoMarcarNotificacoesLidas();
  }

  return (
    <div className="mt-8 space-y-14">
      {naoLidas > 0 && (
        <form action={marcarLidas} className="rounded-2xl bg-cartaz/35 px-5 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-semibold">Você tem {naoLidas} {naoLidas === 1 ? "novidade" : "novidades"} nos seus anúncios.</p>
            <button type="submit" className="botao botao-contorno botao-pequeno">Marcar como vistas</button>
          </div>
          <ul className="mt-3 space-y-1.5">
            {novidades.map((n) => (
              <li key={n.id}>
                {n.anuncio_id ? <Link href={`/anuncio/${n.anuncio_id}`} className="underline underline-offset-4">{textoNovidade(n)}</Link> : textoNovidade(n)}
                <span className="text-sm text-tinta-suave"> ({tempoDesde(n.criado_em)})</span>
              </li>
            ))}
          </ul>
        </form>
      )}

      <section aria-labelledby="t-avisos">
        <h2 id="t-avisos" className="text-3xl font-extrabold">Avisos recebidos</h2>
        <p className="mt-1 text-tinta-suave">Pessoas que viram ou reconheceram um animal dos seus anúncios. Só você vê esses contatos.</p>
        {avisos.length === 0 ? (
          <p className="mt-4 rounded-2xl border-[1.5px] border-dashed border-tinta/25 p-6">Nenhum aviso ainda.</p>
        ) : (
          <ul className="mt-5 space-y-3">
            {avisos.map((v) => (
              <li key={v.id} className="rounded-2xl border-[1.5px] border-tinta/15 bg-folha p-5">
                <p className="text-sm text-tinta-suave">
                  Sobre <Link href={`/anuncio/${v.anuncio_id}`} className="font-semibold text-tinta underline">{v.anuncio_nome}</Link>, recebido {tempoDesde(v.criado_em)}
                </p>
                <p className="mt-2 text-lg font-bold">{v.animal_comigo ? `${v.nome} está com o animal` : `${v.nome} viu o animal`}</p>
                <p className="text-tinta-suave">Em {dataHora(v.visto_em)}{v.ponto ? ", com local marcado no mapa" : ""}</p>
                {v.mensagem && <p className="mt-2 max-w-prose">{v.mensagem}</p>}
                {v.foto && (
                  <a href={v.foto} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block overflow-hidden rounded-xl border border-linha">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={v.foto} alt={`Foto enviada por ${v.nome}`} className="h-28 w-28 object-cover" />
                  </a>
                )}
                <p className="mt-3 flex flex-wrap gap-2">
                  <a href={`mailto:${v.email}`} className="botao botao-tinta botao-pequeno">{v.email}</a>
                  {v.telefone && <a href={`tel:${v.telefone.replace(/\D/g, "")}`} className="botao botao-contorno botao-pequeno">{v.telefone}</a>}
                  {v.ponto && (
                    <a className="botao botao-contorno botao-pequeno" target="_blank" rel="noopener noreferrer"
                      href={`https://www.openstreetmap.org/?mlat=${v.ponto.lat}&mlon=${v.ponto.lng}#map=18/${v.ponto.lat}/${v.ponto.lng}`}>
                      Ver local no mapa
                    </a>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {pedidos.length > 0 && (
        <section aria-labelledby="t-pedidos">
          <h2 id="t-pedidos" className="text-3xl font-extrabold">Pedidos de adoção</h2>
          <ul className="mt-5 space-y-3">
            {pedidos.map((p) => (
              <li key={p.id} className="rounded-2xl border-[1.5px] border-tinta/15 bg-folha p-5">
                <p className="text-sm text-tinta-suave">
                  Para <Link href={`/anuncio/${p.anuncio_id}`} className="font-semibold text-tinta underline">{p.anuncio_nome}</Link>, {tempoDesde(p.criado_em)}
                </p>
                <p className="mt-2 text-lg font-bold">{p.nome}</p>
                <p className="mt-1 max-w-prose">{p.mensagem}</p>
                <p className="mt-3 flex flex-wrap gap-2">
                  <a href={`mailto:${p.email}`} className="botao botao-tinta botao-pequeno">{p.email}</a>
                  {p.telefone && <a href={`tel:${p.telefone.replace(/\D/g, "")}`} className="botao botao-contorno botao-pequeno">{p.telefone}</a>}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="t-meus">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="t-meus" className="text-3xl font-extrabold">Meus anúncios</h2>
          <span className="flex flex-wrap gap-2">
            {usuario.tipo === "ong" && <Link href={`/ong/${usuario.id}`} className="botao botao-contorno botao-pequeno">Ver página pública da ONG</Link>}
            <Link href="/publicar" className="botao botao-tinta botao-pequeno">Publicar anúncio</Link>
          </span>
        </div>
        {anuncios.length === 0 ? (
          <p className="mt-4 rounded-2xl border-[1.5px] border-dashed border-tinta/25 p-6">Você ainda não publicou nenhum anúncio.</p>
        ) : (
          <ul className="mt-5 divide-y divide-linha overflow-hidden rounded-2xl border-[1.5px] border-tinta/15 bg-folha">
            {anuncios.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4">
                <span aria-hidden="true" className={`h-10 w-1.5 rounded-full ${a.status === "ativo" ? COR[a.tipo] : "bg-linha"}`} />
                <div className="min-w-0 flex-1">
                  <Link href={`/anuncio/${a.id}`} className="text-lg font-bold underline-offset-4 hover:underline">{titulo(a)}</Link>
                  <p className="text-sm text-tinta-suave">
                    {textoFaixa(a)}
                    {a.status === "ativo" ? `. Expira em ${diasAte(a.expira_em)} dias` : ""}
                  </p>
                </div>
                <p className="text-sm text-tinta-suave">
                  {a.tipo === "doacao"
                    ? `${a.novosPedidos} ${a.novosPedidos === 1 ? "pedido" : "pedidos"}`
                    : `${a.novosAvisos} ${a.novosAvisos === 1 ? "aviso" : "avisos"}`}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
