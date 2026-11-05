import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { GradeAnuncios } from "@/components/CardAnuncio";
import { Vazio } from "@/components/PaginaFeed";
import { obterOng, obterUsuarioAtual } from "@/lib/dados";

export const metadata = { title: "ONG" };

// Página pública da ONG: dados, selo de verificada, PIX e todos os animais.  [RF02, RF22, RF23]
export default function Page({ params }) {
  return (
    <Suspense fallback={<div className="mx-auto h-[70vh] max-w-6xl animate-pulse px-4 py-10" />}>
      <PaginaOng params={params} />
    </Suspense>
  );
}

async function PaginaOng({ params }) {
  await connection();
  const { id } = await params;
  const [ong, usuario] = await Promise.all([obterOng(id), obterUsuarioAtual()]);
  if (!ong) notFound();
  const eDaOng = usuario?.id === ong.id;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-6">
      <Link href="/ongs" className="text-tinta-suave underline underline-offset-4">Ver todas as ONGs</Link>

      <header className="mt-5 grid gap-6 rounded-2xl border-[1.5px] border-tinta/15 bg-folha p-6 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0">
          <h1 className="text-4xl font-extrabold sm:text-5xl">{ong.nome}</h1>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-tinta-suave">
            {ong.verificada ? (
              <span className="rounded-full bg-adocao-claro px-2.5 py-0.5 text-sm font-bold text-adocao">ONG verificada</span>
            ) : (
              <span className="rounded-full bg-papel px-2.5 py-0.5 text-sm font-bold">Cadastro em análise</span>
            )}
            {ong.cidade && <span>{ong.cidade.nome}, {ong.cidade.uf}</span>}
          </p>
          {ong.descricao && <p className="mt-4 max-w-prose whitespace-pre-line text-lg">{ong.descricao}</p>}
          <ul className="mt-4 flex flex-wrap gap-2">
            {ong.instagram && <li><a className="botao botao-contorno botao-pequeno" href={`https://instagram.com/${ong.instagram}`} target="_blank" rel="noopener noreferrer">Instagram</a></li>}
            {ong.facebook && <li><a className="botao botao-contorno botao-pequeno" href={`https://facebook.com/${ong.facebook}`} target="_blank" rel="noopener noreferrer">Facebook</a></li>}
            {ong.site && <li><a className="botao botao-contorno botao-pequeno" href={ong.site} target="_blank" rel="noopener noreferrer">Site</a></li>}
          </ul>
        </div>
        <div className="space-y-3 lg:border-l-[1.5px] lg:border-tinta/10 lg:pl-6">
          {ong.chave_pix ? (
            <>
              <p className="font-bold">Quer ajudar com os custos?</p>
              <p>Chave PIX da ONG: <strong className="break-all">{ong.chave_pix}</strong></p>
              {/* RN05: o site não intermedeia pagamentos */}
              <p className="text-sm text-tinta-suave">
                A doação vai direto para a ONG; o site não recebe nem repassa dinheiro. Confira se o nome do recebedor é o da ONG antes de confirmar.
              </p>
            </>
          ) : (
            <p className="text-tinta-suave">A chave PIX aparece aqui depois que a nossa equipe verificar o cadastro da ONG.</p>
          )}
          {eDaOng && (
            <Link href="/publicar?tipo=doacao" className="botao botao-adocao w-full">Colocar animal para adoção</Link>
          )}
        </div>
      </header>

      <section aria-labelledby="t-adocao" className="mt-12">
        <h2 id="t-adocao" className="text-3xl font-extrabold">Para adoção</h2>
        <p className="mt-1 text-tinta-suave">Irmãos aparecem juntos no anúncio de cada um. Se puder, adote-os juntos.</p>
        <div className="mt-5">
          <GradeAnuncios anuncios={ong.paraAdocao} vazio={<Vazio texto="Nenhum animal para adoção no momento." />} />
        </div>
      </section>

      {ong.outrosAtivos.length > 0 && (
        <section aria-labelledby="t-outros" className="mt-14">
          <h2 id="t-outros" className="text-3xl font-extrabold">Desaparecidos e encontrados</h2>
          <div className="mt-5">
            <GradeAnuncios anuncios={ong.outrosAtivos} vazio={null} />
          </div>
        </section>
      )}

      {ong.totalAdotados > 0 && (
        <section aria-labelledby="t-adotados" className="mt-14">
          <h2 id="t-adotados" className="text-3xl font-extrabold">
            {ong.totalAdotados === 1 ? "1 animal já foi adotado" : `${ong.totalAdotados} animais já foram adotados`}
          </h2>
          <div className="mt-5">
            <GradeAnuncios anuncios={ong.adotados} vazio={null} />
          </div>
        </section>
      )}
    </div>
  );
}
