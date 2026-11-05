// Cálculos de distância e posição na superfície da Terra (sem bibliotecas).
const RAIO_TERRA_M = 6371008.8;
const rad = (g) => (g * Math.PI) / 180;
const graus = (r) => (r * 180) / Math.PI;

// Fórmula de Haversine: distância em metros entre dois pontos {lat, lng}.
export function distanciaMetros(a, b) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * RAIO_TERRA_M * Math.asin(Math.sqrt(h));
}

// Ponto a "metros" de distância na direção "azimute" (radianos).
export function deslocarPonto(p, metros, azimute) {
  const d = metros / RAIO_TERRA_M;
  const lat1 = rad(p.lat);
  const lng1 = rad(p.lng);
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(d) + Math.cos(lat1) * Math.sin(d) * Math.cos(azimute));
  const lng2 = lng1 + Math.atan2(Math.sin(azimute) * Math.sin(d) * Math.cos(lat1), Math.cos(d) - Math.sin(lat1) * Math.sin(lat2));
  return { lat: graus(lat2), lng: graus(lng2) };
}

// RN04: no modo "aproximado", o ponto público fica entre 50 e 150 m do real.
export const RAIO_APROXIMACAO_M = 150;
export function pontoAproximado(p) {
  return deslocarPonto(p, 50 + Math.random() * 100, Math.random() * 2 * Math.PI);
}

export function coordenadaValida(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}
