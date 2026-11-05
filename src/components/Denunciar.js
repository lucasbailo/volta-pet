"use client";

// RF20: denunciar anúncio. Uma denúncia já mostra o alerta e vai para análise (RN06).
import { useActionState, useState } from "react";
import Modal, { Campo } from "./Modal";
import { acaoDenunciar } from "@/app/acoes";
import { ROTULOS } from "@/lib/regras";

export default function Denunciar({ anuncioId }) {
  const [aberto, setAberto] = useState(false);
  const [chave, setChave] = useState(0);
  return (
    <>
      <button type="button" className="text-sm font-semibold text-alerta underline underline-offset-4" onClick={() => { setChave((k) => k + 1); setAberto(true); }}>
        Denunciar anúncio
      </button>
      <Modal aberto={aberto} aoFechar={() => setAberto(false)} titulo="Denunciar anúncio">
        <Formulario key={chave} anuncioId={anuncioId} aoFechar={() => setAberto(false)} />
      </Modal>
    </>
  );
}

function Formulario({ anuncioId, aoFechar }) {
  const [estado, enviar, enviando] = useActionState(acaoDenunciar, {});
  const e = estado.erros ?? {};
  if (estado.ok) {
    return (
      <div className="space-y-4">
        <p className="text-lg">Denúncia recebida. O anúncio passa a mostrar um alerta enquanto nossa equipe analisa.</p>
        <button type="button" className="botao botao-tinta" onClick={aoFechar}>Fechar</button>
      </div>
    );
  }
  return (
    <form action={enviar} className="space-y-5">
      <input type="hidden" name="anuncio_id" value={anuncioId} />
      {e.geral && <p className="erro" role="alert">{e.geral}</p>}
      <fieldset>
        <legend className="rotulo">Qual o problema?</legend>
        <div className="flex flex-wrap gap-2">
          {Object.entries(ROTULOS.motivoDenuncia).map(([valor, rotulo]) => (
            <label key={valor} className="pilula"><input type="radio" name="motivo" value={valor} /> {rotulo}</label>
          ))}
        </div>
        {e.motivo && <p className="erro" role="alert">{e.motivo}</p>}
      </fieldset>
      <Campo id="den-detalhes" rotulo="Detalhes" opcional erro={e.detalhes}>
        <textarea id="den-detalhes" name="detalhes" rows={3} maxLength={1000} className="campo" placeholder="Ex.: a pessoa pediu um depósito antes de mostrar o animal." />
      </Campo>
      <button type="submit" className="botao botao-tinta w-full" disabled={enviando}>{enviando ? "Enviando denúncia…" : "Enviar denúncia"}</button>
    </form>
  );
}
