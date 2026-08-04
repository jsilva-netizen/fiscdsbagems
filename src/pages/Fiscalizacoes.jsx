import { useState } from 'react';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
import { deleteFiscalizacaoComImagens } from '@/lib/storageCleanup';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Repository } from '@/lib/offline/repository';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Search, SlidersHorizontal, Trash2, AlertTriangle, MapPin, ChevronRight, ChevronDown, Calendar, CheckCircle2, Clock, Plus, RotateCcw, Loader2, ClipboardList } from 'lucide-react';
import ExportarPDFConsolidado from '@/components/fiscalizacao/ExportarPDFConsolidado';
import RelatorioFiscalizacao from '@/components/fiscalizacao/RelatorioFiscalizacao';
import HistoricoFiscalizacao from '@/components/fiscalizacao/HistoricoFiscalizacao';
import { useSyncStatus } from '@/lib/SyncStatusContext.jsx';
import { syncUpForFiscalizacao } from '@/lib/offline/syncEngine';
import { useModulo } from '@/hooks/useModulo';
import { supabase } from '@/lib/supabase';
import AdminShell from '@/components/layout/AdminShell';

// Fiscalizações sem tipo_modulo são registros legados de antes da separação DSB/DTR —
// tratadas como DSB por padrão. Sem esse filtro, um admin (que sincroniza tudo sem
// restrição de RLS) via aqui também as fiscalizações da DTR misturadas.
const DSB_MODULOS = ['saneamento_dsb', 'residuos_dsb'];

export default function Fiscalizacoes() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { camaraTecnica: ownCamaraTecnica, isAdmin } = useModulo();
    const [searchParams] = useSearchParams();
    // Admin navega livremente entre câmaras pelo seletor no cabeçalho — a câmara "efetiva"
    // dessa página vem da URL (?camara=xxx), não do perfil do usuário (que pra admin é vazio).
    const camaraTecnica = searchParams.get('camara') || ownCamaraTecnica;
    const { online, sessionValid, outboxCount } = useSyncStatus?.() || { online: true, sessionValid: true, outboxCount: 0 };
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('todos');
    const [servicoFilter, setServicoFilter] = useState('todos');
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');
    const [fiscalizacaoParaDeletar, setFiscalizacaoParaDeletar] = useState(null);
    const [mostrarFiltros, setMostrarFiltros] = useState(false);
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const [expandedIds, setExpandedIds] = useState(() => new Set());
    const toggleExpanded = (id) => setExpandedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });
    const [deleteConfirmation, setDeleteConfirmation] = useState({ open: false, fiscId: null, step: 1, inputValue: '' });
    const [mostrarConfirmacaoFinalizacao, setMostrarConfirmacaoFinalizacao] = useState({ open: false, fiscId: null });
    const [syncProgress, setSyncProgress] = useState(null);

    const { data: fiscalizacoes = [], isLoading } = useQuery({
        queryKey: ['fiscalizacoes', camaraTecnica],
        queryFn: async () => {
            if (camaraTecnica) {
                const { data, error } = await supabase
                    .from('fiscalizacoes')
                    .select('*')
                    .eq('camara_tecnica_id', camaraTecnica)
                    .order('data_inicio', { ascending: false })
                    .limit(500);
                if (error) throw error;
                return data || [];
            }
            return Repository.listFiscalizacoes(100);
        },
        staleTime: 60000,
        gcTime: 300000
    });

    // total_constatacoes/total_ncs da própria fiscalização só é gravado na finalização
    // (RPC finalizar_fiscalizacao) e nem sempre reflete a realidade. A fonte confiável é
    // somar por unidade vistoriada, que é atualizada a cada vistoria (ver ExecutarFiscalizacao.jsx).
    const fiscalizacaoIds = fiscalizacoes.map((f) => f.id);
    const { data: totaisPorFiscalizacao = {} } = useQuery({
        queryKey: ['fiscalizacoes-totais', fiscalizacaoIds.join(',')],
        queryFn: () => Repository.getTotaisPorFiscalizacao(fiscalizacaoIds),
        enabled: fiscalizacaoIds.length > 0,
    });

    const deletarFiscalizacaoMutation = useMutation({
        mutationFn: async (fiscalizacaoId) => {
            await deleteFiscalizacaoComImagens(fiscalizacaoId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fiscalizacoes'] });
            setFiscalizacaoParaDeletar(null);
            setDeleteConfirmation({ open: false, fiscId: null, step: 1, inputValue: '' });
        },
        onError: (error) => {
            alert('Erro ao deletar fiscalização: ' + error.message);
        }
    });
    
    const finalizarFiscalizacaoMutation = useMutation({
        mutationFn: async (fiscalizacaoId) => {
            await Repository.finalizarFiscalizacao(fiscalizacaoId);
        },
        onSuccess: async (_data, fiscalizacaoId) => {
            queryClient.invalidateQueries({ queryKey: ['fiscalizacoes'] });
            if (online && sessionValid) {
                setSyncProgress({ message: 'Iniciando sincronização...', current: 0, total: 0 });
                try {
                    await syncUpForFiscalizacao(fiscalizacaoId, setSyncProgress);
                    queryClient.invalidateQueries({ queryKey: ['fiscalizacoes'] });
                } catch (err) {
                    console.error('[SyncFiscalizacao]', err);
                } finally {
                    setSyncProgress(null);
                }
            }
        },
        onError: (error) => {
            alert('Erro ao finalizar fiscalização: ' + error.message);
        }
    });

    const reabrirFiscalizacaoMutation = useMutation({
        mutationFn: async (fiscalizacaoId) => {
            await Repository.reabrirFiscalizacao(fiscalizacaoId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fiscalizacoes'] });
        },
        onError: (error) => {
            alert('Erro ao reabrir fiscalização: ' + error.message);
        }
    });

    const filtered = fiscalizacoes.filter(f => {
        const matchModulo = !f.tipo_modulo || DSB_MODULOS.includes(f.tipo_modulo);
        if (!matchModulo) return false;
        const servicosStr = f.servicos?.join(' ').toLowerCase() || '';
        const matchSearch = f.municipio_nome?.toLowerCase().includes(search.toLowerCase()) ||
            servicosStr.includes(search.toLowerCase());
        const matchStatus = statusFilter === 'todos' || f.status === statusFilter;
        const matchServico = servicoFilter === 'todos' || (f.servicos && f.servicos.includes(servicoFilter));
        
        let matchData = true;
        if (dataInicio && dataFim) {
            const fiscData = new Date(f.data_inicio);
            const inicio = new Date(dataInicio);
            const fim = new Date(dataFim);
            fim.setHours(23, 59, 59, 999);
            matchData = fiscData >= inicio && fiscData <= fim;
        }
        
        return matchSearch && matchStatus && matchServico && matchData;
    });

    const fiscalizacoesDSB = fiscalizacoes.filter(f => !f.tipo_modulo || DSB_MODULOS.includes(f.tipo_modulo));
    const servicos = [...new Set(fiscalizacoesDSB.flatMap(f => f.servicos || []))].filter(Boolean);

    const emAndamento = fiscalizacoes.filter(f => f.status === 'em_andamento').length;
    const finalizadas = fiscalizacoes.filter(f => f.status === 'finalizada').length;

    return (
        <AdminShell
            title="Fiscalizações"
            subtitle={`${filtered.length} registro${filtered.length === 1 ? '' : 's'}`}
            actions={
                <Link to={createPageUrl('NovaFiscalizacao')} className="hidden sm:inline-flex">
                    <Button className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow gap-1.5 h-9 px-4 text-sm">
                        <Plus className="h-4 w-4" />
                        Nova Fiscalização
                    </Button>
                </Link>
            }
        >
            <div className="max-w-6xl mx-auto px-4 pt-6 pb-4 space-y-3">
                {/* Nova Fiscalização — no cabeçalho fixo ela fica espremida no mobile, então
                    aqui ganha um botão de largura total, fácil de alcançar. */}
                <Link to={createPageUrl('NovaFiscalizacao')} className="block sm:hidden">
                    <Button className="w-full justify-center bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow gap-1.5 h-11 text-sm">
                        <Plus className="h-4 w-4" />
                        Nova Fiscalização
                    </Button>
                </Link>

                {/* Gatilho discreto — só no mobile. A busca/filtros/exportação completos só
                    aparecem ao tocar aqui; no desktop eles já ficam sempre visíveis abaixo. */}
                <button
                    type="button"
                    onClick={() => setMobileSearchOpen((o) => !o)}
                    className="sm:hidden w-full flex items-center gap-2 h-10 px-4 rounded-xl bg-white border border-gray-200 text-sm text-gray-400"
                >
                    <Search className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 text-left truncate">{search || 'Buscar por código, município ou fiscal...'}</span>
                    <SlidersHorizontal className="h-4 w-4 text-gray-300 flex-shrink-0" />
                </button>

                <div className={`${mobileSearchOpen ? 'block' : 'hidden'} sm:block space-y-3`}>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Buscar por código, município ou fiscal..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10 h-10 rounded-xl bg-white border-gray-200"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="h-10 w-full sm:w-44 rounded-xl bg-white border-gray-200">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-gray-200">
                                <SelectItem value="todos">Todos os status</SelectItem>
                                <SelectItem value="em_andamento">Em andamento</SelectItem>
                                <SelectItem value="finalizada">Finalizadas</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={servicoFilter} onValueChange={setServicoFilter}>
                            <SelectTrigger className="h-10 w-full sm:w-48 rounded-xl bg-white border-gray-200">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-gray-200">
                                <SelectItem value="todos">Todos os serviços</SelectItem>
                                {servicos.map(s => (
                                    <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button
                            variant="outline"
                            className={`h-10 rounded-xl border-gray-200 gap-1.5 flex-shrink-0 ${mostrarFiltros ? 'bg-blue-50 border-blue-200 text-[#0066B3]' : ''}`}
                            onClick={() => setMostrarFiltros(!mostrarFiltros)}
                        >
                            <SlidersHorizontal className="h-4 w-4" />
                            <span className="hidden sm:inline">Mais filtros</span>
                        </Button>
                    </div>

                    {/* Filtros de data (opcional, escondido por padrão) */}
                    {mostrarFiltros && (
                        <div className="flex flex-col sm:flex-row gap-3 p-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
                            <div className="flex-1">
                                <label className="text-xs text-gray-500 font-semibold mb-1 block">Data Início</label>
                                <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="h-10 rounded-xl bg-white border-gray-200" />
                            </div>
                            <div className="flex-1">
                                <label className="text-xs text-gray-500 font-semibold mb-1 block">Data Fim</label>
                                <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="h-10 rounded-xl bg-white border-gray-200" />
                            </div>
                            <Button
                                variant="ghost"
                                className="text-gray-500 hover:text-gray-700 rounded-xl sm:self-end"
                                onClick={() => { setStatusFilter('todos'); setServicoFilter('todos'); setDataInicio(''); setDataFim(''); }}
                            >
                                Limpar Filtros
                            </Button>
                        </div>
                    )}

                    {/* Exportação */}
                    {filtered.length > 0 && (
                        <ExportarPDFConsolidado fiscalizacoes={filtered} />
                    )}
                </div>
            </div>

            {/* List */}
            <div className="max-w-6xl mx-auto px-4 pb-8">
                {isLoading ? (
                    <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-indigo-500" /></div>
                ) : (
                    <div className="space-y-3">
                        {filtered.map((fisc) => {
                            const isFiscalOrAdmin = user && ['admin', 'coordenador', 'fiscal'].includes(user.role);
                            const podeDeleter = isFiscalOrAdmin;
                            const isFinished = fisc.status === 'finalizada';
                            const { total_constatacoes = 0, total_ncs = 0 } = totaisPorFiscalizacao[fisc.id] || {};

                            const isExpanded = expandedIds.has(fisc.id);

                            return (
                                <Card key={fisc.id} className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
                                    <CardContent className="p-0">
                                        {/* Cabeçalho — clique expande; clique de novo (já expandido) abre a fiscalização */}
                                        <div className="w-full flex items-center gap-1 p-4 sm:p-5">
                                            <button
                                                type="button"
                                                onClick={() => toggleExpanded(fisc.id)}
                                                className="flex-1 min-w-0 flex items-center gap-3 text-left"
                                            >
                                                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                                    isFinished ? 'bg-emerald-50' : 'bg-sky-50'
                                                }`}>
                                                    {isFinished ? (
                                                        <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500" />
                                                    ) : (
                                                        <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-sky-500" />
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="font-bold text-gray-800 flex items-center gap-1.5 text-sm sm:text-base">
                                                        <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                                        <span className="truncate">{fisc.municipio_nome}</span>
                                                    </h3>
                                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                        {fisc.servicos?.map(s => (
                                                            <Badge key={s} className="pointer-events-none text-[10px] bg-indigo-50 text-indigo-700 border-none font-semibold">{s}</Badge>
                                                        ))}
                                                        <Badge className={`pointer-events-none text-[10px] font-semibold border-none ${
                                                            isFinished ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'
                                                        }`}>
                                                            {isFinished ? 'Finalizada' : 'Em andamento'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </button>
                                            <Link
                                                to={createPageUrl('ExecutarFiscalizacao') + `?id=${fisc.id}`}
                                                title="Abrir fiscalização"
                                                className="grid place-items-center h-9 w-9 rounded-lg text-gray-300 hover:text-[#0066B3] hover:bg-blue-50 flex-shrink-0 transition-colors"
                                            >
                                                <ChevronRight className="h-5 w-5" />
                                            </Link>
                                        </div>

                                        {/* Detalhes — só aparecem expandido */}
                                        {isExpanded && (
                                            <div className="px-4 sm:px-5 pb-5 border-t border-gray-100">
                                                <div className="pt-4">
                                                    <p className="text-xs text-gray-400 flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {format(new Date(fisc.data_inicio), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                                    </p>
                                                    {fisc.fiscal_nome && (
                                                        <p className="text-xs text-gray-400 mt-0.5">Fiscal: {fisc.fiscal_nome}</p>
                                                    )}
                                                    {fisc.last_modified_by && (
                                                        <p className="text-xs text-gray-400 mt-0.5">
                                                            Última alt.: {fisc.last_modified_by} {fisc.last_modified_at ? `em ${format(new Date(fisc.last_modified_at), 'dd/MM HH:mm', { locale: ptBR })}` : ''}
                                                        </p>
                                                    )}
                                                </div>

                                                {/* Stats */}
                                                {(total_constatacoes > 0 || total_ncs > 0) && (
                                                    <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100 text-xs">
                                                        <span className="flex items-center gap-1 text-emerald-600 font-medium">
                                                            <CheckCircle2 className="h-3 w-3" />
                                                            {total_constatacoes} Constatações
                                                        </span>
                                                        <span className="flex items-center gap-1 text-rose-600 font-medium">
                                                            <AlertTriangle className="h-3 w-3" />
                                                            {total_ncs} NCs
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Ações da Fiscalização */}
                                                <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-2">
                                                    {isFinished && <RelatorioFiscalizacao fiscalizacao={fisc} showStatusOnly />}
                                                    <div className="flex flex-wrap gap-2 items-center">
                                                        <HistoricoFiscalizacao fiscalizacao={fisc} />

                                                        {isFinished ? (
                                                            <>
                                                                <RelatorioFiscalizacao fiscalizacao={fisc} showButtonsOnly />
                                                                {podeDeleter && (
                                                                    <Button
                                                                        variant="outline"
                                                                        size="sm"
                                                                        className="text-amber-600 border-amber-200 hover:bg-amber-50 h-9 rounded-xl font-medium"
                                                                        disabled={reabrirFiscalizacaoMutation.isPending}
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            if (window.confirm("Deseja reabrir esta fiscalização para edição? O relatório anterior será mantido até que você finalize novamente.")) {
                                                                                reabrirFiscalizacaoMutation.mutate(fisc.id);
                                                                            }
                                                                        }}
                                                                    >
                                                                        <RotateCcw className={`h-4 w-4 mr-1.5 ${reabrirFiscalizacaoMutation.isPending ? 'animate-spin' : ''}`} />
                                                                        {reabrirFiscalizacaoMutation.isPending ? 'Reabrindo...' : 'Reabrir Edição'}
                                                                    </Button>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <Button
                                                                variant="brand"
                                                                className="h-9 font-medium text-xs"
                                                                size="sm"
                                                                disabled={
                                                                    !online || !sessionValid || finalizarFiscalizacaoMutation.isPending
                                                                }
                                                                onClick={(e) => {
                                                                    e.preventDefault();
                                                                    e.stopPropagation();
                                                                    setMostrarConfirmacaoFinalizacao({ open: true, fiscId: fisc.id });
                                                                }}
                                                            >
                                                                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                                                                {finalizarFiscalizacaoMutation.isPending ? 'Finalizando...' : 'Finalizar Fiscalização'}
                                                            </Button>
                                                        )}

                                                        {podeDeleter && (
                                                            <AlertDialog
                                                                open={deleteConfirmation.open && deleteConfirmation.fiscId === fisc.id}
                                                                onOpenChange={(open) => {
                                                                    if (!open) {
                                                                        setDeleteConfirmation({ open: false, fiscId: null, step: 1, inputValue: '' });
                                                                    }
                                                                }}
                                                            >
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-9 rounded-xl ml-auto"
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        if (!online) {
                                                                            alert('Exclusão disponível apenas quando online.');
                                                                            return;
                                                                        }
                                                                        setDeleteConfirmation({ open: true, fiscId: fisc.id, step: 1, inputValue: '' });
                                                                    }}
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                                <AlertDialogContent>
                                                                    {deleteConfirmation.step === 1 ? (
                                                                        <>
                                                                            <AlertDialogHeader>
                                                                                <AlertDialogTitle className="flex items-center gap-2 text-rose-600">
                                                                                    <AlertTriangle className="h-5 w-5" />
                                                                                    Excluir Fiscalização?
                                                                                </AlertDialogTitle>
                                                                                <AlertDialogDescription className="space-y-2" asChild>
                                                                                    <div>
                                                                                        <p>Você está prestes a excluir permanentemente:</p>
                                                                                        <p className="font-semibold text-gray-900">{fisc.numero_termo} - {fisc.municipio_nome}</p>
                                                                                        <p className="text-rose-600">Esta ação não pode ser desfeita e removerá todas as unidades, NCs, determinações e dados relacionados.</p>
                                                                                    </div>
                                                                                </AlertDialogDescription>
                                                                            </AlertDialogHeader>
                                                                            <AlertDialogFooter>
                                                                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                                <Button
                                                                                    variant="destructive"
                                                                                    disabled={!online}
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
                                                                                <AlertDialogDescription className="space-y-3" asChild>
                                                                                    <div>
                                                                                        <p>Para confirmar a exclusão, digite <span className="font-bold">EXCLUIR</span> no campo abaixo:</p>
                                                                                        <Input
                                                                                            placeholder="Digite EXCLUIR"
                                                                                            value={deleteConfirmation.inputValue}
                                                                                            onChange={(e) => setDeleteConfirmation(prev => ({ ...prev, inputValue: e.target.value }))}
                                                                                            className="mt-2"
                                                                                        />
                                                                                    </div>
                                                                                </AlertDialogDescription>
                                                                            </AlertDialogHeader>
                                                                            <AlertDialogFooter>
                                                                                <AlertDialogCancel onClick={() => setDeleteConfirmation({ open: false, fiscId: null, step: 1, inputValue: '' })}>
                                                                                    Cancelar
                                                                                </AlertDialogCancel>
                                                                                <Button
                                                                                    variant="destructive"
                                                                                    disabled={!online || deleteConfirmation.inputValue !== 'EXCLUIR' || deletarFiscalizacaoMutation.isPending}
                                                                                    onClick={() => deletarFiscalizacaoMutation.mutate(fisc.id)}
                                                                                >
                                                                                    {deletarFiscalizacaoMutation.isPending ? 'Excluindo...' : 'Excluir Permanentemente'}
                                                                                </Button>
                                                                            </AlertDialogFooter>
                                                                        </>
                                                                    )}
                                                                </AlertDialogContent>
                                                            </AlertDialog>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}

                {/* Dialog de confirmação para finalizar fiscalização */}
                <AlertDialog 
                    open={mostrarConfirmacaoFinalizacao.open} 
                    onOpenChange={(open) => setMostrarConfirmacaoFinalizacao({ open, fiscId: null })}
                >
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Finalizar Fiscalização</AlertDialogTitle>
                            <AlertDialogDescription asChild>
                                <div>
                                    <p>Tem certeza que deseja finalizar esta fiscalização?</p>
                                    <p className="mt-3">Após a finalização:</p>
                                    <ul className="list-disc ml-6 mt-2">
                                        <li>Nenhuma unidade poderá ser editada ou excluída</li>
                                        <li>Nenhuma nova unidade poderá ser adicionada</li>
                                        <li>A fiscalização ficará disponível apenas para visualização</li>
                                    </ul>
                                    <p className="mt-3"><strong>Esta ação não pode ser desfeita (exceto por administradores).</strong></p>
                                </div>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={finalizarFiscalizacaoMutation.isPending}>
                                Cancelar
                            </AlertDialogCancel>
                            <AlertDialogAction 
                                onClick={() => {
                                    if (mostrarConfirmacaoFinalizacao.fiscId) {
                                        finalizarFiscalizacaoMutation.mutate(mostrarConfirmacaoFinalizacao.fiscId);
                                        setMostrarConfirmacaoFinalizacao({ open: false, fiscId: null });
                                    }
                                }}
                                disabled={finalizarFiscalizacaoMutation.isPending}
                                className="bg-emerald-600 hover:bg-emerald-700"
                            >
                                {finalizarFiscalizacaoMutation.isPending ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Finalizando...
                                    </>
                                ) : (
                                    'Sim, Finalizar'
                                )}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {!isLoading && filtered.length === 0 && (
                    <div className="text-center py-16">
                        <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                            <MapPin className="h-8 w-8 text-gray-300" />
                        </div>
                        <p className="text-gray-500 font-semibold">Nenhuma fiscalização encontrada</p>
                        <p className="text-gray-400 text-sm mt-1">Tente ajustar os filtros ou inicie uma nova vistoria</p>
                        <Link to={createPageUrl('NovaFiscalizacao')}>
                            <Button variant="brand" className="mt-5">
                                <Plus className="h-4 w-4 mr-2" />
                                Iniciar primeira fiscalização
                            </Button>
                        </Link>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="py-5 text-center text-xs text-slate-400 bg-white border-t border-slate-200 mt-4">
                AGEMS — Agência Estadual de Regulação de Serviços Públicos de MS
            </div>

            {/* Sync progress overlay */}
            {syncProgress && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 shadow-2xl w-full max-w-sm space-y-4">
                        <div className="flex items-center gap-3">
                            <Loader2 className="h-5 w-5 animate-spin text-[#0066B3] flex-shrink-0" />
                            <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-800">Sincronizando fiscalização</p>
                                <p className="text-xs text-gray-500 mt-0.5 truncate">{syncProgress.message}</p>
                            </div>
                        </div>
                        {syncProgress.total > 0 && (
                            <div className="space-y-1.5">
                                <div className="flex justify-between text-xs text-gray-400">
                                    <span>{syncProgress.current} de {syncProgress.total}</span>
                                    <span>{Math.min(100, Math.round((syncProgress.current / syncProgress.total) * 100))}%</span>
                                </div>
                                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-[#0066B3] rounded-full transition-all duration-300"
                                        style={{ width: `${Math.min(100, Math.round((syncProgress.current / syncProgress.total) * 100))}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </AdminShell>
    );
}
