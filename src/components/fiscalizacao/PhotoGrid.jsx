import { useEffect, useState, useRef, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Repository } from '@/lib/offline/repository';
import { MAX_PHOTOS_PER_UNIDADE, extractCaptureFromImageFile } from '@/lib/offline/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import OptimizedImage from '@/components/fiscalizacao/OptimizedImage.jsx';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Loader2, Image as ImageIcon, Camera as CameraIcon, Trash2, Save, Edit2, X, Clock, GripVertical } from 'lucide-react';

export default function PhotoGrid({
    fotos = [],
    minFotos = 2,
    onAddFoto,
    onRemoveFoto,
    onUpdateLegenda,
    onReorderFotos,
    titulo = "Fotos da Unidade",
    fiscalizacaoId,
    unidadeId,
    isEditable = true,
    bigButton = false,
    enableLegenda = true,
    watermarkContext = null,
    autoCapture = false,
    captureBlocked = false,
    captureBlockedMessage = 'Aguarde...'
}) {
    const fotosList = useMemo(() => {
        return (Array.isArray(fotos) ? fotos : []).map((f) => (typeof f === 'string' ? { url: f, legenda: '' } : f)).filter(Boolean);
    }, [fotos]);
    const [selectedFoto, setSelectedFoto] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isCapturing, setIsCapturing] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [totalUploads, setTotalUploads] = useState(0);
    const [editingLegenda, setEditingLegenda] = useState({});
    const [tempLegendas, setTempLegendas] = useState({});
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const lastGpsFixRef = useRef(null);
    const MAX_GPS_ACCURACY_M = 50;
    const [signedByKey, setSignedByKey] = useState({});
    const lastGpsFixAtRef = useRef(0);
    const GPS_FIX_MAX_AGE_MS = 2 * 60 * 1000;
    const GPS_FALLBACK_MAX_AGE_MS = 10 * 60 * 1000;
    const captureResetTimerRef = useRef(null);
    const autoCaptureAttemptedRef = useRef(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const [showCamera, setShowCamera] = useState(false);

    const fotoKey = (foto, index) => {
        const f = foto || {};
        if (f.bucket && f.path) return `${f.bucket}:${f.path}`;
        if (f.localId) return `local:${f.localId}`;
        const url = String(f.url || '');
        if (url) return `url:${url}`;
        return `idx:${index}`;
    };

    const reorderArray = (list, startIndex, endIndex) => {
        const result = Array.from(list);
        const [removed] = result.splice(startIndex, 1);
        result.splice(endIndex, 0, removed);
        return result;
    };

    const resolveFotoSrc = (foto) => {
        if (!foto) return '';
        const baseUrl = (import.meta.env.VITE_SUPABASE_URL || '');
        if (foto.bucket && foto.path) {
            const k = `${foto.bucket}:${foto.path}`;
            return signedByKey[k] || `${baseUrl}/storage/v1/object/public/${foto.bucket}/${foto.path}`;
        }
        const url = foto.url || '';
        const parsed = Repository.parseStorageUrl(url);
        if (parsed) {
            const k = `${parsed.bucket}:${parsed.path}`;
            return signedByKey[k] || `${baseUrl}/storage/v1/object/public/${parsed.bucket}/${parsed.path}`;
        }
        return url;
    };

    // Limpa stream WebRTC ao desmontar
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
        };
    }, []);

    // Conecta stream ao elemento <video> quando overlay abre
    useEffect(() => {
        if (!showCamera || !videoRef.current || !streamRef.current) return;
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(() => {});
    }, [showCamera]);

    // Auto-abre câmera na montagem quando autoCapture=true e sem fotos
    useEffect(() => {
        if (!autoCapture || autoCaptureAttemptedRef.current || fotosList.length > 0 || captureBlocked) return;
        autoCaptureAttemptedRef.current = true;
        void openCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [captureBlocked]);

    useEffect(() => {
        let cancelled = false;
        const run = async () => {
            const next = { ...signedByKey };
            const pending = [];
            for (const foto of fotosList || []) {
                if (!foto) continue;
                if (foto.bucket && foto.path) {
                    const k = `${foto.bucket}:${foto.path}`;
                    if (!next[k]) pending.push({ k, bucket: foto.bucket, path: foto.path });
                    continue;
                }
                const url = foto.url || '';
                const parsed = Repository.parseStorageUrl(url);
                if (parsed) {
                    const k = `${parsed.bucket}:${parsed.path}`;
                    if (!next[k]) pending.push({ k, bucket: parsed.bucket, path: parsed.path });
                }
            }
            const concurrency = Math.min(4, Math.max(1, pending.length));
            let cursor = 0;
            const worker = async () => {
                while (true) {
                    const i = cursor;
                    cursor++;
                    const item = pending[i];
                    if (!item) break;
                    try {
                        const signed = await Repository.getSignedUrlFromBucket(item.bucket, item.path, 60 * 30);
                        next[item.k] = signed;
                    } catch {
                    }
                }
            };
            await Promise.all(Array.from({ length: concurrency }, () => worker()));
            if (!cancelled) setSignedByKey(next);
        };
        void run();
        return () => {
            cancelled = true;
        };
    }, [fotosList]);

    const getValidatedGpsFix = async () => {
        if (!('geolocation' in navigator) || !navigator.geolocation) {
            throw new Error('Geolocalização não suportada neste dispositivo.');
        }
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
                resolve,
                reject,
                { enableHighAccuracy: true, timeout: 25000, maximumAge: 10000 }
            );
        });
        const coords = position?.coords;
        const latitude = typeof coords?.latitude === 'number' ? coords.latitude : NaN;
        const longitude = typeof coords?.longitude === 'number' ? coords.longitude : NaN;
        const accuracy = typeof coords?.accuracy === 'number' ? coords.accuracy : Infinity;
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
            throw new Error('Coordenadas GPS indisponíveis. Aguarde o sinal e tente novamente.');
        }
        return { latitude, longitude, accuracy, takenAt: new Date().toISOString() };
    };

    const getCachedGpsFix = () => {
        const fix = lastGpsFixRef.current;
        if (!fix) return null;
        const age = Date.now() - (lastGpsFixAtRef.current || 0);
        if (age > GPS_FIX_MAX_AGE_MS) return null;
        if (typeof fix.latitude !== 'number' || !Number.isFinite(fix.latitude)) return null;
        if (typeof fix.longitude !== 'number' || !Number.isFinite(fix.longitude)) return null;
        return fix;
    };

    const getGpsFixWithFallback = async () => {
        const cached = getCachedGpsFix();
        if (cached) return cached;
        try {
            const fix = await getValidatedGpsFix();
            lastGpsFixRef.current = fix;
            lastGpsFixAtRef.current = Date.now();
            return fix;
        } catch (err) {
            const fallback = lastGpsFixRef.current;
            const fallbackAge = Date.now() - (lastGpsFixAtRef.current || 0);
            const okFallback =
                fallback &&
                typeof fallback.latitude === 'number' &&
                Number.isFinite(fallback.latitude) &&
                typeof fallback.longitude === 'number' &&
                Number.isFinite(fallback.longitude) &&
                fallbackAge <= GPS_FALLBACK_MAX_AGE_MS;
            if (okFallback) return fallback;
            throw err;
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        setShowCamera(false);
    };

    const capturePhoto = async () => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
        stopCamera();
        setIsUploading(true);
        setTotalUploads(1);
        setUploadProgress(0);
        canvas.toBlob(async (blob) => {
            if (!blob) { setIsUploading(false); return; }
            const file = new File([blob], `foto_${Date.now()}.jpg`, { type: 'image/jpeg' });
            const gpsFix = lastGpsFixRef.current;
            try {
                const capture = gpsFix
                    ? { latitude: gpsFix.latitude, longitude: gpsFix.longitude, takenAt: new Date().toISOString() }
                    : null;
                const saved = await Repository.addLocalFotoFromFile(
                    unidadeId, file,
                    capture ? { latitude: capture.latitude, longitude: capture.longitude, takenAt: capture.takenAt } : undefined,
                    watermarkContext ? { fiscalizacaoId, ...watermarkContext } : { fiscalizacaoId }
                );
                onAddFoto({
                    localId: saved.localId,
                    url: saved.previewUrl || saved.url || '',
                    legenda: '',
                    mimeType: saved.mimeType,
                    width: saved.width,
                    height: saved.height,
                    data_hora: capture?.takenAt || new Date().toISOString()
                });
                setUploadProgress(1);
            } catch (err) {
                alert('Erro ao salvar foto: ' + (err?.message || String(err)));
            } finally {
                setIsUploading(false);
                setUploadProgress(0);
                setTotalUploads(0);
            }
        }, 'image/jpeg', 0.92);
    };

    const openCamera = async () => {
        if (isCapturing || isUploading) return;
        // Se getUserMedia não disponível, cai no input nativo
        if (!navigator.mediaDevices?.getUserMedia) {
            return openWithGpsGate(cameraInputRef);
        }
        setIsCapturing(true);
        // GPS primeiro
        try {
            const fix = await getGpsFixWithFallback();
            lastGpsFixRef.current = fix;
            lastGpsFixAtRef.current = Date.now();
        } catch (err) {
            setIsCapturing(false);
            alert(err?.message || String(err));
            return;
        }
        // Abre stream da câmera
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                    aspectRatio: { ideal: 16 / 9 }
                },
                audio: false
            });
            streamRef.current = stream;
            setIsCapturing(false);
            setShowCamera(true);
        } catch {
            setIsCapturing(false);
            // Permissão negada ou não suportado: fallback para input nativo
            openWithGpsGate(cameraInputRef);
        }
    };

    const openWithGpsGate = async (ref) => {
        if (isCapturing || isUploading) return;
        try {
            setIsCapturing(true);
            if (captureResetTimerRef.current) clearTimeout(captureResetTimerRef.current);
            captureResetTimerRef.current = setTimeout(() => setIsCapturing(false), 30000);
            const fix = await getGpsFixWithFallback();
            lastGpsFixRef.current = fix;
            lastGpsFixAtRef.current = Date.now();
            ref?.current?.click();
        } catch (err) {
            setIsCapturing(false);
            alert(err?.message || String(err));
        }
    };

    const handleFileSelect = async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        setIsCapturing(false);
        if (captureResetTimerRef.current) {
            clearTimeout(captureResetTimerRef.current);
            captureResetTimerRef.current = null;
        }

        const isGallery = e.target === fileInputRef.current;
        let gpsFix = lastGpsFixRef.current;
        if (!isGallery) {
            try {
                gpsFix = gpsFix || await getGpsFixWithFallback();
                lastGpsFixRef.current = gpsFix;
                lastGpsFixAtRef.current = Date.now();
            } catch (err) {
                alert(err?.message || String(err));
                e.target.value = '';
                return;
            }
        }

            const filesArray = Array.from(files);
            const allowed = Math.max(0, MAX_PHOTOS_PER_UNIDADE - (fotos?.length || 0));
            const filesToProcess = filesArray.slice(0, allowed);
            if (filesToProcess.length === 0) {
                alert(`Limite de ${MAX_PHOTOS_PER_UNIDADE} fotos por unidade atingido`);
                e.target.value = '';
                return;
            }
            if (filesToProcess.length < filesArray.length) {
                alert(`Apenas ${filesToProcess.length} foto(s) serão adicionadas por limite de ${MAX_PHOTOS_PER_UNIDADE} por unidade.`);
            }

        setIsUploading(true);
            setTotalUploads(filesToProcess.length);
        setUploadProgress(0);

        try {
                let processados = 0;
                let erros = 0;
                let cursor = 0;
                const concurrency = Math.min(2, Math.max(1, filesToProcess.length));
                const nextFile = () => {
                    const i = cursor;
                    cursor++;
                    return filesToProcess[i];
                };
                const worker = async () => {
                    while (true) {
                        const file = nextFile();
                        if (!file) break;
                        try {
                            let capture = null;
                            if (isGallery) {
                                capture = await extractCaptureFromImageFile(file);
                            } else {
                                capture = { latitude: gpsFix.latitude, longitude: gpsFix.longitude, takenAt: new Date().toISOString() };
                            }
                            const saved = await Repository.addLocalFotoFromFile(
                                unidadeId,
                                file,
                                capture
                                    ? { latitude: capture.latitude, longitude: capture.longitude, takenAt: capture.takenAt }
                                    : undefined,
                                watermarkContext
                                    ? { fiscalizacaoId, ...watermarkContext }
                                    : { fiscalizacaoId }
                            );
                            // Prioridade: takenAt do EXIF/GPS → lastModified do arquivo → agora
                            const dataHoraFoto = capture?.takenAt
                                ? capture.takenAt
                                : (file?.lastModified ? new Date(file.lastModified).toISOString() : new Date().toISOString());
                            const novaFoto = {
                                localId: saved.localId,
                                url: saved.previewUrl || saved.url || '',
                                legenda: saved.legenda || '',
                                mimeType: saved.mimeType,
                                width: saved.width,
                                height: saved.height,
                                data_hora: dataHoraFoto
                            };
                            onAddFoto(novaFoto);
                            processados++;
                            setUploadProgress(processados);
                        } catch (fileErr) {
                            console.error('Erro ao processar arquivo:', file.name, fileErr);
                            erros++;
                        }
                    }
                };
                await Promise.all(Array.from({ length: concurrency }, () => worker()));

                if (erros > 0) alert(`${erros} arquivo(s) não puderam ser adicionados. ${processados} adicionados com sucesso.`);
        } catch (err) {
            console.error('Erro geral no upload:', err);
            alert('Erro ao processar imagens: ' + err.message);
        } finally {
            setIsUploading(false);
            setIsCapturing(false);
            setUploadProgress(0);
            setTotalUploads(0);
            e.target.value = '';
        }
    };

    const faltam = Math.max(0, minFotos - fotosList.length);

    return (
        <div className="space-y-4">
            {/* Hidden inputs always present */}
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelect} className="hidden" />

            {/* Big empty-state button (modo DTR) */}
            {bigButton && fotosList.length === 0 && isEditable && (
                <button
                    type="button"
                    onClick={() => void openCamera()}
                    disabled={isUploading || isCapturing || captureBlocked}
                    className="w-full py-16 rounded-2xl border-2 border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 active:bg-blue-200 transition-colors flex flex-col items-center justify-center gap-3 disabled:opacity-60"
                >
                    {captureBlocked ? (
                        <>
                            <Loader2 className="h-12 w-12 text-blue-400 animate-spin" />
                            <span className="text-sm font-semibold text-blue-500">{captureBlockedMessage}</span>
                        </>
                    ) : (isUploading || isCapturing) ? (
                        <>
                            <Loader2 className="h-12 w-12 text-blue-400 animate-spin" />
                            <span className="text-sm font-semibold text-blue-500">
                                {isCapturing ? 'Aguardando GPS e câmera...' : `Salvando... ${uploadProgress}/${totalUploads}`}
                            </span>
                        </>
                    ) : (
                        <>
                            <CameraIcon className="h-14 w-14 text-blue-400" />
                            <span className="text-lg font-bold text-blue-600">Registrar Imagem</span>
                            <span className="text-xs text-blue-400">Toque para abrir a câmera</span>
                        </>
                    )}
                </button>
            )}

            {/* Header padrão (exibido quando NÃO é bigButton vazio) */}
            {!(bigButton && fotosList.length === 0) && (
                <div className="flex justify-between items-center">
                    <h4 className="font-medium">{titulo}</h4>
                    <div className="flex gap-2">
                        <Button
                            onClick={() => fileInputRef.current?.click()}
                            size="sm"
                            variant="outline"
                            disabled={isUploading || isCapturing || !isEditable}
                        >
                            {isUploading ? (
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{uploadProgress}/{totalUploads}</>
                            ) : (
                                <><ImageIcon className="h-4 w-4 mr-2" />Galeria</>
                            )}
                        </Button>
                        <Button
                            onClick={() => void openCamera()}
                            size="sm"
                            disabled={isUploading || isCapturing || !isEditable || captureBlocked}
                        >
                            {captureBlocked ? (
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{captureBlockedMessage}</>
                            ) : isUploading ? (
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Enviando...</>
                            ) : isCapturing ? (
                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Abrindo câmera...</>
                            ) : (
                                <><CameraIcon className="h-4 w-4 mr-2" />Câmera</>
                            )}
                        </Button>
                    </div>
                </div>
            )}


            {/* Grid de fotos */}
            {fotosList.length > 0 && (
                <DragDropContext
                    onDragEnd={(result) => {
                        if (!onReorderFotos) return;
                        if (!isEditable) return;
                        if (!result?.destination) return;
                        const { source, destination } = result;
                        if (source.index === destination.index) return;
                        const next = reorderArray(fotosList, source.index, destination.index);
                        onReorderFotos(next);
                    }}
                >
                    <Droppable droppableId="fotos" direction="horizontal">
                        {(provided) => (
                            <div ref={provided.innerRef} {...provided.droppableProps} className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {fotosList.filter(f => !!(f?.url || (f?.bucket && f?.path) || f?.localId)).map((foto, index) => {
                                    const k = fotoKey(foto, index);
                                    return (
                                        <Draggable
                                            key={k}
                                            draggableId={k}
                                            index={index}
                                            isDragDisabled={!isEditable || !onReorderFotos}
                                        >
                                            {(drag) => (
                                                <div
                                                    ref={drag.innerRef}
                                                    {...drag.draggableProps}
                                                    style={drag.draggableProps.style}
                                                    className="relative group rounded-lg overflow-hidden border"
                                                >
                                                    {isEditable && onReorderFotos ? (
                                                        <div {...drag.dragHandleProps} className="absolute top-1 left-1 z-10 bg-black/60 text-white rounded p-1">
                                                            <GripVertical className="h-4 w-4" />
                                                        </div>
                                                    ) : null}
                                                    <OptimizedImage 
                                                        src={resolveFotoSrc(foto)} 
                                                        alt={`Foto ${index + 1}`}
                                                        className="w-full h-32 object-cover cursor-pointer"
                                                        onClick={() => setSelectedFoto(foto)}
                                                    />
                                                    {isEditable && (
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <Button
                                                                variant="destructive"
                                                                size="sm"
                                                                onClick={() => onRemoveFoto(index)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    )}
                                                    {enableLegenda && (isEditable ? (
                                                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 flex gap-1">
                                                            <Input
                                                                placeholder="Legenda..."
                                                                value={editingLegenda[k] ? (tempLegendas[k] ?? foto.legenda ?? '') : (foto.legenda || '')}
                                                                onChange={(e) => setTempLegendas(prev => ({ ...prev, [k]: e.target.value }))}
                                                                readOnly={!editingLegenda[k]}
                                                                className="h-6 text-xs bg-transparent border-none text-white placeholder:text-gray-300"
                                                            />
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-6 w-6 p-0 text-white hover:bg-white/20"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (editingLegenda[k]) {
                                                                        let legenda = tempLegendas[k] ?? foto.legenda ?? '';
                                                                        legenda = legenda.trim();
                                                                        if (legenda) {
                                                                            legenda = legenda.replace(/\.+$/, '.');
                                                                            if (!/[.!?]$/.test(legenda)) {
                                                                                legenda = `${legenda}.`;
                                                                            }
                                                                        }
                                                                        onUpdateLegenda(index, legenda);
                                                                        if (foto.localId) {
                                                                            Repository.updateLocalFotoLegenda(foto.localId, legenda).catch(() => {});
                                                                        }
                                                                        setEditingLegenda(prev => ({ ...prev, [k]: false }));
                                                                    } else {
                                                                        setEditingLegenda(prev => ({ ...prev, [k]: true }));
                                                                        setTempLegendas(prev => ({ ...prev, [k]: foto.legenda || '' }));
                                                                    }
                                                                }}
                                                            >
                                                                {editingLegenda[k] ? <Save className="h-3 w-3" /> : <Edit2 className="h-3 w-3" />}
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        foto.legenda && (
                                                            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1">
                                                                <p className="px-1">{foto.legenda}</p>
                                                            </div>
                                                        )
                                                    ))}

                                                </div>
                                            )}
                                        </Draggable>
                                    );
                                })}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            )}



            {/* Overlay câmera WebRTC — captura sem tela de confirmação nativa */}
            {showCamera && (
                <div className="fixed inset-0 bg-black z-[9999] flex flex-col overflow-hidden">
                    <canvas ref={canvasRef} className="hidden" />
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="flex-1 min-h-0 w-full object-cover"
                    />
                    <div className="flex-shrink-0 p-6 flex items-center justify-around bg-black relative z-10">
                        <button
                            type="button"
                            className="w-12 h-12 flex items-center justify-center rounded-full bg-white/10 active:bg-white/30 text-white"
                            onClick={stopCamera}
                        >
                            <X className="h-6 w-6" />
                        </button>
                        <button
                            type="button"
                            className="w-20 h-20 rounded-full border-4 border-white active:scale-95 transition-transform disabled:opacity-50 bg-transparent"
                            onClick={capturePhoto}
                            disabled={isUploading}
                        />
                        <div className="w-12" />
                    </div>
                </div>
            )}

            {/* Visualização ampliada */}
            {selectedFoto && (
                <div className="fixed inset-0 bg-black/90 z-50 flex flex-col" onClick={() => setSelectedFoto(null)}>
                    <div className="p-4 flex justify-end">
                        <Button variant="ghost" size="icon" className="text-white" onClick={() => setSelectedFoto(null)}>
                            <X className="h-6 w-6" />
                        </Button>
                    </div>
                    <div className="flex-1 flex items-center justify-center p-4">
                        <OptimizedImage 
                            src={resolveFotoSrc(selectedFoto)} 
                            alt="Foto ampliada" 
                            className="max-w-full max-h-full object-contain"
                        />
                    </div>
                    <div className="p-4 text-white text-sm">
                        {selectedFoto.legenda && <p className="mb-2">{selectedFoto.legenda}</p>}
                        {selectedFoto.data_hora && (
                            <span className="flex items-center gap-1 text-xs opacity-70">
                                <Clock className="h-3 w-3" />
                                {format(new Date(selectedFoto.data_hora), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </span>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
