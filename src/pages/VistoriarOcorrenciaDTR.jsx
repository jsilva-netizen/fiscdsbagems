import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Repository } from '@/lib/offline/repository';
import { snapToHighway, parseKMLSegments, snapToNearestKMLSegment, findNearestKmPoint, parseKMLKmPoints } from '@/utils/rodoviasGeoJSON';
import PhotoGrid from '@/components/fiscalizacao/PhotoGrid';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ArrowRight, Loader2, Save } from 'lucide-react';

const TIPOS_FALLBACK = [
    { frente: 'RECUPERAÇÃO E MANUTENÇÃO', item_contrato: '3.1.1 Pavimento', descricao: 'Exsudação', nome: 'Exsudação', nao_atendimento: null, prazo_dias_padrao: null },
    { frente: 'RECUPERAÇÃO E MANUTENÇÃO', item_contrato: '3.1.1 Pavimento', descricao: 'Elementos indesejáveis', nome: 'Elementos indesejáveis', nao_atendimento: null, prazo_dias_padrao: null },
    { frente: 'RECUPERAÇÃO E MANUTENÇÃO', item_contrato: '3.1.1 Pavimento', descricao: 'Buraco / Panela na pista', nome: 'Buraco / Panela na pista', nao_atendimento: '3.1.1 Ausência de defeitos no revestimento do pavimento do tipo panela, afundamento de trilha de roda.', prazo_dias_padrao: 3 },
    { frente: 'RECUPERAÇÃO E MANUTENÇÃO', item_contrato: '3.1.1 Pavimento', descricao: 'Afundamento de trilha de roda', nome: 'Afundamento de trilha de roda', nao_atendimento: null, prazo_dias_padrao: 15 },
    { frente: 'RECUPERAÇÃO E MANUTENÇÃO', item_contrato: '3.1.1 Pavimento', descricao: 'Outros', nome: 'Outros (Pavimento)', nao_atendimento: null, prazo_dias_padrao: null },
    { frente: 'RECUPERAÇÃO E MANUTENÇÃO', item_contrato: '3.1.2 Sinalização e Elementos de Proteção e Segurança', descricao: 'Sinalização vertical danificada ou ausente', nome: 'Sinalização vertical danificada ou ausente', nao_atendimento: null, prazo_dias_padrao: 3 },
    { frente: 'RECUPERAÇÃO E MANUTENÇÃO', item_contrato: '3.1.2 Sinalização e Elementos de Proteção e Segurança', descricao: 'Sinalização horizontal apagada ou desgastada', nome: 'Sinalização horizontal apagada', nao_atendimento: null, prazo_dias_padrao: 15 },
    { frente: 'RECUPERAÇÃO E MANUTENÇÃO', item_contrato: '3.1.2 Sinalização e Elementos de Proteção e Segurança', descricao: 'Defensa metálica danificada ou ausente', nome: 'Defensa metálica danificada', nao_atendimento: null, prazo_dias_padrao: 7 },
    { frente: 'RECUPERAÇÃO E MANUTENÇÃO', item_contrato: '3.1.3 Obras de Arte Especiais', descricao: 'Irregularidade em obra de arte especial', nome: 'Irregularidade em OAE', nao_atendimento: null, prazo_dias_padrao: null },
    { frente: 'RECUPERAÇÃO E MANUTENÇÃO', item_contrato: '3.1.4 Sistemas de Drenagem e Obras-de-Arte Correntes', descricao: 'Drenagem obstruída ou assoreada', nome: 'Drenagem obstruída', nao_atendimento: null, prazo_dias_padrao: 15 },
    { frente: 'RECUPERAÇÃO E MANUTENÇÃO', item_contrato: '3.1.5 Terraplenos e Estruturas de Contenção', descricao: 'Deslizamento ou erosão em terrapleno', nome: 'Deslizamento/erosão', nao_atendimento: null, prazo_dias_padrao: null },
    { frente: 'RECUPERAÇÃO E MANUTENÇÃO', item_contrato: '3.1.6 Canteiro Central e Faixa de Domínio', descricao: 'Vegetação alta no acostamento / faixa de domínio', nome: 'Vegetação alta', nao_atendimento: '3.1.6 Ausência total de vegetação rasteira com comprimento superior a 40,0 cm em toda a extensão da faixa de domínio.', prazo_dias_padrao: 15 },
    { frente: 'RECUPERAÇÃO E MANUTENÇÃO', item_contrato: '3.1.8 Sistemas Elétricos e de Iluminação', descricao: 'Iluminação com defeito ou ausente', nome: 'Iluminação com defeito', nao_atendimento: null, prazo_dias_padrao: null },
    { frente: 'MELHORIAS OPERACIONAIS, DE AMPLIAÇÃO DE CAPACIDADE E DE MANUTENÇÃO DO NÍVEL DE SERVIÇO', item_contrato: 'Melhorias Gerais', descricao: 'Melhoria operacional identificada', nome: 'Melhoria operacional', nao_atendimento: null, prazo_dias_padrao: null },
    { frente: 'CONSERVAÇÃO', item_contrato: 'Conservação Geral', descricao: 'Ponto de conservação', nome: 'Conservação geral', nao_atendimento: null, prazo_dias_padrao: null },
    { frente: 'SERVIÇOS OPERACIONAIS', item_contrato: '3.4.5.1 Atendimento Médico de Emergência', descricao: 'Ausência de ambulância / serviço médico', nome: 'Ausência de ambulância', nao_atendimento: '3.4.5.1. Disponibilização de serviço de atendimento médico de emergência 24:00 horas por dia, inclusive sábados, domingos e feriados.', prazo_dias_padrao: 1 },
];

const BASE_STEPS = ['fotos', 'frente', 'per', 'descricao', 'tipo', 'sentido', 'observacao'];

function RadioCard({ label, selected, onSelect }) {
    return (
        <button
            type="button"
            onClick={onSelect}
            className={`w-full text-left rounded-2xl border px-4 py-4 transition-all flex items-center gap-3 ${
                selected
                    ? 'bg-[#3d3d3d] text-white border-[#3d3d3d] shadow-md'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400 active:bg-gray-50'
            }`}
        >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                selected ? 'border-white' : 'border-gray-400'
            }`}>
                {selected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
            </div>
            <span className="text-sm font-medium leading-snug">{label}</span>
        </button>
    );
}

export default function VistoriarOcorrenciaDTR() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const loc = useLocation();
    const searchParams = new URLSearchParams(loc.search);
    const fiscId = searchParams.get('fiscId');
    const occurrenceId = searchParams.get('id');

    const [stepIdx, setStepIdx] = useState(0);
    const [fotos, setFotos] = useState([]);
    const [fotosDirty, setFotosDirty] = useState(false);
    const fotosCarregadasRef = useRef(null);
    const [selectedFrente, setSelectedFrente] = useState('');
    const [selectedPer, setSelectedPer] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    const [tipoRegistro, setTipoRegistro] = useState('');
    const [etapaObra, setEtapaObra] = useState('');
    const [sentido, setSentido] = useState('');
    const [observacao, setObservacao] = useState('');
    const [km, setKm] = useState('');
    const [trecho, setTrecho] = useState('');
    const [rodoviaSnapped, setRodoviaSnapped] = useState('');
    const [kmPoints, setKmPoints] = useState(null);
    const [kmlSegments, setKmlSegments] = useState([]);
    const [kmDataLoaded, setKmDataLoaded] = useState(false);
    const [location, setLocation] = useState(null);
    const [gettingLocation, setGettingLocation] = useState(false);
    const { data: fisc } = useQuery({
        queryKey: ['fiscalizacao', fiscId],
        queryFn: () => Repository.getFiscalizacaoById(fiscId),
        enabled: !!fiscId
    });

    // Carrega referências KM — 100% local (Dexie): km_points já vem sincronizado
    // no registro do contrato pelo syncEngine normal, sem precisar de rede aqui.
    // kmDataLoaded vira true assim que essa consulta local termina, então nunca
    // trava a liberação da câmera esperando internet.
    // O download do KML por rede é só um fallback legado (contratos antigos sem
    // km_points sincronizado) e roda em segundo plano, sem bloquear nada.
    useEffect(() => {
        if (!fisc) return;
        if (!fisc.rodovia) { setKmDataLoaded(true); return; }
        Repository.getKmPointsForRodovia(fisc.rodovia).then(pts => {
            if (pts && pts.length > 0) { setKmPoints(pts); return; }
            Repository.downloadKMLForRodovia(fisc.rodovia).then(kmlText => {
                if (!kmlText) return;
                const kmlPts = parseKMLKmPoints(kmlText);
                if (kmlPts && kmlPts.length > 0) { setKmPoints(kmlPts); return; }
                const segs = parseKMLSegments(kmlText);
                if (segs.length > 0) setKmlSegments(segs);
            }).catch(() => {});
        }).catch(() => {}).finally(() => setKmDataLoaded(true));
    }, [fisc]);

    const fiscRodovia = fisc?.rodovia ?? null;
    const { data: tiposDB = [] } = useQuery({
        queryKey: ['tipos_ocorrencia_dtr', fiscRodovia],
        queryFn: () => Repository.listTiposOcorrenciaDTR(fiscRodovia),
        staleTime: 5 * 60 * 1000
    });
    const tipos = tiposDB.length > 0 ? tiposDB : TIPOS_FALLBACK;

    const { data: ocorrencia } = useQuery({
        queryKey: ['unidade', occurrenceId],
        queryFn: () => Repository.getUnidadeById(occurrenceId),
        enabled: !!occurrenceId
    });

    const frentes = [...new Set(tipos.map(t => t.frente).filter(Boolean))];
    const pers = [...new Set(
        tipos.filter(t => t.frente === selectedFrente).map(t => t.item_contrato).filter(Boolean)
    )];
    // Deduplica por descricao: mesma descrição pode existir para rodovias diferentes na planilha.
    // Prefere a versão com rodovia específica sobre a genérica (rodovia null).
    const itemsForPer = useMemo(() => {
        const all = tipos.filter(
            t => t.frente === selectedFrente && t.item_contrato === selectedPer
        );
        const byDesc = new Map();
        for (const item of all) {
            const key = (item.descricao || item.nome || '').trim();
            if (!key) continue;
            const existing = byDesc.get(key);
            if (!existing || (item.rodovia && !existing.rodovia)) {
                byDesc.set(key, item);
            }
        }
        return [...byDesc.values()];
    }, [tipos, selectedFrente, selectedPer]);

    // Steps dinâmicos: insere 'etapa_obra' entre 'descricao' e 'tipo' quando o item tem etapas
    const activeSteps = useMemo(() => {
        const s = ['fotos', 'frente', 'per', 'descricao'];
        if (selectedItem?.etapas_obra?.trim()) s.push('etapa_obra');
        s.push('tipo', 'sentido', 'observacao');
        return s;
    }, [selectedItem?.etapas_obra]);

    // Opções de etapa separadas por \n
    const etapaOptions = useMemo(() => {
        if (!selectedItem?.etapas_obra?.trim()) return [];
        return selectedItem.etapas_obra.split('\n').map(e => e.trim()).filter(Boolean);
    }, [selectedItem?.etapas_obra]);

    // GPS on mount for new occurrences — só roda depois que kmDataLoaded confirma que
    // kmPoints/kmlSegments já terminaram de carregar (ou que não há dados a carregar),
    // para nunca resolver o KM com base num fallback incompleto.
    useEffect(() => {
        if (!fisc || occurrenceId || !kmDataLoaded) return;
        setGettingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                setLocation({ lat, lng });
                if (kmPoints && kmPoints.length > 0) {
                    const nearest = findNearestKmPoint(kmPoints, lat, lng);
                    setKm(nearest?.km || '');
                    setRodoviaSnapped(nearest?.rodovia || fisc.rodovia || '');
                } else if (kmlSegments.length > 0) {
                    const snapped = snapToNearestKMLSegment(lat, lng, kmlSegments);
                    setKm(snapped.km);
                    setRodoviaSnapped(snapped.rodovia || fisc.rodovia || '');
                } else {
                    const snapped = snapToHighway(lat, lng, fisc.rodovia);
                    setKm(snapped.km);
                    setTrecho(snapped.trecho);
                    setRodoviaSnapped(fisc.rodovia || '');
                }
                setGettingLocation(false);
            },
            () => setGettingLocation(false),
            { enableHighAccuracy: true, timeout: 10000 }
        );
    }, [fisc, occurrenceId, kmDataLoaded]);

    // Edit mode: pre-populate state and jump to last step
    useEffect(() => {
        if (!occurrenceId || !ocorrencia) return;
        const frente = ocorrencia.frente || '';
        const per = ocorrencia.per || '';
        setSelectedFrente(frente);
        setSelectedPer(per);
        const match = tipos.find(t =>
            t.frente === frente &&
            t.item_contrato === per &&
            (t.descricao || t.nome) === (ocorrencia.nome_unidade || '')
        );
        setSelectedItem(match || null);
        const tr = ocorrencia.tipo_ocorrencia;
        setTipoRegistro(tr === 'nc' || tr === 'constatacao' ? tr : '');
        setSentido(ocorrencia.sentido || '');
        setObservacao(ocorrencia.endereco || '');
        setKm(ocorrencia.km || '');
        setTrecho(ocorrencia.trecho || '');
        setRodoviaSnapped(ocorrencia.rodovia || fisc?.rodovia || '');
        if (ocorrencia.latitude && ocorrencia.longitude) {
            setLocation({ lat: ocorrencia.latitude, lng: ocorrencia.longitude });
        }
        setStepIdx(BASE_STEPS.length - 1);
    }, [occurrenceId, ocorrencia]);

    // Load photos in edit mode
    useEffect(() => {
        if (!occurrenceId) return;
        if (fotosCarregadasRef.current === occurrenceId) return;
        const isLocalUrl = (u) => /^blob:|^data:|^file:|^capacitor:/i.test(String(u || ''));
        (async () => {
            try {
                const remotas = (Array.isArray(ocorrencia?.fotos_unidade) ? ocorrencia.fotos_unidade : [])
                    .map(f => typeof f === 'string' ? { url: f } : f)
                    .filter(f => f && f.url && !isLocalUrl(f.url));
                const locais = await Repository.listLocalFotos(occurrenceId).then(list =>
                    list.map(f => ({ localId: f.localId, url: f.url || '', legenda: f.legenda || '', mimeType: f.mimeType, width: f.width, height: f.height }))
                );
                const merged = [];
                const seen = new Set();
                const add = (f) => {
                    const key = f.localId || f.path || f.url || '';
                    if (key && seen.has(key)) return;
                    if (key) seen.add(key);
                    merged.push(f);
                };
                remotas.forEach(add);
                locais.forEach(add);
                setFotos(merged);
                fotosCarregadasRef.current = occurrenceId;
                setFotosDirty(false);
            } catch (err) {
                console.error('[Fotos DTR]', err);
            }
        })();
    }, [occurrenceId, ocorrencia, fotosDirty]);

    const salvarMutation = useMutation({
        mutationFn: async () => {
            const targetId = occurrenceId;
            let uId = targetId || '';
            const descricaoItem = selectedItem?.descricao || selectedItem?.nome || '';
            const payload = {
                nome_unidade: descricaoItem,
                endereco: observacao,
                latitude: location?.lat ?? null,
                longitude: location?.lng ?? null,
                rodovia: rodoviaSnapped || fisc?.rodovia || '',
                trecho: trecho,
                km: km,
                sentido: sentido || null,
                tipo_ocorrencia: tipoRegistro,
                frente: selectedFrente,
                per: selectedPer,
                nao_atendimento: tipoRegistro === 'nc' ? (selectedItem?.nao_atendimento || '') : null,
                prazo_dias_nc: tipoRegistro === 'nc' ? (selectedItem?.prazo_dias_padrao || null) : null,
                status: 'finalizada'
            };
            if (targetId) {
                await Repository.updateUnidadeDTR(targetId, payload);
            } else {
                const res = await Repository.createUnidade({ fiscalizacao_id: fiscId, tipo_unidade_id: null, ...payload });
                uId = res.id;
                await Repository.reassignLocalFotos('novo-ponto', uId);
            }
            const fotosCompletas = fotos.map(f => typeof f === 'string'
                ? { url: f, legenda: '', mimeType: undefined, width: undefined, height: undefined }
                : { url: f.url, bucket: f.bucket, path: f.path, legenda: f.legenda || '', mimeType: f.mimeType, width: f.width, height: f.height, localId: f.localId }
            );
            await Repository.updateUnidadeFotos(uId, fotosCompletas);
            return uId;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['unidades', fiscId] });
            queryClient.invalidateQueries({ queryKey: ['unidade', occurrenceId] });
            navigate(createPageUrl('ExecutarFiscalizacaoDTR') + `?id=${fiscId}`);
        },
        onError: (err) => alert(err.message || 'Falha ao salvar ocorrência.')
    });

    // Só libera a captura depois que o KM foi resolvido (ou definitivamente falhou),
    // para nunca gravar a foto com um KM ainda não determinado / impreciso.
    const kmReady = !!occurrenceId || (kmDataLoaded && !gettingLocation);

    const currentStep = activeSteps[stepIdx];
    const isLastStep = stepIdx === activeSteps.length - 1;

    const goBack = () => {
        if (stepIdx === 0) {
            if (fotos.length > 0 && !occurrenceId) {
                if (!confirm('Sair agora? As fotos podem ser perdidas.')) return;
            }
            navigate(createPageUrl('ExecutarFiscalizacaoDTR') + `?id=${fiscId}`);
        } else {
            setStepIdx(s => s - 1);
        }
    };
    const goNext = () => setStepIdx(s => s + 1);

    // Auto-avança após selecionar uma opção (com delay para mostrar feedback visual)
    const selectAndAdvance = (setFn, value) => {
        setFn(value);
        if (!isLastStep) setTimeout(goNext, 200);
    };

    const canProceed = {
        fotos: true,
        frente: !!selectedFrente,
        per: !!selectedPer,
        descricao: !!selectedItem,
        etapa_obra: !!etapaObra,
        tipo: !!tipoRegistro,
        sentido: !!sentido,
        observacao: true,
    }[currentStep] ?? true;

    const addFoto = (f) => { setFotos(p => [...p, f]); setFotosDirty(true); };
    const removeFoto = (i) => {
        setFotos(p => {
            const alvo = p[i];
            if (alvo?.localId) Repository.deleteLocalFoto(alvo.localId).catch(() => {});
            return p.filter((_, j) => j !== i);
        });
        setFotosDirty(true);
    };
    const updateLegenda = (i, leg) => {
        setFotos(p => {
            const n = [...p];
            const a = n[i];
            n[i] = typeof a === 'string' ? { url: a, legenda: leg } : { ...a, legenda: leg };
            if (a?.localId) Repository.updateLocalFotoLegenda(a.localId, leg).catch(() => {});
            return n;
        });
        setFotosDirty(true);
    };

    const stepLabel = {
        fotos: 'Fotos',
        frente: 'Frentes da Concessão',
        per: `Frente: ${selectedFrente}`,
        descricao: selectedPer || 'Item',
        etapa_obra: 'Etapa da Obra',
        tipo: 'Tipo',
        sentido: 'Sentido',
        observacao: 'Observação'
    }[currentStep] || '';

    const Header = () => (
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-950 text-white shadow-md sticky top-0 z-10">
            <div className="max-w-md mx-auto px-4 py-4">
                <div className="flex items-center gap-3">
                    {/* Voltar */}
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full flex-shrink-0" onClick={goBack}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>

                    {/* Barra de progresso + label */}
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider truncate">
                            {stepIdx + 1}. {stepLabel}
                        </p>
                        <div className="flex gap-0.5 mt-1.5">
                            {activeSteps.map((_, i) => (
                                <div key={i} className={`h-0.5 flex-1 rounded-full transition-colors ${i <= stepIdx ? 'bg-white' : 'bg-white/20'}`} />
                            ))}
                        </div>
                    </div>

                    {/* Avançar (mostrado em todos exceto no último passo) */}
                    {!isLastStep ? (
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`rounded-full flex-shrink-0 transition-colors ${canProceed ? 'text-white hover:bg-white/10' : 'text-white/20 cursor-not-allowed'}`}
                            onClick={canProceed ? goNext : undefined}
                            disabled={!canProceed}
                        >
                            <ArrowRight className="h-5 w-5" />
                        </Button>
                    ) : (
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3 rounded-lg flex-shrink-0"
                            onClick={() => salvarMutation.mutate()} disabled={salvarMutation.isPending}>
                            {salvarMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-1" /> Salvar</>}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );

    // ─── FOTOS ───────────────────────────────────────────────────────────────────
    if (currentStep === 'fotos') return (
        <div className="min-h-screen bg-[#e8eaed] flex flex-col">
            <Header />
            <div className="flex-1 max-w-md w-full mx-auto px-4 py-6">
                <h2 className="text-sm font-bold text-gray-600 mb-4 uppercase tracking-wide">{stepIdx + 1}. FOTOS</h2>
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3">
                    <PhotoGrid
                        fotos={fotos} minFotos={1} bigButton={fotos.length === 0}
                        titulo={fotos.length > 0 ? 'Evidências Fotográficas' : ''}
                        onAddFoto={addFoto} onRemoveFoto={removeFoto}
                        onUpdateLegenda={updateLegenda}
                        onReorderFotos={(n) => { setFotos(n); setFotosDirty(true); }}
                        fiscalizacaoId={fiscId} unidadeId={occurrenceId || 'novo-ponto'} isEditable={true}
                        enableLegenda={false}
                        autoCapture={!occurrenceId && fotos.length === 0}
                        captureBlocked={!kmReady}
                        captureBlockedMessage="Localizando KM..."
                        watermarkContext={{ rodovia: rodoviaSnapped || fisc?.rodovia || '', km: km || '', sentido: sentido || '' }}
                    />
                </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-3">
                <Button className="w-full bg-gray-900 hover:bg-gray-700 text-white rounded-xl h-11" onClick={goNext}>
                    Próximo
                </Button>
            </div>
        </div>
    );

    // ─── FRENTE ──────────────────────────────────────────────────────────────────
    if (currentStep === 'frente') return (
        <div className="min-h-screen bg-[#e8eaed] flex flex-col">
            <Header />
            <div className="flex-1 max-w-md w-full mx-auto px-4 py-6 space-y-3">
                <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide">{stepIdx + 1}. FRENTES DA CONCESSÃO</h2>
                {frentes.map(f => (
                    <RadioCard key={f} label={f} selected={selectedFrente === f}
                        onSelect={() => selectAndAdvance((v) => { setSelectedFrente(v); setSelectedPer(''); setSelectedItem(null); }, f)} />
                ))}
            </div>
        </div>
    );

    // ─── PER ─────────────────────────────────────────────────────────────────────
    if (currentStep === 'per') return (
        <div className="min-h-screen bg-[#e8eaed] flex flex-col">
            <Header />
            <div className="flex-1 max-w-md w-full mx-auto px-4 py-6 space-y-3">
                <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide">{stepIdx + 1}. FRENTE DE {selectedFrente}</h2>
                {pers.map(p => (
                    <RadioCard key={p} label={p} selected={selectedPer === p}
                        onSelect={() => selectAndAdvance((v) => { setSelectedPer(v); setSelectedItem(null); }, p)} />
                ))}
            </div>
        </div>
    );

    // ─── DESCRIÇÃO / ITEM ────────────────────────────────────────────────────────
    if (currentStep === 'descricao') return (
        <div className="min-h-screen bg-[#e8eaed] flex flex-col">
            <Header />
            <div className="flex-1 max-w-md w-full mx-auto px-4 py-6 space-y-3">
                <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide">{stepIdx + 1}. {selectedPer.toUpperCase()}</h2>
                {itemsForPer.map((item, i) => {
                    const label = item.descricao || item.nome || `Item ${i + 1}`;
                    const isSel = selectedItem?.id === item.id;
                    return (
                        <RadioCard key={item.id || label} label={label} selected={isSel}
                            onSelect={() => {
                                setEtapaObra('');
                                setObservacao('');
                                selectAndAdvance(setSelectedItem, item);
                            }} />
                    );
                })}
            </div>
        </div>
    );

    // ─── ETAPA DA OBRA ───────────────────────────────────────────────────────────
    if (currentStep === 'etapa_obra') return (
        <div className="min-h-screen bg-[#e8eaed] flex flex-col">
            <Header />
            <div className="flex-1 max-w-md w-full mx-auto px-4 py-6 space-y-3">
                <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide">{stepIdx + 1}. ETAPA DA OBRA</h2>
                <p className="text-xs text-gray-500">{selectedItem?.descricao || selectedItem?.nome}</p>
                {etapaOptions.map(etapa => (
                    <RadioCard key={etapa} label={etapa} selected={etapaObra === etapa}
                        onSelect={() => {
                            setEtapaObra(etapa);
                            setObservacao(etapa);
                            if (!isLastStep) setTimeout(goNext, 200);
                        }} />
                ))}
            </div>
        </div>
    );

    // ─── TIPO ────────────────────────────────────────────────────────────────────
    if (currentStep === 'tipo') return (
        <div className="min-h-screen bg-[#e8eaed] flex flex-col">
            <Header />
            <div className="flex-1 max-w-md w-full mx-auto px-4 py-6 space-y-3">
                <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide">{stepIdx + 1}. TIPO</h2>
                <RadioCard label="Constatação" selected={tipoRegistro === 'constatacao'}
                    onSelect={() => selectAndAdvance(setTipoRegistro, 'constatacao')} />
                <RadioCard label="Não Conformidade" selected={tipoRegistro === 'nc'}
                    onSelect={() => selectAndAdvance(setTipoRegistro, 'nc')} />
                {tipoRegistro === 'nc' && selectedItem?.nao_atendimento && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-700 space-y-1">
                        <p className="font-semibold">Não Atendimento (PER):</p>
                        <p className="leading-relaxed">{selectedItem.nao_atendimento}</p>
                        {selectedItem.prazo_dias_padrao && (
                            <p className="font-semibold">Prazo: {selectedItem.prazo_dias_padrao} {selectedItem.prazo_dias_padrao === 1 ? 'dia' : 'dias'}</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    // ─── SENTIDO ─────────────────────────────────────────────────────────────────
    if (currentStep === 'sentido') return (
        <div className="min-h-screen bg-[#e8eaed] flex flex-col">
            <Header />
            <div className="flex-1 max-w-md w-full mx-auto px-4 py-6 space-y-3">
                <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide">{stepIdx + 1}. SENTIDO</h2>
                {(km || gettingLocation) && (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl px-3 py-2 text-xs text-blue-700 flex items-center gap-2">
                        <span className="font-semibold">{rodoviaSnapped || fisc?.rodovia || ''}</span>
                        {km
                            ? <span className="font-mono">KM {km}</span>
                            : <span className="text-blue-400">Obtendo localização...</span>
                        }
                        {gettingLocation && <Loader2 className="h-3 w-3 animate-spin ml-auto" />}
                    </div>
                )}
                {['N', 'S', 'N/S'].map(s => (
                    <RadioCard key={s} label={s} selected={sentido === s}
                        onSelect={() => selectAndAdvance(setSentido, s)} />
                ))}
            </div>
        </div>
    );

    // ─── OBSERVAÇÃO (passo final) ─────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-[#e8eaed] flex flex-col">
            <Header />
            <div className="flex-1 max-w-md w-full mx-auto px-4 py-6 space-y-4">
                <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide">{stepIdx + 1}. OBSERVAÇÃO</h2>

                {/* Resumo do registro */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-2">
                    {[
                        ['Frente', selectedFrente || '—'],
                        ['PER', selectedPer || '—'],
                        ['Item', selectedItem?.descricao || selectedItem?.nome || '—'],
                        etapaObra ? ['Etapa', etapaObra] : null,
                        ['Tipo', tipoRegistro === 'nc' ? 'Não Conformidade' : 'Constatação'],
                        ['KM', km || (gettingLocation ? 'Obtendo...' : '—')],
                        ['Sentido', sentido || '—'],
                        ['Rodovia', rodoviaSnapped || fisc?.rodovia || '—'],
                    ].filter(Boolean).map(([label, value]) => (
                        <div key={label} className="flex gap-2 text-xs">
                            <span className="text-gray-400 font-semibold w-16 flex-shrink-0">{label}</span>
                            <span className={`text-gray-700 ${label === 'Tipo' && tipoRegistro === 'nc' ? 'text-rose-600 font-bold' : ''}`}>
                                {value}
                            </span>
                        </div>
                    ))}
                </div>

                <Textarea
                    value={observacao}
                    onChange={e => setObservacao(e.target.value)}
                    placeholder="Observações..."
                    className="bg-white border-gray-200 text-gray-800 text-sm min-h-[120px] rounded-2xl resize-none"
                />
            </div>

            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-3">
                <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-11"
                    onClick={() => salvarMutation.mutate()}
                    disabled={salvarMutation.isPending}
                >
                    {salvarMutation.isPending
                        ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Salvando...</>
                        : <><Save className="h-4 w-4 mr-2" /> Salvar Ocorrência</>
                    }
                </Button>
            </div>
        </div>
    );
}
