// Estrutura comum dos feeds (desaparecidos, encontrados, adoção e reencontros).
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import Filtros from "./Filtros";
import { GradeAnuncios } from "./CardAnuncio";
import { listarAnuncios, listarEstados, listarCidades, obterCidade } from "@/lib/dados";
import { ESPECIES, ROTULOS } from "@/lib/regras";
import { coordenadaValida } from "@/lib/geo";

const POR_PAGINA = 24;

export default function PaginaFeed({ caminho, titulo, descricao, tipos, abas, statusFixo, acao, vazio, searchParams }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-extrabold sm:text-5xl">{titulo}</h1>
          <p className="mt-2 text-lg text-tinta-suave">{descricao}</p>
        </div>
        {acao}
      </header>
      <Suspense fallback={<Esqueleto />}>
        <ConteudoFeed caminho={caminho} tipos={tipos} abas={abas} statusFixo={statusFixo} vazio={vazio} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ConteudoFeed({ caminho, tipos, abas, statusFixo, vazio, searchParams }) {
  await connection();
  const sp = await searchParams;
  const um = (v) => (Array.isArray(v) ? v[0] : v) || undefined;
  const valores = {
    aba: um(sp.aba),
    uf: um(sp.uf),
    cidade: um(sp.cidade),
    especie: ESPECIES.includes(um(sp.especie)) ? um(sp.especie) : undefined,
    lat: um(sp.lat),
    lng: um(sp.lng),
  };
  const pagina = Math.max(1, Math.min(20, Number(um(sp.pagina)) || 1));
  const lat = Number(valores.lat);
  const lng = Number(valores.lng);
  const perto = valores.lat && coordenadaValida(lat, lng) ? { lat, lng } : null;
  const estados = listarEstados();
  if (valores.uf && !estados.some((e) => e.sigla === valores.uf)) valores.uf = undefined;
  if (valores.cidade && obterCidade(valores.cidade)?.uf !== valores.uf) valores.cidade = undefined;

  const status = statusFixo ?? (valores.aba === "expirados" ? "expirado" : "ativo");
  const { itens, total, temMais } = await listarAnuncios({
    tipos, status, uf: valores.uf, cidadeId: valores.cidade, especie: valores.especie, perto,
    porPagina: POR_PAGINA * pagina,
  });

  const params = new URLSearchParams(Object.entries(valores).filter(([, v]) => v));
  params.set("pagina", pagina + 1);

  return (
    <>
      <Filtros
        key={valores.uf ?? "todos"}
        caminho={caminho}
        valores={valores}
        estados={estados}
        cidadesIniciais={valores.uf ? listarCidades(valores.uf) : []}
        abas={abas}
      />
      <p className="mb-4 mt-8 text-tinta-suave" aria-live="polite">
        {total === 0 ? "Nenhum anúncio com esses filtros." : total === 1 ? "1 anúncio" : `${total} anúncios`}
        {valores.especie ? ` de ${ROTULOS.especiePlural[valores.especie].toLowerCase()}` : ""}
        {perto ? ", do mais perto ao mais longe" : ", dos mais recentes aos mais antigos"}.
      </p>
      <GradeAnuncios anuncios={itens} vazio={vazio} />
      {temMais && (
        <div className="mt-8 text-center">
          <Link href={`${caminho}?${params}`} scroll={false} className="botao botao-contorno">Mostrar mais anúncios</Link>
        </div>
      )}
    </>
  );
}

function Esqueleto() {
  return (
    <div aria-hidden="true" className="space-y-6">
      <div className="h-24 animate-pulse rounded-2xl bg-folha" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-96 animate-pulse rounded-2xl bg-folha" />
        ))}
      </div>
    </div>
  );
}

export function Vazio({ texto, acao }) {
  return (
    <div className="rounded-2xl border-[1.5px] border-dashed border-tinta/25 px-6 py-12 text-center">
      <p className="mx-auto max-w-md text-lg">{texto}</p>
      {acao && <div className="mt-5">{acao}</div>}
    </div>
  );
}
