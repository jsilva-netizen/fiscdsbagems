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
