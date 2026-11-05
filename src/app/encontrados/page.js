import Link from "next/link";
import PaginaFeed, { Vazio } from "@/components/PaginaFeed";

export const metadata = { title: "Animais encontrados" };

export default function Page({ searchParams }) {
  return (
    <PaginaFeed
      caminho="/encontrados"
      titulo="Animais encontrados"
      descricao="Animais achados na rua, que estão com alguém ou foram vistos sozinhos. Reconhece algum? Fale com quem publicou."
      tipos={["encontrado"]}
      abas={[["ativos", "Esperando a família"], ["expirados", "Expirados"]]}
      acao={<Link href="/publicar?tipo=encontrado" className="botao botao-achado">Encontrei um animal</Link>}
      vazio={<Vazio texto="Nenhum animal encontrado com esses filtros." />}
      searchParams={searchParams}
    />
  );
}
