import Link from "next/link";
import PaginaFeed, { Vazio } from "@/components/PaginaFeed";

export const metadata = { title: "Adoção" };

export default function Page({ searchParams }) {
  return (
    <PaginaFeed
      caminho="/doacao"
      titulo="Para adoção"
      descricao="Animais de pessoas e ONGs procurando um lar. Gostou de algum? Envie um pedido e o doador entra em contato."
      tipos={["doacao"]}
      abas={[["ativos", "Disponíveis"], ["expirados", "Expirados"]]}
      acao={<Link href="/publicar?tipo=doacao" className="botao botao-adocao">Colocar para adoção</Link>}
      vazio={<Vazio texto="Nenhum animal para adoção com esses filtros." />}
      searchParams={searchParams}
    />
  );
}
