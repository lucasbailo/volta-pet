"use client";

// Carrega os mapas só no navegador (o Leaflet não funciona no servidor).
import dynamic from "next/dynamic";
import { useState } from "react";
import { Distancia, AlternarUnidade } from "./Unidade";
import { FONTES } from "@/lib/regras";

const carregando = () => <div className="grid h-full w-full place-items-center bg-papel text-tinta-suave">Carregando mapa…</div>;
const MapaAnuncioLeaflet = dynamic(() => import("./MapaLeaflet").then((m) => m.MapaAnuncio), { ssr: false, loading: carregando });
const SeletorMapaLeaflet = dynamic(() => import("./MapaLeaflet").then((m) => m.SeletorMapa), { ssr: false, loading: carregando });

export function MapaAnuncio(props) {
  const { zonas, precisao, avistamentos = [] } = props;
  return (
    <div>
      <div className="h-[340px] overflow-hidden rounded-2xl border-[1.5px] border-tinta/15 sm:h-[420px]">
        <MapaAnuncioLeaflet {...props} />
      </div>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <ul className="space-y-2 text-[0.95rem]">
          {zonas && (
            <>
              <li className="flex gap-2.5">
                <span aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 rounded-full border-2 border-tinta bg-cartaz/70" />
                <span>
                  Até <strong><Distancia metros={zonas.interna_m} /></strong>: onde {zonas.interna_pct}% dos animais com esse perfil foram encontrados. Procure aqui primeiro.
                </span>
              </li>
              <li className="flex gap-2.5">
                <span aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 rounded-full border-2 border-dashed border-tinta bg-cartaz/20" />
                <span>
                  Até <strong><Distancia metros={zonas.externa_m} /></strong>: onde {zonas.externa_pct}% foram encontrados.
                </span>
              </li>
            </>
          )}
          {precisao === "aproximado" && !zonas && (
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 rounded-full border border-dotted border-tinta bg-tinta/10" />
              <span>O responsável preferiu mostrar só a região aproximada.</span>
            </li>
          )}
          {zonas?.centroAproximado && (
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 rounded-full border border-dotted border-tinta bg-tinta/10" />
              <span>O responsável mostrou só o local aproximado, então o centro pode estar até 150 m deslocado. Procure também nos arredores.</span>
            </li>
          )}
          {avistamentos.length > 0 && (
            <li className="flex gap-2.5">
              <span aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 rounded-full border-2 border-white bg-achado ring-1 ring-achado" />
              <span>
                Avistamentos ({avistamentos.length}).{" "}
                {zonas?.apartirDeAvistamento ? "As zonas partem do avistamento mais recente." : ""}
              </span>
            </li>
          )}
        </ul>
        {zonas && <AlternarUnidade />}
      </div>
      {zonas && (
        <p className="mt-3 text-sm text-tinta-suave">
          Fonte das zonas:{" "}
          <a href={FONTES[zonas.fonte]} target="_blank" rel="noopener noreferrer" className="underline">{zonas.fonte}</a>.
          São estimativas estatísticas, não uma garantia de onde o animal está.
        </p>
      )}
    </div>
  );
}

// Seletor de ponto com busca da localização atual.
export function SeletorLocal({ nome = "", inicial, valor, aoMudar, erro, altura = "h-[320px]" }) {
  const [centralizar, setCentralizar] = useState(null);
  const [aviso, setAviso] = useState("");

  function usarMinhaLocalizacao() {
    setAviso("");
    if (!("geolocation" in navigator)) return setAviso("Seu navegador não informa a localização.");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        aoMudar(p);
        setCentralizar(p);
      },
      () => setAviso("Não foi possível obter sua localização. Clique no mapa para marcar."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div>
      <div className={`${altura} overflow-hidden rounded-2xl border-[1.5px] ${erro ? "border-alerta" : "border-tinta/15"}`}>
        <SeletorMapaLeaflet inicial={inicial} ponto={valor} aoEscolher={aoMudar} centralizarEm={centralizar} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button type="button" className="botao botao-contorno botao-pequeno" onClick={usarMinhaLocalizacao}>Usar minha localização</button>
        <span className="dica">{valor ? "Ponto marcado. Clique em outro lugar para mudar." : "Clique no mapa para marcar o ponto."}</span>
      </div>
      {aviso && <p className="erro">{aviso}</p>}
      {erro && <p className="erro">{erro}</p>}
      <input type="hidden" name={`${nome}lat`} value={valor?.lat ?? ""} />
      <input type="hidden" name={`${nome}lng`} value={valor?.lng ?? ""} />
    </div>
  );
}
