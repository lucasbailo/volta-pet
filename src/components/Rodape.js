import Link from "next/link";
import { MARCA } from "@/lib/marca";

export default function Rodape() {
  return (
    <footer className="mt-20 border-t-[1.5px] border-tinta/10 bg-folha">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 md:grid-cols-[2fr_1fr_1fr]">
        <div>
          <p className="titulo text-xl font-extrabold">{MARCA.nome}</p>
          <p className="mt-2 max-w-md text-tinta-suave">{MARCA.slogan}</p>
          <p className="mt-4 max-w-md text-sm text-tinta-suave">
            Nunca pague nada antes de ver o animal pessoalmente. Combine encontros em lugares públicos e vá acompanhado.
          </p>
        </div>
        <nav aria-label="Rodapé">
          <ul className="space-y-1.5">
            <li><Link href="/desaparecidos" className="hover:underline">Animais desaparecidos</Link></li>
            <li><Link href="/encontrados" className="hover:underline">Animais encontrados</Link></li>
            <li><Link href="/doacao" className="hover:underline">Adoção</Link></li>
            <li><Link href="/reencontros" className="hover:underline">Reencontros</Link></li>
          </ul>
        </nav>
        <div className="space-y-1.5">
          <Link href="/publicar" className="block hover:underline">Publicar anúncio</Link>
          {MARCA.lojaTagsUrl && (
            <a href={MARCA.lojaTagsUrl} className="block hover:underline" target="_blank" rel="noopener noreferrer">
              Tags de identificação para pets
            </a>
          )}
          <Link href="/privacidade" className="block hover:underline">Privacidade</Link>
          <Link href="/meus-dados" className="block hover:underline">Apagar meus dados</Link>
          <p className="pt-2 text-sm text-tinta-suave">Zonas de busca baseadas em Huang et al. (2018) e Kremer (2021).</p>
        </div>
      </div>
    </footer>
  );
}
