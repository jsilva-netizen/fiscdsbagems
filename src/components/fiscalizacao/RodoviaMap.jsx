import { useEffect, useRef, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Repository } from '@/lib/offline/repository';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

// Fix leaflet default icon broken by Vite bundler
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
});

// ── Icon factories ────────────────────────────────────────────────────────────

function occurrenceIcon(index, isNC) {
    const bg = isNC ? '#dc2626' : '#16a34a';
    const html = `
        <div style="
            width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
            background:${bg};border:2px solid #fff;
            box-shadow:0 2px 6px rgba(0,0,0,.4);
            display:flex;align-items:center;justify-content:center;
        ">
            <span style="transform:rotate(45deg);color:#fff;font-size:10px;font-weight:700;line-height:1;">
                ${index}
            </span>
        </div>`;
    return L.divIcon({ html, className: '', iconSize: [28, 28], iconAnchor: [14, 28], popupAnchor: [0, -30] });
}

function kmIcon(label) {
    const html = `
        <div style="
            background:rgba(30,30,30,.75);color:#fff;
            font-size:9px;font-weight:600;
            padding:1px 4px;border-radius:3px;
            white-space:nowrap;line-height:1.4;
            box-shadow:0 1px 3px rgba(0,0,0,.4);
        ">KM ${label}</div>`;
    return L.divIcon({ html, className: '', iconSize: 'auto', iconAnchor: [16, 8], popupAnchor: [0, -10] });
}

function gpsIcon() {
    const html = `
        <div style="position:relative;width:20px;height:20px;">
            <div style="
                position:absolute;inset:0;border-radius:50%;
                background:rgba(59,130,246,.25);
                animation:gps-pulse 2s ease-out infinite;
            "></div>
            <div style="
                position:absolute;inset:4px;border-radius:50%;
                background:#3b82f6;border:2px solid #fff;
                box-shadow:0 0 0 1px #3b82f6;
            "></div>
        </div>
        <style>
            @keyframes gps-pulse{0%{transform:scale(1);opacity:.8}100%{transform:scale(3);opacity:0}}
        </style>`;
    return L.divIcon({ html, className: '', iconSize: [20, 20], iconAnchor: [10, 10] });
}

// ── Internal map helpers ──────────────────────────────────────────────────────

function MapController({ gpsPos, initialCentre }) {
    const map = useMap();
    const centredRef = useRef(false);

    useEffect(() => {
        if (gpsPos && !centredRef.current) {
            centredRef.current = true;
            map.setView([gpsPos.lat, gpsPos.lng], 15, { animate: true });
        }
    }, [gpsPos, map]);

    useEffect(() => {
        if (initialCentre && !centredRef.current) {
            map.setView(initialCentre, 14);
        }
    }, [initialCentre, map]);

    return null;
}

function RecenterButton({ gpsPos }) {
    const map = useMap();
    const handleClick = useCallback((e) => {
        e.stopPropagation();
        if (gpsPos) map.setView([gpsPos.lat, gpsPos.lng], 15, { animate: true });
    }, [gpsPos, map]);

    return (
        <div style={{ position: 'absolute', bottom: 16, right: 12, zIndex: 1000 }}>
            <button
                onClick={handleClick}
                title={gpsPos ? 'Centralizar no GPS' : 'Aguardando GPS...'}
                style={{
                    width: 40, height: 40, borderRadius: '50%',
                    background: gpsPos ? '#3b82f6' : '#6b7280',
                    border: '2px solid #fff',
                    boxShadow: '0 2px 8px rgba(0,0,0,.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', transition: 'background .2s',
                }}
            >
                {/* GPS crosshair */}
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
                    fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <line x1="12" y1="2" x2="12" y2="6" />
                    <line x1="12" y1="18" x2="12" y2="22" />
                    <line x1="2" y1="12" x2="6" y2="12" />
                    <line x1="18" y1="12" x2="22" y2="12" />
                </svg>
            </button>
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * RodoviaMap — preenche 100% do container pai.
 * Props:
 *   rodovia      {string}  — e.g. "MS-306"
 *   fiscId       {string}  — fiscalização ID (para links dos popups)
 *   ocorrencias  {Array}   — Unidade[] com latitude/longitude/km/tipo_ocorrencia/nome_unidade
 */
export default function RodoviaMap({ rodovia, fiscId, ocorrencias = [] }) {
    const [fullscreen, setFullscreen] = useState(false);
    const [gpsPos, setGpsPos]         = useState(null);
    const [kmPoints, setKmPoints]     = useState([]);
    const containerRef                = useRef(null);
    const watchIdRef                  = useRef(null);

    // ── KM points ───────────────────────────────────────────────────────────
    useEffect(() => {
        if (!rodovia) return;
        Repository.getKmPointsForRodovia(rodovia).then((pts) => {
            if (pts && pts.length > 0) setKmPoints(pts);
        });
    }, [rodovia]);

    // ── GPS watch ───────────────────────────────────────────────────────────
    useEffect(() => {
        if (!navigator.geolocation) return;
        watchIdRef.current = navigator.geolocation.watchPosition(
            (pos) => setGpsPos({
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
            }),
            () => {},
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 }
        );
        return () => {
            if (watchIdRef.current !== null)
                navigator.geolocation.clearWatch(watchIdRef.current);
        };
    }, []);

    // ── Fullscreen API ──────────────────────────────────────────────────────
    const enterFullscreen = useCallback(() => {
        const el = containerRef.current;
        if (!el) return;
        (el.requestFullscreen?.() ||
            el.webkitRequestFullscreen?.() ||
            el.mozRequestFullScreen?.() ||
            el.msRequestFullscreen?.());
    }, []);

    const exitFullscreen = useCallback(() => {
        (document.exitFullscreen?.() ||
            document.webkitExitFullscreen?.() ||
            document.mozCancelFullScreen?.() ||
            document.msExitFullscreen?.());
    }, []);

    // Sync state with actual browser fullscreen (Esc key updates this too)
    useEffect(() => {
        const onChange = () => setFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', onChange);
        document.addEventListener('webkitfullscreenchange', onChange);
        return () => {
            document.removeEventListener('fullscreenchange', onChange);
            document.removeEventListener('webkitfullscreenchange', onChange);
        };
    }, []);

    // ── Derived ─────────────────────────────────────────────────────────────
    const initialCentre = kmPoints.length > 0
        ? [kmPoints[0].lat, kmPoints[0].lng]
        : [-20.469, -54.620]; // MS fallback

    const mappableOcs = ocorrencias.filter(
        (oc) => oc.latitude != null && oc.longitude != null
    );

    // ── Render ──────────────────────────────────────────────────────────────
    return (
        <div
            ref={containerRef}
            style={{
                position: 'relative',
                width: '100%',
                height: '100%',
                background: '#0f172a',
            }}
        >
            {/* ── MapContainer fills the whole div ── */}
            <MapContainer
                center={initialCentre}
                zoom={13}
                style={{ width: '100%', height: '100%' }}
                zoomControl={true}
                attributionControl={false}
            >
                {/* ESRI satellite base */}
                <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                    maxZoom={19}
                />
                {/* ESRI labels overlay */}
                <TileLayer
                    url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                    maxZoom={19}
                    opacity={0.75}
                />

                <MapController gpsPos={gpsPos} initialCentre={initialCentre} />
                <RecenterButton gpsPos={gpsPos} />

                {/* GPS marker */}
                {gpsPos && (
                    <>
                        <Circle
                            center={[gpsPos.lat, gpsPos.lng]}
                            radius={gpsPos.accuracy}
                            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.08, weight: 1 }}
                        />
                        <Marker position={[gpsPos.lat, gpsPos.lng]} icon={gpsIcon()} zIndexOffset={500}>
                            <Popup>
                                <strong>Sua posição</strong><br />
                                ±{Math.round(gpsPos.accuracy)} m
                            </Popup>
                        </Marker>
                    </>
                )}

                {/* KM markers */}
                {kmPoints.map((pt, i) => (
                    <Marker key={`km-${i}`} position={[pt.lat, pt.lng]} icon={kmIcon(pt.km)} zIndexOffset={100}>
                        <Popup>KM {pt.km} — {pt.rodovia || rodovia}</Popup>
                    </Marker>
                ))}

                {/* Occurrence markers */}
                {mappableOcs.map((oc, idx) => {
                    const isNC = oc.tipo_ocorrencia === 'nc';
                    return (
                        <Marker
                            key={oc.id || idx}
                            position={[oc.latitude, oc.longitude]}
                            icon={occurrenceIcon(idx + 1, isNC)}
                            zIndexOffset={300}
                        >
                            <Popup>
                                <div style={{ minWidth: 140 }}>
                                    <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 13 }}>
                                        #{idx + 1} — KM {oc.km || '—'}
                                    </p>
                                    <p style={{ margin: '0 0 6px', fontSize: 11, color: '#374151' }}>
                                        {oc.nome_unidade || oc.tipo_ocorrencia_nome || 'Ponto de Inspeção'}
                                    </p>
                                    {isNC && (
                                        <span style={{
                                            display: 'inline-block', fontSize: 10, fontWeight: 700,
                                            color: '#dc2626', background: '#fef2f2',
                                            border: '1px solid #fecaca', borderRadius: 4,
                                            padding: '1px 6px', marginBottom: 6,
                                        }}>NC</span>
                                    )}
                                    <br />
                                    <Link
                                        to={createPageUrl('VistoriarOcorrenciaDTR') + `?fiscId=${fiscId}&id=${oc.id}`}
                                        style={{ fontSize: 11, color: '#4f46e5', fontWeight: 600 }}
                                    >
                                        Ver / Editar →
                                    </Link>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>

            {/* ── Overlays (ficam sobre o mapa via z-index) ── */}

            {/* GPS badge — canto superior esquerdo */}
            <div style={{
                position: 'absolute', top: 8, left: 8, zIndex: 1000,
                background: gpsPos ? 'rgba(22,163,74,.9)' : 'rgba(75,85,99,.85)',
                color: '#fff', fontSize: 10, fontWeight: 600,
                borderRadius: 12, padding: '3px 10px',
                boxShadow: '0 1px 4px rgba(0,0,0,.25)',
                pointerEvents: 'none',
            }}>
                {gpsPos ? `GPS ±${Math.round(gpsPos.accuracy)}m` : 'Sem GPS'}
            </div>

            {/* Botão TELA CHEIA — canto superior direito */}
            {!fullscreen && (
                <button
                    onClick={enterFullscreen}
                    title="Expandir para tela cheia"
                    style={{
                        position: 'absolute', top: 8, right: 8, zIndex: 1000,
                        background: 'rgba(255,255,255,.9)',
                        border: '1px solid #d1d5db',
                        borderRadius: 8, padding: '5px 10px',
                        fontSize: 11, fontWeight: 600, color: '#374151',
                        display: 'flex', alignItems: 'center', gap: 5,
                        cursor: 'pointer', boxShadow: '0 1px 4px rgba(0,0,0,.18)',
                    }}
                >
                    {/* expand icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 3 21 3 21 9" />
                        <polyline points="9 21 3 21 3 15" />
                        <line x1="21" y1="3" x2="14" y2="10" />
                        <line x1="3" y1="21" x2="10" y2="14" />
                    </svg>
                    Tela cheia
                </button>
            )}

            {/* Botão SAIR — visível e óbvio só no fullscreen */}
            {fullscreen && (
                <button
                    onClick={exitFullscreen}
                    title="Sair da tela cheia"
                    style={{
                        position: 'absolute', top: 12, right: 12, zIndex: 2000,
                        /* pill grande de fundo escuro semi-transparente */
                        background: 'rgba(15,23,42,.85)',
                        border: '1.5px solid rgba(255,255,255,.25)',
                        borderRadius: 12, padding: '8px 16px',
                        fontSize: 13, fontWeight: 700, color: '#fff',
                        display: 'flex', alignItems: 'center', gap: 8,
                        cursor: 'pointer',
                        boxShadow: '0 4px 16px rgba(0,0,0,.4)',
                        backdropFilter: 'blur(6px)',
                    }}
                >
                    {/* X icon */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                    Sair da tela cheia
                </button>
            )}
        </div>
    );
}
