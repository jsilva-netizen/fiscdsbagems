import { useState } from 'react';
import { Repository } from '@/lib/offline/repository';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Plus, Edit2, Trash2, AlertTriangle, Eye, Loader2, Link2, MapPin, Settings2 } from 'lucide-react';
import CaterfLayout from '@/components/caterf/CaterfLayout';

export default function Contratos() {
    const queryClient = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState({ open: false, contratoId: null, step: 1, inputValue: '' });

    const [formData, setFormData] = useState({
        numero_contrato: '',
        prestador_servico_id: '',
        rodovia: '',
        ativo: true
    });

    // Load Contracts
    const { data: contratos = [], isLoading: isLoadingContratos } = useQuery({
        queryKey: ['contratos'],
        queryFn: async () => await Repository.listContratos()
    });

    // Load Concessionaires (filtered for DTR/Rodovias)
    const { data: concessionarias = [], isLoading: isLoadingConcess } = useQuery({
        queryKey: ['prestadores', 'dtr-only'],
        queryFn: async () => await Repository.listPrestadoresFull('dtr')
    });

    const criarMutation = useMutation({
        mutationFn: async (data) => {
            const id = await Repository.createContrato(data);
            return { id };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contratos'] });
            resetForm();
            setShowForm(false);
        }
    });

    const atualizarMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            await Repository.updateContrato(id, data);
            return { id };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contratos'] });
            resetForm();
            setShowForm(false);
        }
    });

    const deletarMutation = useMutation({
        mutationFn: async (id) => {
            await Repository.deleteContrato(id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['contratos'] });
            setDeleteConfirmation({ open: false, contratoId: null, step: 1, inputValue: '' });
        }
    });

    const resetForm = () => {
        setFormData({
            numero_contrato: '',
            prestador_servico_id: '',
            rodovia: '',
            ativo: true
        });
        setEditingId(null);
    };

    const handleEdit = (contrato) => {
        setFormData({
            numero_contrato: contrato.numero_contrato || '',
            prestador_servico_id: contrato.prestador_servico_id || '',
            rodovia: contrato.rodovia || '',
            ativo: contrato.ativo !== false
        });
        setEditingId(contrato.id);
        setShowForm(true);
    };

    const handleSubmit = () => {
        if (!formData.numero_contrato || !formData.prestador_servico_id || !formData.rodovia) {
            alert('Por favor, preencha todos os campos obrigatórios (*).');
            return;
        }

        if (editingId) {
            atualizarMutation.mutate({ id: editingId, data: formData });
        } else {
            criarMutation.mutate(formData);
        }
    };

    const getConcessionariaName = (id) => {
        const found = concessionarias.find(c => c.id === id);
        return found ? found.nome : 'Concessionária desconhecida';
    };

    const getConcessionariaLogo = (id) => {
        const found = concessionarias.find(c => c.id === id);
        return found ? found.logo_url : null;
    };

    return (
        <CaterfLayout>
            <div>
                {/* Header */}
                <div className="max-w-6xl mx-auto px-4 pt-8">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                            <h1 className="text-xs font-bold uppercase tracking-widest text-slate-400">Contratos</h1>
                        </div>
                        <div className="flex gap-2">
                            <Link to={createPageUrl('ConfiguracoesDTR')}>
                                <Button variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 rounded-xl gap-1.5">
                                    <Settings2 className="h-4 w-4" />
                                    Config. DTR
                                </Button>
                            </Link>
                            <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow transition-all">
                                <Plus className="h-4 w-4 mr-2" />
                                Novo Contrato
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
                    <div className="text-sm text-slate-500 font-medium bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 inline-block">
                        Total de Contratos: <span className="text-slate-800 font-bold">{contratos.length}</span>
                    </div>

                    {isLoadingContratos || isLoadingConcess ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
                        </div>
                    ) : contratos.length === 0 ? (
                        <Card className="border-dashed border-2 border-slate-300 bg-slate-50/50">
                            <CardContent className="p-10 text-center text-gray-500">
                                <p className="font-medium text-slate-600">Nenhum contrato cadastrado.</p>
                                <p className="text-xs text-slate-400 mt-1">Clique em "Novo Contrato" para iniciar.</p>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid gap-4">
                            {contratos.map(contrato => {
                                const logo = getConcessionariaLogo(contrato.prestador_servico_id);
                                const concessionariaNome = getConcessionariaName(contrato.prestador_servico_id);
                                return (
                                    <Card key={contrato.id} className="hover:shadow-md transition-shadow border border-slate-200 rounded-2xl overflow-hidden bg-white">
                                        <CardContent className="p-5 flex gap-4 items-center">
                                            {/* Concessionaria Logo Preview */}
                                            <div className="flex-shrink-0">
                                                {logo ? (
                                                    <img src={logo} alt="Logo" className="w-12 h-12 rounded-lg object-contain border bg-white shadow-sm" />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center text-slate-400 border border-slate-250 font-bold text-xs shadow-inner">
                                                        ROD
                                                    </div>
                                                )}
                                            </div>

                                            {/* Contract Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-bold text-slate-800 text-base leading-tight">
                                                            Contrato nº {contrato.numero_contrato}
                                                        </h3>
                                                        <Badge className={`text-[10px] font-semibold py-0 px-2 border-none text-white ${contrato.ativo ? 'bg-emerald-500' : 'bg-slate-400'}`}>
                                                            {contrato.ativo ? 'Ativo' : 'Inativo'}
                                                        </Badge>
                                                    </div>
                                                    <Badge variant="outline" className="text-xs font-semibold py-0.5 bg-indigo-50 border-indigo-150 text-indigo-700 uppercase flex items-center gap-1">
                                                        <MapPin className="h-3 w-3 text-indigo-500" />
                                                        {contrato.rodovia}
                                                    </Badge>
                                                </div>

                                                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                                                    <Link2 className="h-3.5 w-3.5 text-slate-400" />
                                                    <span>Concessionária: <strong className="text-slate-700">{concessionariaNome}</strong></span>
                                                </p>

                                                {/* Action Buttons */}
                                                <div className="flex gap-2 justify-end pt-3 border-t border-slate-100 mt-4">
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        className="text-xs h-8 border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg"
                                                        onClick={() => handleEdit(contrato)}
                                                    >
                                                        <Edit2 className="h-3.5 w-3.5 mr-1 text-slate-400" />
                                                        Editar
                                                    </Button>
                                                    <AlertDialog 
                                                        open={deleteConfirmation.open && deleteConfirmation.contratoId === contrato.id}
                                                        onOpenChange={(open) => {
                                                            if (!open) {
                                                                setDeleteConfirmation({ open: false, contratoId: null, step: 1, inputValue: '' });
                                                            }
                                                        }}
                                                    >
                                                        <AlertDialogTrigger asChild>
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                className="text-xs h-8 bg-rose-50 hover:bg-rose-100 border-none text-rose-600 hover:text-rose-700 rounded-lg transition-all"
                                                                onClick={() => setDeleteConfirmation({ open: true, contratoId: contrato.id, step: 1, inputValue: '' })}
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5 mr-1" />
                                                                Deletar
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent className="bg-white border border-slate-200 text-slate-900 rounded-2xl shadow-xl">
                                                            {deleteConfirmation.step === 1 ? (
                                                                <>
                                                                    <AlertDialogHeader>
                                                                        <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
                                                                            <AlertTriangle className="h-5 w-5 text-rose-500" />
                                                                            Excluir Contrato de Concessão?
                                                                        </AlertDialogTitle>
                                                                        <AlertDialogDescription className="space-y-2 text-slate-500">
                                                                            <p>Você está prestes a excluir permanentemente o contrato:</p>
                                                                            <p className="font-semibold text-slate-800">nº {contrato.numero_contrato} ({contrato.rodovia})</p>
                                                                            <p className="text-rose-600 text-xs">Esta ação não pode ser desfeita e removerá os vínculos locais.</p>
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter className="pt-4">
                                                                        <AlertDialogCancel className="bg-slate-105 hover:bg-slate-200 border-none text-slate-700 rounded-xl">Cancelar</AlertDialogCancel>
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
                                                                            <AlertTriangle className="h-5 w-5 text-rose-500" />
                                                                            Confirmação Final
                                                                        </AlertDialogTitle>
                                                                        <AlertDialogDescription className="space-y-3 text-slate-500">
                                                                            <p>Para confirmar a exclusão, digite <span className="font-bold text-slate-800">EXCLUIR</span> no campo abaixo:</p>
                                                                            <Input
                                                                                placeholder="Digite EXCLUIR"
                                                                                value={deleteConfirmation.inputValue}
                                                                                onChange={(e) => setDeleteConfirmation(prev => ({ ...prev, inputValue: e.target.value }))}
                                                                                className="mt-2 bg-white border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl h-11"
                                                                            />
                                                                        </AlertDialogDescription>
                                                                    </AlertDialogHeader>
                                                                    <AlertDialogFooter className="pt-4">
                                                                        <AlertDialogCancel className="bg-slate-105 hover:bg-slate-200 border-none text-slate-700 rounded-xl" onClick={() => setDeleteConfirmation({ open: false, contratoId: null, step: 1, inputValue: '' })}>
                                                                            Cancelar
                                                                        </AlertDialogCancel>
                                                                        <Button
                                                                            variant="destructive"
                                                                            className="bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-xl"
                                                                            disabled={deleteConfirmation.inputValue !== 'EXCLUIR' || deletarMutation.isPending}
                                                                            onClick={() => deletarMutation.mutate(contrato.id)}
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
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Dialog Form */}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent className="max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl">
                    <DialogHeader className="pb-3 border-b">
                        <DialogTitle className="text-xl font-bold text-slate-900">
                            {editingId ? 'Editar Contrato' : 'Novo Contrato'}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 pt-4">
                        <div className="space-y-3">
                            <div>
                                <Label className="text-slate-700 font-semibold text-xs">Número do Contrato *</Label>
                                <Input placeholder="Ex: 001/2014" value={formData.numero_contrato} onChange={(e) => setFormData({ ...formData, numero_contrato: e.target.value })} className="rounded-lg mt-1 h-11" />
                            </div>

                            <div>
                                <Label className="text-slate-700 font-semibold text-xs">Rodovia *</Label>
                                <Input placeholder="Ex: BR-163, MS-306, MS-112" value={formData.rodovia} onChange={(e) => setFormData({ ...formData, rodovia: e.target.value })} className="rounded-lg mt-1 h-11" />
                            </div>

                            <div>
                                <Label className="text-slate-700 font-semibold text-xs">Concessionária Vinculada *</Label>
                                <Select value={formData.prestador_servico_id} onValueChange={(val) => setFormData({ ...formData, prestador_servico_id: val })}>
                                    <SelectTrigger className="rounded-lg mt-1 h-11 bg-white border-slate-200">
                                        <SelectValue placeholder="Selecione a concessionária..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white border-slate-200">
                                        {concessionarias.map(c => (
                                            <SelectItem key={c.id} value={c.id} className="focus:bg-indigo-600 hover:bg-indigo-600">
                                                {c.nome}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label className="text-slate-700 font-semibold text-xs">Status do Contrato *</Label>
                                <Select value={formData.ativo ? 'ativo' : 'inativo'} onValueChange={(val) => setFormData({ ...formData, ativo: val === 'ativo' })}>
                                    <SelectTrigger className="rounded-lg mt-1 h-11 bg-white border-slate-200">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white border-slate-200">
                                        <SelectItem value="ativo">Ativo</SelectItem>
                                        <SelectItem value="inativo">Inativo / Encerrado</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="flex gap-2.5 pt-4 border-t mt-6">
                            <Button
                                className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg transition-all font-semibold"
                                onClick={handleSubmit}
                                disabled={criarMutation.isPending || atualizarMutation.isPending}
                            >
                                {criarMutation.isPending || atualizarMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : null}
                                Salvar Contrato
                            </Button>
                            <Button variant="outline" className="h-11 border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl px-5" onClick={() => setShowForm(false)}>
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
        </CaterfLayout>
    );
}
