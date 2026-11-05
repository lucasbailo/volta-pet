import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { Vazio } from "@/components/PaginaFeed";
import { listarOngs } from "@/lib/dados";

export const metadata = { title: "ONGs" };

export default function Page() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-8">
      <h1 className="text-4xl font-extrabold sm:text-5xl">ONGs verificadas</h1>
      <p className="mt-2 max-w-prose text-lg text-tinta-suave">
        Organizações que resgatam e colocam animais para adoção. Todas tiveram o cadastro conferido pela nossa equipe.
      </p>
      <Suspense fallback={<div className="mt-8 h-64 animate-pulse rounded-2xl bg-folha" />}>
        <Lista />
      </Suspense>
    </div>
  );
}

async function Lista() {
  await connection();
  const ongs = await listarOngs();
  if (!ongs.length) return <div className="mt-8"><Vazio texto="Nenhuma ONG verificada ainda." /></div>;
  return (
    <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {ongs.map((o) => (
        <li key={o.id} className="relative flex flex-col gap-2 rounded-2xl border-[1.5px] border-tinta/15 bg-folha p-5 hover:border-tinta/50">
          <h2 className="text-2xl font-bold">
            <Link href={`/ong/${o.id}`} className="after:absolute after:inset-0 focus-visible:outline-none">{o.nome}</Link>
          </h2>
          {o.cidade && <p className="text-sm text-tinta-suave">{o.cidade.nome}, {o.cidade.uf}</p>}
          {o.descricao && <p className="line-clamp-3">{o.descricao}</p>}
          <p className="mt-auto pt-2 text-sm font-semibold text-adocao">
            {o.paraAdocao === 0 ? "Nenhum animal para adoção agora" : `${o.paraAdocao} ${o.paraAdocao === 1 ? "animal" : "animais"} para adoção`}
          </p>
        </li>
      ))}
    </ul>
  );
}
