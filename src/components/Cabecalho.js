import Link from "next/link";
import { Suspense } from "react";
import { MARCA } from "@/lib/marca";
import { obterUsuarioAtual, contarNaoLidas, contarPendenciasModeracao } from "@/lib/dados";
import { acaoAlternarModoLocal } from "@/app/acoes";

const LINKS = [
  ["/desaparecidos", "Desaparecidos"],
  ["/encontrados", "Encontrados"],
  ["/doacao", "Adoção"],
  ["/ongs", "ONGs"],
  ["/reencontros", "Reencontros"],
];

export default function Cabecalho() {
  return (
    <header className="sticky top-0 z-20 border-b-[1.5px] border-tinta/10 bg-papel/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <Link href="/" className="titulo flex items-center gap-2 text-2xl font-extrabold">
          <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-full bg-cartaz text-lg">🐾</span>
          {MARCA.nome}
        </Link>
        <nav aria-label="Principal" className="order-3 -mx-4 w-full overflow-x-auto px-4 md:order-none md:mx-0 md:w-auto md:px-0">
          <ul className="flex gap-1 whitespace-nowrap">
            {LINKS.map(([href, rotulo]) => (
              <li key={href}>
                <Link href={href} className="inline-block rounded-full px-3 py-1.5 font-semibold text-tinta-suave hover:bg-folha hover:text-tinta">
                  {rotulo}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Suspense fallback={null}>
            <AreaUsuario />
          </Suspense>
          <Link href="/publicar" className="botao botao-tinta botao-pequeno">Publicar anúncio</Link>
        </div>
      </div>
    </header>
  );
}

async function AreaUsuario() {
  const usuario = await obterUsuarioAtual();
  const naoLidas = usuario ? await contarNaoLidas(usuario.id) : 0;
  const pendencias = usuario?.e_admin ? await contarPendenciasModeracao(usuario.id) : 0;
  return (
    <>
      {usuario?.e_admin && (
        <Link href="/admin" className="hidden rounded-full px-3 py-1.5 font-semibold hover:bg-folha sm:inline-block">
          Moderação
          {pendencias > 0 && (
            <span className="ml-1.5 rounded-full bg-alerta px-1.5 py-0.5 text-xs font-bold text-white">
              {pendencias}
              <span className="sr-only"> pendências</span>
            </span>
          )}
        </Link>
      )}
      {usuario ? (
        <Link href="/painel" className="relative hidden rounded-full px-3 py-1.5 font-semibold hover:bg-folha sm:inline-block">
          Meu painel
          {naoLidas > 0 && (
            <span className="ml-1.5 rounded-full bg-alerta px-1.5 py-0.5 text-xs font-bold text-white">
              {naoLidas}
              <span className="sr-only"> novidades</span>
            </span>
          )}
        </Link>
      ) : null}
      {/* Só existe no modo local: alterna entre Ana (admin), a ONG de exemplo e um visitante sem conta. */}
      <form action={acaoAlternarModoLocal}>
        <button type="submit" className="rounded-full border border-dashed border-tinta/40 px-3 py-1 text-xs text-tinta-suave hover:border-tinta" title="Clique para trocar de perfil: Ana, ONG ou visitante sem conta">
          {usuario ? `Modo local: ${usuario.tipo === "ong" ? usuario.nome : usuario.nome.split(" ")[0]}` : "Modo local: visitante"}
        </button>
      </form>
    </>
  );
}
