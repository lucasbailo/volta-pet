import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { titulo } from "@/components/CardAnuncio";
import VincularIrmaos from "@/components/VincularIrmaos";
import { obterUsuarioAtual, obterVinculosIrmaos } from "@/lib/dados";

export const metadata = { title: "Vincular irmãos" };

// Tela da ONG para marcar quais animais são irmãos para adoção conjunta.  [RF23, RN08]
export default function Page({ params }) {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 pt-6">
      <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-folha" />}>
        <Conteudo params={params} />
      </Suspense>
    </div>
  );
}

async function Conteudo({ params }) {
  await connection();
  const { id } = await params;
  const usuario = await obterUsuarioAtual();
  const dados = usuario ? await obterVinculosIrmaos(id, usuario.id) : null;

  if (!dados) {
    return (
      <div className="py-10">
        <h1 className="text-3xl font-extrabold">Vincular irmãos</h1>
        <p className="mt-3 text-lg">Só a ONG responsável por um anúncio de adoção pode vincular irmãos a ele.</p>
        <Link href={`/anuncio/${id}`} className="botao botao-contorno mt-6">Voltar para o anúncio</Link>
      </div>
    );
  }

  const nome = titulo(dados.anuncio);
  return (
    <>
      <Link href={`/anuncio/${id}`} className="text-tinta-suave underline underline-offset-4">Voltar para {nome}</Link>
      <h1 className="mt-5 text-4xl font-extrabold">Irmãos de {nome}</h1>
      <p className="mt-2 max-w-prose text-lg text-tinta-suave">
        Marque os animais da ONG que são irmãos de {nome}. O vínculo vale nos dois sentidos: o anúncio de cada um mostra
        os outros. Quando um deles for adotado, ele sai da lista dos demais.
      </p>
      <div className="mt-8">
        <VincularIrmaos anuncioId={id} nomeAnimal={nome} candidatos={dados.candidatos} />
      </div>
    </>
  );
}
