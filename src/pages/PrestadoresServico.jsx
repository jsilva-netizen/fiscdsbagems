import { useState } from 'react';
import { Repository } from '@/lib/offline/repository';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { ArrowLeft, Plus, Edit2, Trash2, AlertTriangle, Eye, Loader2 } from 'lucide-react';

export default function PrestadoresServico() {
    const queryClient = useQueryClient();
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState({ open: false, prestadorId: null, step: 1, inputValue: '' });
    const [formData, setFormData] = useState({
        nome: '',
        razao_social: '',
        endereco: '',
        cidade: '',
        telefone: '',
        email_contato: '',
        cnpj: '',
        responsavel: '',
        cargo: ''
    });

    const { data: prestadores = [], isLoading } = useQuery({
        queryKey: ['prestadores'],
        queryFn: async () => {
            const data = await Repository.listPrestadoresFull();
            return data.slice(0, 200);
        }
    });

    const { data: fiscalizacoes = [] } = useQuery({
        queryKey: ['fiscalizacoes-todos'],
        queryFn: async () => {
            const data = await Repository.listFiscalizacoes(500);
            return data;
        }
    });

    const { data: unidades = [] } = useQuery({
        queryKey: ['unidades-todas'],
        queryFn: async () => {
            const all = await Repository.listUnidadesByFiscalizacao(fiscalizacoes?.[0]?.id || '', 500); // fallback simples
            const todas = await Promise.all(
                fiscalizacoes.map(f => Repository.listUnidadesByFiscalizacao(f.id, 100))
            );
            return todas.flat();
        }
    });

    const { data: ncs = [] } = useQuery({
        queryKey: ['ncs-todos'],
        queryFn: async () => {
            return []; // offline não temos tabela própria; contaremos por unidade via Repository
        }
    });

    const { data: determinacoes = [] } = useQuery({
        queryKey: ['determinacoes-todos'],
        queryFn: async () => {
            return []; // offline derivadas de constatações manuais
        }
    });

    const { data: autos = [] } = useQuery({
        queryKey: ['autos-todos'],
        queryFn: async () => {
            return []; // não suportado offline
        }
    });

    const { data: recomendacoes = [] } = useQuery({
        queryKey: ['recomendacoes-todas'],
        queryFn: async () => {
            // recoms offline por unidade
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
            cargo: ''
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
            cargo: prestador.cargo || ''
        });
        setEditingId(prestador.id);
        setShowForm(true);
    };

    const handleSubmit = () => {
        if (!formData.nome || !formData.cnpj) {
            alert('Nome e CNPJ são obrigatórios');
            return;
        }

        if (editingId) {
            atualizarMutation.mutate({ id: editingId, data: formData });
        } else {
            criarMutation.mutate(formData);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-blue-900 text-white">
                <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
                    <Link to={createPageUrl('Home')}>
                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold">Prestadores de Serviço</h1>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
                <div className="flex justify-end">
                    <Button onClick={() => { resetForm(); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Prestador
                    </Button>
                </div>

                {isLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                    </div>
                ) : prestadores.length === 0 ? (
                    <Card>
                        <CardContent className="p-6 text-center text-gray-500">
                            <p>Nenhum prestador cadastrado.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-4">
                        {prestadores.map(prestador => (
                            <Card key={prestador.id}>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-lg">{prestador.nome}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {prestador.razao_social && (
                                        <p className="text-sm text-gray-600">
                                            <span className="font-medium">Razão Social:</span> {prestador.razao_social}
                                        </p>
                                    )}
                                    {prestador.endereco && (
                                        <p className="text-sm text-gray-600">
                                            <span className="font-medium">Endereço:</span> {prestador.endereco}
                                        </p>
                                    )}
                                    {prestador.cidade && (
                                        <p className="text-sm text-gray-600">
                                            <span className="font-medium">Cidade:</span> {prestador.cidade}
                                        </p>
                                    )}
                                    {prestador.telefone && (
                                        <p className="text-sm text-gray-600">
                                            <span className="font-medium">Telefone:</span> {prestador.telefone}
                                        </p>
                                    )}
                                    {prestador.cnpj && (
                                        <p className="text-sm text-gray-600">
                                            <span className="font-medium">CNPJ/MF:</span> {prestador.cnpj}
                                        </p>
                                    )}
                                    {prestador.responsavel && (
                                        <p className="text-sm text-gray-600">
                                            <span className="font-medium">Responsável:</span> {prestador.responsavel}
                                        </p>
                                    )}
                                    {prestador.cargo && (
                                        <p className="text-sm text-gray-600">
                                            <span className="font-medium">Cargo:</span> {prestador.cargo}
                                        </p>
                                    )}
                                    {prestador.email_contato && (
                                        <p className="text-sm text-gray-600 mt-2">
                                            <span className="font-medium">Email:</span> {prestador.email_contato}
                                        </p>
                                    )}
                                    <div className="text-xs text-gray-500 mt-3 pt-3 border-t">
                                        {(() => {
                                            const stats = getStatsForPrestador(prestador.id);
                                            return (
                                                <div className="flex gap-4 flex-wrap">
                                                    <span>Fiscalizações Finalizadas: {stats.fiscalizacoesFinalizado}</span>
                                                    <span>NCs: {stats.ncs}</span>
                                                    <span>Recomendações: {stats.recomendacoes}</span>
                                                    <span>Determinações: {stats.determinacoes}</span>
                                                    <span>Autos: {stats.autos}</span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                    <div className="flex gap-2 mt-4">
                                        <Link to={createPageUrl(`DetalhePrestador?id=${prestador.id}`)}>
                                            <Button size="sm" variant="outline">
                                                <Eye className="h-4 w-4 mr-1" />
                                                Detalhes
                                            </Button>
                                        </Link>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleEdit(prestador)}
                                        >
                                            <Edit2 className="h-4 w-4 mr-1" />
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
                                                    onClick={() => setDeleteConfirmation({ open: true, prestadorId: prestador.id, step: 1, inputValue: '' })}
                                                >
                                                    <Trash2 className="h-4 w-4 mr-1" />
                                                    Deletar
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                {deleteConfirmation.step === 1 ? (
                                                    <>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                                                                <AlertTriangle className="h-5 w-5" />
                                                                Excluir Prestador de Serviço?
                                                            </AlertDialogTitle>
                                                            <AlertDialogDescription className="space-y-2">
                                                                <p>Você está prestes a excluir permanentemente:</p>
                                                                <p className="font-semibold text-gray-900">{prestador.nome}</p>
                                                                <p className="text-red-600">Esta ação não pode ser desfeita.</p>
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
                                                            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
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
                                                            <AlertDialogCancel onClick={() => setDeleteConfirmation({ open: false, prestadorId: null, step: 1, inputValue: '' })}>
                                                                Cancelar
                                                            </AlertDialogCancel>
                                                            <Button
                                                                variant="destructive"
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
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            {/* Dialog */}
            <Dialog open={showForm} onOpenChange={setShowForm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingId ? 'Editar Prestador' : 'Novo Prestador'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Input
                            placeholder="Nome *"
                            value={formData.nome}
                            onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        />
                        <Input
                            placeholder="Razão Social"
                            value={formData.razao_social}
                            onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                        />
                        <Textarea
                            placeholder="Endereço"
                            value={formData.endereco}
                            onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                            rows={2}
                        />
                        <Input
                            placeholder="Cidade"
                            value={formData.cidade}
                            onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                        />
                        <Input
                            placeholder="Telefone"
                            value={formData.telefone}
                            onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                        />
                        <Input
                            placeholder="CNPJ/MF *"
                            value={formData.cnpj}
                            onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                        />
                        <Input
                            placeholder="Responsável"
                            value={formData.responsavel}
                            onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                        />
                        <Input
                            placeholder="Cargo"
                            value={formData.cargo}
                            onChange={(e) => setFormData({ ...formData, cargo: e.target.value })}
                        />
                        <Input
                            placeholder="Email de Contato"
                            type="email"
                            value={formData.email_contato}
                            onChange={(e) => setFormData({ ...formData, email_contato: e.target.value })}
                        />
                        <div className="flex gap-2">
                            <Button
                                className="flex-1 bg-blue-600 hover:bg-blue-700"
                                onClick={handleSubmit}
                                disabled={criarMutation.isPending || atualizarMutation.isPending}
                            >
                                {criarMutation.isPending || atualizarMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                ) : null}
                                Salvar
                            </Button>
                            <Button variant="outline" onClick={() => setShowForm(false)}>
                                Cancelar
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
