import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Repository } from '@/lib/offline/repository';
import { snapToHighway } from '@/utils/rodoviasGeoJSON';
import PhotoGrid from '@/components/fiscalizacao/PhotoGrid';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import {
    ArrowLeft, Loader2, Save, AlertCircle, FileText,
    AlertTriangle, ChevronRight, Check
} from 'lucide-react';

const TIPOS_OCORRENCIA_FALLBACK = [
    { nome: 'Buraco / Panela na pista',                       gera_nc: true,  item_contrato: '3.1.1 Pavimento',                                           nao_atendimento: null, prazo_dias_padrao: 3  },
    { nome: 'Afundamento de trilha de roda',                  gera_nc: true,  item_contrato: '3.1.1 Pavimento',                                           nao_atendimento: null, prazo_dias_padrao: 15 },
    { nome: 'Trincas no pavimento (FC-2 / FC-3)',             gera_nc: false, item_contrato: '3.1.1 Pavimento',                                           nao_atendimento: null, prazo_dias_padrao: null },
    { nome: 'Vegetação alta no acostamento / faixa de domínio', gera_nc: true, item_contrato: '3.1.6 Canteiro Central e Faixa de Domínio',               nao_atendimento: '3.1.6 Ausência total de vegetação rasteira com comprimento superior a 40,0 cm em toda a extensão da faixa de domínio.', prazo_dias_padrao: 15 },
    { nome: 'Sinalização vertical danificada ou ausente',     gera_nc: true,  item_contrato: '3.1.2 Sinalização e Elementos de Proteção e Segurança',    nao_atendimento: null, prazo_dias_padrao: 3  },
    { nome: 'Sinalização horizontal apagada ou desgastada',   gera_nc: true,  item_contrato: '3.1.2 Sinalização e Elementos de Proteção e Segurança',    nao_atendimento: null, prazo_dias_padrao: 15 },
    { nome: 'Defensa metálica danificada ou ausente',         gera_nc: true,  item_contrato: '3.1.2 Sinalização e Elementos de Proteção e Segurança',    nao_atendimento: null, prazo_dias_padrao: 7  },
    { nome: 'Drenagem obstruída ou assoreada',                gera_nc: true,  item_contrato: '3.1.4 Sistema de Drenagem e Obras de Arte Correntes',      nao_atendimento: null, prazo_dias_padrao: 15 },
    { nome: 'Ausência de ambulância / serviço médico',        gera_nc: true,  item_contrato: '3.4.5.1 Atendimento Médico de Emergência',                 nao_atendimento: '3.4.5.1. Disponibilização de serviço de atendimento médico de emergência 24:00 horas por dia, inclusive sábados, domingos e feriados.', prazo_dias_padrao: 1 },
    { nome: 'Outro',                                          gera_nc: false, item_contrato: null,                                                        nao_atendimento: null, prazo_dias_padrao: null },
];

const GRAVIDADES = [
    { value: 'leve',       label: 'Leve (Monitoramento)' },
    { value: 'media',      label: 'Média (Atenção)' },
    { value: 'grave',      label: 'Grave (Urgente)' },
    { value: 'gravissima', label: 'Gravíssima (Crítico / Risco de Vida)' }
];

export default function VistoriarOcorrenciaDTR() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const loc = useLocation();
    const searchParams = new URLSearchParams(loc.search);
    const fiscId = searchParams.get('fiscId');
    const occurrenceId = searchParams.get('id');

    // 'main' = formulário principal | 'select-type' = tela de seleção de tipo
    const [step, setStep] = useState('main');

    const [location, setLocation] = useState(null);
    const [gettingLocation, setGettingLocation] = useState(false);

    const [formData, setFormData] = useState({
        rodovia: '',
        trecho: '',
        km: '',
        sentido: '',
        tipo_ocorrencia: '',
        gravidade: 'media',
        observacao: ''
    });

    const [requerDeterminacao, setRequerDeterminacao] = useState(false);
    const [textoDeterminacao, setTextoDeterminacao] = useState('');
    const [prazoDeterminacao, setPrazoDeterminacao] = useState('30');

    const [fotos, setFotos] = useState([]);
    const [fotosDirty, setFotosDirty] = useState(false);
    const fotosCarregadasRef = useRef(null);

    // Tipos de ocorrência (banco ou fallback)
    const { data: tiposDB = [] } = useQuery({
        queryKey: ['tipos_ocorrencia_dtr'],
        queryFn: () => Repository.listTiposOcorrenciaDTR(),
        staleTime: 5 * 60 * 1000
    });
    const tiposOcorrencia = tiposDB.length > 0 ? tiposDB : TIPOS_OCORRENCIA_FALLBACK;
    const tipoSelecionado = tiposOcorrencia.find(t => t.nome === formData.tipo_ocorrencia) ?? null;

    // Fiscalização
    const { data: fisc } = useQuery({
        queryKey: ['fiscalizacao', fiscId],
        queryFn: async () => await Repository.getFiscalizacaoById(fiscId),
        enabled: !!fiscId
    });

    // Ocorrência (edição)
    const { data: ocorrencia } = useQuery({
        queryKey: ['unidade', occurrenceId],
        queryFn: async () => await Repository.getUnidadeById(occurrenceId),
        enabled: !!occurrenceId
    });

    // Determinações existentes
    const { data: determinacoes = [] } = useQuery({
        queryKey: ['determinacoes', occurrenceId],
        queryFn: async () => await Repository.listDeterminacoesByUnidade(occurrenceId),
        enabled: !!occurrenceId
    });

    // Preencher form na edição / inicializar GPS
    useEffect(() => {
        if (occurrenceId && ocorrencia) {
            setFormData({
                rodovia: ocorrencia.rodovia || fisc?.rodovia || '',
                trecho: ocorrencia.trecho || '',
                km: ocorrencia.km || '',
                sentido: ocorrencia.sentido || '',
                tipo_ocorrencia: ocorrencia.tipo_ocorrencia || ocorrencia.nome_unidade || '',
                gravidade: ocorrencia.gravidade || 'media',
                observacao: ocorrencia.endereco || ''
            });
            if (ocorrencia.latitude && ocorrencia.longitude) {
                setLocation({ lat: ocorrencia.latitude, lng: ocorrencia.longitude });
            }
            const det = determinacoes.find(d => d.origem === 'dtr_determination');
            if (det) {
                setRequerDeterminacao(true);
                setTextoDeterminacao(det.descricao || '');
                setPrazoDeterminacao(String(det.prazo_dias || '30'));
            }
        } else if (fisc && !occurrenceId) {
            setFormData(prev => ({ ...prev, rodovia: fisc.rodovia || '' }));
            setGettingLocation(true);
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;
                    setLocation({ lat, lng });
                    const snapped = snapToHighway(lat, lng, fisc.rodovia);
                    setFormData(prev => ({ ...prev, km: snapped.km, trecho: snapped.trecho }));
                    setGettingLocation(false);
                },
                () => setGettingLocation(false),
                { enableHighAccuracy: true, timeout: 10000 }
            );
        }
    }, [occurrenceId, ocorrencia, fisc, determinacoes]);

    // Carregar fotos na edição
    useEffect(() => {
        if (!occurrenceId) return;
        if (fotosCarregadasRef.current === occurrenceId) return;

        const isLocalUrl = (u) => /^blob:|^data:|^file:|^capacitor:/i.test(String(u || ''));
        const carregarFotos = async () => {
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
        };
        carregarFotos();
    }, [occurrenceId, ocorrencia, fotosDirty]);

    // Salvar ocorrência
    const salvarMutation = useMutation({
        mutationFn: async () => {
            let uId = occurrenceId;
            const unitPayload = {
                fiscalizacao_id: fiscId,
                tipo_unidade_id: null,
                tipo_unidade_name: 'Ocorrência',
                nome_unidade: formData.tipo_ocorrencia,
                codigo_unidade: '',
                endereco: formData.observacao,
                latitude: location?.lat ?? null,
                longitude: location?.lng ?? null,
                rodovia: formData.rodovia,
                trecho: formData.trecho,
                km: formData.km,
                sentido: formData.sentido || null,
                tipo_ocorrencia: formData.tipo_ocorrencia,
                gravidade: formData.gravidade,
                status: 'finalizada'
            };
            if (occurrenceId) {
                await Repository.updateUnidadeDTR(occurrenceId, unitPayload);
            } else {
                const res = await Repository.createUnidade(unitPayload);
                uId = res.id;
            }
            const fotosCompletas = fotos.map(f => typeof f === 'string'
                ? { url: f, legenda: '', mimeType: undefined, width: undefined, height: undefined }
                : { url: f.url, bucket: f.bucket, path: f.path, legenda: f.legenda || '', mimeType: f.mimeType, width: f.width, height: f.height, localId: f.localId }
            );
            await Repository.updateUnidadeFotos(uId, fotosCompletas);
            if (requerDeterminacao && textoDeterminacao.trim()) {
                await Repository.upsertDeterminacaoByOrigem(uId, 'dtr_determination', textoDeterminacao, parseInt(prazoDeterminacao, 10));
            } else {
                await Repository.upsertDeterminacaoByOrigem(uId, 'dtr_determination', null);
            }
            return uId;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['unidades', fiscId] });
            queryClient.invalidateQueries({ queryKey: ['unidade', occurrenceId] });
            setFotosDirty(false);
            navigate(createPageUrl('ExecutarFiscalizacaoDTR') + `?id=${fiscId}`);
        },
        onError: (err) => alert(err.message || 'Falha ao salvar ocorrência.')
    });

    const handleAddFoto = (fotoData) => {
        setFotos(prev => [...prev, fotoData]);
        setFotosDirty(true);
        // Abre seleção de tipo automaticamente se ainda não escolheu
        if (!formData.tipo_ocorrencia) {
            setStep('select-type');
        }
    };

    const handleRemoveFoto = (index) => {
        setFotos(prev => {
            const alvo = prev[index];
            if (alvo?.localId) Repository.deleteLocalFoto(alvo.localId).catch(() => {});
            return prev.filter((_, i) => i !== index);
        });
        setFotosDirty(true);
    };

    const handleUpdateLegenda = (index, legenda) => {
        setFotos(prev => {
            const next = [...prev];
            const alvo = next[index];
            if (!alvo) return prev;
            next[index] = typeof alvo === 'string' ? { url: alvo, legenda } : { ...alvo, legenda };
            if (alvo?.localId) Repository.updateLocalFotoLegenda(alvo.localId, legenda).catch(() => {});
            return next;
        });
        setFotosDirty(true);
    };

    const handleReorderFotos = (next) => { setFotos(next); setFotosDirty(true); };

    const isEditable = true;

    // ─── Tela de seleção de tipo ────────────────────────────────────────────────
    if (step === 'select-type') {
        return (
            <div className="min-h-screen bg-white flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-950 text-white shadow-md sticky top-0 z-10">
                    <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-white hover:bg-white/10 rounded-full"
                            onClick={() => setStep('main')}
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-sm font-bold">Tipo de Ocorrência</h1>
                            <p className="text-indigo-200 text-[10px]">Selecione o que foi constatado</p>
                        </div>
                    </div>
                </div>

                {/* Lista de tipos */}
                <div className="flex-1 overflow-y-auto max-w-md w-full mx-auto divide-y divide-gray-100">
                    {tiposOcorrencia.map(t => (
                        <button
                            key={t.nome}
                            type="button"
                            onClick={() => {
                                setFormData(prev => ({ ...prev, tipo_ocorrencia: t.nome }));
                                if (t.gera_nc && t.prazo_dias_padrao) {
                                    setPrazoDeterminacao(String(t.prazo_dias_padrao));
                                }
                                setStep('main');
                            }}
                            className={`w-full text-left px-4 py-4 hover:bg-blue-50 active:bg-blue-100 transition-colors flex items-center gap-3 ${formData.tipo_ocorrencia === t.nome ? 'bg-indigo-50' : ''}`}
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-semibold text-gray-800">{t.nome}</span>
                                    {t.gera_nc && (
                                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200 flex-shrink-0">NC</span>
                                    )}
                                </div>
                                {t.item_contrato && (
                                    <p className="text-[11px] text-indigo-500 mt-0.5 truncate">{t.item_contrato}</p>
                                )}
                            </div>
                            {formData.tipo_ocorrencia === t.nome
                                ? <Check className="h-5 w-5 text-indigo-600 flex-shrink-0" />
                                : <ChevronRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
                            }
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    // ─── Formulário principal ────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-950 text-white shadow-md">
                <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link to={createPageUrl('ExecutarFiscalizacaoDTR') + `?id=${fiscId}`}>
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-sm font-bold">
                                {occurrenceId ? 'Editar Ocorrência' : 'Nova Ocorrência'}
                            </h1>
                            <p className="text-indigo-200 text-[10px]">
                                {formData.rodovia || 'DTR — Fiscalização de Rodovias'}
                            </p>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3 rounded-lg"
                        onClick={() => salvarMutation.mutate()}
                        disabled={salvarMutation.isPending}
                    >
                        {salvarMutation.isPending
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : <><Save className="h-4 w-4 mr-1" /> Salvar</>
                        }
                    </Button>
                </div>
            </div>

            {/* Body */}
            <div className="flex-1 max-w-md w-full mx-auto px-4 py-4 space-y-3 overflow-y-auto">

                {/* KM / Sentido / Trecho */}
                <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                        <Label className="text-xs text-gray-500 font-semibold">KM</Label>
                        <Input
                            value={formData.km}
                            onChange={e => setFormData(p => ({ ...p, km: e.target.value }))}
                            placeholder="142.5"
                            className="h-9 rounded-xl bg-white border-gray-200 font-mono text-sm"
                        />
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-gray-500 font-semibold">Sentido</Label>
                        <Select
                            value={formData.sentido}
                            onValueChange={val => setFormData(p => ({ ...p, sentido: val }))}
                        >
                            <SelectTrigger className="h-9 rounded-xl bg-white border-gray-200 text-gray-800 text-xs">
                                <SelectValue placeholder="—" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-gray-200 text-gray-800">
                                <SelectItem value="N">N (Norte / Crescente)</SelectItem>
                                <SelectItem value="S">S (Sul / Decrescente)</SelectItem>
                                <SelectItem value="N/S">N/S (Ambos)</SelectItem>
                                <SelectItem value="L">L (Leste)</SelectItem>
                                <SelectItem value="O">O (Oeste)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label className="text-xs text-gray-500 font-semibold">Trecho</Label>
                        <Input
                            value={formData.trecho}
                            onChange={e => setFormData(p => ({ ...p, trecho: e.target.value }))}
                            placeholder="Trecho"
                            className="h-9 rounded-xl bg-white border-gray-200 text-xs"
                        />
                    </div>
                </div>

                {/* Foto */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-3">
                    <PhotoGrid
                        fotos={fotos}
                        minFotos={1}
                        bigButton={true}
                        titulo={fotos.length > 0 ? 'Evidências Fotográficas' : ''}
                        onAddFoto={handleAddFoto}
                        onRemoveFoto={handleRemoveFoto}
                        onUpdateLegenda={handleUpdateLegenda}
                        onReorderFotos={handleReorderFotos}
                        fiscalizacaoId={fiscId}
                        unidadeId={occurrenceId || 'novo-ponto'}
                        isEditable={isEditable}
                    />
                </div>

                {/* Tipo de ocorrência — botão que abre a tela de seleção */}
                <button
                    type="button"
                    onClick={() => setStep('select-type')}
                    className={`w-full text-left rounded-2xl border shadow-sm px-4 py-3 transition-colors ${
                        formData.tipo_ocorrencia
                            ? 'bg-white border-indigo-200 hover:bg-indigo-50'
                            : 'bg-white border-dashed border-2 border-indigo-200 hover:bg-indigo-50'
                    }`}
                >
                    {formData.tipo_ocorrencia ? (
                        <div className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wide mb-0.5">Tipo de Ocorrência</p>
                                <p className="text-sm font-bold text-gray-800">{formData.tipo_ocorrencia}</p>
                                {tipoSelecionado?.item_contrato && (
                                    <p className="text-[11px] text-indigo-400 mt-0.5 truncate">{tipoSelecionado.item_contrato}</p>
                                )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                {tipoSelecionado?.gera_nc && (
                                    <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">NC</span>
                                )}
                                <ChevronRight className="h-4 w-4 text-gray-300" />
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-between gap-2 py-1">
                            <div>
                                <p className="text-sm font-semibold text-indigo-500">Selecionar Tipo de Ocorrência</p>
                                <p className="text-xs text-indigo-300 mt-0.5">Toque para escolher na lista</p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-indigo-300 flex-shrink-0" />
                        </div>
                    )}
                </button>

                {/* Alertas do tipo selecionado */}
                {tipoSelecionado?.gera_nc && (
                    <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2.5 text-xs text-rose-600">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                        <span className="font-semibold">Este tipo gera Não Conformidade automática.</span>
                    </div>
                )}
                {tipoSelecionado?.nao_atendimento && (
                    <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 text-xs text-amber-700">
                        <div className="flex items-start gap-1.5">
                            <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                            <div>
                                <span className="font-semibold text-amber-800 block mb-0.5">Não Atendimento (PER):</span>
                                <span className="leading-relaxed">{tipoSelecionado.nao_atendimento}</span>
                            </div>
                        </div>
                    </div>
                )}
                {tipoSelecionado?.prazo_dias_padrao && (
                    <p className="text-[10px] text-gray-400 pl-1">
                        Prazo padrão para NC: <span className="font-bold text-gray-500">{tipoSelecionado.prazo_dias_padrao} {tipoSelecionado.prazo_dias_padrao === 1 ? 'dia' : 'dias'}</span>
                    </p>
                )}

                {/* Observações + Gravidade */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-gray-600">Observações</Label>
                        <Textarea
                            value={formData.observacao}
                            onChange={e => setFormData(p => ({ ...p, observacao: e.target.value }))}
                            placeholder="Descreva as condições encontradas..."
                            className="bg-white border-gray-200 text-gray-800 text-xs min-h-[72px] rounded-xl"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-gray-600">Gravidade / Risco</Label>
                        <Select
                            value={formData.gravidade}
                            onValueChange={val => setFormData(p => ({ ...p, gravidade: val }))}
                        >
                            <SelectTrigger className="bg-white border-gray-200 text-gray-800 text-sm h-10 rounded-xl">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-gray-200 text-gray-800">
                                {GRAVIDADES.map(g => (
                                    <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Determinação */}
                <Card className="bg-white border border-gray-200 shadow-sm rounded-2xl">
                    <CardContent className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-semibold text-gray-800 flex items-center gap-1.5">
                                    <FileText className="h-4 w-4 text-indigo-500" /> Requer Determinação?
                                </Label>
                                <p className="text-[10px] text-gray-400">Notificar concessionária para reparo.</p>
                            </div>
                            <Switch
                                checked={requerDeterminacao}
                                onCheckedChange={(val) => {
                                    setRequerDeterminacao(val);
                                    if (val) {
                                        if (!textoDeterminacao) {
                                            setTextoDeterminacao(`Sanar a ocorrência de ${formData.tipo_ocorrencia || 'irregularidade'} identificada no KM ${formData.km || ''}${formData.sentido ? `, sentido ${formData.sentido}` : ''}, na rodovia ${formData.rodovia || ''};`);
                                        }
                                        if (tipoSelecionado?.prazo_dias_padrao) {
                                            setPrazoDeterminacao(String(tipoSelecionado.prazo_dias_padrao));
                                        }
                                    }
                                }}
                            />
                        </div>

                        {requerDeterminacao && (
                            <div className="space-y-3 pt-2 border-t border-gray-100">
                                <div className="space-y-1">
                                    <Label className="text-xs text-gray-500 font-semibold">Texto da Determinação</Label>
                                    <Textarea
                                        value={textoDeterminacao}
                                        onChange={e => setTextoDeterminacao(e.target.value)}
                                        className="bg-white border-gray-200 text-gray-800 text-xs min-h-[70px] rounded-xl"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-gray-500 font-semibold">Prazo de Resolução (Dias)</Label>
                                    <Select value={prazoDeterminacao} onValueChange={setPrazoDeterminacao}>
                                        <SelectTrigger className="bg-white border-gray-200 text-gray-700 text-xs h-9 rounded-xl">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-white border-gray-200 text-gray-800">
                                            <SelectItem value="1">24 Horas (Crítico)</SelectItem>
                                            <SelectItem value="5">5 Dias (Urgente)</SelectItem>
                                            <SelectItem value="15">15 Dias (Médio)</SelectItem>
                                            <SelectItem value="30">30 Dias (Padrão)</SelectItem>
                                            <SelectItem value="90">90 Dias (Obras Estruturais)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

            </div>

            {/* Footer */}
            <div className="py-3 text-center text-xs text-gray-400 bg-white border-t border-gray-200">
                AGEMS — Diretoria de Transportes Rodoviários
            </div>
        </div>
    );
}
