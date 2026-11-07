import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import FormPublicar from "@/components/FormPublicar";
import { listarEstados, obterUsuarioAtual } from "@/lib/dados";

export const metadata = { title: "Publicar anúncio" };

export default function Page({ searchParams }) {
  return (
    <div className="mx-auto max-w-3xl px-4 pb-10 pt-8">
      <h1 className="text-4xl font-extrabold sm:text-5xl">Publicar anúncio</h1>
      <p className="mt-2 text-lg text-tinta-suave">Quanto mais detalhes, mais fácil alguém reconhecer o animal.</p>
      <div className="mt-8">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-folha" />}>
          <Conteudo searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function Conteudo({ searchParams }) {
  await connection();
  const { tipo } = await searchParams;
  const usuario = await obterUsuarioAtual();
  if (!usuario) {
    return (
      <div className="space-y-4 rounded-2xl bg-folha p-6 text-lg">
        <p>Para publicar, entre na sua conta. Quem só quer avisar que viu um animal não precisa de conta: use o botão “Encontrei o animal” no anúncio.</p>
        <p className="flex flex-wrap gap-2">
          <Link href={`/entrar?proximo=${encodeURIComponent(`/publicar${tipo ? `?tipo=${tipo}` : ""}`)}`} className="botao botao-tinta">Entrar</Link>
          <Link href="/cadastro" className="botao botao-contorno">Criar conta</Link>
        </p>
      </div>
    );
  }
  const tipoInicial = ["desaparecido", "encontrado", "doacao"].includes(tipo) ? tipo : "desaparecido";
  return <FormPublicar tipoInicial={tipoInicial} estados={listarEstados()} />;
}
