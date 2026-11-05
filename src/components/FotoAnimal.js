// Foto do anúncio ou, sem foto, um quadro com o símbolo da espécie.
import { EMOJI_ESPECIE, ROTULOS } from "@/lib/regras";

const FUNDO = {
  desaparecido: "bg-[#FFF3C4]",
  encontrado: "bg-achado-claro",
  doacao: "bg-adocao-claro",
};

export default function FotoAnimal({ foto, especie, tipo, nome, className = "", grande = false }) {
  const alt = `${nome || ROTULOS.especie[especie]}${foto ? "" : ", sem foto"}`;
  if (foto) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={foto} alt={alt} className={`h-full w-full object-cover ${className}`} loading="lazy" />;
  }
  return (
    <div role="img" aria-label={alt} className={`grid h-full w-full place-items-center ${FUNDO[tipo] ?? "bg-papel"} ${className}`}>
      <span aria-hidden="true" className={grande ? "text-8xl" : "text-6xl"}>{EMOJI_ESPECIE[especie]}</span>
    </div>
  );
}
