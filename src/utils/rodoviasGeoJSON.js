import nearestPointOnLine from '@turf/nearest-point-on-line';
import length from '@turf/length';
import { lineString, point } from '@turf/helpers';

// Trajetórias simplificadas (Long, Lat) ordenadas pelo ponto inicial (KM 0)
export const RODOVIAS_TRACKS = {
  'BR-163': {
    nome: 'BR-163 (CCR MSVia)',
    concessionaria: 'CCR MSVia',
    oficialLengthKm: 847.2,
    // De Sonora (Norte - KM 0) a Mundo Novo (Sul - KM 847.2)
    coordinates: [
      [-54.607422, -17.886022], // Sonora (Divisa MT) - KM 0
      [-54.757080, -18.151120],
      [-54.809341, -18.504269], // Coxim
      [-54.843674, -18.919799], // Rio Verde de MT
      [-54.567032, -19.395724], // São Gabriel do Oeste
      [-54.364471, -19.873204], // Bandeirantes
      [-54.402924, -20.141566], // Jaraguari
      [-54.602509, -20.463588], // Campo Grande - KM ~480
      [-54.385529, -21.463379], // Nova Alvorada do Sul
      [-54.551697, -21.802102], // Rio Brilhante
      [-54.808044, -22.222718], // Dourados
      [-54.825211, -22.632289], // Caarapó
      [-54.582825, -22.862413], // Juti
      [-54.195251, -23.064971], // Naviraí
      [-54.192505, -23.473523], // Itaquiraí
      [-54.281769, -23.784566], // Eldorado
      [-54.270782, -23.958229]  // Mundo Novo (Divisa PR) - KM ~847
    ],
    // Mapeamento aproximado de trechos por faixa de KM
    trechos: [
      { maxKm: 100, nome: 'Sonora - Pedro Gomes' },
      { maxKm: 250, nome: 'Pedro Gomes - Rio Verde de MT' },
      { maxKm: 380, nome: 'Rio Verde de MT - São Gabriel do Oeste' },
      { maxKm: 440, nome: 'São Gabriel do Oeste - Bandeirantes' },
      { maxKm: 530, nome: 'Bandeirantes - Campo Grande' },
      { maxKm: 650, nome: 'Campo Grande - Nova Alvorada do Sul' },
      { maxKm: 720, nome: 'Nova Alvorada do Sul - Dourados' },
      { maxKm: 800, nome: 'Dourados - Caarapó' },
      { maxKm: 999, nome: 'Caarapó - Mundo Novo (Divisa PR)' }
    ]
  },
  'MS-306': {
    nome: 'MS-306 (Way-306)',
    concessionaria: 'Concessionária Way-306',
    oficialLengthKm: 218.1,
    // De Cassilândia (KM 0) a Costa Rica / Limite MS-GO (KM 218.1)
    coordinates: [
      [-51.729126, -19.111816], // Cassilândia - KM 0
      [-51.980900, -18.995000],
      [-52.624756, -18.790933], // Chapadão do Sul
      [-53.020100, -18.390000],
      [-53.111954, -18.257324]  // Limite MS/GO - KM 218
    ],
    trechos: [
      { maxKm: 90, nome: 'Cassilândia - Chapadão do Sul' },
      { maxKm: 999, nome: 'Chapadão do Sul - Limite MS/GO' }
    ]
  },
  'MS-112': {
    nome: 'MS-112 / BR-158 (Way-112)',
    concessionaria: 'Concessionária Way-112',
    oficialLengthKm: 200.0,
    // De Cassilândia (KM 0) a Três Lagoas (KM 200.0)
    coordinates: [
      [-51.729126, -19.111816], // Cassilândia - KM 0
      [-51.850000, -19.380000],
      [-51.929932, -19.729932], // Inocência
      [-51.810000, -20.250000],
      [-51.704254, -20.785324]  // Três Lagoas - KM 200
    ],
    trechos: [
      { maxKm: 110, nome: 'Cassilândia - Inocência' },
      { maxKm: 999, nome: 'Inocência - Três Lagoas' }
    ]
  }
};

/**
 * Analisa um KML de pontos de KM e retorna array de {lat, lng, km}.
 * Aceita o campo "km" via: ExtendedData > SimpleData[name=km],
 * ExtendedData > Data[name=km] > value, ou <name>.
 *
 * @param {string} kmlText
 * @returns {{lat: number, lng: number, km: string}[] | null}
 */
export function parseKMLKmPoints(kmlText) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(kmlText, 'application/xml');
    const placemarks = doc.querySelectorAll('Placemark');
    const points = [];

    for (const pm of placemarks) {
      const coordEl = pm.querySelector('Point > coordinates');
      if (!coordEl) continue;
      const parts = coordEl.textContent.trim().split(',').map(Number);
      if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) continue;
      const lng = parts[0];
      const lat = parts[1];

      let km = '';
      for (const sd of pm.querySelectorAll('SimpleData')) {
        if ((sd.getAttribute('name') || '').toLowerCase() === 'km') {
          km = sd.textContent.trim();
          break;
        }
      }
      if (!km) {
        for (const d of pm.querySelectorAll('Data')) {
          if ((d.getAttribute('name') || '').toLowerCase() === 'km') {
            const v = d.querySelector('value');
            if (v) { km = v.textContent.trim(); break; }
          }
        }
      }
      if (!km) {
        const nameEl = pm.querySelector('name');
        if (nameEl) km = nameEl.textContent.trim();
      }

      if (km) points.push({ lat, lng, km });
    }

    return points.length > 0 ? points : null;
  } catch {
    return null;
  }
}

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const dPhi = (lat2 - lat1) * Math.PI / 180;
  const dLambda = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dPhi / 2) ** 2 + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Retorna o ponto KM mais próximo das coordenadas GPS fornecidas.
 *
 * @param {{lat: number, lng: number, km: string}[]} points
 * @param {number} lat
 * @param {number} lng
 * @returns {{lat: number, lng: number, km: string, distanceMeters: number} | null}
 */
export function findNearestKmPoint(points, lat, lng) {
  if (!points || points.length === 0) return null;
  let nearest = null;
  let minDist = Infinity;
  for (const p of points) {
    const d = haversineMeters(lat, lng, p.lat, p.lng);
    if (d < minDist) { minDist = d; nearest = p; }
  }
  return nearest ? { ...nearest, distanceMeters: Math.round(minDist) } : null;
}

/**
 * Analisa um arquivo KML e extrai o primeiro LineString de coordenadas encontrado.
 * Retorna um array de [lng, lat] para uso com Turf.js (mesmo formato de RODOVIAS_TRACKS).
 *
 * @param {string} kmlText - Conteúdo textual do arquivo KML
 * @returns {[number, number][] | null} Array de coordenadas [lng, lat] ou null se inválido
 */
export function parseKMLCoordinates(kmlText) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(kmlText, 'application/xml');

    // Aceita <coordinates> dentro de <LineString> ou <LinearRing>
    const coordNodes = doc.querySelectorAll('LineString > coordinates, LinearRing > coordinates');
    if (coordNodes.length === 0) return null;

    const raw = coordNodes[0].textContent.trim();
    const coords = raw
      .split(/\s+/)
      .map(token => {
        const parts = token.split(',').map(Number);
        // KML usa lon,lat,alt — descartamos altitude
        if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          return [parts[0], parts[1]];
        }
        return null;
      })
      .filter(Boolean);

    return coords.length >= 2 ? coords : null;
  } catch {
    return null;
  }
}

/**
 * Analisa um KML com múltiplos Placemarks (uma rodovia por Placemark).
 * Retorna um array de segmentos { name, coordinates } para snap multi-rodovia.
 *
 * @param {string} kmlText
 * @returns {{ name: string, coordinates: [number,number][] }[]}
 */
export function parseKMLSegments(kmlText) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(kmlText, 'application/xml');
    const placemarks = doc.querySelectorAll('Placemark');

    const parseCoords = (el) => {
      const coordNodes = el.querySelectorAll('LineString > coordinates, LinearRing > coordinates');
      if (!coordNodes.length) return null;
      const raw = coordNodes[0].textContent.trim();
      const coords = raw.split(/\s+/).map(token => {
        const parts = token.split(',').map(Number);
        return parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1]) ? [parts[0], parts[1]] : null;
      }).filter(Boolean);
      return coords.length >= 2 ? coords : null;
    };

    if (placemarks.length > 0) {
      const segments = [];
      for (const pm of placemarks) {
        const nameEl = pm.querySelector('name');
        const name = nameEl ? nameEl.textContent.trim() : '';
        const coords = parseCoords(pm);
        if (coords) segments.push({ name, coordinates: coords });
      }
      if (segments.length > 0) return segments;
    }

    // Fallback: KML sem Placemarks — segmento único sem nome
    const coords = parseKMLCoordinates(kmlText);
    return coords ? [{ name: '', coordinates: coords }] : [];
  } catch {
    return [];
  }
}

/**
 * Faz snap do ponto GPS ao segmento mais próximo dentre múltiplos do KML.
 * Retorna km, rodovia (nome do Placemark) e coordenadas snappadas.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {{ name: string, coordinates: [number,number][] }[]} segments
 * @returns {{ km: string, rodovia: string, distanceToLineMeters: number, latitude: number, longitude: number }}
 */
export function snapToNearestKMLSegment(lat, lng, segments) {
  if (!segments || segments.length === 0) {
    return { km: '', rodovia: '', distanceToLineMeters: 0, latitude: lat, longitude: lng };
  }

  let best = null;
  let bestDist = Infinity;

  for (const seg of segments) {
    if (!seg.coordinates || seg.coordinates.length < 2) continue;
    try {
      const line = lineString(seg.coordinates);
      const pt = point([lng, lat]);
      const snapped = nearestPointOnLine(line, pt);
      const distM = (snapped.properties.dist ?? 0) * 1000;

      if (distM < bestDist) {
        bestDist = distM;
        const rawKm = snapped.properties.location ?? 0;
        best = {
          km: rawKm.toFixed(1),
          rodovia: seg.name || '',
          distanceToLineMeters: Math.round(distM),
          latitude: snapped.geometry.coordinates[1],
          longitude: snapped.geometry.coordinates[0]
        };
      }
    } catch {}
  }

  return best || { km: '', rodovia: '', distanceToLineMeters: 0, latitude: lat, longitude: lng };
}

/**
 * Faz snap de um ponto GPS ao traçado de uma rodovia, preferindo coordenadas
 * carregadas de KML (passadas como parâmetro) sobre as hardcoded em RODOVIAS_TRACKS.
 *
 * @param {number} lat
 * @param {number} lng
 * @param {string} rodoviaId
 * @param {[number, number][] | null} kmlCoords - Coordenadas do KML (opcional)
 */
export function snapToHighwayWithKML(lat, lng, rodoviaId, kmlCoords) {
  const rodovia = RODOVIAS_TRACKS[rodoviaId];
  const coordinates = (kmlCoords && kmlCoords.length >= 2) ? kmlCoords : (rodovia?.coordinates ?? null);
  if (!coordinates) {
    return { km: '', trecho: '', distanceToLineMeters: 0, latitude: lat, longitude: lng };
  }
  const tempRodovia = {
    ...rodovia,
    coordinates,
    // Se veio do KML não temos trechos mapeados; retornar a rodovia completa
    trechos: rodovia?.trechos ?? [{ maxKm: 9999, nome: rodoviaId }]
  };
  try {
    const highwayLine = lineString(tempRodovia.coordinates);
    const userPoint = point([lng, lat]);
    const snapped = nearestPointOnLine(highwayLine, userPoint);
    const distanceKm = snapped.properties.dist ?? 0;
    const rawLocationKm = snapped.properties.location ?? 0;
    const geomLength = length(highwayLine);
    const officialLength = tempRodovia.oficialLengthKm ?? geomLength;
    const finalKm = rawLocationKm * (officialLength / geomLength);
    const trechoObj = tempRodovia.trechos.find(t => finalKm <= t.maxKm) ?? tempRodovia.trechos[tempRodovia.trechos.length - 1];
    return {
      km: finalKm.toFixed(1),
      trecho: trechoObj?.nome ?? '',
      distanceToLineMeters: Math.round(distanceKm * 1000),
      latitude: snapped.geometry.coordinates[1],
      longitude: snapped.geometry.coordinates[0]
    };
  } catch {
    return { km: '', trecho: '', distanceToLineMeters: 0, latitude: lat, longitude: lng };
  }
}

/**
 * Cruza a coordenada GPS com o traçado da rodovia selecionada usando Turf.js.
 * Retorna o KM snappeado, a distância do GPS à rodovia (em metros) e o trecho estimado.
 * 
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {string} rodoviaId - ID da rodovia ('BR-163' | 'MS-306' | 'MS-112')
 * @returns {{ km: string, trecho: string, distanceToLineMeters: number, latitude: number, longitude: number }}
 */
export function snapToHighway(lat, lng, rodoviaId) {
  const rodovia = RODOVIAS_TRACKS[rodoviaId];
  if (!rodovia) {
    return { km: '', trecho: '', distanceToLineMeters: 0, latitude: lat, longitude: lng };
  }

  try {
    const highwayLine = lineString(rodovia.coordinates);
    const userPoint = point([lng, lat]);

    // Snappar ponto na rodovia
    const snapped = nearestPointOnLine(highwayLine, userPoint);
    const snappedLng = snapped.geometry.coordinates[0];
    const snappedLat = snapped.geometry.coordinates[1];

    // Distância do ponto original até a rodovia (em km, convertendo pra metros)
    const distanceKm = snapped.properties.dist ?? 0;
    const distanceMeters = Math.round(distanceKm * 1000);

    // Distância percorrida desde o início do LineString (Sonora/KM 0) em km
    const rawLocationKm = snapped.properties.location ?? 0;

    // Calcular o comprimento total geométrico da linha
    const geomLength = length(highwayLine);

    // Escalonamento para que o final da linha represente exatamente a extensão oficial da rodovia
    const scaleFactor = rodovia.oficialLengthKm / geomLength;
    const finalKm = rawLocationKm * scaleFactor;

    // Formatar KM com 1 casa decimal (ex: 124.5)
    const kmFormatted = finalKm.toFixed(1);

    // Encontrar o trecho correspondente
    const trechoObj = rodovia.trechos.find(t => finalKm <= t.maxKm) || rodovia.trechos[rodovia.trechos.length - 1];
    const trechoNome = trechoObj ? trechoObj.nome : '';

    return {
      km: kmFormatted,
      trecho: trechoNome,
      distanceToLineMeters: distanceMeters,
      latitude: snappedLat,
      longitude: snappedLng
    };
  } catch (error) {
    console.error('Erro no snapping de rodovia:', error);
    return {
      km: '',
      trecho: '',
      distanceToLineMeters: 0,
      latitude: lat,
      longitude: lng
    };
  }
}
