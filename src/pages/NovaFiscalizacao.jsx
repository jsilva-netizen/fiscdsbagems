import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Repository } from '@/lib/offline/repository';
import { useAuth } from '@/lib/AuthContext';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Navigation, Loader2, MapPin, Plus } from 'lucide-react';

const SERVICOS = ['Abastecimento de Água', 'Esgotamento Sanitário', 'Manejo de Resíduos Sólidos', 'Limpeza Urbana', 'Drenagem'];

export default function NovaFiscalizacao() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [formData, setFormData] = useState({ municipio_id: '', servicos: [], prestador_servico_id: '' });
    const [location, setLocation] = useState(null);
    const [locationError, setLocationError] = useState(null);
    const [gettingLocation, setGettingLocation] = useState(false);

    const { data: municipiosRaw = [] } = useQuery({
        queryKey: ['municipios'],
        queryFn: async () => await Repository.listMunicipios()
    });
    const municipios = [...municipiosRaw].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    const { data: prestadores = [] } = useQuery({
        queryKey: ['prestadores'],
        queryFn: async () => await Repository.listPrestadores()
    });

    const getLocation = () => {
        setGettingLocation(true);
        setLocationError(null);
        if (!navigator.geolocation) {
            setLocationError('Geolocalização não suportada');
            setGettingLocation(false);
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (pos) => { setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGettingLocation(false); },
            () => { setLocationError('Não foi possível obter localização. Verifique as permissões.'); setGettingLocation(false); },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    useEffect(() => { getLocation(); }, []);

    const createMutation = useMutation({
        mutationFn: async (data) => {
            return await Repository.createFiscalizacao({
                municipio_id: data.municipio_id,
                prestador_servico_id: data.prestador_servico_id,
                servicos: data.servicos,
                status: 'em_andamento',
                fiscal_email: user?.email,
                latitude_inicio: location?.lat,
                longitude_inicio: location?.lng
            });
        },
        onSuccess: (result) => navigate(createPageUrl('ExecutarFiscalizacao') + `?id=${result.id}`),
        onError: (err) => alert(err?.message || 'Falha ao criar fiscalização localmente.'),
    });

    const toggleServico = (servico) => {
        setFormData(prev => ({
            ...prev,
            servicos: prev.servicos.includes(servico)
                ? prev.servicos.filter(s => s !== servico)
                : [...prev.servicos, servico]
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.municipio_id || formData.servicos.length === 0 || !formData.prestador_servico_id) {
            alert('Preencha todos os campos obrigatórios');
            return;
        }
        createMutation.mutate(formData);
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
            <div>
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-950 text-white shadow-md">
                    <div className="max-w-lg mx-auto px-4 py-5 flex items-center gap-3">
                        <Link to={createPageUrl('Home')}>
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold">
                                Nova Fiscalização
                            </h1>
                            <p className="text-blue-200 text-xs">Módulo Saneamento Básico (DSB)</p>
                        </div>
                    </div>
                </div>

                {/* Form */}
                <div className="max-w-lg mx-auto px-4 py-6">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* GPS Status */}
                        <Card className={`border ${location ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'} shadow-sm`}>
                            <CardContent className="p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${location ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                        {gettingLocation ? <Loader2 className="h-5 w-5 animate-spin" /> : <Navigation className="h-5 w-5" />}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-sm text-gray-800">
                                            {gettingLocation ? 'Obtendo GPS...' : location ? 'Coordenadas Capturadas' : 'GPS Pendente'}
                                        </p>
                                        {location && <p className="text-xs text-gray-500 font-mono">{location.lat.toFixed(6)}, {location.lng.toFixed(6)}</p>}
                                        {locationError && <p className="text-xs text-rose-500 mt-0.5">{locationError}</p>}
                                    </div>
                                </div>
                                {!location && !gettingLocation && (
                                    <Button type="button" size="sm" variant="outline" className="text-xs" onClick={getLocation}>Recapturar</Button>
                                )}
                            </CardContent>
                        </Card>

                        <div className="space-y-5 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                            {/* Município */}
                            <div className="space-y-2">
                                <Label className="text-gray-700 font-semibold text-sm flex items-center gap-1.5">
                                    <MapPin className="h-3.5 w-3.5 text-indigo-400" /> Município *
                                </Label>
                                <Select value={formData.municipio_id} onValueChange={v => setFormData({ ...formData, municipio_id: v })}>
                                    <SelectTrigger className="h-12 rounded-xl bg-white border-gray-200">
                                        <SelectValue placeholder="Selecione o município..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white border-gray-200">
                                        {municipios.map(m => (
                                            <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Prestador */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label className="text-gray-700 font-semibold text-sm">Prestador de Serviço *</Label>
                                    <Link to={createPageUrl('PrestadoresServico')}>
                                        <Button type="button" size="sm" variant="outline" className="h-7 text-xs rounded-lg border-gray-200 gap-1">
                                            <Plus className="h-3 w-3" /> Novo
                                        </Button>
                                    </Link>
                                </div>
                                <Select value={formData.prestador_servico_id} onValueChange={v => setFormData({ ...formData, prestador_servico_id: v })}>
                                    <SelectTrigger className="h-12 rounded-xl bg-white border-gray-200">
                                        <SelectValue placeholder="Selecione o prestador..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white border-gray-200">
                                        {prestadores.map(p => (
                                            <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Serviços */}
                            <div className="space-y-2">
                                <Label className="text-gray-700 font-semibold text-sm">Serviços Fiscalizados *</Label>
                                <div className="border border-gray-200 rounded-xl p-4 space-y-2.5 bg-gray-50">
                                    {SERVICOS.map(s => (
                                        <div key={s} className="flex items-center space-x-2.5">
                                            <Checkbox
                                                id={s}
                                                checked={formData.servicos.includes(s)}
                                                onCheckedChange={() => toggleServico(s)}
                                                className="border-gray-300"
                                            />
                                            <label htmlFor={s} className="text-sm text-gray-700 font-medium cursor-pointer">{s}</label>
                                        </div>
                                    ))}
                                </div>
                                {formData.servicos.length === 0 && (
                                    <p className="text-xs text-rose-500">Selecione ao menos um serviço</p>
                                )}
                            </div>
                        </div>

                        {/* Fiscal Info */}
                        {user && (
                            <Card className="bg-blue-50 border border-blue-100 rounded-xl">
                                <CardContent className="p-4 text-xs text-blue-700">
                                    <p><strong>Fiscal:</strong> {user.user_metadata?.full_name || user.email}</p>
                                    <p className="opacity-70 mt-0.5">{user.email}</p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Submit */}
                        <Button
                            type="submit"
                            className="w-full h-14 text-md font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl shadow-lg transition-all"
                            disabled={createMutation.isPending || !formData.municipio_id || formData.servicos.length === 0 || !formData.prestador_servico_id}
                        >
                            {createMutation.isPending ? (
                                <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Iniciando...</>
                            ) : 'Iniciar Fiscalização'}
                        </Button>
                    </form>
                </div>
            </div>

            <div className="py-5 text-center text-xs text-slate-400 bg-white border-t border-slate-200">
                AGEMS — Agência Estadual de Regulação de Serviços Públicos de MS
            </div>
        </div>
    );
}
