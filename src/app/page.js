import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { GradeAnuncios } from "@/components/CardAnuncio";
import { Vazio } from "@/components/PaginaFeed";
import { listarAnuncios } from "@/lib/dados";

export default function Inicio() {
  return (
    <>
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-10 md:grid-cols-[1.1fr_1fr] md:pt-16">
        <div>
          <h1 className="text-5xl font-extrabold sm:text-6xl">Perdeu ou encontrou um animal?</h1>
          <p className="mt-5 max-w-xl text-xl text-tinta-suave">
            Publique o anúncio, marque no mapa onde ele foi visto e receba avisos de quem passou por lá. Quem encontra não precisa criar conta.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/publicar?tipo=desaparecido" className="botao botao-cartaz text-lg">Meu animal sumiu</Link>
            <Link href="/publicar?tipo=encontrado" className="botao botao-achado text-lg">Encontrei um animal</Link>
          </div>
          <p className="mt-6">
            <Link href="/doacao" className="font-semibold underline decoration-adocao decoration-2 underline-offset-4">
              Quer adotar? Veja os animais esperando um lar
            </Link>
          </p>
        </div>
        <Zonas />
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8" aria-labelledby="t-recentes">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="t-recentes" className="text-3xl font-extrabold">Sumiram recentemente</h2>
          <Link href="/desaparecidos" className="font-semibold underline underline-offset-4">Ver todos os desaparecidos</Link>
        </div>
        <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-folha" />}>
          <Lista tipos={["desaparecido"]} limite={6} vazio="Nenhum animal desaparecido no momento." />
        </Suspense>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8" aria-labelledby="t-adocao">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="t-adocao" className="text-3xl font-extrabold">Esperando um lar</h2>
          <Link href="/doacao" className="font-semibold underline underline-offset-4">Ver todos para adoção</Link>
        </div>
        <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-folha" />}>
          <Lista tipos={["doacao"]} limite={3} vazio="Nenhum animal para adoção no momento." />
        </Suspense>
      </section>
    </>
  );
}

async function Lista({ tipos, limite, vazio }) {
  await connection();
  const { itens } = await listarAnuncios({ tipos, porPagina: limite });
  return <GradeAnuncios anuncios={itens} vazio={<Vazio texto={vazio} />} />;
}

// Ilustração das zonas de busca, o diferencial do site.
function Zonas() {
  return (
    <figure className="rounded-[28px] border-[1.5px] border-tinta/15 bg-folha p-6">
      <svg viewBox="0 0 400 300" role="img" aria-labelledby="zonas-titulo zonas-desc" className="w-full">
        <title id="zonas-titulo">Zonas de busca</title>
        <desc id="zonas-desc">
          Um ponto marca onde o gato sumiu. Um círculo pequeno de 39 metros e um maior de 137 metros mostram onde metade e três quartos desses gatos foram encontrados.
        </desc>
        <defs>
          <pattern id="quadras" width="40" height="40" patternUnits="userSpaceOnUse">
            <rect width="40" height="40" fill="#EEF2F0" />
            <rect x="4" y="4" width="32" height="32" rx="3" fill="#E2E9E5" />
          </pattern>
        </defs>
        <rect width="400" height="300" rx="18" fill="url(#quadras)" />
        <circle cx="200" cy="150" r="128" fill="#FFCE1F" fillOpacity="0.16" stroke="#17232F" strokeWidth="2" strokeDasharray="6 6" />
        <circle cx="200" cy="150" r="52" fill="#FFCE1F" fillOpacity="0.55" stroke="#17232F" strokeWidth="2" />
        <circle cx="200" cy="150" r="9" fill="#17232F" />
        <circle cx="200" cy="150" r="4" fill="#FFCE1F" />
        <g fontFamily="var(--font-titulo)" fontWeight="700" fill="#17232F">
          <text x="258" y="146" fontSize="18">39 m</text>
          <text x="330" y="58" fontSize="18">137 m</text>
        </g>
      </svg>
      <figcaption className="mt-4 text-lg leading-snug">
        Metade dos gatos que vivem dentro de casa e escapam é encontrada a menos de 39 metros de onde sumiu.
        <span className="mt-2 block text-base text-tinta-suave">
          Cada anúncio mostra no mapa onde vale procurar primeiro, com base em estudos sobre gatos e cães perdidos.
        </span>
      </figcaption>
    </figure>
  );
}
