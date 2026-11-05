import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import FotoAnimal from "@/components/FotoAnimal";
import BotoesModeracao from "@/components/BotoesModeracao";
import { titulo, textoFaixa } from "@/components/CardAnuncio";
import { filaModeracao, obterUsuarioAtual } from "@/lib/dados";
import { ROTULOS } from "@/lib/regras";
import { cnpj, dataHora, tempoDesde } from "@/lib/formatacao";

export const metadata = { title: "Moderação" };

// Área do administrador: fila de denúncias e cadastros de ONG para aprovar.  [RF21, RF22, RN06]
export default function Page() {
  return (
    <div className="mx-auto max-w-5xl px-4 pb-10 pt-8">
      <h1 className="text-4xl font-extrabold sm:text-5xl">Moderação</h1>
      <Suspense fallback={<div className="mt-8 h-96 animate-pulse rounded-2xl bg-folha" />}>
        <Conteudo />
      </Suspense>
    </div>
  );
}

async function Conteudo() {
  await connection();
  const usuario = await obterUsuarioAtual();
  if (!usuario?.e_admin) return <p className="mt-6 text-lg">Esta área é só para administradores.</p>;
  const { denuncias, ongs, revisadas } = await filaModeracao(usuario.id);

  return (
    <div className="mt-8 space-y-14">
      <section aria-labelledby="t-denuncias">
        <h2 id="t-denuncias" className="text-3xl font-extrabold">Denúncias para analisar</h2>
        <p className="mt-1 max-w-prose text-tinta-suave">
          O anúncio denunciado já mostra o selo &ldquo;Denunciado, em análise&rdquo;. Confirme para ocultá-lo ou descarte para tirar o
          selo. O responsável é avisado nos dois casos. A mais antiga aparece primeiro.
        </p>
        {denuncias.length === 0 ? (
          <p className="mt-4 rounded-2xl border-[1.5px] border-dashed border-tinta/25 p-6">Nenhuma denúncia esperando análise.</p>
        ) : (
          <ul className="mt-5 space-y-3">
            {denuncias.map((d) => (
              <li key={d.id} className="grid gap-4 rounded-2xl border-[1.5px] border-tinta/15 bg-folha p-5 sm:grid-cols-[96px_1fr]">
                <div className="h-24 w-24 overflow-hidden rounded-xl">
                  {d.anuncio && <FotoAnimal foto={d.anuncio.foto} especie={d.anuncio.especie} tipo={d.anuncio.tipo} nome={titulo(d.anuncio)} />}
                </div>
                <div className="min-w-0 space-y-2">
                  <p className="text-sm text-tinta-suave">Recebida {tempoDesde(d.criado_em)} ({dataHora(d.criado_em)})</p>
                  <p className="text-lg font-bold">{ROTULOS.motivoDenuncia[d.motivo]}</p>
                  {d.detalhes && <p className="max-w-prose whitespace-pre-line">{d.detalhes}</p>}
                  {d.anuncio && (
                    <p className="text-[0.95rem]">
                      Anúncio: <Link href={`/anuncio/${d.anuncio.id}`} className="font-semibold underline underline-offset-4">{titulo(d.anuncio)}</Link>
                      <span className="text-tinta-suave"> ({ROTULOS.tipo[d.anuncio.tipo]}, {textoFaixa(d.anuncio).toLowerCase()}, por {d.anuncio.dono?.nome ?? "usuário removido"})</span>
                    </p>
                  )}
                  {d.anuncio?.status === "oculto" ? (
                    <p className="text-sm text-tinta-suave">Este anúncio já foi ocultado por outra denúncia.</p>
                  ) : null}
                  <BotoesModeracao tipo="denuncia" id={d.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="t-ongs">
        <h2 id="t-ongs" className="text-3xl font-extrabold">ONGs para aprovar</h2>
        <p className="mt-1 max-w-prose text-tinta-suave">
          Confira o CNPJ na Receita Federal antes de aprovar. A ONG aprovada ganha o selo de verificada e passa a mostrar a chave PIX.
        </p>
        {ongs.length === 0 ? (
          <p className="mt-4 rounded-2xl border-[1.5px] border-dashed border-tinta/25 p-6">Nenhum cadastro de ONG esperando aprovação.</p>
        ) : (
          <ul className="mt-5 space-y-3">
            {ongs.map((o) => (
              <li key={o.id} className="space-y-2 rounded-2xl border-[1.5px] border-tinta/15 bg-folha p-5">
                <p className="text-lg font-bold">
                  <Link href={`/ong/${o.id}`} className="underline-offset-4 hover:underline">{o.nome}</Link>
                </p>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[0.95rem]">
                  <dt className="text-tinta-suave">CNPJ</dt><dd className="font-semibold">{o.cnpj ? cnpj(o.cnpj) : "Não informado"}</dd>
                  {o.cidade && (<><dt className="text-tinta-suave">Cidade</dt><dd>{o.cidade.nome}, {o.cidade.uf}</dd></>)}
                  {o.chave_pix && (<><dt className="text-tinta-suave">Chave PIX</dt><dd className="break-all">{o.chave_pix}</dd></>)}
                  {o.instagram && (<><dt className="text-tinta-suave">Instagram</dt><dd>@{o.instagram}</dd></>)}
                  {o.criado_em && (<><dt className="text-tinta-suave">Cadastro</dt><dd>{dataHora(o.criado_em)}</dd></>)}
                </dl>
                {o.descricao && <p className="max-w-prose">{o.descricao}</p>}
                <BotoesModeracao tipo="ong" id={o.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {revisadas.length > 0 && (
        <section aria-labelledby="t-revisadas">
          <h2 id="t-revisadas" className="text-2xl font-extrabold">Últimas denúncias analisadas</h2>
          <ul className="mt-4 divide-y divide-linha overflow-hidden rounded-2xl border-[1.5px] border-tinta/15 bg-folha">
            {revisadas.map((d) => (
              <li key={d.id} className="px-5 py-3 text-[0.95rem]">
                <span className="font-semibold">{d.status === "confirmada" ? "Confirmada" : "Descartada"}</span>
                {" — "}{ROTULOS.motivoDenuncia[d.motivo]}
                {d.anuncio && <>, <Link href={`/anuncio/${d.anuncio.id}`} className="underline underline-offset-4">{titulo(d.anuncio)}</Link></>}
                <span className="text-tinta-suave">. Por {d.revisado_por}, {tempoDesde(d.revisado_em)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
