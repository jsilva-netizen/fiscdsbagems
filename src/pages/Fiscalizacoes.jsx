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
import { Search, Filter, Trash2, AlertTriangle, MapPin, ChevronRight, Calendar, CheckCircle2, Clock, Plus, RotateCcw, Loader2, Settings } from 'lucide-react';
import ExportarPDFConsolidado from '@/components/fiscalizacao/ExportarPDFConsolidado';
import RelatorioFiscalizacao from '@/components/fiscalizacao/RelatorioFiscalizacao';
import HistoricoFiscalizacao from '@/components/fiscalizacao/HistoricoFiscalizacao';
import { useSyncStatus } from '@/lib/SyncStatusContext.jsx';
import { syncUpForFiscalizacao } from '@/lib/offline/syncEngine';
import { useModulo } from '@/hooks/useModulo';
import { useCamaraLayout } from '@/hooks/useCamaraLayout';
import { supabase } from '@/lib/supabase';

export default function Fiscalizacoes() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { camaraTecnica: ownCamaraTecnica, isAdmin } = useModulo();
    const [searchParams] = useSearchParams();
    // Admin navega livremente entre câmaras pelo seletor no cabeçalho — a câmara "efetiva"
    // dessa página vem da URL (?camara=xxx), não do perfil do usuário (que pra admin é vazio).
    const camaraTecnica = searchParams.get('camara') || ownCamaraTecnica;
    const Layout = useCamaraLayout(searchParams.get('camara'));
    const { online, sessionValid, outboxCount } = useSyncStatus?.() || { online: true, sessionValid: true, outboxCount: 0 };
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('todos');
    const [servicoFilter, setServicoFilter] = useState('todos');
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');
    const [fiscalizacaoParaDeletar, setFiscalizacaoParaDeletar] = useState(null);
    const [mostrarFiltros, setMostrarFiltros] = useState(false);
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

    const servicos = [...new Set(fiscalizacoes.flatMap(f => f.servicos || []))].filter(Boolean);

    const emAndamento = fiscalizacoes.filter(f => f.status === 'em_andamento').length;
    const finalizadas = fiscalizacoes.filter(f => f.status === 'finalizada').length;

    return (
        <Layout>
            {/* Header */}
            <div className="max-w-6xl mx-auto px-4 pt-8">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-xs font-bold uppercase tracking-widest text-slate-400">Histórico de Fiscalizações</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        {isAdmin && (
                            <Link to={createPageUrl('Definicoes')}>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg sm:h-9 sm:w-auto sm:px-3 sm:gap-1.5">
                                    <Settings className="h-4 w-4" />
                                    <span className="hidden sm:inline text-xs">Definições</span>
                                </Button>
                            </Link>
                        )}
                        <Link to={createPageUrl('NovaFiscalizacao')}>
                            <Button className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow gap-1.5 h-12 px-5 text-base">
                                <Plus className="h-5 w-5" />
                                Nova Fiscalização
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="max-w-6xl mx-auto px-4 py-4 space-y-3">
                <div className="flex justify-end">
                    <Button
                        variant="outline"
                        size="icon"
                        title="Filtros"
                        className={`h-9 w-9 rounded-xl border-gray-200 ${mostrarFiltros ? 'bg-indigo-50 border-indigo-300 text-indigo-600' : ''}`}
                        onClick={() => setMostrarFiltros(!mostrarFiltros)}
                    >
                        <Filter className="h-4 w-4" />
                    </Button>
                </div>

                {/* Filtros Avançados (busca inclusa) */}
                {mostrarFiltros && (
                    <div className="space-y-3 p-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Filtros Avançados</p>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                placeholder="Buscar município ou serviço..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10 h-10 rounded-xl bg-white border-gray-200"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-gray-500 font-semibold mb-1 block">Status</label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="h-10 rounded-xl bg-white border-gray-200">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white border-gray-200">
                                        <SelectItem value="todos">Todos</SelectItem>
                                        <SelectItem value="em_andamento">Em andamento</SelectItem>
                                        <SelectItem value="finalizada">Finalizadas</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-semibold mb-1 block">Serviço</label>
                                <Select value={servicoFilter} onValueChange={setServicoFilter}>
                                    <SelectTrigger className="h-10 rounded-xl bg-white border-gray-200">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white border-gray-200">
                                        <SelectItem value="todos">Todos</SelectItem>
                                        {servicos.map(s => (
                                            <SelectItem key={s} value={s}>{s}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-xs text-gray-500 font-semibold mb-1 block">Data Início</label>
                                <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="h-10 rounded-xl bg-white border-gray-200" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 font-semibold mb-1 block">Data Fim</label>
                                <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="h-10 rounded-xl bg-white border-gray-200" />
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-gray-500 hover:text-gray-700 rounded-xl"
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

                            return (
                                <Card key={fisc.id} className="hover:shadow-md transition-all border border-gray-200 rounded-2xl overflow-hidden bg-white">
                                    <CardContent className="p-5">
                                        <div className="flex justify-between items-start gap-3">
                                        <Link
                                            to={createPageUrl('ExecutarFiscalizacao') + `?id=${fisc.id}`}
                                            className="flex-1 min-w-0 block"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex items-start gap-3">
                                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                                        isFinished ? 'bg-emerald-50' : 'bg-sky-50'
                                                    }`}>
                                                        {isFinished ? (
                                                            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                                                        ) : (
                                                            <Clock className="h-6 w-6 text-sky-500" />
                                                        )}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h3 className="font-bold text-gray-800 flex items-center gap-1.5">
                                                            <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                                            {fisc.municipio_nome}
                                                        </h3>
                                                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                            {fisc.servicos?.map(s => (
                                                                <Badge key={s} className="text-[10px] bg-indigo-50 text-indigo-700 border-none font-semibold">{s}</Badge>
                                                            ))}
                                                            <Badge className={`text-[10px] font-semibold border-none ${
                                                                isFinished ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'
                                                            }`}>
                                                                {isFinished ? 'Finalizada' : 'Em andamento'}
                                                            </Badge>
                                                        </div>
                                                        <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
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
                                                </div>
                                                <ChevronRight className="h-5 w-5 text-gray-300 flex-shrink-0 mt-1" />
                                            </div>

                                            {/* Stats */}
                                            {(fisc.total_conformidades > 0 || fisc.total_nao_conformidades > 0) && (
                                                <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100 text-xs">
                                                    <span className="flex items-center gap-1 text-emerald-600 font-medium">
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        {fisc.total_conformidades || 0} Constatações
                                                    </span>
                                                    <span className="flex items-center gap-1 text-rose-600 font-medium">
                                                        <AlertTriangle className="h-3 w-3" />
                                                        {fisc.total_nao_conformidades || 0} NCs
                                                    </span>
                                                </div>
                                            )}
                                        </Link>
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
                                                         className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
                                                                     <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                                                                         <AlertTriangle className="h-5 w-5" />
                                                                         Excluir Fiscalização?
                                                                     </AlertDialogTitle>
                                                                     <AlertDialogDescription className="space-y-2" asChild>
                                                                        <div>
                                                                            <p>Você está prestes a excluir permanentemente:</p>
                                                                            <p className="font-semibold text-gray-900">{fisc.numero_termo} - {fisc.municipio_nome}</p>
                                                                            <p className="text-red-600">Esta ação não pode ser desfeita e removerá todas as unidades, NCs, determinações e dados relacionados.</p>
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
                                                                     <AlertDialogTitle className="flex items-center gap-2 text-red-600">
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
                                          
                                          {/* Ações da Fiscalização */}
                                          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-2">
                                              {/* Status text first */}
                                              {isFinished && <RelatorioFiscalizacao fiscalizacao={fisc} showStatusOnly />}
                                              {/* Row with all buttons aligned horizontally to left */}
                                              <div className="flex gap-2 items-center justify-start">
                                                  <HistoricoFiscalizacao fiscalizacao={fisc} />

                                                  {isFinished ? (
                                                      <>
                                                          <RelatorioFiscalizacao fiscalizacao={fisc} showButtonsOnly />
                                                          {podeDeleter && (
                                                              <Button
                                                                  variant="outline"
                                                                  size="sm"
                                                                  className="text-orange-600 border-orange-200 hover:bg-orange-50 h-9 rounded-xl font-medium"
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
                                                          className="bg-indigo-600 hover:bg-indigo-700 text-white h-9 rounded-xl font-medium text-xs"
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
                                              </div>
                                          </div>
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
                                className="bg-green-600 hover:bg-green-700"
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
                            <Button className="mt-5 bg-indigo-600 hover:bg-indigo-700 rounded-xl">
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
                            <Loader2 className="h-5 w-5 animate-spin text-indigo-500 flex-shrink-0" />
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
                                        className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                                        style={{ width: `${Math.min(100, Math.round((syncProgress.current / syncProgress.total) * 100))}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </Layout>
    );
}
