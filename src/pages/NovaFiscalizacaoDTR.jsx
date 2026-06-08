import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Repository } from '@/lib/offline/repository';
import { useAuth } from '@/lib/AuthContext';
import { useModulo } from '@/hooks/useModulo';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Navigation, Loader2, MapPin, Sparkles, AlertCircle } from 'lucide-react';

export default function NovaFiscalizacaoDTR() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { tipoModulo } = useModulo();
    const [formData, setFormData] = useState({
        municipio_id: '',
        rodovia: '',
        prestador_servico_id: ''
    });
    const [location, setLocation] = useState(null);
    const [locationError, setLocationError] = useState(null);
    const [gettingLocation, setGettingLocation] = useState(false);

    // Fetch Municipios
    const { data: municipiosRaw = [] } = useQuery({
        queryKey: ['municipios'],
        queryFn: async () => await Repository.listMunicipios()
    });

    const municipios = [...municipiosRaw].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    // Fetch Contracts
    const { data: contratos = [], isLoading: isLoadingContratos } = useQuery({
        queryKey: ['contratos'],
        queryFn: async () => await Repository.listContratos()
    });

    // Fetch Concessionaires
    const { data: prestadores = [], isLoading: isLoadingPrestadores } = useQuery({
        queryKey: ['prestadores', 'dtr-only'],
        queryFn: async () => await Repository.listPrestadoresFull('dtr')
    });

    const activeContratos = contratos.filter(c => c.ativo !== false);
    const rodoviasDisponiveis = Array.from(new Set(activeContratos.map(c => c.rodovia))).sort();

    const matchingContrato = activeContratos.find(c => c.rodovia === formData.rodovia);
    const resolvedConcessionaria = matchingContrato ? prestadores.find(p => p.id === matchingContrato.prestador_servico_id) : null;

    const getLocation = () => {
        setGettingLocation(true);
        setLocationError(null);
        
        if (!navigator.geolocation) {
            setLocationError('Geolocalização não suportada');
            setGettingLocation(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setLocation({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude
                });
                setGettingLocation(false);
            },
            (_) => {
                setLocationError('Não foi possível obter localização GPS.');
                setGettingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    useEffect(() => {
        getLocation();
    }, []);

    const handleRodoviaChange = (val) => {
        const contrato = activeContratos.find(c => c.rodovia === val);
        setFormData(prev => ({
            ...prev,
            rodovia: val,
            prestador_servico_id: contrato ? contrato.prestador_servico_id : ''
        }));
    };

    const createMutation = useMutation({
        mutationFn: async (data) => {
            const result = await Repository.createFiscalizacao({
                municipio_id: data.municipio_id,
                prestador_servico_id: data.prestador_servico_id,
                rodovia: data.rodovia,
                servicos: ['Rodovias'],
                tipo_modulo: tipoModulo,
                status: 'em_andamento',
                fiscal_email: user?.email,
                fiscal_nome: user?.user_metadata?.full_name || user?.email,
                latitude_inicio: location?.lat,
                longitude_inicio: location?.lng
            });
            return result;
        },
        onSuccess: (result) => {
            navigate(createPageUrl('ExecutarFiscalizacaoDTR') + `?id=${result.id}`);
        },
        onError: (err) => {
            alert(err?.message || 'Falha ao criar fiscalização localmente.');
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.municipio_id || !formData.rodovia || !formData.prestador_servico_id) {
            alert('Preencha todos os campos obrigatórios');
            return;
        }
        createMutation.mutate(formData);
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between">
            <div>
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-indigo-800 border-b border-indigo-600/30">
                    <div className="max-w-md mx-auto px-4 py-5 flex items-center gap-3">
                        <Link to={createPageUrl('Home')}>
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full transition-all">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold flex items-center gap-2">
                                Nova Fiscalização <Sparkles className="h-5 w-5 text-yellow-300 fill-yellow-300" />
                            </h1>
                            <p className="text-indigo-200 text-xs">Módulo Transportes e Rodovias (DTR)</p>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <div className="max-w-md w-full mx-auto px-4 py-6">
                    {isLoadingContratos || isLoadingPrestadores ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
                            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                            <p className="text-sm">Carregando rodovias e concessionárias...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* GPS Status Card */}
                            <Card className={`border-none bg-slate-800/80 backdrop-blur ${location ? 'shadow-green-500/5' : 'shadow-amber-500/5'} shadow-xl`}>
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${location ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                                            {gettingLocation ? (
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                            ) : (
                                                <Navigation className="h-5 w-5" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm text-slate-200">
                                                {gettingLocation ? 'Obtendo GPS...' : location ? 'Coordenadas Capturadas' : 'GPS Pendente'}
                                            </p>
                                            {location ? (
                                                <p className="text-xs text-slate-400 font-mono">
                                                    {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                                                </p>
                                            ) : (
                                                <p className="text-xs text-slate-500">Aguardando sinal estável...</p>
                                            )}
                                            {locationError && (
                                                <p className="text-xs text-rose-400 mt-0.5">{locationError}</p>
                                            )}
                                        </div>
                                    </div>
                                    {!location && !gettingLocation && (
                                        <Button type="button" size="sm" variant="outline" className="border-slate-700 hover:bg-slate-700 text-slate-200 text-xs" onClick={getLocation}>
                                            Recapturar
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>

                            <div className="space-y-5 bg-slate-800/40 p-5 rounded-2xl border border-slate-800/80 shadow-inner">
                                {/* Rodovia */}
                                <div className="space-y-2">
                                    <Label className="text-slate-300 font-medium">Rodovia *</Label>
                                    {rodoviasDisponiveis.length === 0 ? (
                                        <div className="flex items-center gap-2 text-rose-400 bg-rose-950/20 p-3 rounded-xl border border-rose-900/30 text-xs">
                                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                            <span>Nenhuma rodovia com contrato ativo cadastrada no dispositivo.</span>
                                        </div>
                                    ) : (
                                        <Select 
                                            value={formData.rodovia} 
                                            onValueChange={handleRodoviaChange}
                                        >
                                            <SelectTrigger className="bg-slate-800 border-slate-750 text-slate-100 h-12 rounded-xl focus:ring-indigo-500">
                                                <SelectValue placeholder="Selecione a rodovia..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-slate-800 border-slate-700 text-slate-100">
                                                {rodoviasDisponiveis.map(rodovia => (
                                                    <SelectItem key={rodovia} value={rodovia} className="focus:bg-indigo-650 hover:bg-indigo-600 focus:text-white">
                                                        {rodovia}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>

                                {/* Município */}
                                <div className="space-y-2">
                                    <Label className="text-slate-300 font-medium">Município de Referência *</Label>
                                    <Select 
                                        value={formData.municipio_id} 
                                        onValueChange={(v) => setFormData({...formData, municipio_id: v})}
                                    >
                                        <SelectTrigger className="bg-slate-800 border-slate-750 text-slate-100 h-12 rounded-xl">
                                            <SelectValue placeholder="Selecione o município..." />
                                        </SelectTrigger>
                                        <SelectContent className="bg-slate-800 border-slate-700 text-slate-100">
                                            {municipios.map(m => (
                                                <SelectItem key={m.id} value={m.id} className="focus:bg-indigo-650 hover:bg-indigo-600">
                                                    <div className="flex items-center gap-2">
                                                        <MapPin className="h-4 w-4 text-indigo-400" />
                                                        {m.nome}
                                                    </div>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Mapped Concessionaire and Contract */}
                                {formData.rodovia && (
                                    <div className="space-y-2 bg-slate-850 p-4 rounded-xl border border-slate-750 shadow-inner">
                                        <Label className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Concessionária & Contrato Vinculados</Label>
                                        <div className="flex items-center gap-3 mt-1.5">
                                            {resolvedConcessionaria?.logo_url ? (
                                                <img src={resolvedConcessionaria.logo_url} alt="Logo" className="w-10 h-10 rounded-lg object-contain border bg-white" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                                                    CONC
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-bold text-sm text-slate-200">{resolvedConcessionaria?.nome || 'Buscando concessionária...'}</p>
                                                <p className="text-xs text-indigo-300">Contrato nº: {matchingContrato?.numero_contrato || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Fiscal Info */}
                            {user && (
                                <Card className="bg-indigo-950/40 border border-indigo-900/40 rounded-xl">
                                    <CardContent className="p-4 text-xs text-indigo-300">
                                        <p><strong>Inspetor:</strong> {user.user_metadata?.full_name || user.email}</p>
                                        <p className="opacity-70 mt-0.5">{user.email}</p>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Submit Button */}
                            <Button 
                                type="submit" 
                                className="w-full h-14 text-md font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg transition-all"
                                disabled={createMutation.isPending || !formData.municipio_id || !formData.rodovia || !formData.prestador_servico_id}
                            >
                                {createMutation.isPending ? (
                                    <>
                                        <Loader2 className="h-5 w-5 mr-2 animate-spin text-white" />
                                        Iniciando Vistoria...
                                    </>
                                ) : (
                                    'Iniciar Vistoria'
                                )}
                            </Button>
                        </form>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="py-4 text-center text-xs text-slate-500">
                AGEMS - Agência Estadual de Regulação de Serviços Públicos de MS
            </div>
        </div>
    );
}
