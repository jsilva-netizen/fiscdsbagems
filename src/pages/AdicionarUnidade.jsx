import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Repository } from '@/lib/offline/repository';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Navigation, Building2, Loader2 } from 'lucide-react';




export default function AdicionarUnidade() {
    const navigate = useNavigate();
    const urlParams = new URLSearchParams(window.location.search);
    const fiscalizacaoId = urlParams.get('fiscalizacao') || urlParams.get('id'); // Tentar 'id' como fallback

    const [formData, setFormData] = useState({
        tipo_unidade_id: '',
        codigo_unidade: '',
        nome_unidade: '',
        endereco: ''
    });

    useEffect(() => {
        if (!fiscalizacaoId) {
            console.error('ID da fiscalização não encontrado na URL');
            alert('Erro: ID da fiscalização não informado. Volte e selecione uma fiscalização.');
            navigate('/dashboard'); // Ou onde fizer sentido
        }
    }, [fiscalizacaoId, navigate]);
    const [location, setLocation] = useState(null);
    const [loadingAddress, setLoadingAddress] = useState(false);

    const { data: fiscalizacao } = useQuery({
        queryKey: ['fiscalizacao', fiscalizacaoId],
        queryFn: async () => Repository.getFiscalizacaoById(fiscalizacaoId),
        enabled: !!fiscalizacaoId
    });

    const { data: tipos = [] } = useQuery({
        queryKey: ['tipos-unidade'],
        queryFn: async () => Repository.listTiposUnidade()
    });

    const { data: unidadesExistentes = [] } = useQuery({
        queryKey: ['unidades-existentes', fiscalizacaoId],
        queryFn: async () => Repository.listUnidadesByFiscalizacao(fiscalizacaoId, 1000),
        enabled: !!fiscalizacaoId
    });

    useEffect(() => {
        const desired = 50;
        const timeoutMs = 12000;
        let watchId = null;
        let best = null;
        let done = false;
        if (navigator.geolocation) {
            const finish = async (pos) => {
                if (done) return;
                done = true;
                if (watchId !== null) navigator.geolocation.clearWatch(watchId);
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                setLocation({ lat, lng });
                setLoadingAddress(true);
                try {
                    const response = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
                        { headers: { 'User-Agent': 'AGEMS-Fiscalizacao' } }
                    );
                    const data = await response.json();
                    if (data.address) {
                        const endereco = [
                            data.address.road || '',
                            data.address.house_number || '',
                            data.address.suburb || data.address.neighbourhood || '',
                            data.address.city || data.address.town || data.address.village || ''
                        ].filter(Boolean).join(', ');
                        setFormData(prev => ({ ...prev, endereco }));
                    } else {
                        const coords = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                        setFormData(prev => ({ ...prev, endereco: coords }));
                    }
                } catch {
                    const coords = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                    setFormData(prev => ({ ...prev, endereco: coords }));
                } finally {
                    setLoadingAddress(false);
                }
            };
            watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    const acc = typeof pos.coords.accuracy === 'number' ? pos.coords.accuracy : 9999;
                    if (!best || acc < best.coords.accuracy) best = pos;
                    if (acc <= desired) finish(pos);
                },
                () => {},
                { enableHighAccuracy: true, maximumAge: 0, timeout: timeoutMs }
            );
            setTimeout(() => {
                if (!done && best) finish(best);
            }, timeoutMs);
        }
        return () => {
            if (watchId !== null) navigator.geolocation.clearWatch(watchId);
        };
    }, []);

    const servicosSelecionados = Array.isArray(fiscalizacao?.servicos)
        ? fiscalizacao.servicos
        : typeof fiscalizacao?.servico === 'string'
            ? fiscalizacao.servico.split(',').map(s => s.trim()).filter(Boolean)
            : [];
    const normServico = (s) =>
        String(s || '')
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '');
    const servicosNorm = new Set(servicosSelecionados.map(normServico).filter(Boolean));
    const tiposFiltrados = tipos.filter(t => {
        if (t.ativo === false) return false;
        if (servicosNorm.size === 0) return true;
        const lista = Array.isArray(t.servicos_aplicaveis) ? t.servicos_aplicaveis : [];
        if (lista.length === 0) return true;
        return lista.map(normServico).some(s => servicosNorm.has(s));
    });

    // Gerar código automático quando seleciona tipo
    const handleTipoChange = (tipoId) => {
        const tipo = tipos.find(t => t.id === tipoId);
        if (!tipo) return;

        // Obter sigla do tipo de unidade (codigo da importação)
        const prefixo = tipo.codigo || tipo.nome.substring(0, 3).toUpperCase();

        // Contar quantas unidades deste tipo já existem nesta fiscalização
        const unidadesMesmoTipo = unidadesExistentes.filter(u => u.tipo_unidade_id === tipoId);
        const proximoNumero = unidadesMesmoTipo.length + 1;
        const codigo = `${prefixo}-${String(proximoNumero).padStart(3, '0')}`;

        // Atualizar form
        setFormData({
            ...formData,
            tipo_unidade_id: tipoId,
            codigo_unidade: codigo,
            nome_unidade: tipo.nome
        });
    };

    const createMutation = useMutation({
        mutationFn: async (data) => {
            const payload = {
                tipo_unidade_id: data.tipo_unidade_id,
                fiscalizacao_id: fiscalizacaoId,
                codigo_unidade: data.codigo_unidade || '',
                nome_unidade: data.nome_unidade || '',
                // endereço é apenas local; backend não possui coluna
                endereco: data.endereco || '',
                // geolocalização local; se backend tiver colunas, serializer cuidará
                latitude: location?.lat ? parseFloat(location.lat) : null,
                longitude: location?.lng ? parseFloat(location.lng) : null,
                data_hora_vistoria: new Date().toISOString()
            };
            const created = await Repository.createUnidade(payload)
            return created
        },
        onSuccess: (result) => {
            navigate(createPageUrl('VistoriarUnidade') + `?id=${result.id}`);
        },
        onError: (err) => {
            alert(err?.message || 'Falha ao criar unidade localmente.');
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!formData.tipo_unidade_id) {
            alert('Selecione o tipo de unidade');
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
                    <Link to={createPageUrl('ExecutarFiscalizacao') + `?id=${fiscalizacaoId}`}>
                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-xs font-bold uppercase tracking-widest text-blue-200">Adicionar Unidade</h1>
                    </div>
                </div>
            </div>

            {/* Form */}
            <div className="max-w-lg mx-auto px-4 py-6">
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* GPS */}
                    <Card className={`border shadow-sm ${location ? 'border-emerald-200 bg-emerald-50' : 'border-amber-100 bg-amber-50'}`}>
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center ${location ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-500'}`}>
                                <Navigation className="h-4.5 w-4.5" />
                            </div>
                            <div>
                                <p className="font-semibold text-sm text-gray-800">
                                    {location ? 'Coordenadas Capturadas' : 'Obtendo GPS...'}
                                </p>
                                {location && (
                                    <p className="text-xs text-gray-500 font-mono">{location.lat.toFixed(6)}, {location.lng.toFixed(6)}</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    <div className="space-y-4 bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
                    {/* Tipo de Unidade */}
                    <div className="space-y-2">
                        <Label className="text-gray-700 font-semibold text-sm">Tipo de Unidade *</Label>
                        <Select
                            value={formData.tipo_unidade_id}
                            onValueChange={handleTipoChange}
                        >
                            <SelectTrigger className="h-12 rounded-xl bg-white border-gray-200">
                                <SelectValue placeholder="Selecione o tipo..." />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-gray-200">
                                {tiposFiltrados.map(t => (
                                    <SelectItem key={t.id} value={t.id}>
                                        <div className="flex items-center gap-2">
                                            <Building2 className="h-4 w-4 text-gray-400" />
                                            {t.nome}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {tiposFiltrados.length === 0 && (
                            <p className="text-xs text-amber-600">
                                Nenhum tipo cadastrado para os serviços selecionados.
                                <Link to={createPageUrl('TiposUnidade')} className="text-indigo-600 ml-1 font-semibold">Cadastrar tipos</Link>
                            </p>
                        )}
                    </div>

                    {/* Código */}
                    <div className="space-y-2">
                        <Label className="text-gray-700 font-semibold text-sm">Código/Identificador</Label>
                        <Input
                            value={formData.codigo_unidade}
                            onChange={(e) => setFormData({ ...formData, codigo_unidade: e.target.value })}
                            placeholder="Ex: ETA-001"
                            className="h-11 rounded-xl bg-white border-gray-200"
                        />
                    </div>

                    {/* Nome */}
                    <div className="space-y-2">
                        <Label className="text-gray-700 font-semibold text-sm">Nome/Descrição</Label>
                        <Input
                            value={formData.nome_unidade}
                            onChange={(e) => setFormData({ ...formData, nome_unidade: e.target.value })}
                            placeholder="Ex: ETA Central"
                            className="h-11 rounded-xl bg-white border-gray-200"
                        />
                    </div>

                    {/* Endereço */}
                    <div className="space-y-2">
                        <Label className="text-gray-700 font-semibold text-sm">Endereço</Label>
                        <Input
                            value={formData.endereco}
                            onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                            placeholder="Rua, número, bairro..."
                            disabled={loadingAddress}
                            className="h-11 rounded-xl bg-white border-gray-200"
                        />
                        {loadingAddress && <p className="text-xs text-gray-400">Obtendo endereço do GPS...</p>}
                    </div>

                    {/* Coordenadas */}
                    <div className="space-y-2">
                        <Label className="text-gray-700 font-semibold text-sm">Coordenadas (WGS 84-EPSG:4326)</Label>
                        <Input
                            value={
                                location
                                    ? (() => {
                                        const latAbs = Math.abs(location.lat);
                                        const lonAbs = Math.abs(location.lng);
                                        const latDeg = Math.floor(latAbs);
                                        const lonDeg = Math.floor(lonAbs);
                                        const latMinFloat = (latAbs - latDeg) * 60;
                                        const lonMinFloat = (lonAbs - lonDeg) * 60;
                                        const latMin = Math.floor(latMinFloat);
                                        const lonMin = Math.floor(lonMinFloat);
                                        const latSec = (latMinFloat - latMin) * 60;
                                        const lonSec = (lonMinFloat - lonMin) * 60;
                                        const latHem = location.lat >= 0 ? 'N' : 'S';
                                        const lonHem = location.lng >= 0 ? 'E' : 'W';
                                        return `${latDeg}° ${latMin}' ${latSec.toFixed(2)}" ${latHem}, ${lonDeg}° ${lonMin}' ${lonSec.toFixed(2)}" ${lonHem}`;
                                    })()
                                    : ''
                            }
                            placeholder="dd° mm' ss.s″ N/S, dd° mm' ss.s″ E/W"
                            disabled
                            className="h-11 rounded-xl bg-gray-50 border-gray-200 font-mono text-xs"
                        />
                    </div>
                    </div>

                    {/* Submit */}
                    <Button
                        type="submit"
                        className="w-full h-14 font-semibold bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl shadow-lg transition-all text-base"
                        disabled={createMutation.isPending || !formData.tipo_unidade_id}
                    >
                        {createMutation.isPending ? (
                            <><Loader2 className="h-5 w-5 mr-2 animate-spin" /> Criando...</>
                        ) : 'Iniciar Vistoria'}
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
