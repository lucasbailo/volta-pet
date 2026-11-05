import PaginaFeed, { Vazio } from "@/components/PaginaFeed";

export const metadata = { title: "Reencontros" };

export default function Page({ searchParams }) {
  return (
    <PaginaFeed
      caminho="/reencontros"
      titulo="Reencontros"
      descricao="Animais que voltaram para casa. Cada aviso conta."
      tipos={["desaparecido", "encontrado"]}
      statusFixo="resolvido"
      vazio={<Vazio texto="Ainda não há reencontros com esses filtros." />}
      searchParams={searchParams}
    />
  );
}
