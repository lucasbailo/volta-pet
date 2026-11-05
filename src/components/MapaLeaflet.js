"use client";

// Mapas com Leaflet + OpenStreetMap (carregados só no navegador).
import { useEffect } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Circle, CircleMarker, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { RAIO_APROXIMACAO_M } from "@/lib/geo";
import { dataHora } from "@/lib/formatacao";

const TINTA = "#17232F";
const CARTAZ = "#FFCE1F";
const ACHADO = "#1F6FB8";

function Camadas() {
  return (
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    />
  );
}

function Enquadrar({ centro, raio }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(L.latLng(centro.lat, centro.lng).toBounds(raio * 2.3));
  }, [map, centro.lat, centro.lng, raio]);
  return null;
}

// Mapa do anúncio: ponto (ou região aproximada), zonas de busca e avistamentos.
export function MapaAnuncio({ pontoPublico, precisao, zonas, avistamentos = [], pontoExato }) {
  const centro = zonas?.centro ?? pontoPublico;
  const raio = zonas?.externa_m ?? 600;
  return (
    <MapContainer center={[centro.lat, centro.lng]} zoom={15} scrollWheelZoom={false} className="h-full w-full">
      <Camadas />
      <Enquadrar centro={centro} raio={Math.max(raio, 250)} />
      {zonas && (
        <>
          <Circle center={[zonas.centro.lat, zonas.centro.lng]} radius={zonas.externa_m}
            pathOptions={{ color: TINTA, weight: 2, dashArray: "6 6", fillColor: CARTAZ, fillOpacity: 0.14 }} />
          <Circle center={[zonas.centro.lat, zonas.centro.lng]} radius={zonas.interna_m}
            pathOptions={{ color: TINTA, weight: 2, fillColor: CARTAZ, fillOpacity: 0.45 }} />
        </>
      )}
      {precisao === "aproximado" && zonas ? null : precisao === "aproximado" ? (
        <Circle center={[pontoPublico.lat, pontoPublico.lng]} radius={RAIO_APROXIMACAO_M}
          pathOptions={{ color: TINTA, weight: 1.5, dashArray: "2 5", fillColor: TINTA, fillOpacity: 0.08 }}>
          <Tooltip>Região aproximada do último local visto</Tooltip>
        </Circle>
      ) : (
        <CircleMarker center={[pontoPublico.lat, pontoPublico.lng]} radius={9}
          pathOptions={{ color: TINTA, weight: 3, fillColor: CARTAZ, fillOpacity: 1 }}>
          <Tooltip>Último local visto</Tooltip>
        </CircleMarker>
      )}
      {pontoExato && precisao === "aproximado" && (
        <CircleMarker center={[pontoExato.lat, pontoExato.lng]} radius={6} pathOptions={{ color: TINTA, fillColor: TINTA, fillOpacity: 1 }}>
          <Tooltip>Ponto exato (só você vê)</Tooltip>
        </CircleMarker>
      )}
      {avistamentos.map((v) => (
        <CircleMarker key={v.id} center={[v.ponto.lat, v.ponto.lng]} radius={8}
          pathOptions={{ color: "#fff", weight: 2.5, fillColor: ACHADO, fillOpacity: 1 }}>
          <Tooltip>Visto em {dataHora(v.visto_em)}{v.observacao ? `: ${v.observacao}` : ""}</Tooltip>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}

function Clique({ aoEscolher }) {
  useMapEvents({ click: (e) => aoEscolher({ lat: e.latlng.lat, lng: e.latlng.lng }) });
  return null;
}

function Seguir({ ponto }) {
  const map = useMap();
  useEffect(() => {
    if (ponto) map.setView([ponto.lat, ponto.lng], Math.max(map.getZoom(), 16));
  }, [map, ponto]);
  return null;
}

// Seletor de ponto: clique no mapa para marcar.
export function SeletorMapa({ inicial, ponto, aoEscolher, centralizarEm }) {
  return (
    <MapContainer center={[inicial.lat, inicial.lng]} zoom={inicial.zoom ?? 13} className="h-full w-full">
      <Camadas />
      <Clique aoEscolher={aoEscolher} />
      <Seguir ponto={centralizarEm} />
      {ponto && (
        <CircleMarker center={[ponto.lat, ponto.lng]} radius={10} pathOptions={{ color: TINTA, weight: 3, fillColor: CARTAZ, fillOpacity: 1 }} />
      )}
    </MapContainer>
  );
}
