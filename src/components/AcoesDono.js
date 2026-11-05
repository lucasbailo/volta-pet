"use client";

// Ações do responsável pelo anúncio: avistamento, irmãos (ONG), encontrado/adotado e renovação.
import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import Modal, { Campo, agoraParaInput } from "./Modal";
import { SeletorLocal } from "./Mapa";
import { acaoAdicionarAvistamento, acaoMarcarResolvido, acaoRenovar } from "@/app/acoes";
import { diasAte } from "@/lib/formatacao";

export default function AcoesDono({ anuncio }) {
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState("");
  const [modal, setModal] = useState(false);
  const [chave, setChave] = useState(0);
  const ativo = anuncio.status === "ativo";
  const podeAlterar = ["ativo", "expirado"].includes(anuncio.status);
  const rotuloResolver = anuncio.tipo === "doacao" ? "Marcar como adotado" : anuncio.tipo === "desaparecido" ? "Marcar como encontrado" : "Marcar como devolvido à família";
  const dias = diasAte(anuncio.expira_em);

  function executar(acao, confirmar) {
    if (confirmar && !window.confirm(confirmar)) return;
    setErro("");
    iniciar(async () => {
      const r = await acao(anuncio.id);
      if (r?.erro) setErro(r.erro);
    });
  }

  if (!podeAlterar) return null;

  return (
    <section aria-labelledby="t-dono" className="rounded-2xl border-[1.5px] border-tinta bg-folha p-5">
      <h2 id="t-dono" className="text-xl font-extrabold">Seu anúncio</h2>
      <p className="mt-1 text-[0.95rem] text-tinta-suave">
        {ativo
          ? `Fica no ar por mais ${dias} ${dias === 1 ? "dia" : "dias"}. Você pode renovar quando quiser.`
          : "Este anúncio expirou e saiu do feed principal. Renove se ainda estiver procurando."}
      </p>
      <div className="mt-4 flex flex-col gap-2">
        {anuncio.tipo === "desaparecido" && ativo && (
          <button type="button" className="botao botao-contorno" onClick={() => { setChave((k) => k + 1); setModal(true); }}>
            Adicionar avistamento
          </button>
        )}
        {anuncio.tipo === "doacao" && anuncio.dono?.tipo === "ong" && ativo && (
          <Link href={`/anuncio/${anuncio.id}/irmaos`} className="botao botao-contorno">Vincular irmãos</Link>
        )}
        <button type="button" className="botao botao-tinta" disabled={pendente}
          onClick={() => executar(acaoMarcarResolvido, "Confirmar? O anúncio vai para a página de reencontros e não recebe mais avisos.")}>
          {rotuloResolver}
        </button>
        <button type="button" className="botao botao-contorno" disabled={pendente} onClick={() => executar(acaoRenovar)}>
          {ativo ? "Renovar por mais 60 dias" : "Ainda procuro: renovar"}
        </button>
      </div>
      {erro && <p className="erro" role="alert">{erro}</p>}
      <Modal aberto={modal} aoFechar={() => setModal(false)} titulo="Novo avistamento">
        <FormAvistamento key={chave} anuncio={anuncio} aoFechar={() => setModal(false)} />
      </Modal>
    </section>
  );
}

function FormAvistamento({ anuncio, aoFechar }) {
  const [estado, enviar, enviando] = useActionState(acaoAdicionarAvistamento, {});
  const [ponto, setPonto] = useState(null);
  const [agora] = useState(agoraParaInput);
  const e = estado.erros ?? {};
  if (estado.ok) {
    return (
      <div className="space-y-4">
        <p className="text-lg">Avistamento adicionado. As zonas de busca agora partem deste ponto.</p>
        <button type="button" className="botao botao-tinta" onClick={aoFechar}>Ver no mapa</button>
      </div>
    );
  }
  const centro = anuncio.zonas?.centro ?? anuncio.ponto_publico;
  return (
    <form action={enviar} className="space-y-5">
      <input type="hidden" name="anuncio_id" value={anuncio.id} />
      {e.geral && <p className="erro" role="alert">{e.geral}</p>}
      <div>
        <p className="rotulo">Onde ele foi visto?</p>
        <SeletorLocal inicial={{ ...centro, zoom: 15 }} valor={ponto} aoMudar={setPonto} erro={e.ponto} altura="h-[260px]" />
      </div>
      <Campo id="av-quando" rotulo="Quando?" erro={e.visto_em}>
        <input id="av-quando" name="visto_em" type="datetime-local" className="campo" defaultValue={agora} max={agora} />
      </Campo>
      <Campo id="av-obs" rotulo="Observação" opcional erro={e.observacao}>
        <textarea id="av-obs" name="observacao" rows={2} maxLength={500} className="campo" placeholder="Ex.: um vizinho viu perto do mercado." />
      </Campo>
      <button type="submit" className="botao botao-tinta w-full" disabled={enviando}>{enviando ? "Salvando…" : "Salvar avistamento"}</button>
    </form>
  );
}
