"use client";

// Diálogo acessível (usa o <dialog> nativo: foco preso, Esc fecha).
import { useEffect, useRef } from "react";

export default function Modal({ aberto, aoFechar, titulo, children }) {
  const ref = useRef(null);
  useEffect(() => {
    const d = ref.current;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);
  return (
    <dialog ref={ref} className="modal" onClose={aoFechar} aria-labelledby="modal-titulo">
      {aberto && (
        <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
          <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-linha bg-folha px-6 py-4">
            <h2 id="modal-titulo" className="text-2xl font-extrabold">{titulo}</h2>
            <button type="button" onClick={aoFechar} className="-mr-2 rounded-full px-3 py-1 text-2xl leading-none hover:bg-papel" aria-label="Fechar">
              ×
            </button>
          </div>
          <div className="px-6 py-5">{children}</div>
        </div>
      )}
    </dialog>
  );
}

// Campo com rótulo e mensagem de erro ligados por acessibilidade.
export function Campo({ id, rotulo, erro, dica, children, opcional }) {
  return (
    <div>
      <label htmlFor={id} className="rotulo">
        {rotulo} {opcional && <span className="font-normal text-tinta-suave">(opcional)</span>}
      </label>
      {children}
      {dica && <p className="dica mt-1" id={`${id}-dica`}>{dica}</p>}
      {erro && <p className="erro" id={`${id}-erro`} role="alert">{erro}</p>}
    </div>
  );
}

export function agoraParaInput() {
  const d = new Date();
  d.setSeconds(0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
