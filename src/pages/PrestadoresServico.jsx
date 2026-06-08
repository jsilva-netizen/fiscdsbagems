import { useState } from 'react';
import { Repository } from '@/lib/offline/repository';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { ArrowLeft, Plus, Edit2, Trash2, AlertTriangle, Eye, Loader2, Upload, Globe, Mail, Phone, MapPin } from 'lucide-react';
import { useModulo } from '@/hooks/useModulo';
import { supabase } from '@/lib/supabase';

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

const SERVICES_BY_DIRETORIA = {
    dsb: ['Abastecimento de Água', 'Esgotamento Sanitário', 'Limpeza Urbana', 'Manejo de Resíduos Sólidos', 'Drenagem Urbana'],
    dtr: ['Rodovias'],
    dge: ['Energia Elétrica', 'Gás Canalizado', 'Iluminação Pública']
};

export default function PrestadoresServico() {
    const queryClient = useQueryClient();
    const { diretoria, isAdmin } = useModulo();
    const [activeTab, setActiveTab] = useState(isAdmin ? 'todos' : diretoria);
    
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState({ open: false, prestadorId: null, step: 1, inputValue: '' });
    const [uploadingLogo, setUploadingLogo] = useState(false);

    const [formData, setFormData] = useState({
        nome: '',
        razao_social: '',
        endereco: '',
        cidade: '',
        telefone: '',
        email_contato: '',
        cnpj: '',
        responsavel: '',
        cargo: '',
        tipo_entidade: 'Concessionária',
        tipo_servico: [],
        logo_url: '',
        status: 'ativa',
        website: '',
        estado: 'MS',
        cep: '',
        observacoes: ''
    });

    const { data: prestadores = [], isLoading } = useQuery({
        queryKey: ['prestadores'],
        queryFn: async () => {
            return await Repository.listPrestadoresFull();
        }
    });

    const { data: fiscalizacoes = [] } = useQuery({
        queryKey: ['fiscalizacoes-todos'],
        queryFn: async () => {
            return await Repository.listFiscalizacoes(500);
        }
    });

    const { data: unidades = [] } = useQuery({
        queryKey: ['unidades-todas'],
        queryFn: async () => {
            if (fiscalizacoes.length === 0) return [];
            const todas = await Promise.all(
                fiscalizacoes.map(f => Repository.listUnidadesByFiscalizacao(f.id, 100))
            );
            return todas.flat();
        }
    });

    const { data: recomendacoes = [] } = useQuery({
        queryKey: ['recomendacoes-todas'],
        queryFn: async () => {
            if (unidades.length === 0) return [];
            const todas = await Promise.all(
                unidades.map(u => Repository.listRecomendacoesByUnidade(u.id))
            );
            return todas.flat();
        }
    });

    const getStatsForPrestador = (prestadorId) => {
        const prestadorFiscalizacoes = fiscalizacoes.filter(f => f.prestador_servico_id === prestadorId);
        const unidadeIds = unidades
            .filter(u => prestadorFiscalizacoes.some(f => f.id === u.fiscalizacao_id))
            .map(u => u.id);

        return {
            fiscalizacoes: prestadorFiscalizacoes.length,
            fiscalizacoesFinalizado: prestadorFiscalizacoes.filter(f => f.status === 'finalizada').length,
            ncs: 0,
            recomendacoes: recomendacoes.filter(r => unidadeIds.includes(r.unidade_fiscalizada_id)).length,
            determinacoes: 0,
            autos: 0
        };
    };

    const filteredPrestadores = prestadores.filter(p => {
        if (!isAdmin) {
            const allowed = SERVICES_BY_DIRETORIA[diretoria] || [];
            return Array.isArray(p.tipo_servico) && p.tipo_servico.some(s => allowed.includes(s));
        }
        if (activeTab === 'todos') return true;
        const allowed = SERVICES_BY_DIRETORIA[activeTab] || [];
        return Array.isArray(p.tipo_servico) && p.tipo_servico.some(s => allowed.includes(s));
    });

    const pageTitle = (!isAdmin && diretoria === 'dsb') ? 'Prestadores de Serviço' : 'Concessionárias';
    const buttonText = (!isAdmin && diretoria === 'dsb') ? 'Novo Prestador' : 'Nova Concessionária';

    const getPageTitleText = () => {
        if (!isAdmin) return pageTitle;
        if (activeTab === 'dsb') return 'Prestadores de Serviço (DSB)';
        if (activeTab === 'dtr') return 'Concessionárias (DTR)';
        if (activeTab === 'dge') return 'Concessionárias (DGE)';
        return 'Entidades Reguladas';
    };

    const criarMutation = useMutation({
        mutationFn: async (data) => {
            const id = await Repository.createPrestador(data);
            return { id };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['prestadores'] });
            resetForm();
            setShowForm(false);
        }
    });

    const atualizarMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            await Repository.updatePrestador(id, data);
            return { id };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['prestadores'] });
            resetForm();
            setShowForm(false);
        }
    });

    const deletarMutation = useMutation({
        mutationFn: async (id) => {
            await Repository.deletePrestador(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['prestadores'] });
            setDeleteConfirmation({ open: false, prestadorId: null, step: 1, inputValue: '' });
        }
    });

    const resetForm = () => {
        setFormData({
            nome: '',
            razao_social: '',
            endereco: '',
            cidade: '',
            telefone: '',
            email_contato: '',
            cnpj: '',
            responsavel: '',
            cargo: '',
            tipo_entidade: 'Concessionária',
            tipo_servico: [],
            logo_url: '',
            status: 'ativa',
            website: '',
            estado: 'MS',
            cep: '',
            observacoes: ''
        });
        setEditingId(null);
    };

    const handleEdit = (prestador) => {
        setFormData({
            nome: prestador.nome || '',
            razao_social: prestador.razao_social || '',
            endereco: prestador.endereco || '',
            cidade: prestador.cidade || '',
            telefone: prestador.telefone || '',
            email_contato: prestador.email_contato || '',
            cnpj: prestador.cnpj || '',
            responsavel: prestador.responsavel || '',
            cargo: prestador.cargo || '',
            tipo_entidade: prestador.tipo_entidade || 'Concessionária',
            tipo_servico: prestador.tipo_servico || [],
            logo_url: prestador.logo_url || '',
            status: prestador.status || 'ativa',
            website: prestador.website || '',
            estado: prestador.estado || 'MS',
            cep: prestador.cep || '',
            observacoes: prestador.observacoes || ''
        });
        setEditingId(prestador.id);
        setShowForm(true);
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
            const base64Data = reader.result;
            setFormData(prev => ({ ...prev, logo_url: base64Data }));

            setUploadingLogo(true);
            try {
                const fileExt = file.name.split('.').pop();
                const fileName = `${crypto.randomUUID()}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('logos-entidades')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('logos-entidades')
                    .getPublicUrl(filePath);

                setFormData(prev => ({ ...prev, logo_url: publicUrl }));
            } catch (err) {
                console.warn('Erro no upload online da logo (mantendo visualização local):', err);
            } finally {
                setUploadingLogo(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const toggleService = (serviceId) => {
        setFormData(prev => {
            const current = prev.tipo_servico || [];
            const next = current.includes(serviceId)
                ? current.filter(x => x !== serviceId)
                : [...current, serviceId];
            return { ...prev, tipo_servico: next };
        });
    };

    const handleSubmit = () => {
        if (!formData.nome || !formData.razao_social || !formData.cnpj || !formData.endereco || !formData.cidade || !formData.estado || !formData.cep) {
            alert('Nome Fantasia, Razão Social, CNPJ, Endereço, Cidade, Estado e CEP são obrigatórios.');
            return;
        }

        if (editingId) {
            atualizarMutation.mutate({ id: editingId, data: formData });
        } else {
            criarMutation.mutate(formData);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
            <div>
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-950 text-white shadow-md">
                    <div className="max-w-4xl mx-auto px-4 py-5 flex items-center gap-3">
                        <Link to={createPageUrl('Home')}>
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full transition-all">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">{getPageTitleText()}</h1>
                            <p className="text-blue-200 text-xs mt-0.5">Gestão de Cadastro e Serviços regulados pela AGEMS</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
                    {/* Controls & Tabs */}
                    <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
                        {isAdmin ? (
                            <div className="flex gap-1 bg-slate-200/60 p-1 rounded-xl text-xs shadow-inner">
                                <button 
                                    type="button" 
                                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${activeTab === 'todos' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                    onClick={() => setActiveTab('todos')}
                                >
                                    Todos
                                </button>
                                <button 
                                    type="button" 
                                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${activeTab === 'dsb' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                    onClick={() => setActiveTab('dsb')}
                                >
                                    DSB (Saneamento)
                                </button>
                                <button 
                                    type="button" 
                                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${activeTab === 'dtr' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                    onClick={() => setActiveTab('dtr')}
                                >
                                    DTR (Rodovias)
                                </button>
                                <button 
                                    type="button" 
                                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${activeTab === 'dge' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                    onClick={() => setActiveTab('dge')}
                                >
                                    DGE (Energia/Gás)
                                </button>
                            </div>
                        ) : (
                            <div className="text-sm text-slate-500 font-medium bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                                Módulo: <span className="text-slate-800 uppercase font-bold">{diretoria}</span>
                            </div>
                        )}
                        <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl shadow transition-all">
                            <Plus className="h-4 w-4 mr-2" />
                            {buttonText}
                        </Button>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-indigo-650" />
                        </div>
                    ) : filteredPrestadores.length === 0 ? (
                        <Card className="border-dashed border-2 border-slate-300 bg-slate-50/50">
                            <CardContent className="p-10 text-center text-gray-500">
                                <p className="font-medium text-slate-600">Nenhuma entidade cadastrada neste filtro.</p>
                                <p className="text-xs text-slate-400 mt-1">Utilize o botão superior para adicionar um novo cadastro.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {filteredPrestadores.map(prestador => (
                                <Card key={prestador.id} className="hover:shadow-md transition-shadow border border-slate-200 rounded-2xl overflow-hidden bg-white">
                                    <CardContent className="p-5 flex gap-4">
                                        {/* Logo/Avatar */}
                                        <div className="flex-shrink-0">
                                            {prestador.logo_url ? (
                                                <img src={prestador.logo_url} alt="Logo" className="w-16 h-16 rounded-xl object-contain border bg-white shadow-sm" />
                                            ) : (
                                                <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center text-indigo-500 border border-indigo-200/50 font-bold text-xl shadow-inner">
                                                    {prestador.nome.substring(0, 2).toUpperCase()}
                                                </div>
                                            )}
                                        </div>
                                        
                                        {/* Details */}
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-start justify-between gap-2 flex-wrap">
                                                <div>
                                                    <h3 className="font-bold text-slate-800 text-base leading-tight truncate">{prestador.nome}</h3>
                                                    <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">{prestador.razao_social}</p>
                                                </div>
                                                <div className="flex gap-1.5 items-center">
                                                    <Badge variant="outline" className="text-[10px] font-semibold py-0.5 bg-slate-55 border-slate-200 text-slate-600 uppercase">
                                                        {prestador.tipo_entidade || 'Concessionária'}
                                                    </Badge>
                                                    <Badge className={`text-[10px] font-semibold py-0.5 uppercase border-none text-white ${
                                                        prestador.status === 'ativa' ? 'bg-emerald-500 hover:bg-emerald-600' : 
                                                        prestador.status === 'suspensa' ? 'bg-amber-500 hover:bg-amber-600' : 
                                                        'bg-rose-500 hover:bg-rose-600'
                                                    }`}>
                                                        {prestador.status || 'Ativa'}
                                                    </Badge>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600 pt-2 font-medium">
                                                <p><span className="text-slate-400">CNPJ:</span> {prestador.cnpj}</p>
                                                {prestador.telefone && <p><span className="text-slate-400">Tel:</span> {prestador.telefone}</p>}
                                                {prestador.email_contato && <p><span className="text-slate-400">Email:</span> {prestador.email_contato}</p>}
                                                {prestador.website && (
                                                    <p className="flex items-center gap-1">
                                                        <Globe className="h-3.5 w-3.5 text-slate-400" />
                                                        <a href={prestador.website.startsWith('http') ? prestador.website : `https://${prestador.website}`} target="_blank" rel="noopener noreferrer" className="text-indigo-650 hover:underline">
                                                            {prestador.website}
                                                        </a>
                                                    </p>
                                                )}
                                                <p className="md:col-span-2 flex items-start gap-1">
                                                    <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 flex-shrink-0" />
                                                    <span>{prestador.endereco}, {prestador.cidade} - {prestador.estado}, CEP {prestador.cep}</span>
                                                </p>
                                            </div>
                                            
                                            {/* Services badges */}
                                            {Array.isArray(prestador.tipo_servico) && prestador.tipo_servico.length > 0 && (
                                                <div className="flex gap-1 flex-wrap pt-2.5">
                                                    {prestador.tipo_servico.map(s => (
                                                        <Badge key={s} variant="secondary" className="text-[10px] py-0 px-2 bg-indigo-50/80 text-indigo-700 hover:bg-indigo-50 border-none font-semibold">
                                                            {s}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            )}
                                            
                                            <div className="text-xs text-gray-500 mt-3 pt-3 border-t flex gap-4 flex-wrap">
                                                {(() => {
                                                    const stats = getStatsForPrestador(prestador.id);
                                                    return (
                                                        <>
                                                            <span>Vistorias em Campo: {stats.fiscalizacoes}</span>
                                                            <span>Recomendações: {stats.recomendacoes}</span>
                                                        </>
                                                    );
                                                })()}
                                            </div>

                                            <div className="flex gap-2 justify-end pt-3 border-t border-slate-100 mt-4">
                                                <Link to={createPageUrl(`DetalhePrestador?id=${prestador.id}`)}>
                                                    <Button size="sm" variant="outline" className="text-xs h-9 border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl">
                                                        <Eye className="h-4 w-4 mr-1 text-slate-400" />
                                                        Detalhes
                                                    </Button>
                                                </Link>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-xs h-9 border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl"
                                                    onClick={() => handleEdit(prestador)}
                                                >
                                                    <Edit2 className="h-4 w-4 mr-1 text-slate-400" />
                                                    Editar
                                                </Button>
                                                <AlertDialog 
                                                    open={deleteConfirmation.open && deleteConfirmation.prestadorId === prestador.id}
                                                    onOpenChange={(open) => {
                                                        if (!open) {
                                                            setDeleteConfirmation({ open: false, prestadorId: null, step: 1, inputValue: '' });
                                                        }
                                                    }}
                                                >
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            className="text-xs h-9 bg-rose-50 hover:bg-rose-100 border-none text-rose-600 hover:text-rose-700 rounded-xl transition-all"
                                                            onClick={() => setDeleteConfirmation({ open: true, prestadorId: prestador.id, step: 1, inputValue: '' })}
                                                        >
                                                            <Trash2 className="h-4 w-4 mr-1" />
                                                            Deletar
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent className="max-w-sm rounded-2xl">
                                                        {deleteConfirmation.step === 1 ? (
                                                            <>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
                                                                        <AlertTriangle className="h-5 w-5" />
                                                                        Excluir Entidade Regulada?
                                                                    </AlertDialogTitle>
                                                                    <AlertDialogDescription className="space-y-2 text-gray-600">
                                                                        <p>Você está prestes a excluir permanentemente:</p>
                                                                        <p className="font-semibold text-gray-800">{prestador.nome}</p>
                                                                        <p className="text-rose-500 text-xs">Esta ação não pode ser desfeita.</p>
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter className="pt-4">
                                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                    <Button
                                                                        variant="destructive"
                                                                        className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
                                                                        onClick={() => setDeleteConfirmation(prev => ({ ...prev, step: 2 }))}
                                                                    >
                                                                        Continuar
                                                                    </Button>
                                                                </AlertDialogFooter>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
                                                                        <AlertTriangle className="h-5 w-5" />
                                                                        Confirmação Final
                                                                    </AlertDialogTitle>
                                                                    <AlertDialogDescription className="space-y-3 text-gray-600">
                                                                        <p>Para confirmar a exclusão, digite <span className="font-bold text-gray-800">EXCLUIR</span> no campo abaixo:</p>
                                                                        <Input
                                                                            placeholder="Digite EXCLUIR"
                                                                            value={deleteConfirmation.inputValue}
                                                                            onChange={(e) => setDeleteConfirmation(prev => ({ ...prev, inputValue: e.target.value }))}
                                                                            className="mt-2 rounded-xl"
                                                                        />
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter className="pt-4">
                                                                    <AlertDialogCancel onClick={() => setDeleteConfirmation({ open: false, prestadorId: null, step: 1, inputValue: '' })}>
                                                                        Cancelar
                                                                    </AlertDialogCancel>
                                                                    <Button
                                                                        variant="destructive"
                                                                        className="bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
                                                                        disabled={deleteConfirmation.inputValue !== 'EXCLUIR' || deletarMutation.isPending}
                                                                        onClick={() => deletarMutation.mutate(prestador.id)}
                                                                    >
                                                                        {deletarMutation.isPending ? 'Excluindo...' : 'Excluir Permanentemente'}
                                                                    </Button>
                                                                </AlertDialogFooter>
                                                            </>
                                                        )}
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Dialog Form */}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="max-w-2xl bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader className="pb-4 border-b">
                        <DialogTitle className="text-xl font-bold text-slate-900">
                            {editingId ? 'Editar Cadastro' : 'Novo Cadastro'}
                        </DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4 pt-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Logo File Selector and Preview */}
                            <div className="md:col-span-2 flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/50">
                                {formData.logo_url ? (
                                    <img src={formData.logo_url} alt="Logo" className="w-16 h-16 rounded-xl object-contain border bg-white shadow-sm" />
                                ) : (
                                    <div className="w-16 h-16 rounded-xl bg-slate-200 flex items-center justify-center text-slate-500 border font-bold text-xs shadow-inner">
                                        LOGO
                                    </div>
                                )}
                                <div className="flex-1 space-y-1">
                                    <Label className="text-xs text-slate-500 font-bold block mb-1">Logo da Entidade (PNG ou JPG)</Label>
                                    <div className="flex items-center gap-2">
                                        <Input type="file" accept="image/png, image/jpeg, image/jpg" onChange={handleLogoChange} className="hidden" id="logo-uploader" />
                                        <Label htmlFor="logo-uploader" className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold px-4 py-2.5 rounded-lg border border-indigo-200/50 cursor-pointer transition-all shadow-sm">
                                            <Upload className="h-4 w-4" />
                                            Selecionar Imagem
                                        </Label>
                                    </div>
                                    {uploadingLogo && <span className="text-[10px] text-indigo-600 font-semibold animate-pulse">Enviando logo para servidor...</span>}
                                </div>
                            </div>
                            
                            <div>
                                <Label className="text-slate-700 font-semibold text-xs">Nome Fantasia *</Label>
                                <Input placeholder="Nome Fantasia" value={formData.nome} onChange={(e) => setFormData({ ...formData, nome: e.target.value })} className="rounded-lg mt-1 h-11" />
                            </div>
                            <div>
                                <Label className="text-slate-700 font-semibold text-xs">Razão Social *</Label>
                                <Input placeholder="Razão Social" value={formData.razao_social} onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })} className="rounded-lg mt-1 h-11" />
                            </div>
                            <div>
                                <Label className="text-slate-700 font-semibold text-xs">CNPJ *</Label>
                                <Input placeholder="00.000.000/0000-00" value={formData.cnpj} onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })} className="rounded-lg mt-1 h-11" />
                            </div>
                            <div>
                                <Label className="text-slate-700 font-semibold text-xs">Tipo de Entidade *</Label>
                                <Select value={formData.tipo_entidade} onValueChange={(val) => setFormData({ ...formData, tipo_entidade: val })}>
                                    <SelectTrigger className="rounded-lg mt-1 h-11 bg-white border-slate-200">
                                        <SelectValue placeholder="Selecione o tipo" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white border-slate-200">
                                        <SelectItem value="Concessionária">Concessionária</SelectItem>
                                        <SelectItem value="Órgão ou Entidade Pública">Órgão ou Entidade Pública</SelectItem>
                                        <SelectItem value="Permissionária">Permissionária</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            
                            <div>
                                <Label className="text-slate-700 font-semibold text-xs">Status *</Label>
                                <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                                    <SelectTrigger className="rounded-lg mt-1 h-11 bg-white border-slate-200">
                                        <SelectValue placeholder="Selecione o status" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white border-slate-200">
                                        <SelectItem value="ativa">Ativa</SelectItem>
                                        <SelectItem value="suspensa">Suspensa</SelectItem>
                                        <SelectItem value="encerrada">Encerrada</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-slate-700 font-semibold text-xs">Website</Label>
                                <Input placeholder="www.entidade.com.br" value={formData.website} onChange={(e) => setFormData({ ...formData, website: e.target.value })} className="rounded-lg mt-1 h-11" />
                            </div>
                            <div>
                                <Label className="text-slate-700 font-semibold text-xs">E-mail Principal</Label>
                                <Input type="email" placeholder="contato@entidade.com.br" value={formData.email_contato} onChange={(e) => setFormData({ ...formData, email_contato: e.target.value })} className="rounded-lg mt-1 h-11" />
                            </div>
                            <div>
                                <Label className="text-slate-700 font-semibold text-xs">Telefone</Label>
                                <Input placeholder="(00) 0000-0000" value={formData.telefone} onChange={(e) => setFormData({ ...formData, telefone: e.target.value })} className="rounded-lg mt-1 h-11" />
                            </div>
                            
                            <div className="md:col-span-2">
                                <Label className="text-slate-700 font-semibold text-xs">Endereço *</Label>
                                <Input placeholder="Rua, Número, Bairro, etc." value={formData.endereco} onChange={(e) => setFormData({ ...formData, endereco: e.target.value })} className="rounded-lg mt-1 h-11" />
                            </div>
                            
                            <div>
                                <Label className="text-slate-700 font-semibold text-xs">Cidade *</Label>
                                <Input placeholder="Cidade" value={formData.cidade} onChange={(e) => setFormData({ ...formData, cidade: e.target.value })} className="rounded-lg mt-1 h-11" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label className="text-slate-700 font-semibold text-xs">Estado *</Label>
                                    <Input placeholder="UF" maxLength={2} value={formData.estado} onChange={(e) => setFormData({ ...formData, estado: e.target.value.toUpperCase() })} className="rounded-lg mt-1 h-11" />
                                </div>
                                <div>
                                    <Label className="text-slate-700 font-semibold text-xs">CEP *</Label>
                                    <Input placeholder="00000-000" value={formData.cep} onChange={(e) => setFormData({ ...formData, cep: e.target.value })} className="rounded-lg mt-1 h-11" />
                                </div>
                            </div>
                            
                            <div>
                                <Label className="text-slate-700 font-semibold text-xs">Representante Legal</Label>
                                <Input placeholder="Nome do Representante" value={formData.responsavel} onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })} className="rounded-lg mt-1 h-11" />
                            </div>
                            <div>
                                <Label className="text-slate-700 font-semibold text-xs">Cargo</Label>
                                <Input placeholder="Cargo do Representante" value={formData.cargo} onChange={(e) => setFormData({ ...formData, cargo: e.target.value })} className="rounded-lg mt-1 h-11" />
                            </div>
                            
                            <div className="md:col-span-2">
                                <Label className="text-slate-700 font-semibold text-xs">Observações</Label>
                                <Textarea placeholder="Informações adicionais..." value={formData.observacoes} onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })} className="rounded-lg mt-1" rows={2} />
                            </div>
                            
                            <div className="md:col-span-2">
                                <Label className="text-slate-700 font-semibold text-xs mb-2 block">Tipos de Serviço Prestados</Label>
                                <div className="grid grid-cols-2 gap-2 border border-slate-200 p-4 rounded-xl bg-slate-50/50 max-h-40 overflow-y-auto">
                                    {AVAILABLE_SERVICES.map(s => (
                                        <label key={s.id} className="flex items-center gap-2.5 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                                            <input 
                                                type="checkbox" 
                                                checked={(formData.tipo_servico || []).includes(s.id)}
                                                onChange={() => toggleService(s.id)}
                                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                            />
                                            <span>{s.label} <span className="text-[9px] text-slate-400 uppercase font-mono">({s.group})</span></span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-2.5 pt-4 border-t mt-6">
                            <Button
                                className="flex-1 h-11 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl shadow-lg transition-all font-semibold"
                                onClick={handleSubmit}
                                disabled={criarMutation.isPending || atualizarMutation.isPending}
                            >
                                {criarMutation.isPending || atualizarMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : null}
                                Salvar Cadastro
                            </Button>
                            <Button variant="outline" className="h-11 border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl px-6" onClick={() => setShowForm(false)}>
                                Cancelar
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Footer */}
            <div className="py-5 text-center text-xs text-slate-400 bg-white border-t border-slate-200">
                AGEMS - Agência Estadual de Regulação de Serviços Públicos de MS
            </div>
        </div>
    );
}
