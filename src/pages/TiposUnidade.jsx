import { useState } from 'react';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOnlineStatus } from '@/lib/OnlineStatusContext.jsx';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Plus, Building2, ClipboardCheck, Edit, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import AdminShell from '@/components/layout/AdminShell';

const SERVICOS = ['Abastecimento de Água', 'Esgotamento Sanitário', 'Manejo de Resíduos Sólidos', 'Limpeza Urbana', 'Drenagem'];

export default function TiposUnidade({ embedded = false }) {
    const queryClient = useQueryClient();
    const { online } = useOnlineStatus();
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState({ open: false, tipoId: null, step: 1, inputValue: '' });
    const [formData, setFormData] = useState({
        nome: '',
        codigo: '',
        servicos_aplicaveis: [],
        ativo: true
    });

    const { data: tipos = [], isLoading } = useQuery({
        queryKey: ['tipos-unidade'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tipos_unidade')
                .select('id, nome, codigo, servicos_aplicaveis, ativo, created_at')
                .order('nome', { ascending: true });
            if (error) throw error;
            return data || [];
        }
    });

    const createMutation = useMutation({
        mutationFn: async (data) => {
            if (!online) throw new Error('Operação disponível somente online.');
            const id = crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
            const payload = { ...data, id };
            const { error } = await supabase.from('tipos_unidade').insert(payload);
            if (error) throw error;
            return { id };
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tipos-unidade'] });
            resetForm();
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, data }) => {
            if (!online) throw new Error('Operação disponível somente online.');
            const { error } = await supabase.from('tipos_unidade').update({ ...data }).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tipos-unidade'] });
            resetForm();
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            if (!online) throw new Error('Operação disponível somente online.');
            const { error } = await supabase.from('tipos_unidade').update({ ativo: false }).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tipos-unidade'] });
            setDeleteConfirmation({ open: false, tipoId: null, step: 1, inputValue: '' });
        },
        onError: (err) => {
            alert(err?.message || 'Erro ao excluir tipo de unidade.');
        },
    });

    const reactivateMutation = useMutation({
        mutationFn: async (id) => {
            if (!online) throw new Error('Operação disponível somente online.');
            const { error } = await supabase.from('tipos_unidade').update({ ativo: true }).eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tipos-unidade'] });
        },
        onError: (err) => {
            alert(err?.message || 'Erro ao reativar tipo de unidade.');
        },
    });

    const resetForm = () => {
        setFormData({ nome: '', codigo: '', servicos_aplicaveis: [], ativo: true });
        setEditing(null);
        setShowForm(false);
    };

    const handleEdit = (tipo) => {
        setFormData({
            nome: tipo.nome,
            codigo: tipo.codigo || '',
            servicos_aplicaveis: tipo.servicos_aplicaveis || [],
            ativo: tipo.ativo !== false
        });
        setEditing(tipo);
        setShowForm(true);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editing) {
            updateMutation.mutate({ id: editing.id, data: formData });
        } else {
            createMutation.mutate(formData);
        }
    };

    const toggleServico = (servico) => {
        const atual = formData.servicos_aplicaveis || [];
        if (atual.includes(servico)) {
            setFormData({...formData, servicos_aplicaveis: atual.filter(s => s !== servico)});
        } else {
            setFormData({...formData, servicos_aplicaveis: [...atual, servico]});
        }
    };

    const content = (
        <>
            {/* Form Dialog */}
            <Dialog open={showForm} onOpenChange={(open) => !open && resetForm()}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Editar' : 'Novo'} Tipo de Unidade</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <Label>Nome *</Label>
                            <Input
                                value={formData.nome}
                                onChange={(e) => setFormData({...formData, nome: e.target.value})}
                                placeholder="Ex: ETA - Estação de Tratamento de Água"
                                required
                            />
                        </div>
                        <div>
                            <Label>Código *</Label>
                            <Input
                                value={formData.codigo}
                                onChange={(e) => setFormData({...formData, codigo: e.target.value.toUpperCase()})}
                                placeholder="Ex: ETA, ETE, RES..."
                                maxLength="10"
                                required
                            />
                        </div>
                        <div>
                            <Label>Serviços Aplicáveis</Label>
                            <div className="grid grid-cols-2 gap-2 mt-2">
                                {SERVICOS.map(servico => (
                                    <label key={servico} className="flex items-center gap-2 p-2 border rounded cursor-pointer hover:bg-gray-50">
                                        <Checkbox
                                            checked={formData.servicos_aplicaveis?.includes(servico)}
                                            onCheckedChange={() => toggleServico(servico)}
                                        />
                                        <span className="text-sm">{servico}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button type="submit" className="flex-1" disabled={createMutation.isPending || updateMutation.isPending}>
                                {editing ? 'Atualizar' : 'Criar'}
                            </Button>
                            <Button type="button" variant="outline" onClick={resetForm}>
                                Cancelar
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* List */}
            <div className="max-w-4xl mx-auto px-4 py-6">
                {embedded && (
                    <div className="flex justify-end mb-4">
                        <Button onClick={() => setShowForm(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow gap-1.5">
                            <Plus className="h-4 w-4" /> Novo Tipo
                        </Button>
                    </div>
                )}
                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-7 w-7 animate-spin text-[#0066B3]" />
                    </div>
                ) : (
                    <div className="space-y-3">
                        {tipos.map((tipo) => (
                            <Card key={tipo.id} className="border border-gray-200 rounded-2xl hover:shadow-md transition-all bg-white">
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3">
                                            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mt-0.5 flex-shrink-0">
                                                <Building2 className="h-5 w-5 text-[#0066B3]" />
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-800">{tipo.nome}</h3>
                                                {tipo.codigo && (
                                                    <p className="text-xs text-gray-500 mt-0.5 font-mono">Código: <span className="font-bold text-gray-700">{tipo.codigo}</span></p>
                                                )}
                                                {tipo.ativo === false && (
                                                    <div className="mt-1">
                                                        <Badge className="text-[10px] bg-rose-100 text-rose-600 border-none">Inativo</Badge>
                                                    </div>
                                                )}
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {tipo.servicos_aplicaveis?.map(s => (
                                                        <Badge key={s} className="text-[10px] bg-indigo-50 text-indigo-700 border-none font-medium">
                                                            {s}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <Link to={createPageUrl('Checklists') + `?tipo=${tipo.id}`}>
                                                <Button variant="ghost" size="icon" title="Configurar Checklist" className="hover:bg-blue-50 text-[#0066B3]">
                                                    <ClipboardCheck className="h-4 w-4" />
                                                </Button>
                                            </Link>
                                            {tipo.ativo === false ? (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => reactivateMutation.mutate(tipo.id)}
                                                    disabled={reactivateMutation.isPending}
                                                >
                                                    Reativar
                                                </Button>
                                            ) : (
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(tipo)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            )}
                                            <AlertDialog 
                                                open={deleteConfirmation.open && deleteConfirmation.tipoId === tipo.id}
                                                onOpenChange={(open) => {
                                                    if (!open) {
                                                        setDeleteConfirmation({ open: false, tipoId: null, step: 1, inputValue: '' });
                                                    }
                                                }}
                                            >
                                                <AlertDialogTrigger asChild>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon"
                                                        disabled={tipo.ativo === false}
                                                        onClick={() => setDeleteConfirmation({ open: true, tipoId: tipo.id, step: 1, inputValue: '' })}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-rose-500" />
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    {deleteConfirmation.step === 1 ? (
                                                        <>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
                                                                    <AlertTriangle className="h-5 w-5" />
                                                                    Excluir Tipo de Unidade?
                                                                </AlertDialogTitle>
                                                                <AlertDialogDescription className="space-y-2">
                                                                    <p>Você está prestes a excluir permanentemente:</p>
                                                                    <p className="font-semibold text-gray-900">{tipo.nome}</p>
                                                                    <p className="text-rose-600">Esta ação não pode ser desfeita.</p>
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                <Button
                                                                    variant="destructive"
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
                                                                <AlertDialogDescription className="space-y-3">
                                                                    <p>Para confirmar a exclusão, digite <span className="font-bold">EXCLUIR</span> no campo abaixo:</p>
                                                                    <Input
                                                                        placeholder="Digite EXCLUIR"
                                                                        value={deleteConfirmation.inputValue}
                                                                        onChange={(e) => setDeleteConfirmation(prev => ({ ...prev, inputValue: e.target.value }))}
                                                                        className="mt-2"
                                                                    />
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel onClick={() => setDeleteConfirmation({ open: false, tipoId: null, step: 1, inputValue: '' })}>
                                                                    Cancelar
                                                                </AlertDialogCancel>
                                                                <Button
                                                                    variant="destructive"
                                                                    disabled={deleteConfirmation.inputValue !== 'EXCLUIR' || deleteMutation.isPending}
                                                                    onClick={() => deleteMutation.mutate(tipo.id)}
                                                                >
                                                                    {deleteMutation.isPending ? 'Excluindo...' : 'Excluir Permanentemente'}
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

                {!isLoading && tipos.length === 0 && (
                    <div className="text-center py-16">
                        <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <Building2 className="h-7 w-7 text-gray-300" />
                        </div>
                        <p className="text-gray-500 font-semibold">Nenhum tipo de unidade cadastrado</p>
                        <p className="text-gray-400 text-sm mt-1">Crie um tipo para começar a configurar checklists</p>
                        <Button onClick={() => setShowForm(true)} variant="brand" className="mt-5">
                            <Plus className="h-4 w-4 mr-2" />
                            Criar primeiro tipo
                        </Button>
                    </div>
                )}
            </div>
        </>
    );

    if (embedded) return content;

    return (
        <AdminShell
            title="Tipos de Unidade"
            actions={
                <Button onClick={() => setShowForm(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow gap-1.5">
                    <Plus className="h-4 w-4" /> Novo Tipo
                </Button>
            }
        >
            {content}
        </AdminShell>
    );
}
