import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, Shield, Loader2, Mail, Trash2, Check } from 'lucide-react';

export default function GerenciarUsuarios() {
    const queryClient = useQueryClient();
    const [currentUser, setCurrentUser] = useState(null);
    const [deleteEmail, setDeleteEmail] = useState('');
    const [vinculoDialog, setVinculoDialog] = useState({ open: false, user: null, mode: 'approve' });
    const [prestadorSelecionado, setPrestadorSelecionado] = useState('');

    const { data: usuarios = [], isLoading } = useQuery({
        queryKey: ['usuarios-admin'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .order('full_name');
            if (error) throw error;
            return data;
        }
    });

    const { data: prestadores = [] } = useQuery({
        queryKey: ['prestadores-servico-admin'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('prestadores_servico')
                .select('id,nome')
                .order('nome');
            if (error) throw error;
            return data || [];
        }
    });

    const { data: _me } = useQuery({
        queryKey: ['current-user'],
        queryFn: async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                // Get profile
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                
                const userData = { ...user, ...profile };
                setCurrentUser(userData);
                return userData;
            }
            return null;
        }
    });


    const atualizarRoleMutation = useMutation({
        mutationFn: async ({ userId, role }) => {
            const { error } = await supabase
                .from('profiles')
                .update({ role })
                .eq('id', userId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['usuarios-admin'] });
        }
    });

    const deleteUserMutation = useMutation({
        mutationFn: async ({ userId }) => {
            const { error } = await supabase.rpc('admin_delete_user', { p_user_id: userId });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['usuarios-admin'] });
        }
    });

    const handleDeleteUser = (userId, userName) => {
        if (confirm(`Tem certeza que deseja EXCLUIR DEFINITIVAMENTE o usuário ${userName}?`)) {
            deleteUserMutation.mutate({ userId });
        }
    };

    const deleteUserByEmailMutation = useMutation({
        mutationFn: async ({ email }) => {
            const { error } = await supabase.rpc('admin_delete_user_by_email', { p_email: email });
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['usuarios-admin'] });
            setDeleteEmail('');
            alert('Usuário excluído com sucesso.');
        }
    });

    const toggleStatusMutation = useMutation({
        mutationFn: async ({ userId, novoStatus, prestadorId }) => {
            // Se estivermos aprovando (ativando), também podemos confirmar o email se necessário
            if (novoStatus === true) {
                // Tenta atualizar no Auth (pode falhar se não for service_role, mas não custa tentar se for admin)
                // Na verdade, via Client só podemos mexer no profile.
            }

            if (novoStatus === true && prestadorId) {
                const { data: cur, error: getErr } = await supabase
                    .from('profiles')
                    .select('prestador_servico_id')
                    .eq('id', userId)
                    .maybeSingle();
                if (getErr) throw getErr;
                const currentPrestador = cur?.prestador_servico_id;
                if (currentPrestador && currentPrestador !== prestadorId) {
                    const { error: clearErr } = await supabase
                        .from('prestadores_servico')
                        .update({ user_id: null })
                        .eq('id', currentPrestador);
                    if (clearErr) throw clearErr;
                }

                const { error: clearOldErr } = await supabase
                    .from('prestadores_servico')
                    .update({ user_id: null })
                    .eq('user_id', userId)
                    .neq('id', prestadorId);
                if (clearOldErr) throw clearOldErr;

                const { error: upPrestErr } = await supabase
                    .from('prestadores_servico')
                    .update({ user_id: userId })
                    .eq('id', prestadorId);
                if (upPrestErr) throw upPrestErr;
            }

            const { error } = await supabase
                .from('profiles')
                .update({ ativo: novoStatus, ...(prestadorId ? { prestador_servico_id: prestadorId } : {}) })
                .eq('id', userId);
            
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['usuarios-admin'] });
        }
    });

    const vincularPrestadorMutation = useMutation({
        mutationFn: async ({ userId, prestadorId }) => {
            const { data: cur, error: getErr } = await supabase
                .from('profiles')
                .select('prestador_servico_id')
                .eq('id', userId)
                .maybeSingle();
            if (getErr) throw getErr;
            const currentPrestador = cur?.prestador_servico_id;
            if (currentPrestador && currentPrestador !== prestadorId) {
                const { error: clearErr } = await supabase
                    .from('prestadores_servico')
                    .update({ user_id: null })
                    .eq('id', currentPrestador);
                if (clearErr) throw clearErr;
            }

            const { error: clearOldErr } = await supabase
                .from('prestadores_servico')
                .update({ user_id: null })
                .eq('user_id', userId)
                .neq('id', prestadorId);
            if (clearOldErr) throw clearOldErr;

            const { error: upPrestErr } = await supabase
                .from('prestadores_servico')
                .update({ user_id: userId })
                .eq('id', prestadorId);
            if (upPrestErr) throw upPrestErr;

            const { error } = await supabase
                .from('profiles')
                .update({ prestador_servico_id: prestadorId })
                .eq('id', userId);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['usuarios-admin'] });
        }
    });

    // Removido handleInvite e convidarMutation pois não usamos mais


    const handleChangeRole = (userId, newRole) => {
        if (confirm(`Tem certeza que deseja alterar a permissão deste usuário?`)) {
            atualizarRoleMutation.mutate({ userId, role: newRole });
        }
    };

    const handleToggleStatus = (userId, userName, currentStatus) => {
        const action = currentStatus ? 'desativar' : 'ativar';
        if (confirm(`Tem certeza que deseja ${action.toUpperCase()} o usuário ${userName}?`)) {
            toggleStatusMutation.mutate({ userId, novoStatus: !currentStatus });
        }
    };

    const isAdmin = currentUser?.role === 'admin';
    const getPrestadorNome = (id) => prestadores.find((p) => p.id === id)?.nome || 'N/A';

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-blue-900 text-white">
                <div className="max-w-6xl mx-auto px-4 py-6">
                    <div className="flex items-center gap-3">
                        <Link to={createPageUrl('Home')}>
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <h1 className="text-2xl font-bold">Gestão de Usuários</h1>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-6xl mx-auto px-4 py-6">
                {!isAdmin ? (
                    <Card>
                        <CardContent className="p-6 text-center text-gray-500">
                            <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>Apenas administradores podem gerenciar usuários.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <>
                        {/* Botão de convite removido conforme solicitado */}
                        <div className="mb-4">
                            <Link to={createPageUrl('ExportarImportar')}>
                                <Button className="bg-blue-600 hover:bg-blue-700">
                                    Exportar / Importar Dados
                                </Button>
                            </Link>
                        </div>

                        <Card className="mb-4">
                            <CardContent className="p-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="deleteEmail">Excluir usuário por e-mail</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            id="deleteEmail"
                                            type="email"
                                            placeholder="email@exemplo.com"
                                            value={deleteEmail}
                                            onChange={(e) => setDeleteEmail(e.target.value)}
                                        />
                                        <Button
                                            variant="destructive"
                                            disabled={!deleteEmail || deleteUserByEmailMutation.isPending}
                                            onClick={() => {
                                                const email = deleteEmail.trim();
                                                if (!email) return;
                                                if (confirm(`Tem certeza que deseja EXCLUIR DEFINITIVAMENTE o usuário ${email}?`)) {
                                                    deleteUserByEmailMutation.mutate({ email });
                                                }
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4 mr-2" />
                                            Excluir
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        
                        {isLoading ? (
                            <div className="flex justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                            </div>
                        ) : usuarios.length === 0 ? (
                            <Card>
                                <CardContent className="p-6 text-center text-gray-500">
                                    Nenhum usuário registrado.
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid gap-4">
                                {usuarios.map(usuario => (
                                    <Card key={usuario.id}>
                                        <CardContent className="p-6">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h3 className="font-semibold text-lg">{usuario.full_name}</h3>
                                                        {(() => {
                                                            const role = (usuario.role === 'user' ? 'fiscal' : usuario.role) || 'fiscal'
                                                            const roleLabelMap = { admin: 'Admin', fiscal: 'Fiscal', prestador: 'Prestador', coordenador: 'Coordenador' }
                                                            const roleColorMap = { admin: 'bg-purple-600', fiscal: 'bg-blue-600', prestador: 'bg-indigo-600', coordenador: 'bg-orange-600' }
                                                            const label = roleLabelMap[role] || 'Fiscal'
                                                            const cls = roleColorMap[role] || roleColorMap['fiscal']
                                                            return <Badge className={cls}>{label}</Badge>
                                                        })()}
                                                        {usuario.ativo ? (
                                                            <Badge className="bg-green-600">Ativo</Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                                                                Pendente Aprovação
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-sm text-gray-600 mb-3">
                                                        <Mail className="h-4 w-4" />
                                                        {usuario.email}
                                                    </div>
                                                    {usuario.role === 'prestador' && (
                                                        <div className="text-sm text-gray-700 mb-2">
                                                            <span className="font-medium">Prestador vinculado:</span>{' '}
                                                            {usuario.prestador_servico_id ? getPrestadorNome(usuario.prestador_servico_id) : (
                                                                <span className="text-yellow-700">Não vinculado</span>
                                                            )}
                                                        </div>
                                                    )}
                                                    <p className="text-xs text-gray-500">
                                                        Criado em {(usuario.created_at || usuario.created_date) ? new Date(usuario.created_at || usuario.created_date).toLocaleDateString('pt-BR') : '-'}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2">
                                                    {usuario.id !== currentUser?.id && (
                                                        <>
                                                            <Select
                                                                value={(usuario.role === 'user' ? 'fiscal' : usuario.role) || 'fiscal'}
                                                                onValueChange={(newRole) => handleChangeRole(usuario.id, newRole)}
                                                            >
                                                                <SelectTrigger className="w-32">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="fiscal">Fiscal</SelectItem>
                                                                    <SelectItem value="prestador">Prestador</SelectItem>
                                                                    <SelectItem value="coordenador">Coordenador</SelectItem>
                                                                    <SelectItem value="admin">Admin</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                            {usuario.role === 'prestador' && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => {
                                                                        setPrestadorSelecionado(usuario.prestador_servico_id || '');
                                                                        setVinculoDialog({ open: true, user: usuario, mode: 'link' });
                                                                    }}
                                                                    disabled={toggleStatusMutation.isPending || deleteUserMutation.isPending}
                                                                >
                                                                    Vincular
                                                                </Button>
                                                            )}
                                                            <Button
                                                                size="sm"
                                                                variant={usuario.ativo ? "destructive" : "default"}
                                                                className={!usuario.ativo ? "bg-green-600 hover:bg-green-700" : ""}
                                                                onClick={() => {
                                                                    if (usuario.ativo) {
                                                                        handleDeleteUser(usuario.id, usuario.full_name);
                                                                    } else {
                                                                        if (usuario.role === 'prestador' && !usuario.prestador_servico_id) {
                                                                            setPrestadorSelecionado('');
                                                                            setVinculoDialog({ open: true, user: usuario, mode: 'approve' });
                                                                            return;
                                                                        }
                                                                        handleToggleStatus(usuario.id, usuario.full_name, usuario.ativo);
                                                                    }
                                                                }}
                                                                disabled={toggleStatusMutation.isPending || deleteUserMutation.isPending}
                                                            >
                                                                {usuario.ativo ? (
                                                                    <Trash2 className="h-4 w-4" />
                                                                ) : (
                                                                    <>
                                                                        <Check className="h-4 w-4 mr-2" />
                                                                        Aprovar
                                                                    </>
                                                                )}
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>

            <Dialog
                open={vinculoDialog.open}
                onOpenChange={(open) => {
                    if (!open) setVinculoDialog({ open: false, user: null, mode: 'approve' });
                    else setVinculoDialog((prev) => ({ ...prev, open: true }));
                }}
            >
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{vinculoDialog.mode === 'approve' ? 'Vincular prestador para aprovar usuário' : 'Vincular prestador ao usuário'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="text-sm text-gray-700">
                            <div><span className="font-medium">Usuário:</span> {vinculoDialog.user?.full_name}</div>
                            <div><span className="font-medium">Email:</span> {vinculoDialog.user?.email}</div>
                        </div>
                        <div>
                            <Label>Prestador de serviço</Label>
                            <Select value={prestadorSelecionado} onValueChange={setPrestadorSelecionado}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione um prestador" />
                                </SelectTrigger>
                                <SelectContent>
                                    {prestadores.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex gap-2 justify-end">
                            <Button
                                variant="outline"
                                onClick={() => setVinculoDialog({ open: false, user: null, mode: 'approve' })}
                                type="button"
                            >
                                Cancelar
                            </Button>
                            <Button
                                className="bg-green-600 hover:bg-green-700"
                                disabled={!prestadorSelecionado || toggleStatusMutation.isPending || vincularPrestadorMutation.isPending}
                                onClick={() => {
                                    const u = vinculoDialog.user;
                                    if (!u?.id) return;
                                    if (vinculoDialog.mode === 'approve') {
                                        toggleStatusMutation.mutate(
                                            { userId: u.id, novoStatus: true, prestadorId: prestadorSelecionado },
                                            {
                                                onSuccess: () => {
                                                    setVinculoDialog({ open: false, user: null, mode: 'approve' });
                                                    setPrestadorSelecionado('');
                                                    alert('Usuário aprovado e vinculado ao prestador.');
                                                }
                                            }
                                        );
                                    } else {
                                        vincularPrestadorMutation.mutate(
                                            { userId: u.id, prestadorId: prestadorSelecionado },
                                            {
                                                onSuccess: () => {
                                                    setVinculoDialog({ open: false, user: null, mode: 'approve' });
                                                    setPrestadorSelecionado('');
                                                    alert('Vínculo com prestador atualizado.');
                                                }
                                            }
                                        );
                                    }
                                }}
                                type="button"
                            >
                                {vinculoDialog.mode === 'approve' ? 'Aprovar e vincular' : 'Salvar vínculo'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
