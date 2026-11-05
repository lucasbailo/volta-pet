"use client";

// Lista os outros animais da ONG para adoção, com um botão para vincular ou desvincular
// cada um como irmão. Cada clique grava na hora.  [RF23, RN08]
import Link from "next/link";
import { useState, useTransition } from "react";
import FotoAnimal from "./FotoAnimal";
import { titulo } from "./CardAnuncio";
import { acaoDesvincularIrmaos, acaoVincularIrmaos } from "@/app/acoes";
import { ROTULOS } from "@/lib/regras";
import { idade } from "@/lib/formatacao";

export default function VincularIrmaos({ anuncioId, nomeAnimal, candidatos }) {
  const [pendente, iniciar] = useTransition();
  const [emAndamento, setEmAndamento] = useState(null);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  if (!candidatos.length) {
    return (
      <div className="rounded-2xl border-[1.5px] border-dashed border-tinta/25 px-6 py-10 text-center">
        <p className="mx-auto max-w-md text-lg">A ONG não tem outros animais para adoção agora. Publique os irmãos de {nomeAnimal} para poder vinculá-los.</p>
        <Link href="/publicar?tipo=doacao" className="botao botao-adocao mt-5">Colocar outro animal para adoção</Link>
      </div>
    );
  }

  function alternar(c) {
    setErro("");
    setAviso("");
    setEmAndamento(c.id);
    iniciar(async () => {
      const acao = c.vinculado ? acaoDesvincularIrmaos : acaoVincularIrmaos;
      const r = await acao(anuncioId, c.id);
      if (r?.erro) setErro(r.erro);
      else setAviso(c.vinculado ? `${titulo(c)} não é mais irmão de ${nomeAnimal}.` : `${titulo(c)} agora é irmão de ${nomeAnimal}.`);
      setEmAndamento(null);
    });
  }

  return (
    <>
      <ul className="divide-y divide-linha overflow-hidden rounded-2xl border-[1.5px] border-tinta/15 bg-folha">
        {candidatos.map((c) => {
          const nome = titulo(c);
          const detalhes = [ROTULOS.especie[c.especie], c.sexo !== "desconhecido" ? ROTULOS.sexo[c.sexo] : null, idade(c.idade_meses)].filter(Boolean);
          return (
            <li key={c.id} className="flex flex-wrap items-center gap-4 px-5 py-4">
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl">
                <FotoAnimal foto={c.foto} especie={c.especie} tipo={c.tipo} nome={nome} />
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/anuncio/${c.id}`} className="text-lg font-bold underline-offset-4 hover:underline">{nome}</Link>
                <p className="text-sm text-tinta-suave">{detalhes.join(", ")}</p>
                {c.vinculado && <p className="text-sm font-semibold text-adocao">Irmão de {nomeAnimal}</p>}
              </div>
              <button
                type="button"
                aria-pressed={c.vinculado}
                aria-label={c.vinculado ? `Desvincular ${nome}` : `Vincular ${nome} como irmão`}
                className={`botao botao-pequeno ${c.vinculado ? "botao-contorno" : "botao-adocao"}`}
                disabled={pendente}
                onClick={() => alternar(c)}
              >
                {emAndamento === c.id ? "Salvando…" : c.vinculado ? "Desvincular" : "Vincular como irmão"}
              </button>
            </li>
          );
        })}
      </ul>
      <p className="sr-only" role="status">{aviso}</p>
      {erro && <p className="erro" role="alert">{erro}</p>}
    </>
  );
}
