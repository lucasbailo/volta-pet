"use client";

// Botões da fila de moderação: confirmar/descartar denúncia e aprovar/recusar ONG.  [RF21, RF22]
import { useState, useTransition } from "react";
import { acaoRevisarDenuncia, acaoRevisarOng } from "@/app/acoes";

const OPCOES = {
  denuncia: {
    acao: acaoRevisarDenuncia,
    sim: "Confirmar e ocultar anúncio",
    nao: "Descartar denúncia",
    confirmarSim: "Ocultar o anúncio? Ele sai do site e o responsável é avisado.",
    confirmarNao: null,
  },
  ong: {
    acao: acaoRevisarOng,
    sim: "Aprovar ONG",
    nao: "Recusar",
    confirmarSim: null,
    confirmarNao: "Recusar esta ONG? A página pública dela deixa de existir.",
  },
};

export default function BotoesModeracao({ tipo, id }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState("");
  const o = OPCOES[tipo];

  function decidir(sim) {
    const pergunta = sim ? o.confirmarSim : o.confirmarNao;
    if (pergunta && !window.confirm(pergunta)) return;
    setErro("");
    iniciar(async () => {
      const r = await o.acao(id, sim);
      if (r?.erro) setErro(r.erro);
    });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={`botao botao-pequeno ${tipo === "ong" ? "botao-adocao" : "botao-tinta"}`} disabled={pendente} onClick={() => decidir(true)}>
          {o.sim}
        </button>
        <button type="button" className="botao botao-contorno botao-pequeno" disabled={pendente} onClick={() => decidir(false)}>
          {o.nao}
        </button>
      </div>
      {erro && <p className="erro" role="alert">{erro}</p>}
    </div>
  );
}
