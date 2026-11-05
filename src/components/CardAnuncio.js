// Card do feed. A faixa no topo diz o tipo e há quanto tempo, como num cartaz de rua.
import Link from "next/link";
import FotoAnimal from "./FotoAnimal";
import { Distancia } from "./Unidade";
import { ROTULOS } from "@/lib/regras";
import { tempoDesde, idade, dinheiro } from "@/lib/formatacao";

const FAIXA = {
  desaparecido: "bg-cartaz text-tinta",
  encontrado: "bg-achado text-white",
  doacao: "bg-adocao text-white",
  resolvido: "bg-tinta text-white",
  expirado: "bg-linha text-tinta",
  oculto: "bg-alerta text-white",
};

export function textoFaixa(a) {
  if (a.status === "oculto") return "Ocultado pela moderação"; // RF21: só o dono e o administrador veem
  if (a.status === "resolvido") return a.tipo === "doacao" ? "Adotado" : "Reencontrado com a família";
  if (a.status === "expirado") return "Anúncio expirado";
  if (a.tipo === "desaparecido") return `Sumiu ${tempoDesde(a.data_evento ?? a.criado_em)}`;
  if (a.tipo === "encontrado") return `Encontrado ${tempoDesde(a.data_evento ?? a.criado_em)}`;
  return "Para adoção";
}

export function titulo(a) {
  if (a.nome) return a.nome;
  const especie = ROTULOS.especie[a.especie].toLowerCase();
  return a.tipo === "encontrado" ? `${especie[0].toUpperCase()}${especie.slice(1)} sem identificação` : ROTULOS.especie[a.especie];
}

export default function CardAnuncio({ anuncio: a }) {
  const faixa = FAIXA[a.status === "ativo" ? a.tipo : a.status];
  const detalhes = [a.raca, a.sexo !== "desconhecido" ? ROTULOS.sexo[a.sexo] : null, idade(a.idade_meses)].filter(Boolean);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border-[1.5px] border-tinta/15 bg-folha shadow-[0_1px_0_rgb(23_35_47/0.08)] transition-[border-color] hover:border-tinta/50">
      <p className={`px-4 py-2 text-sm font-bold ${faixa}`}>{textoFaixa(a)}</p>
      <div className="relative aspect-[4/3] overflow-hidden">
        <FotoAnimal foto={a.foto} especie={a.especie} tipo={a.tipo} nome={a.nome} />
        {a.sinalizado && (
          <span className="absolute left-3 top-3 rounded-full bg-alerta px-3 py-1 text-xs font-bold text-white">
            Denunciado, em análise
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <h3 className="text-2xl font-bold">
          <Link href={`/anuncio/${a.id}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {titulo(a)}
          </Link>
        </h3>
        {detalhes.length > 0 && <p className="text-tinta-suave">{detalhes.join(", ")}</p>}
        <p className="text-sm text-tinta-suave">
          {a.cidade ? `${a.cidade.nome}, ${a.cidade.uf}` : ""}
          {a.distancia_m != null && (
            <>
              {" "}
              <span className="font-semibold text-tinta">
                (a <Distancia metros={a.distancia_m} />)
              </span>
            </>
          )}
        </p>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-2 text-sm font-semibold">
          {a.recompensa > 0 && a.status === "ativo" && (
            <span className="rounded-full bg-cartaz/40 px-2.5 py-0.5">Recompensa de {dinheiro(a.recompensa)}</span>
          )}
          {a.tipo === "encontrado" && a.animal_comigo && a.status === "ativo" && (
            <span className="rounded-full bg-achado-claro px-2.5 py-0.5 text-achado">Está com quem achou</span>
          )}
          {a.tipo === "doacao" && a.vacinado && <span className="rounded-full bg-adocao-claro px-2.5 py-0.5 text-adocao">Vacinado</span>}
          {a.tipo === "doacao" && a.castrado && <span className="rounded-full bg-adocao-claro px-2.5 py-0.5 text-adocao">Castrado</span>}
          {a.tipo === "doacao" && a.status === "ativo" && a.total_irmaos > 0 && (
            <span className="rounded-full bg-adocao px-2.5 py-0.5 text-white">
              {a.total_irmaos === 1 ? "Tem 1 irmão disponível" : `Tem ${a.total_irmaos} irmãos disponíveis`}
            </span>
          )}
          {a.dono?.tipo === "ong" && a.dono.ong_status === "aprovada" && (
            <span className="rounded-full border border-linha px-2.5 py-0.5">{a.dono.nome}</span>
          )}
        </div>
      </div>
    </article>
  );
}

export function GradeAnuncios({ anuncios, vazio }) {
  if (!anuncios.length) return vazio;
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {anuncios.map((a) => (
        <li key={a.id} className="flex">
          <div className="w-full">
            <CardAnuncio anuncio={a} />
          </div>
        </li>
      ))}
    </ul>
  );
}
