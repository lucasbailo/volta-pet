import Link from "next/link";
import PaginaFeed, { Vazio } from "@/components/PaginaFeed";

export const metadata = { title: "Animais desaparecidos" };

export default function Page({ searchParams }) {
  return (
    <PaginaFeed
      caminho="/desaparecidos"
      titulo="Animais desaparecidos"
      descricao="Se você viu algum deles, abra o anúncio e avise o responsável. Não precisa criar conta."
      tipos={["desaparecido"]}
      abas={[["ativos", "Procurando"], ["expirados", "Expirados"]]}
      acao={<Link href="/publicar?tipo=desaparecido" className="botao botao-cartaz">Anunciar animal desaparecido</Link>}
      vazio={<Vazio texto="Nenhum animal desaparecido por aqui com esses filtros. Tente outra cidade ou remova algum filtro." />}
      searchParams={searchParams}
    />
  );
}
