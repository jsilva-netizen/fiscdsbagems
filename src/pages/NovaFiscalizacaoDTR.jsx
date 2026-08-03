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
import { ArrowLeft, Navigation, Loader2, AlertCircle } from 'lucide-react';

export default function NovaFiscalizacaoDTR() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { tipoModulo } = useModulo();
    const [formData, setFormData] = useState({
        rodovia: '',
        prestador_servico_id: ''
    });
    const [location, setLocation] = useState(null);
    const [locationError, setLocationError] = useState(null);
    const [gettingLocation, setGettingLocation] = useState(false);


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
                prestador_servico_id: data.prestador_servico_id,
                rodovia: data.rodovia,
                servicos: ['Rodovias'],
                tipo_modulo: tipoModulo,
                status: 'em_andamento',
                fiscal_email: user?.email,
                fiscal_nome: user?.full_name || user?.user_metadata?.full_name || user?.email,
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
        if (!formData.rodovia || !formData.prestador_servico_id) {
            alert('Selecione a rodovia para continuar');
            return;
        }
        createMutation.mutate(formData);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
            <div>
                {/* Header */}
                <div className="bg-gradient-to-r from-[#0066B3] to-[#004A8F] text-white shadow-md">
                    <div className="max-w-4xl mx-auto px-4 py-5 flex items-center gap-3">
                        <Link to={createPageUrl('Home')}>
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full transition-all">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xs font-bold uppercase tracking-widest text-blue-200">Nova Fiscalização</h1>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <div className="max-w-lg w-full mx-auto px-4 py-6">
                    {isLoadingContratos || isLoadingPrestadores ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400">
                            <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
                            <p className="text-sm">Carregando rodovias e concessionárias...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {/* GPS Status Card */}
                            <Card className={`border ${location ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'} shadow-sm`}>
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${location ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                            {gettingLocation ? (
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                            ) : (
                                                <Navigation className="h-5 w-5" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-sm text-gray-800">
                                                {gettingLocation ? 'Obtendo GPS...' : location ? 'Coordenadas Capturadas' : 'GPS Pendente'}
                                            </p>
                                            {location ? (
                                                <p className="text-xs text-gray-500 font-mono">
                                                    {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                                                </p>
                                            ) : (
                                                <p className="text-xs text-gray-400">Aguardando sinal estável...</p>
                                            )}
                                            {locationError && (
                                                <p className="text-xs text-rose-500 mt-0.5">{locationError}</p>
                                            )}
                                        </div>
                                    </div>
                                    {!location && !gettingLocation && (
                                        <Button type="button" size="sm" variant="outline" className="text-xs" onClick={getLocation}>
                                            Recapturar
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>

                            <div className="space-y-5 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                                {/* Rodovia */}
                                <div className="space-y-2">
                                    <Label className="text-gray-700 font-semibold text-sm">Rodovia *</Label>
                                    {rodoviasDisponiveis.length === 0 ? (
                                        <div className="flex items-center gap-2 text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-200 text-xs">
                                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                            <span>Nenhuma rodovia com contrato ativo cadastrada no dispositivo. Sincronize os dados.</span>
                                        </div>
                                    ) : (
                                        <Select
                                            value={formData.rodovia}
                                            onValueChange={handleRodoviaChange}
                                        >
                                            <SelectTrigger className="h-12 rounded-xl bg-white border-gray-200">
                                                <SelectValue placeholder="Selecione a rodovia..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white border-gray-200">
                                                {rodoviasDisponiveis.map(rodovia => (
                                                    <SelectItem key={rodovia} value={rodovia}>
                                                        {rodovia}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                </div>

                                {/* Concessionária & Contrato auto-resolvidos */}
                                {formData.rodovia && (
                                    <div className="p-4 rounded-xl border border-indigo-100 bg-indigo-50">
                                        <p className="text-indigo-600 text-xs font-semibold uppercase tracking-wider mb-2">Concessionária & Contrato Vinculados</p>
                                        <div className="flex items-center gap-3">
                                            {resolvedConcessionaria?.logo_url ? (
                                                <img src={resolvedConcessionaria.logo_url} alt="Logo" className="w-10 h-10 rounded-lg object-contain border bg-white shadow-sm" />
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-500 flex items-center justify-center font-bold text-xs">
                                                    CONC
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-bold text-sm text-gray-800">{resolvedConcessionaria?.nome || 'Concessionária não encontrada'}</p>
                                                <p className="text-xs text-indigo-600">Contrato nº: {matchingContrato?.numero_contrato || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Fiscal Info */}
                            {user && (
                                <Card className="bg-blue-50 border border-blue-100 rounded-xl">
                                    <CardContent className="p-4 text-xs text-blue-700">
                                        <p><strong>Inspetor:</strong> {user.full_name || user.user_metadata?.full_name || user.email}</p>
                                        <p className="opacity-70 mt-0.5">{user.email}</p>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Submit Button */}
                            <Button
                                type="submit"
                                className="w-full h-14 text-md font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl shadow-lg transition-all"
                                disabled={createMutation.isPending || !formData.rodovia || !formData.prestador_servico_id}
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
            <div className="py-5 text-center text-xs text-slate-400 bg-white border-t border-slate-200">
                AGEMS - Agência Estadual de Regulação de Serviços Públicos de MS
            </div>
        </div>
    );
}
