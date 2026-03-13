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
    const [formData, setFormData] = useState({
        municipio_id: '',
        servicos: [],
        prestador_servico_id: ''
    });
    const [location, setLocation] = useState(null);
    const [locationError, setLocationError] = useState(null);
    const [gettingLocation, setGettingLocation] = useState(false);

    const { data: municipiosRaw = [], isLoading: _loadingMunicipios } = useQuery({
        queryKey: ['municipios'],
        queryFn: async () => {
            const data = await Repository.listMunicipios();
            return data;
        }
    });

    const municipios = [...municipiosRaw].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    const { data: prestadores = [] } = useQuery({
        queryKey: ['prestadores'],
        queryFn: async () => {
            const data = await Repository.listPrestadores();
            return data;
        }
    });

    // user já vem do AuthContext

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
                setLocationError('Não foi possível obter localização. Verifique as permissões.');
                setGettingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    useEffect(() => {
        getLocation();
    }, []);

    const createMutation = useMutation({
        mutationFn: async (data) => {
            const result = await Repository.createFiscalizacao({
                municipio_id: data.municipio_id,
                prestador_servico_id: data.prestador_servico_id,
                servicos: data.servicos,
                status: 'em_andamento',
                fiscal_email: user?.email,
                latitude_inicio: location?.lat,
                longitude_inicio: location?.lng
            });
            return result;
        },
        onSuccess: (result) => {
            navigate(createPageUrl('ExecutarFiscalizacao') + `?id=${result.id}`);
        },
        onError: (err) => {
            alert(err?.message || 'Falha ao criar fiscalização localmente.');
        },
        onSettled: (_data, _error) => {
            // nada adicional: spinner é controlado automaticamente
        }
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
        <div className="min-h-screen bg-gray-50">
                {/* Header */}
            <div className="bg-green-600 text-white">
                <div className="max-w-lg mx-auto px-4 py-4">
                    <div className="flex items-center gap-3">
                        <Link to={createPageUrl('Home')}>
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold">Nova Fiscalização</h1>
                            <p className="text-green-100 text-sm">Configure os dados iniciais</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Form */}
            <div className="max-w-lg mx-auto px-4 py-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* GPS Status */}
                    <Card className={location ? "border-green-200 bg-green-50" : "border-yellow-200 bg-yellow-50"}>
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${location ? 'bg-green-500' : 'bg-yellow-500'}`}>
                                        {gettingLocation ? (
                                            <Loader2 className="h-5 w-5 text-white animate-spin" />
                                        ) : (
                                            <Navigation className="h-5 w-5 text-white" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="font-medium">
                                            {gettingLocation ? 'Obtendo GPS...' : location ? 'GPS Capturado' : 'GPS Pendente'}
                                        </p>
                                        {location && (
                                            <p className="text-xs text-gray-500">
                                                {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                                            </p>
                                        )}
                                        {locationError && (
                                            <p className="text-xs text-red-600">{locationError}</p>
                                        )}
                                    </div>
                                </div>
                                {!location && !gettingLocation && (
                                    <Button type="button" size="sm" variant="outline" onClick={getLocation}>
                                        Tentar novamente
                                    </Button>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Município */}
                    <div className="space-y-2">
                        <Label>Município *</Label>
                        <Select 
                            value={formData.municipio_id} 
                            onValueChange={(v) => setFormData({...formData, municipio_id: v})}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o município..." />
                            </SelectTrigger>
                            <SelectContent>
                                {municipios.map(m => (
                                    <SelectItem key={m.id} value={m.id}>
                                        <div className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-gray-400" />
                                            {m.nome}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Serviços */}
                    <div className="space-y-3">
                        <Label>Serviços *</Label>
                        <div className="border rounded-lg p-4 space-y-2">
                            {SERVICOS.map(s => (
                                <div key={s} className="flex items-center space-x-2">
                                    <Checkbox 
                                        id={s}
                                        checked={formData.servicos.includes(s)}
                                        onCheckedChange={() => toggleServico(s)}
                                    />
                                    <Label htmlFor={s} className="font-normal cursor-pointer">{s}</Label>
                                </div>
                            ))}
                        </div>
                        {formData.servicos.length === 0 && (
                            <p className="text-xs text-red-600">Selecione ao menos um serviço</p>
                        )}
                    </div>

                    {/* Prestador de Serviço */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Prestador de Serviço *</Label>
                            <Link to={createPageUrl('PrestadoresServico')}>
                                <Button type="button" size="sm" variant="outline">
                                    <Plus className="h-3 w-3" />
                                </Button>
                            </Link>
                        </div>
                        <Select 
                            value={formData.prestador_servico_id} 
                            onValueChange={(v) => setFormData({...formData, prestador_servico_id: v})}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o prestador..." />
                            </SelectTrigger>
                            <SelectContent>
                                {prestadores.map(p => (
                                    <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Fiscal Info */}
                    {user && (
                        <Card className="bg-blue-50 border-blue-200">
                            <CardContent className="p-4">
                                <p className="text-sm text-blue-800">
                                    <strong>Fiscal:</strong> {user.user_metadata?.full_name}
                                </p>
                                <p className="text-xs text-blue-600">{user.email}</p>
                            </CardContent>
                        </Card>
                    )}

                    {/* Submit */}
                    <Button 
                        type="submit" 
                        className="w-full h-14 text-lg bg-green-600 hover:bg-green-700"
                        disabled={createMutation.isPending || !formData.municipio_id || formData.servicos.length === 0 || !formData.prestador_servico_id}
                    >
                        {createMutation.isPending ? (
                            <>
                                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                Criando...
                            </>
                        ) : (
                            'Iniciar Fiscalização'
                        )}
                    </Button>
                </form>
            </div>
        </div>
    );
}
