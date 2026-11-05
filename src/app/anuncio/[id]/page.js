import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import FotoAnimal from "@/components/FotoAnimal";
import CardAnuncio, { textoFaixa, titulo } from "@/components/CardAnuncio";
import { MapaAnuncio } from "@/components/Mapa";
import ModalEncontrei from "@/components/ModalEncontrei";
import FormAdocao from "@/components/FormAdocao";
import Denunciar from "@/components/Denunciar";
import AcoesDono from "@/components/AcoesDono";
import { obterAnuncio, obterUsuarioAtual } from "@/lib/dados";
import { ROTULOS } from "@/lib/regras";
import { idade, dinheiro, dataHora, dataCurta, tempoDesde } from "@/lib/formatacao";

export const metadata = { title: "Anúncio" };

export default function Page({ params, searchParams }) {
  return (
    <Suspense fallback={<div className="mx-auto h-[70vh] max-w-6xl animate-pulse px-4 py-10" />}>
      <Detalhe params={params} searchParams={searchParams} />
    </Suspense>
  );
}

const FAIXA = {
  desaparecido: "bg-cartaz text-tinta",
  encontrado: "bg-achado text-white",
  doacao: "bg-adocao text-white",
  resolvido: "bg-tinta text-white",
  expirado: "bg-linha text-tinta",
  oculto: "bg-alerta text-white",
};

async function Detalhe({ params, searchParams }) {
  await connection();
  const { id } = await params;
  const sp = await searchParams;
  const usuario = await obterUsuarioAtual();
  const a = await obterAnuncio(id, usuario?.id);
  if (!a) notFound();

  const nome = titulo(a);
  const ativo = a.status === "ativo";
  const fatos = [
    ["Espécie", ROTULOS.especie[a.especie]],
    ["Raça", a.raca],
    ["Sexo", a.sexo !== "desconhecido" ? ROTULOS.sexo[a.sexo].toLowerCase() : null],
    ["Idade", idade(a.idade_meses)],
    ["Porte", a.porte ? ROTULOS.porte[a.porte].replace("Porte ", "") : null],
    ["Cor", a.cor],
    ["Sinais particulares", a.sinais_particulares],
    a.tipo === "desaparecido" && ["Costume", ROTULOS.perfilSaida[a.perfil_saida]],
    a.data_evento && [a.tipo === "desaparecido" ? "Sumiu em" : "Encontrado em", dataHora(a.data_evento)],
  ].filter((f) => f && f[1]);

  const saude = a.tipo === "doacao" ? [
    ["Vacinado", a.vacinado], ["Castrado", a.castrado], ["Vermifugado", a.vermifugado],
    ["Convive com crianças", a.convive_criancas], ["Convive com cães", a.convive_caes], ["Convive com gatos", a.convive_gatos],
  ].filter(([, v]) => v !== null && v !== undefined) : [];

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-6">
      {sp.publicado && (
        <p role="status" className="mb-6 rounded-2xl bg-adocao-claro px-5 py-4 font-semibold text-adocao">
          Anúncio publicado. Compartilhe o link desta página nos grupos do seu bairro para mais gente ver.
        </p>
      )}
      <Link href={a.tipo === "doacao" ? "/doacao" : a.tipo === "encontrado" ? "/encontrados" : "/desaparecidos"} className="text-tinta-suave underline underline-offset-4">
        Voltar para {a.tipo === "doacao" ? "adoção" : a.tipo === "encontrado" ? "encontrados" : "desaparecidos"}
      </Link>

      {/* Celular: foto, ficha e depois o resto. Desktop: ficha fixa na coluna da direita. */}
      <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 lg:col-start-1">
          <Galeria anuncio={a} nome={nome} />
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
          <div className="overflow-hidden rounded-2xl border-[1.5px] border-tinta/15 bg-folha">
            <p className={`px-5 py-2.5 font-bold ${FAIXA[ativo ? a.tipo : a.status]}`}>{textoFaixa(a)}</p>
            <div className="space-y-4 p-5">
              {a.status === "oculto" && (
                <p role="alert" className="rounded-xl border-l-4 border-alerta bg-alerta-claro p-3 text-[0.95rem]">
                  A moderação confirmou uma denúncia e ocultou este anúncio. Só {a.eDono ? "você" : "o responsável"} e a equipe do site conseguem vê-lo.
                </p>
              )}
              {a.sinalizado && a.status !== "oculto" && (
                <p role="alert" className="rounded-xl border-l-4 border-alerta bg-alerta-claro p-3 text-[0.95rem]">
                  Este anúncio foi denunciado e está em análise. Tenha cuidado redobrado e não faça pagamentos.
                </p>
              )}
              <div>
                <h1 className="text-4xl font-extrabold">{nome}</h1>
                <p className="mt-1 text-tinta-suave">{a.cidade ? `${a.cidade.nome}, ${a.cidade.uf}` : ""}</p>
              </div>
              {a.recompensa > 0 && ativo && (
                <p className="rounded-xl bg-cartaz/35 px-4 py-3">
                  <strong className="text-lg">Recompensa de {dinheiro(a.recompensa)}</strong>
                  <span className="block text-sm">Paga pelo responsável somente depois que o animal for devolvido.</span>
                </p>
              )}
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[0.98rem]">
                {fatos.map(([rotulo, valor]) => (
                  <div key={rotulo} className="contents">
                    <dt className="text-tinta-suave">{rotulo}</dt>
                    <dd className="font-semibold">{valor}</dd>
                  </div>
                ))}
              </dl>
              {saude.length > 0 && (
                <ul className="flex flex-wrap gap-1.5 text-sm font-semibold">
                  {saude.map(([rotulo, v]) => (
                    <li key={rotulo} className={`rounded-full px-2.5 py-0.5 ${v ? "bg-adocao-claro text-adocao" : "bg-papel text-tinta-suave"}`}>
                      {v ? rotulo : `Não ${rotulo.charAt(0).toLowerCase()}${rotulo.slice(1)}`}
                    </li>
                  ))}
                </ul>
              )}

              {ativo && !a.eDono && a.tipo === "desaparecido" && (
                <ModalEncontrei anuncioId={a.id} nomeAnimal={a.nome ?? "este animal"} centro={a.zonas?.centro ?? a.ponto_publico} usuario={usuario && { nome: usuario.nome }} />
              )}
              {ativo && !a.eDono && a.tipo === "doacao" && (
                <FormAdocao anuncioId={a.id} nomeAnimal={a.nome} usuario={usuario && { nome: usuario.nome }} />
              )}
              {ativo && a.tipo === "encontrado" && !a.eDono && (
                <>
                  <p className="rounded-xl bg-achado-claro p-3 text-[0.95rem]">
                    {a.animal_comigo ? "O animal está com quem publicou." : "Quem publicou viu o animal, mas ele não está com essa pessoa."} Se ele é seu, tenha fotos antigas com ele para comprovar.
                  </p>
                  <ModalEncontrei modo="dono" anuncioId={a.id} nomeAnimal={nome} centro={a.ponto_publico} usuario={usuario && { nome: usuario.nome }} />
                </>
              )}
            </div>
          </div>

          {a.eDono && <AcoesDono anuncio={a} />}

          {a.dono && (
            <div className="rounded-2xl border-[1.5px] border-tinta/15 bg-folha p-5">
              <p className="text-sm text-tinta-suave">Publicado {tempoDesde(a.criado_em)} por</p>
              <p className="titulo mt-0.5 text-xl font-bold">
                {a.dono.tipo === "ong" ? (
                  <Link href={`/ong/${a.dono.id}`} className="underline underline-offset-4">{a.dono.nome}</Link>
                ) : a.dono.nome}
                {a.dono.tipo === "ong" && a.dono.ong_status === "aprovada" && (
                  <span className="ml-2 align-middle rounded-full bg-adocao-claro px-2 py-0.5 font-[family-name:var(--font-texto)] text-xs font-bold text-adocao">ONG verificada</span>
                )}
              </p>
              <ul className="mt-3 flex flex-wrap gap-2">
                {a.dono.instagram && <li><a className="botao botao-contorno botao-pequeno" href={`https://instagram.com/${a.dono.instagram}`} target="_blank" rel="noopener noreferrer">Instagram</a></li>}
                {a.dono.facebook && <li><a className="botao botao-contorno botao-pequeno" href={`https://facebook.com/${a.dono.facebook}`} target="_blank" rel="noopener noreferrer">Facebook</a></li>}
                {a.dono.site && <li><a className="botao botao-contorno botao-pequeno" href={a.dono.site} target="_blank" rel="noopener noreferrer">Site</a></li>}
              </ul>
              {a.dono.ong_chave_pix && (
                <p className="mt-4 text-[0.95rem]">Quer ajudar a ONG com os custos? Chave PIX: <strong className="break-all">{a.dono.ong_chave_pix}</strong></p>
              )}
              <p className="mt-4 text-sm text-tinta-suave">
                Nunca pague nada antes de ver o animal pessoalmente. Encontros em lugar público, de preferência acompanhado.
              </p>
              {!a.eDono && a.status !== "oculto" && <div className="mt-3"><Denunciar anuncioId={a.id} /></div>}
            </div>
          )}
          <p className="text-sm text-tinta-suave">Anúncio expira em {dataCurta(a.expira_em)}.</p>
        </aside>
        <div className="min-w-0 space-y-8 lg:col-start-1">
          {a.descricao && (
            <section aria-labelledby="t-desc">
              <h2 id="t-desc" className="text-2xl font-extrabold">Sobre {a.nome ? a.nome : "o animal"}</h2>
              <p className="mt-2 max-w-prose whitespace-pre-line text-lg">{a.descricao}</p>
            </section>
          )}

          {a.ponto_publico && (
            <section aria-labelledby="t-mapa">
              <h2 id="t-mapa" className="text-2xl font-extrabold">
                {a.tipo === "desaparecido" ? "Onde procurar" : a.tipo === "encontrado" ? "Onde foi encontrado" : "Região"}
              </h2>
              {a.tipo === "desaparecido" && !a.zonas && (
                <p className="mt-1 text-tinta-suave">Ainda não há estudos sobre a distância percorrida por esta espécie, então o mapa mostra só o último local visto.</p>
              )}
              <div className="mt-3">
                <MapaAnuncio pontoPublico={a.ponto_publico} precisao={a.precisao} zonas={a.zonas} avistamentos={a.avistamentos} pontoExato={a.ponto_exato} />
              </div>
              {a.avistamentos.length > 0 && (
                <ol className="mt-5 space-y-2">
                  {a.avistamentos.map((v) => (
                    <li key={v.id} className="rounded-xl bg-folha px-4 py-3">
                      <span className="font-semibold">Visto {tempoDesde(v.visto_em)}</span>
                      <span className="text-tinta-suave"> ({dataHora(v.visto_em)})</span>
                      {v.observacao && <span className="block">{v.observacao}</span>}
                    </li>
                  ))}
                </ol>
              )}
            </section>
          )}
        </div>

      </div>

      {a.irmaos.length > 0 && (
        <section aria-labelledby="t-irmaos" className="mt-14">
          <h2 id="t-irmaos" className="text-3xl font-extrabold">
            {a.irmaos.length === 1 ? "1 irmão também procura um lar" : `${a.irmaos.length} irmãos também procuram um lar`}
          </h2>
          <p className="mt-1 text-tinta-suave">Se puder, considere adotar juntos.</p>
          <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {a.irmaos.map((x) => <li key={x.id}><CardAnuncio anuncio={x} /></li>)}
          </ul>
        </section>
      )}

      {a.parecidos.length > 0 && (
        <section aria-labelledby="t-parecidos" className="mt-14">
          <h2 id="t-parecidos" className="text-3xl font-extrabold">Desaparecidos parecidos por perto</h2>
          <p className="mt-1 text-tinta-suave">Mesma espécie, sumiram nos últimos 60 dias a até 5 km daqui. Pode ser um deles?</p>
          <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {a.parecidos.map((x) => <li key={x.id}><CardAnuncio anuncio={x} /></li>)}
          </ul>
        </section>
      )}
    </div>
  );
}

function Galeria({ anuncio: a, nome }) {
  const [principal, ...outras] = a.fotos;
  return (
    <div className="space-y-3">
      <div className="aspect-[4/3] overflow-hidden rounded-2xl border-[1.5px] border-tinta/15 sm:aspect-[16/10]">
        <FotoAnimal foto={principal} especie={a.especie} tipo={a.tipo} nome={nome} grande />
      </div>
      {outras.length > 0 && (
        <ul className="grid grid-cols-4 gap-3">
          {outras.map((f, i) => (
            <li key={f} className="aspect-square overflow-hidden rounded-xl">
              <a href={f} target="_blank" rel="noopener noreferrer">
                <FotoAnimal foto={f} especie={a.especie} tipo={a.tipo} nome={`${nome}, foto ${i + 2}`} />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
