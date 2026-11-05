"use client";

// Filtros do feed. Tudo fica na URL (?uf=SP&cidade=...&especie=gato), então dá para compartilhar o link.
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { acaoListarCidades } from "@/app/acoes";
import { ESPECIES, ROTULOS, EMOJI_ESPECIE } from "@/lib/regras";

export default function Filtros({ caminho, valores, estados, cidadesIniciais, abas }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [cidades, setCidades] = useState(cidadesIniciais);
  const [erroLocal, setErroLocal] = useState("");
  const pertoAtivo = Boolean(valores.lat && valores.lng);

  function ir(mudancas) {
    const p = new URLSearchParams();
    const novos = { ...valores, ...mudancas, pagina: undefined };
    for (const [k, v] of Object.entries(novos)) if (v) p.set(k, v);
    iniciar(() => router.push(`${caminho}${p.size ? `?${p}` : ""}`, { scroll: false }));
  }

  async function trocarEstado(uf) {
    setCidades(uf ? await acaoListarCidades(uf) : []);
    ir({ uf, cidade: undefined, lat: undefined, lng: undefined });
  }

  function pertoDeMim() {
    setErroLocal("");
    if (!("geolocation" in navigator)) {
      setErroLocal("Seu navegador não informa a localização. Escolha o estado e a cidade.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => ir({
        // 3 casas decimais (~100 m) bastam para ordenar e evitam expor a posição exata na URL
        lat: pos.coords.latitude.toFixed(3),
        lng: pos.coords.longitude.toFixed(3),
        uf: undefined,
        cidade: undefined,
      }),
      () => setErroLocal("Não foi possível usar sua localização. Permita o acesso no navegador ou escolha a cidade."),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
  }

  return (
    <div className={`space-y-4 transition-opacity ${pendente ? "opacity-60" : ""}`} aria-busy={pendente}>
      {abas && (
        <div role="group" aria-label="Situação dos anúncios" className="flex gap-2">
          {abas.map(([valor, rotulo]) => (
            <button
              key={valor}
              type="button"
              className="pilula"
              aria-current={(valores.aba ?? "ativos") === valor}
              onClick={() => ir({ aba: valor === "ativos" ? undefined : valor })}
            >
              {rotulo}
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-40">
          <label htmlFor="f-uf" className="rotulo text-sm">Estado</label>
          <select id="f-uf" className="campo" value={valores.uf ?? ""} onChange={(e) => trocarEstado(e.target.value)}>
            <option value="">Todos</option>
            {estados.map((e) => (
              <option key={e.sigla} value={e.sigla}>{e.nome}</option>
            ))}
          </select>
        </div>
        <div className="w-60">
          <label htmlFor="f-cidade" className="rotulo text-sm">Cidade</label>
          <select
            id="f-cidade"
            className="campo"
            value={valores.cidade ?? ""}
            disabled={!valores.uf}
            onChange={(e) => ir({ cidade: e.target.value })}
          >
            <option value="">{valores.uf ? "Todas" : "Escolha o estado"}</option>
            {cidades.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>
        {pertoAtivo ? (
          <button type="button" className="botao botao-tinta botao-pequeno" onClick={() => ir({ lat: undefined, lng: undefined })}>
            Perto de você (até 50 km). Remover
          </button>
        ) : (
          <button type="button" className="botao botao-contorno botao-pequeno" onClick={pertoDeMim}>
            Perto de mim
          </button>
        )}
      </div>
      {erroLocal && <p className="erro" role="alert">{erroLocal}</p>}

      <div role="group" aria-label="Espécie" className="flex flex-wrap gap-2">
        <button type="button" className="pilula" aria-current={!valores.especie} onClick={() => ir({ especie: undefined })}>
          Todas
        </button>
        {ESPECIES.map((e) => (
          <button key={e} type="button" className="pilula" aria-current={valores.especie === e} onClick={() => ir({ especie: e })}>
            <span aria-hidden="true">{EMOJI_ESPECIE[e]}</span> {ROTULOS.especiePlural[e]}
          </button>
        ))}
      </div>
    </div>
  );
}
