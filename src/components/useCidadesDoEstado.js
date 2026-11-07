"use client";

// Lista de cidades que acompanha o campo Estado (formulários de cadastro e de publicar).
// Ao carregar, lê o estado que já está no campo: o navegador pode tê-lo restaurado (F5, Voltar)
// ou a pessoa pode ter escolhido antes de o JavaScript terminar de carregar.
import { useEffect, useRef, useState } from "react";
import { acaoListarCidades } from "@/app/acoes";

export function useCidadesDoEstado() {
  const refUf = useRef(null);
  const pedido = useRef("");
  const [uf, setUf] = useState("");
  const [cidades, setCidades] = useState([]);

  async function trocarUf(novaUf) {
    pedido.current = novaUf;
    setUf(novaUf);
    setCidades([]); // não mostra cidades do estado anterior enquanto a lista nova chega
    if (!novaUf) return;
    const lista = await acaoListarCidades(novaUf);
    if (pedido.current === novaUf) setCidades(lista); // ignora resposta de um estado já trocado
  }

  useEffect(() => {
    const noCampo = refUf.current?.value;
    if (noCampo) trocarUf(noCampo);
  }, []);

  return { refUf, uf, cidades, trocarUf };
}
