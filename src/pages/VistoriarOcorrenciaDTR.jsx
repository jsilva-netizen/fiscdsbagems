import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Repository } from '@/lib/offline/repository';
import { snapToHighway } from '@/utils/rodoviasGeoJSON';
import PhotoGrid from '@/components/fiscalizacao/PhotoGrid';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ArrowLeft, Loader2, Save, MapPin, Compass, AlertCircle, FileText } from 'lucide-react';

const TIPOS_OCORRENCIA = [
    'Buraco na pista',
    'Rachaduras no asfalto',
    'Vegetação alta no acostamento',
    'Sinalização vertical danificada',
    'Sinalização horizontal apagada',
    'Lixo ou entulho na via',
    'Defeito na defensa metálica',
    'Drenagem obstruída',
    'Outro'
];

const GRAVIDADES = [
    { value: 'leve', label: 'Leve (Monitoramento)' },
    { value: 'media', label: 'Média (Atenção)' },
    { value: 'grave', label: 'Grave (Urgente)' },
    { value: 'gravissima', label: 'Gravíssima (Crítico / Risco de Vida)' }
];

export default function VistoriarOcorrenciaDTR() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const loc = useLocation();
    const searchParams = new URLSearchParams(loc.search);
    const fiscId = searchParams.get('fiscId');
    const occurrenceId = searchParams.get('id'); // null se estiver criando

    const [location, setLocation] = useState(null);
    const [gettingLocation, setGettingLocation] = useState(false);
    
    const [formData, setFormData] = useState({
        rodovia: '',
        trecho: '',
        km: '',
        tipo_ocorrencia: '',
        gravidade: 'media',
        observacao: ''
    });

    const [requerDeterminacao, setRequerDeterminacao] = useState(false);
    const [textoDeterminacao, setTextoDeterminacao] = useState('');
    const [prazoDeterminacao, setPrazoDeterminacao] = useState('30'); // Dias

    const [fotos, setFotos] = useState([]);
    const [fotosDirty, setFotosDirty] = useState(false);
    const fotosCarregadasRef = useRef(null);

    // 1. Carregar fiscalização principal
    const { data: fisc } = useQuery({
        queryKey: ['fiscalizacao', fiscId],
        queryFn: async () => await Repository.getFiscalizacaoById(fiscId),
        enabled: !!fiscId
    });

    // 2. Carregar ocorrência se for edição
    const { data: ocorrencia, isLoading: loadingOcorrencia } = useQuery({
        queryKey: ['unidade', occurrenceId],
        queryFn: async () => await Repository.getUnidadeById(occurrenceId),
        enabled: !!occurrenceId
    });

    // 3. Carregar determinação existente se houver
    const { data: determinacoes = [] } = useQuery({
        queryKey: ['determinacoes', occurrenceId],
        queryFn: async () => await Repository.listDeterminacoesByUnidade(occurrenceId),
        enabled: !!occurrenceId
    });

    // Carregar coordenadas e preencher dados
    useEffect(() => {
        if (occurrenceId && ocorrencia) {
            setFormData({
                rodovia: ocorrencia.rodovia || fisc?.rodovia || '',
                trecho: ocorrencia.trecho || '',
                km: ocorrencia.km || '',
                tipo_ocorrencia: ocorrencia.tipo_ocorrencia || ocorrencia.nome_unidade || '',
                gravidade: ocorrencia.gravidade || 'media',
                observacao: ocorrencia.endereco || '' // Reutiliza campo endereço para observação longa
            });

            if (ocorrencia.latitude && ocorrencia.longitude) {
                setLocation({
                    lat: ocorrencia.latitude,
                    lng: ocorrencia.longitude
                });
            }

            // Checar determinação
            const det = determinacoes.find(d => d.origem === 'dtr_determination');
            if (det) {
                setRequerDeterminacao(true);
                setTextoDeterminacao(det.descricao || '');
                setPrazoDeterminacao(String(det.prazo_dias || '30'));
            }
        } else if (fisc && !occurrenceId) {
            setFormData(prev => ({
                ...prev,
                rodovia: fisc.rodovia || ''
            }));
            
            // Se for novo ponto, pegar GPS imediatamente e snappar à rodovia
            setGettingLocation(true);
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;
                    setLocation({ lat, lng });

                    const snapped = snapToHighway(lat, lng, fisc.rodovia);
                    setFormData(prev => ({
                        ...prev,
                        km: snapped.km,
                        trecho: snapped.trecho
                    }));
                    setGettingLocation(false);
                },
                () => {
                    setGettingLocation(false);
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        }
    }, [occurrenceId, ocorrencia, fisc, determinacoes]);

    // Carregar Fotos
    useEffect(() => {
        if (!occurrenceId) return;
        if (fotosCarregadasRef.current === occurrenceId) return;

        const carregarFotos = async () => {
            try {
                const remotas = Array.isArray(ocorrencia?.fotos_unidade) ? ocorrencia.fotos_unidade : [];
                const locais = await Repository.listLocalFotos(occurrenceId).then(list =>
                    list.map(f => ({
                        localId: f.localId,
                        url: f.url || '',
                        legenda: f.legenda || '',
                        mimeType: f.mimeType,
                        width: f.width,
                        height: f.height
                    }))
                );
                setFotos([...locais, ...remotas]);
                fotosCarregadasRef.current = occurrenceId;
                setFotosDirty(false);
            } catch (err) {
                console.error('[Fotos DTR]', err);
            }
        };

        carregarFotos();
    }, [occurrenceId, ocorrencia, fotosDirty]);

    // Salvar Ocorrência
    const salvarMutation = useMutation({
        mutationFn: async () => {
            let uId = occurrenceId;

            const unitPayload = {
                fiscalizacao_id: fiscId,
                tipo_unidade_id: null, // No specific unit type for DTR occurrences
                tipo_unidade_name: 'Ocorrência',
                nome_unidade: formData.tipo_ocorrencia,
                codigo_unidade: '',
                endereco: formData.observacao, // Usa endereço para notas textuais
                latitude: location?.lat ?? null,
                longitude: location?.lng ?? null,
                rodovia: formData.rodovia,
                trecho: formData.trecho,
                km: formData.km,
                tipo_ocorrencia: formData.tipo_ocorrencia,
                gravidade: formData.gravidade,
                status: 'finalizada' // Sempre marca como finalizado para facilitar o fechamento
            };

            if (occurrenceId) {
                // Atualizar
                await Repository.updateUnidadeDTR(occurrenceId, unitPayload);
            } else {
                // Criar
                const res = await Repository.createUnidade(unitPayload);
                uId = res.id;
            }

            // Salvar fotos vinculadas
            const fotosCompletas = fotos.map(f => {
                if (typeof f === 'string') return { url: f, legenda: '' };
                return {
                    url: f.url,
                    bucket: f.bucket,
                    path: f.path,
                    legenda: f.legenda || '',
                    mimeType: f.mimeType,
                    width: f.width,
                    height: f.height
                };
            });
            await Repository.updateUnidadeFotos(uId, fotosCompletas);

            // Salvar determinação se requerida
            if (requerDeterminacao && textoDeterminacao.trim()) {
                await Repository.upsertDeterminacaoByOrigem(
                    uId, 
                    'dtr_determination', 
                    textoDeterminacao, 
                    parseInt(prazoDeterminacao, 10)
                );
            } else {
                // Remover determinação se foi desmarcada
                await Repository.upsertDeterminacaoByOrigem(uId, 'dtr_determination', null);
            }

            return uId;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['unidades', fiscId] });
            queryClient.invalidateQueries({ queryKey: ['unidade', occurrenceId] });
            queryClient.invalidateQueries({ queryKey: ['determinacoes', occurrenceId] });
            setFotosDirty(false);
            navigate(createPageUrl('ExecutarFiscalizacaoDTR') + `?id=${fiscId}`);
        },
        onError: (err) => {
            alert(err.message || 'Falha ao salvar ocorrência.');
        }
    });

    const handleAddFoto = async (fotoData) => {
        setFotos(prev => [...prev, fotoData]);
        setFotosDirty(true);
    };

    const handleRemoveFoto = (index) => {
        setFotos(prev => {
            const alvo = prev[index];
            if (alvo?.localId) {
                Repository.deleteLocalFoto(alvo.localId).catch(() => {});
            }
            return prev.filter((_, i) => i !== index);
        });
        setFotosDirty(true);
    };

    const handleUpdateLegenda = (index, legenda) => {
        setFotos(prev => {
            const novasFotos = [...prev];
            const alvo = novasFotos[index];
            if (!alvo) return prev;
            if (typeof alvo === 'string') {
                novasFotos[index] = { url: alvo, legenda };
            } else {
                novasFotos[index] = { ...alvo, legenda };
            }
            if (alvo?.localId) {
                Repository.updateLocalFotoLegenda(alvo.localId, legenda).catch(() => {});
            }
            return novasFotos;
        });
        setFotosDirty(true);
    };

    const handleReorderFotos = (nextFotos) => {
        setFotos(nextFotos);
        setFotosDirty(true);
    };

    const isEditable = !ocorrencia || ocorrencia.status !== 'finalizada' || true; // Em vistorias DTR sempre permitimos editar antes do fechamento geral

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 border-b border-indigo-600/30">
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
                                {occurrenceId ? `ID: ${occurrenceId.substring(0,8).toUpperCase()}` : 'Cadastro de Não Conformidade'}
                            </p>
                        </div>
                    </div>
                    <Button 
                        size="sm" 
                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8 px-3 rounded-lg"
                        onClick={() => salvarMutation.mutate()}
                        disabled={salvarMutation.isPending || !formData.tipo_target_name && !formData.tipo_ocorrencia}
                    >
                        {salvarMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <>
                                <Save className="h-4 w-4 mr-1" /> Salvar
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* Form */}
            <div className="flex-1 max-w-md w-full mx-auto px-4 py-5 space-y-5 overflow-y-auto">
                {/* Georeferencing Snapping Panel */}
                <Card className="bg-slate-800 border-none shadow-xl">
                    <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                                <Compass className="h-4 w-4 text-emerald-400" /> Georeferenciamento DTR
                            </h3>
                            {gettingLocation && (
                                <span className="text-[10px] text-indigo-400 flex items-center gap-1">
                                    <Loader2 className="h-3 w-3 animate-spin" /> Snapping ativo...
                                </span>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-400">KM *</Label>
                                <Input 
                                    value={formData.km}
                                    onChange={e => setFormData({...formData, km: e.target.value})}
                                    placeholder="Ex: 142.5"
                                    className="bg-slate-900 border-slate-750 text-slate-100 font-mono text-sm"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-slate-400">Trecho *</Label>
                                <Input 
                                    value={formData.trecho}
                                    onChange={e => setFormData({...formData, trecho: e.target.value})}
                                    placeholder="Ex: Sonora - Pedro Gomes"
                                    className="bg-slate-900 border-slate-750 text-slate-100 text-xs"
                                />
                            </div>
                        </div>

                        {location && (
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                                <MapPin className="h-3.5 w-3.5 text-slate-500" />
                                {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Main Occurrence Details */}
                <div className="space-y-4 bg-slate-800/40 p-4 rounded-xl border border-slate-800/80">
                    {/* Tipo de Ocorrência */}
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-350">Tipo de Ocorrência *</Label>
                        <Select 
                            value={formData.tipo_ocorrencia} 
                            onValueChange={val => setFormData({...formData, tipo_ocorrencia: val})}
                        >
                            <SelectTrigger className="bg-slate-800 border-slate-755 text-slate-100 text-sm h-11 rounded-lg">
                                <SelectValue placeholder="Selecione o tipo..." />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700 text-slate-150">
                                {TIPOS_OCORRENCIA.map(t => (
                                    <SelectItem key={t} value={t} className="focus:bg-indigo-650 hover:bg-indigo-600">
                                        {t}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Gravidade */}
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-350">Gravidade / Risco *</Label>
                        <Select 
                            value={formData.gravidade} 
                            onValueChange={val => setFormData({...formData, gravidade: val})}
                        >
                            <SelectTrigger className="bg-slate-800 border-slate-755 text-slate-100 text-sm h-11 rounded-lg">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-slate-800 border-slate-700 text-slate-150">
                                {GRAVIDADES.map(g => (
                                    <SelectItem key={g.value} value={g.value} className="focus:bg-indigo-650 hover:bg-indigo-600">
                                        {g.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Observação / Descrição */}
                    <div className="space-y-2">
                        <Label className="text-xs font-semibold text-slate-350">Descrição Detalhada / Fotos</Label>
                        <Textarea 
                            value={formData.observacao}
                            onChange={e => setFormData({...formData, observacao: e.target.value})}
                            placeholder="Descreva as condições da pista, acostamento ou sinalização..."
                            className="bg-slate-800 border-slate-755 text-slate-100 text-xs min-h-[80px]"
                        />
                    </div>
                </div>

                {/* Photo Grid Section */}
                <div className="bg-slate-850 p-4 rounded-xl border border-slate-800/80 shadow-md">
                    <PhotoGrid
                        fotos={fotos}
                        minFotos={1}
                        onAddFoto={handleAddFoto}
                        onRemoveFoto={handleRemoveFoto}
                        onUpdateLegenda={handleUpdateLegenda}
                        onReorderFotos={handleReorderFotos}
                        titulo="Evidências Fotográficas"
                        fiscalizacaoId={fiscId}
                        unidadeId={occurrenceId || 'novo-ponto'}
                        isEditable={isEditable}
                    />
                </div>

                {/* Determination (Determinação / Prazo) */}
                <Card className="bg-slate-800 border-none shadow-xl">
                    <CardContent className="p-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                                    <FileText className="h-4.5 w-4.5 text-indigo-400" /> Requer Determinação?
                                </Label>
                                <p className="text-[10px] text-slate-550">Notificar concessionária para reparo.</p>
                            </div>
                            <Switch 
                                checked={requerDeterminacao} 
                                onCheckedChange={(val) => {
                                    setRequerDeterminacao(val);
                                    if (val && !textoDeterminacao) {
                                        setTextoDeterminacao(`Sanar a ocorrência de ${formData.tipo_ocorrencia || 'irregularidade'} identificada no KM ${formData.km || ''} da rodovia ${formData.rodovia || ''};`);
                                    }
                                }} 
                            />
                        </div>

                        {requerDeterminacao && (
                            <div className="space-y-3 pt-2 border-t border-slate-750/50 animate-fade-in">
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-400">Texto da Determinação</Label>
                                    <Textarea 
                                        value={textoDeterminacao}
                                        onChange={e => setTextoDeterminacao(e.target.value)}
                                        placeholder="Ex: Corrigir defeito asfáltico no prazo estabelecido..."
                                        className="bg-slate-900 border-slate-750 text-slate-100 text-xs min-h-[70px]"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs text-slate-400">Prazo de Resolução (Dias)</Label>
                                    <Select value={prazoDeterminacao} onValueChange={setPrazoDeterminacao}>
                                        <SelectTrigger className="bg-slate-900 border-slate-750 text-slate-200 text-xs h-9">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 border-slate-700 text-slate-150">
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
            <div className="py-4 text-center text-xs text-slate-600 bg-slate-900/50 border-t border-slate-850">
                AGEMS - DTR
            </div>
        </div>
    );
}
