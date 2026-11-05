"use client";

// Preferência de unidade de distância (km ou milhas), lembrada no navegador.
import { useSyncExternalStore } from "react";
import { distancia } from "@/lib/formatacao";

const CHAVE = "unidade-distancia";
const ouvintes = new Set();

function assinar(aviso) {
  ouvintes.add(aviso);
  window.addEventListener("storage", aviso);
  return () => {
    ouvintes.delete(aviso);
    window.removeEventListener("storage", aviso);
  };
}

function ler() {
  try {
    return localStorage.getItem(CHAVE) === "mi" ? "mi" : "km";
  } catch {
    return "km";
  }
}

function gravar(unidade) {
  try {
    localStorage.setItem(CHAVE, unidade);
  } catch {}
  ouvintes.forEach((aviso) => aviso());
}

export function useUnidade() {
  const unidade = useSyncExternalStore(assinar, ler, () => "km");
  return { unidade, setUnidade: gravar };
}

// Mantido para o layout: não precisa mais de contexto.
export function UnidadeProvider({ children }) {
  return children;
}

export function Distancia({ metros }) {
  const { unidade } = useUnidade();
  return <>{distancia(metros, unidade)}</>;
}

export function AlternarUnidade() {
  const { unidade, setUnidade } = useUnidade();
  return (
    <div role="group" aria-label="Unidade de distância" className="inline-flex rounded-full border-[1.5px] border-linha bg-folha p-0.5 text-sm">
      {[
        ["km", "km"],
        ["mi", "milhas"],
      ].map(([valor, rotulo]) => (
        <button
          key={valor}
          type="button"
          aria-pressed={unidade === valor}
          onClick={() => setUnidade(valor)}
          className={`rounded-full px-3 py-1 font-semibold ${unidade === valor ? "bg-tinta text-white" : "text-tinta-suave"}`}
        >
          {rotulo}
        </button>
      ))}
    </div>
  );
}
