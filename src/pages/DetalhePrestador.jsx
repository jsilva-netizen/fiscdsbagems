import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Repository } from '@/lib/offline/repository';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ArrowLeft, Mail, Phone, Globe, MapPin, Building2, Edit2, Save, Loader2, Upload, FileText, CheckCircle2, Clock, AlertCircle, User } from 'lucide-react';
import HistoricoFiscalizacoes from '@/components/prestador/HistoricoFiscalizacoes';
import HistoricoDeterminacoes from '@/components/prestador/HistoricoDeterminacoes';
import HistoricoAutos from '@/components/prestador/HistoricoAutos';
import DocumentosManager from '@/components/prestador/DocumentosManager';

const AVAILABLE_SERVICES = [
    { id: 'Abastecimento de Água', label: 'Abastecimento de Água', group: 'DSB' },
    { id: 'Esgotamento Sanitário', label: 'Esgotamento Sanitário', group: 'DSB' },
    { id: 'Limpeza Urbana', label: 'Limpeza Urbana', group: 'DSB' },
    { id: 'Manejo de Resíduos Sólidos', label: 'Manejo de Resíduos Sólidos', group: 'DSB' },
    { id: 'Drenagem Urbana', label: 'Drenagem Urbana', group: 'DSB' },
    { id: 'Energia Elétrica', label: 'Energia Elétrica', group: 'DGE' },
    { id: 'Gás Canalizado', label: 'Gás Canalizado', group: 'DGE' },
    { id: 'Iluminação Pública', label: 'Iluminação Pública', group: 'DGE' },
    { id: 'Rodovias', label: 'Rodovias', group: 'DTR' }
];

export default function DetalhePrestador() {
    const [searchParams] = useSearchParams();
    const prestadorId = searchParams.get('id');
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [isUploadingDoc, setIsUploadingDoc] = useState(false);
    const [uploadingLogo, setUploadingLogo] = useState(false);

    const { data: prestador, isLoading: isLoadingPrestador } = useQuery({
        queryKey: ['prestador', prestadorId],
        queryFn: async () => await Repository.getPrestadorById(prestadorId),
        enabled: !!prestadorId
    });

    const { data: fiscalizacoes = [] } = useQuery({
        queryKey: ['fiscalizacoes-prestador', prestadorId],
        queryFn: async () => await Repository.listFiscalizacoesByPrestador(prestadorId, 500),
        enabled: !!prestadorId
    });

    const { data: unidades = [] } = useQuery({
        queryKey: ['unidades-fiscalizacoes', prestadorId],
        queryFn: async () => {
            if (fiscalizacoes.length === 0) return [];
            const lists = await Promise.all(fiscalizacoes.map(f => Repository.listUnidadesByFiscalizacao(f.id, 200)));
            return lists.flat();
        },
        enabled: fiscalizacoes.length > 0
    });

    const { data: ncs = [] } = useQuery({
        queryKey: ['ncs-prestador', prestadorId],
        queryFn: async () => {
            if (unidades.length === 0) return [];
            const counts = await Promise.all(unidades.map(u => Repository.countNCsByUnidade(u.id)));
            const total = counts.reduce((a, b) => a + b, 0);
            return Array.from({ length: total }, (_, i) => ({ id: i + 1 }));
        },
        enabled: unidades.length > 0
    });

    const { data: determinacoes = [] } = useQuery({
        queryKey: ['determinacoes-prestador', prestadorId],
        queryFn: async () => {
            if (unidades.length === 0) return [];
            const counts = await Promise.all(unidades.map(u => Repository.countDeterminacoesByUnidade(u.id)));
            const total = counts.reduce((a, b) => a + b, 0);
            return Array.from({ length: total }, (_, i) => ({ id: i + 1 }));
        },
        enabled: unidades.length > 0
    });

    const { data: respostas = [] } = useQuery({
        queryKey: ['respostas-determinacoes'],
        queryFn: async () => [],
        enabled: determinacoes.length > 0
    });

    const { data: autos = [] } = useQuery({
        queryKey: ['autos-prestador', prestadorId],
        queryFn: async () => [],
        enabled: !!prestadorId
    });

    const { data: municipios = [] } = useQuery({
        queryKey: ['municipios'],
        queryFn: async () => await Repository.listMunicipios()
    });

    const atualizarMutation = useMutation({
        mutationFn: async (data) => {
            await Repository.updatePrestador(prestadorId, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['prestador', prestadorId] });
            setIsEditing(false);
        }
    });

    const handleOpenEdit = () => {
        setEditForm({
            nome: prestador.nome || '',
            razao_social: prestador.razao_social || '',
            cnpj: prestador.cnpj || '',
            tipo_entidade: prestador.tipo_entidade || 'Concessionária',
            tipo_servico: prestador.tipo_servico || [],
            status: prestador.status || 'ativa',
            email_contato: prestador.email_contato || '',
            telefone: prestador.telefone || '',
            website: prestador.website || '',
            endereco: prestador.endereco || '',
            cidade: prestador.cidade || '',
            estado: prestador.estado || 'MS',
            cep: prestador.cep || '',
            responsavel: prestador.responsavel || '',
            cargo: prestador.cargo || '',
            observacoes: prestador.observacoes || '',
            logo_url: prestador.logo_url || '',
        });
        setIsEditing(true);
    };

    const handleLogoChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!['image/png', 'image/jpeg', 'image/jpg'].includes(file.type)) {
            alert('Apenas arquivos PNG ou JPG são permitidos.');
            return;
        }
        const reader = new FileReader();
        reader.onloadend = async () => {
            setEditForm(prev => ({ ...prev, logo_url: reader.result }));
            setUploadingLogo(true);
            try {
                const fileExt = file.name.split('.').pop();
                const fileName = `${crypto.randomUUID()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage.from('logos-entidades').upload(fileName, file);
                if (uploadError) throw uploadError;
                const { data: { publicUrl } } = supabase.storage.from('logos-entidades').getPublicUrl(fileName);
                setEditForm(prev => ({ ...prev, logo_url: publicUrl }));
            } catch (err) {
                console.warn('Upload logo error (mantendo preview local):', err);
            } finally {
                setUploadingLogo(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const toggleService = (serviceId) => {
        setEditForm(prev => {
            const current = prev.tipo_servico || [];
            const next = current.includes(serviceId) ? current.filter(x => x !== serviceId) : [...current, serviceId];
            return { ...prev, tipo_servico: next };
        });
    };

    const handleSaveEdit = () => {
        if (!editForm.nome || !editForm.razao_social || !editForm.cnpj) {
            alert('Nome Fantasia, Razão Social e CNPJ são obrigatórios.');
            return;
        }
        atualizarMutation.mutate(editForm);
    };

    const handleUploadDocumento = async (file, tipo) => {
        setIsUploadingDoc(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${prestadorId}/${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('documentos-prestadores').upload(fileName, file);
            if (uploadError) throw uploadError;
            const novoDoc = {
                nome: file.name,
                tipo,
                url: `storage://documentos-prestadores/${fileName}`,
                bucket: 'documentos-prestadores',
                path: fileName,
                data_upload: new Date().toISOString()
            };
            const docsAtualizados = [...(prestador?.documentos || []), novoDoc];
            await atualizarMutation.mutateAsync({ documentos: docsAtualizados });
            alert('Documento anexado com sucesso!');
        } catch (error) {
            alert('Erro ao fazer upload: ' + error.message);
        } finally {
            setIsUploadingDoc(false);
        }
    };

    const handleDeleteDocumento = async (index) => {
        if (!confirm('Tem certeza que deseja excluir este documento?')) return;
        try {
            const docToDelete = prestador.documentos[index];
            if (docToDelete.path) {
                await supabase.storage.from('documentos-prestadores').remove([docToDelete.path]);
            }
            const docsAtualizados = prestador.documentos.filter((_, i) => i !== index);
            await atualizarMutation.mutateAsync({ documentos: docsAtualizados });
        } catch (error) {
            alert('Erro ao excluir documento');
        }
    };

    if (isLoadingPrestador || !prestador) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
            </div>
        );
    }

    const statusColor = prestador.status === 'ativa'
        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
        : prestador.status === 'suspensa'
            ? 'bg-amber-100 text-amber-700 border-amber-200'
            : 'bg-rose-100 text-rose-700 border-rose-200';

    const fiscFinalizadas = fiscalizacoes.filter(f => f.status === 'finalizada').length;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-950 text-white shadow-md">
                <div className="max-w-6xl mx-auto px-4 py-5">
                    <div className="flex items-center gap-4">
                        <Link to={createPageUrl('PrestadoresServico')}>
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        {/* Logo + Title */}
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                            {prestador.logo_url ? (
                                <img src={prestador.logo_url} alt="Logo" className="w-14 h-14 rounded-xl object-contain bg-white border border-white/20 shadow-md flex-shrink-0" />
                            ) : (
                                <div className="w-14 h-14 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center font-bold text-lg flex-shrink-0 shadow-md">
                                    {prestador.nome.substring(0, 2).toUpperCase()}
                                </div>
                            )}
                            <div className="min-w-0">
                                <h1 className="text-2xl font-bold truncate">{prestador.nome}</h1>
                                <p className="text-blue-200 text-sm truncate">{prestador.razao_social}</p>
                                <div className="flex items-center gap-3 mt-1 flex-wrap">
                                    {prestador.email_contato && (
                                        <span className="flex items-center gap-1 text-blue-200 text-xs">
                                            <Mail className="h-3.5 w-3.5" /> {prestador.email_contato}
                                        </span>
                                    )}
                                    {prestador.telefone && (
                                        <span className="flex items-center gap-1 text-blue-200 text-xs">
                                            <Phone className="h-3.5 w-3.5" /> {prestador.telefone}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${statusColor}`}>
                                {prestador.status || 'Ativa'}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                className="bg-white/10 border-white/30 text-white hover:bg-white/20 rounded-xl"
                                onClick={handleOpenEdit}
                            >
                                <Edit2 className="h-4 w-4 mr-1.5" />
                                Editar
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats bar */}
            <div className="bg-white border-b border-gray-200 shadow-sm">
                <div className="max-w-6xl mx-auto px-4 py-3">
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-center">
                        {[
                            { label: 'Fiscalizações', value: fiscalizacoes.length, color: 'text-indigo-600', icon: <FileText className="h-4 w-4" /> },
                            { label: 'Finalizadas', value: fiscFinalizadas, color: 'text-emerald-600', icon: <CheckCircle2 className="h-4 w-4" /> },
                            { label: 'Em Andamento', value: fiscalizacoes.length - fiscFinalizadas, color: 'text-sky-600', icon: <Clock className="h-4 w-4" /> },
                            { label: 'NCs', value: ncs.length, color: 'text-red-600', icon: <AlertCircle className="h-4 w-4" /> },
                            { label: 'Determinações', value: determinacoes.length, color: 'text-amber-600', icon: <AlertCircle className="h-4 w-4" /> },
                            { label: 'Documentos', value: prestador.documentos?.length || 0, color: 'text-teal-600', icon: <FileText className="h-4 w-4" /> },
                        ].map((stat, i) => (
                            <div key={i} className="flex flex-col items-center gap-0.5 py-1">
                                <div className={`${stat.color} opacity-60`}>{stat.icon}</div>
                                <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                                <p className="text-[11px] text-gray-400 font-medium">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-4 py-6">
                <Tabs defaultValue="info" className="w-full">
                    <TabsList className="grid w-full grid-cols-5 mb-6 bg-white border border-gray-200 rounded-xl shadow-sm p-1 h-auto">
                        <TabsTrigger value="info" className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white py-2 text-xs font-semibold">Informações</TabsTrigger>
                        <TabsTrigger value="fiscalizacoes" className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white py-2 text-xs font-semibold">Fiscalizações ({fiscalizacoes.length})</TabsTrigger>
                        <TabsTrigger value="determinacoes" className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white py-2 text-xs font-semibold">Determinações ({determinacoes.length})</TabsTrigger>
                        <TabsTrigger value="autos" className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white py-2 text-xs font-semibold">Autos ({autos.length})</TabsTrigger>
                        <TabsTrigger value="documentos" className="rounded-lg data-[state=active]:bg-indigo-600 data-[state=active]:text-white py-2 text-xs font-semibold">Documentos</TabsTrigger>
                    </TabsList>

                    <TabsContent value="info" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Dados Gerais */}
                            <Card className="border border-gray-200 rounded-2xl shadow-sm">
                                <CardHeader className="pb-3 border-b border-gray-100">
                                    <CardTitle className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                        <Building2 className="h-4 w-4 text-indigo-500" /> Dados Gerais
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-3">
                                    {[
                                        { label: 'Nome Fantasia', value: prestador.nome },
                                        { label: 'Razão Social', value: prestador.razao_social },
                                        { label: 'CNPJ', value: prestador.cnpj },
                                        { label: 'Tipo de Entidade', value: prestador.tipo_entidade },
                                    ].map(item => item.value && (
                                        <div key={item.label}>
                                            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">{item.label}</p>
                                            <p className="text-sm text-gray-800 font-medium mt-0.5">{item.value}</p>
                                        </div>
                                    ))}
                                    {Array.isArray(prestador.tipo_servico) && prestador.tipo_servico.length > 0 && (
                                        <div>
                                            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Serviços Prestados</p>
                                            <div className="flex flex-wrap gap-1.5">
                                                {prestador.tipo_servico.map(s => (
                                                    <Badge key={s} className="text-[10px] bg-indigo-50 text-indigo-700 border-none font-semibold">{s}</Badge>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Contato & Endereço */}
                            <Card className="border border-gray-200 rounded-2xl shadow-sm">
                                <CardHeader className="pb-3 border-b border-gray-100">
                                    <CardTitle className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-indigo-500" /> Contato & Endereço
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-3">
                                    {prestador.email_contato && (
                                        <div className="flex items-center gap-2 text-sm text-gray-700">
                                            <Mail className="h-4 w-4 text-gray-400" />
                                            <a href={`mailto:${prestador.email_contato}`} className="hover:text-indigo-600 hover:underline">{prestador.email_contato}</a>
                                        </div>
                                    )}
                                    {prestador.telefone && (
                                        <div className="flex items-center gap-2 text-sm text-gray-700">
                                            <Phone className="h-4 w-4 text-gray-400" />
                                            <span>{prestador.telefone}</span>
                                        </div>
                                    )}
                                    {prestador.website && (
                                        <div className="flex items-center gap-2 text-sm text-gray-700">
                                            <Globe className="h-4 w-4 text-gray-400" />
                                            <a href={prestador.website.startsWith('http') ? prestador.website : `https://${prestador.website}`} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">{prestador.website}</a>
                                        </div>
                                    )}
                                    {(prestador.endereco || prestador.cidade) && (
                                        <div className="flex items-start gap-2 text-sm text-gray-700">
                                            <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                            <span>{[prestador.endereco, prestador.cidade, prestador.estado, prestador.cep ? `CEP ${prestador.cep}` : ''].filter(Boolean).join(', ')}</span>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Representante */}
                            {(prestador.responsavel || prestador.cargo) && (
                                <Card className="border border-gray-200 rounded-2xl shadow-sm">
                                    <CardHeader className="pb-3 border-b border-gray-100">
                                        <CardTitle className="text-sm font-bold text-gray-700 flex items-center gap-2">
                                            <User className="h-4 w-4 text-indigo-500" /> Representante Legal
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-4 space-y-2">
                                        {prestador.responsavel && <p className="text-sm text-gray-800 font-semibold">{prestador.responsavel}</p>}
                                        {prestador.cargo && <p className="text-xs text-gray-500">{prestador.cargo}</p>}
                                    </CardContent>
                                </Card>
                            )}

                            {/* Observações */}
                            {prestador.observacoes && (
                                <Card className="border border-gray-200 rounded-2xl shadow-sm">
                                    <CardHeader className="pb-3 border-b border-gray-100">
                                        <CardTitle className="text-sm font-bold text-gray-700">Observações</CardTitle>
                                    </CardHeader>
                                    <CardContent className="pt-4">
                                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{prestador.observacoes}</p>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="fiscalizacoes">
                        <HistoricoFiscalizacoes fiscalizacoes={fiscalizacoes} municipios={municipios} />
                    </TabsContent>

                    <TabsContent value="determinacoes">
                        <HistoricoDeterminacoes determinacoes={determinacoes} respostas={respostas} />
                    </TabsContent>

                    <TabsContent value="autos">
                        <HistoricoAutos autos={autos} />
                    </TabsContent>

                    <TabsContent value="documentos">
                        <DocumentosManager
                            documentos={prestador.documentos || []}
                            onUpload={handleUploadDocumento}
                            onDelete={handleDeleteDocumento}
                            isUploading={isUploadingDoc}
                        />
                    </TabsContent>
                </Tabs>
            </div>

            {/* Edit Dialog */}
            <Dialog open={isEditing} onOpenChange={setIsEditing}>
                <DialogContent className="max-w-2xl bg-white border border-gray-200 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="pb-4 border-b border-gray-100">
                        <DialogTitle className="text-xl font-bold text-gray-900">Editar Cadastro</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Logo */}
                            <div className="md:col-span-2 flex items-center gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200">
                                {editForm.logo_url ? (
                                    <img src={editForm.logo_url} alt="Logo" className="w-16 h-16 rounded-xl object-contain border bg-white shadow-sm" />
                                ) : (
                                    <div className="w-16 h-16 rounded-xl bg-gray-200 flex items-center justify-center text-gray-500 border font-bold text-xs shadow-inner">
                                        LOGO
                                    </div>
                                )}
                                <div className="flex-1 space-y-1">
                                    <Label className="text-xs text-gray-500 font-bold block mb-1">Logo da Entidade (PNG ou JPG)</Label>
                                    <div className="flex items-center gap-2">
                                        <Input type="file" accept="image/png, image/jpeg, image/jpg" onChange={handleLogoChange} className="hidden" id="logo-uploader-edit" />
                                        <Label htmlFor="logo-uploader-edit" className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold px-4 py-2.5 rounded-lg border border-indigo-200 cursor-pointer transition-all">
                                            <Upload className="h-4 w-4" /> Selecionar Imagem
                                        </Label>
                                    </div>
                                    {uploadingLogo && <span className="text-[10px] text-indigo-600 font-semibold animate-pulse">Enviando logo para servidor...</span>}
                                </div>
                            </div>

                            <div>
                                <Label className="text-gray-700 font-semibold text-xs">Nome Fantasia *</Label>
                                <Input value={editForm.nome || ''} onChange={e => setEditForm({ ...editForm, nome: e.target.value })} className="rounded-lg mt-1 h-11" placeholder="Nome Fantasia" />
                            </div>
                            <div>
                                <Label className="text-gray-700 font-semibold text-xs">Razão Social *</Label>
                                <Input value={editForm.razao_social || ''} onChange={e => setEditForm({ ...editForm, razao_social: e.target.value })} className="rounded-lg mt-1 h-11" placeholder="Razão Social" />
                            </div>
                            <div>
                                <Label className="text-gray-700 font-semibold text-xs">CNPJ *</Label>
                                <Input value={editForm.cnpj || ''} onChange={e => setEditForm({ ...editForm, cnpj: e.target.value })} className="rounded-lg mt-1 h-11" placeholder="00.000.000/0000-00" />
                            </div>
                            <div>
                                <Label className="text-gray-700 font-semibold text-xs">Tipo de Entidade *</Label>
                                <Select value={editForm.tipo_entidade || 'Concessionária'} onValueChange={val => setEditForm({ ...editForm, tipo_entidade: val })}>
                                    <SelectTrigger className="rounded-lg mt-1 h-11 bg-white border-gray-200"><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-white border-gray-200">
                                        <SelectItem value="Concessionária">Concessionária</SelectItem>
                                        <SelectItem value="Órgão ou Entidade Pública">Órgão ou Entidade Pública</SelectItem>
                                        <SelectItem value="Permissionária">Permissionária</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-gray-700 font-semibold text-xs">Status *</Label>
                                <Select value={editForm.status || 'ativa'} onValueChange={val => setEditForm({ ...editForm, status: val })}>
                                    <SelectTrigger className="rounded-lg mt-1 h-11 bg-white border-gray-200"><SelectValue /></SelectTrigger>
                                    <SelectContent className="bg-white border-gray-200">
                                        <SelectItem value="ativa">Ativa</SelectItem>
                                        <SelectItem value="suspensa">Suspensa</SelectItem>
                                        <SelectItem value="encerrada">Encerrada</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-gray-700 font-semibold text-xs">E-mail Principal</Label>
                                <Input type="email" value={editForm.email_contato || ''} onChange={e => setEditForm({ ...editForm, email_contato: e.target.value })} className="rounded-lg mt-1 h-11" placeholder="contato@entidade.com.br" />
                            </div>
                            <div>
                                <Label className="text-gray-700 font-semibold text-xs">Telefone</Label>
                                <Input value={editForm.telefone || ''} onChange={e => setEditForm({ ...editForm, telefone: e.target.value })} className="rounded-lg mt-1 h-11" placeholder="(00) 0000-0000" />
                            </div>
                            <div>
                                <Label className="text-gray-700 font-semibold text-xs">Website</Label>
                                <Input value={editForm.website || ''} onChange={e => setEditForm({ ...editForm, website: e.target.value })} className="rounded-lg mt-1 h-11" placeholder="www.entidade.com.br" />
                            </div>
                            <div className="md:col-span-2">
                                <Label className="text-gray-700 font-semibold text-xs">Endereço *</Label>
                                <Input value={editForm.endereco || ''} onChange={e => setEditForm({ ...editForm, endereco: e.target.value })} className="rounded-lg mt-1 h-11" placeholder="Rua, Número, Bairro" />
                            </div>
                            <div>
                                <Label className="text-gray-700 font-semibold text-xs">Cidade *</Label>
                                <Input value={editForm.cidade || ''} onChange={e => setEditForm({ ...editForm, cidade: e.target.value })} className="rounded-lg mt-1 h-11" placeholder="Cidade" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label className="text-gray-700 font-semibold text-xs">Estado *</Label>
                                    <Input value={editForm.estado || ''} maxLength={2} onChange={e => setEditForm({ ...editForm, estado: e.target.value.toUpperCase() })} className="rounded-lg mt-1 h-11" placeholder="UF" />
                                </div>
                                <div>
                                    <Label className="text-gray-700 font-semibold text-xs">CEP *</Label>
                                    <Input value={editForm.cep || ''} onChange={e => setEditForm({ ...editForm, cep: e.target.value })} className="rounded-lg mt-1 h-11" placeholder="00000-000" />
                                </div>
                            </div>
                            <div>
                                <Label className="text-gray-700 font-semibold text-xs">Representante Legal</Label>
                                <Input value={editForm.responsavel || ''} onChange={e => setEditForm({ ...editForm, responsavel: e.target.value })} className="rounded-lg mt-1 h-11" placeholder="Nome do Representante" />
                            </div>
                            <div>
                                <Label className="text-gray-700 font-semibold text-xs">Cargo</Label>
                                <Input value={editForm.cargo || ''} onChange={e => setEditForm({ ...editForm, cargo: e.target.value })} className="rounded-lg mt-1 h-11" placeholder="Cargo do Representante" />
                            </div>
                            <div className="md:col-span-2">
                                <Label className="text-gray-700 font-semibold text-xs">Observações</Label>
                                <Textarea value={editForm.observacoes || ''} onChange={e => setEditForm({ ...editForm, observacoes: e.target.value })} className="rounded-lg mt-1" rows={2} placeholder="Informações adicionais..." />
                            </div>
                            <div className="md:col-span-2">
                                <Label className="text-gray-700 font-semibold text-xs mb-2 block">Tipos de Serviço Prestados</Label>
                                <div className="grid grid-cols-2 gap-2 border border-gray-200 p-4 rounded-xl bg-gray-50 max-h-40 overflow-y-auto">
                                    {AVAILABLE_SERVICES.map(s => (
                                        <label key={s.id} className="flex items-center gap-2.5 text-xs font-semibold text-gray-700 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={(editForm.tipo_servico || []).includes(s.id)}
                                                onChange={() => toggleService(s.id)}
                                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                            />
                                            <span>{s.label} <span className="text-[9px] text-gray-400 uppercase font-mono">({s.group})</span></span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2.5 pt-4 border-t border-gray-100">
                            <Button
                                className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow font-semibold"
                                onClick={handleSaveEdit}
                                disabled={atualizarMutation.isPending}
                            >
                                {atualizarMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                Salvar Alterações
                            </Button>
                            <Button variant="outline" className="h-11 border-gray-200 hover:bg-gray-50 text-gray-600 rounded-xl px-6" onClick={() => setIsEditing(false)}>
                                Cancelar
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
