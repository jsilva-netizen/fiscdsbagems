import { useState } from 'react';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
import { deleteFiscalizacaoComImagens } from '@/lib/storageCleanup';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Repository } from '@/lib/offline/repository';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from '@/components/ui/alert-dialog';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Search, Filter, Trash2, Calendar, Map, CheckCircle2, Clock, Plus, Compass, Loader2, Settings } from 'lucide-react';
import RelatorioFiscalizacao from '@/components/fiscalizacao/RelatorioFiscalizacao';
import CaterfLayout from '@/components/caterf/CaterfLayout';

const DTR_MODULOS = ['rodovias_dtr', 'transportes_dtr', 'fiscal_dtr'];

export default function FiscalizacoesDTR() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('todos');
    const [rodoviaFilter, setRodoviaFilter] = useState('todos');
    const [dataInicio, setDataInicio] = useState('');
    const [dataFim, setDataFim] = useState('');
    const [mostrarFiltros, setMostrarFiltros] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState({ open: false, fiscId: null, step: 1, inputValue: '' });

    const { data: fiscalizacoes = [], isLoading } = useQuery({
        queryKey: ['fiscalizacoes'],
        queryFn: async () => await Repository.listFiscalizacoes(100),
        staleTime: 30000
    });

    const deletarFiscalizacaoMutation = useMutation({
        mutationFn: async (fiscalizacaoId) => {
            await deleteFiscalizacaoComImagens(fiscalizacaoId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['fiscalizacoes'] });
            setDeleteConfirmation({ open: false, fiscId: null, step: 1, inputValue: '' });
        },
        onError: (error) => {
            alert('Erro ao deletar fiscalização: ' + error.message);
        }
    });

    const filtered = fiscalizacoes.filter(f => {
        // Filtrar apenas vistorias DTR
        const isDtr = DTR_MODULOS.includes(f.tipo_modulo);
        if (!isDtr) return false;

        const matchSearch = (f.rodovia || '').toLowerCase().includes(search.toLowerCase()) ||
            (f.prestador_servico_nome || '').toLowerCase().includes(search.toLowerCase());

        const matchStatus = statusFilter === 'todos' || f.status === statusFilter;
        const matchRodovia = rodoviaFilter === 'todos' || f.rodovia === rodoviaFilter;

        let matchData = true;
        if (dataInicio && dataFim) {
            const fiscData = new Date(f.data_inicio);
            const inicio = new Date(dataInicio);
            const fim = new Date(dataFim);
            fim.setHours(23, 59, 59, 999);
            matchData = fiscData >= inicio && fiscData <= fim;
        }

        return matchSearch && matchStatus && matchRodovia && matchData;
    });

    const rodoviasDisponiveis = Array.from(new Set(fiscalizacoes.filter(f => DTR_MODULOS.includes(f.tipo_modulo) && f.rodovia).map(f => f.rodovia)));

    const handleDeleteClick = (e, fiscId) => {
        e.preventDefault();
        e.stopPropagation();
        setDeleteConfirmation({ open: true, fiscId, step: 1, inputValue: '' });
    };

    const handleConfirmDelete = () => {
        if (deleteConfirmation.inputValue.toUpperCase() === 'EXCLUIR') {
            deletarFiscalizacaoMutation.mutate(deleteConfirmation.fiscId);
        } else {
            alert('Você deve digitar EXCLUIR para confirmar.');
        }
    };

    return (
        <CaterfLayout>
            <div className="min-h-full flex flex-col">
            {/* Header */}
            <div className="max-w-6xl mx-auto px-4 pt-8">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-xs font-bold uppercase tracking-widest text-slate-400">Histórico de Fiscalizações</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <Link to={createPageUrl('DefinicoesDTR')}>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg sm:h-9 sm:w-auto sm:px-3 sm:gap-1.5">
                                <Settings className="h-4 w-4" />
                                <span className="hidden sm:inline text-xs">Definições</span>
                            </Button>
                        </Link>
                        <Link to={createPageUrl('NovaFiscalizacaoDTR')}>
                            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow gap-1.5">
                                <Plus className="h-4 w-4" /> Nova Fiscalização
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 max-w-6xl w-full mx-auto px-4 py-5 flex flex-col gap-4">
                {/* Filter toggle — busca e filtros ficam escondidos até o usuário pedir */}
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        className={`h-11 rounded-xl transition-all border gap-1.5 text-sm ${mostrarFiltros ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                        onClick={() => setMostrarFiltros(!mostrarFiltros)}
                    >
                        <Filter className="h-4 w-4" />
                        Filtros
                    </Button>
                </div>

                {/* Expanded Filters (busca inclusa) */}
                {mostrarFiltros && (
                    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4 shadow-sm">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar por rodovia..."
                                className="pl-10 h-10 rounded-xl bg-white border-gray-200"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs text-gray-500 font-medium">Status</label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="bg-white border-gray-200 text-xs h-9 text-gray-700">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white border-gray-200">
                                        <SelectItem value="todos">Todos</SelectItem>
                                        <SelectItem value="em_andamento">Em Andamento</SelectItem>
                                        <SelectItem value="finalizada">Finalizados</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-500 font-medium">Rodovia</label>
                                <Select value={rodoviaFilter} onValueChange={setRodoviaFilter}>
                                    <SelectTrigger className="bg-white border-gray-200 text-xs h-9 text-gray-700">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white border-gray-200">
                                        <SelectItem value="todos">Todas</SelectItem>
                                        {rodoviasDisponiveis.map(r => (
                                            <SelectItem key={r} value={r}>{r}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs text-gray-500 font-medium">Início</label>
                                <Input
                                    type="date"
                                    value={dataInicio}
                                    onChange={e => setDataInicio(e.target.value)}
                                    className="h-9 text-xs"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-gray-500 font-medium">Fim</label>
                                <Input
                                    type="date"
                                    value={dataFim}
                                    onChange={e => setDataFim(e.target.value)}
                                    className="h-9 text-xs"
                                />
                            </div>
                        </div>
                    </div>
                )}

                {/* List */}
                <div className="space-y-3">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
                            <p className="text-sm text-gray-400">Carregando vistorias...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-12 bg-white border border-gray-200 rounded-2xl shadow-sm">
                            <Compass className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                            <p className="text-sm text-gray-500 font-medium">Nenhuma vistoria encontrada</p>
                            <p className="text-xs text-gray-400 mt-1">Abra uma nova vistoria DTR para começar.</p>
                        </div>
                    ) : (
                        filtered.map(f => {
                            const dataFmt = f.data_inicio
                                ? format(new Date(f.data_inicio), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                                : '—';
                            const horaFmt = f.data_inicio
                                ? format(new Date(f.data_inicio), 'HH:mm')
                                : '';

                            const isFinalized = f.status === 'finalizada';

                            return (
                                <Link
                                    key={f.id}
                                    to={createPageUrl('ExecutarFiscalizacaoDTR') + `?id=${f.id}`}
                                    className="block transition-all"
                                >
                                    <Card className="bg-white border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all rounded-xl shadow-sm overflow-hidden">
                                        <CardContent className="p-4 flex flex-col justify-between gap-3">
                                            {/* Top info */}
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-bold text-gray-800 text-sm flex items-center gap-1.5">
                                                        <Map className="h-4 w-4 text-indigo-500" />
                                                        {f.rodovia || 'Rodovia Indefinida'}
                                                    </h3>
                                                    <p className="text-xs text-gray-500 mt-0.5">{f.prestador_servico_nome}</p>
                                                </div>
                                                <Badge
                                                    variant="outline"
                                                    className={`text-[10px] px-2 py-0.5 rounded-full ${isFinalized ? 'border-emerald-300 text-emerald-700 bg-emerald-50' : 'border-sky-300 text-sky-700 bg-sky-50'}`}
                                                >
                                                    {isFinalized ? (
                                                        <CheckCircle2 className="h-3 w-3 mr-1 inline-block" />
                                                    ) : (
                                                        <Clock className="h-3 w-3 mr-1 inline-block animate-pulse" />
                                                    )}
                                                    {isFinalized ? 'Finalizado' : 'Em Andamento'}
                                                </Badge>
                                            </div>

                                            {/* Middle detail */}
                                            <div className="text-xs text-gray-500 bg-gray-50 p-2.5 rounded-lg border border-gray-100 flex flex-col gap-1">
                                                <div className="flex items-center justify-between text-[11px] text-gray-400 font-mono">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {dataFmt} {horaFmt}
                                                    </span>
                                                    <span>{f.id.substring(0, 8).toUpperCase()}</span>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex flex-col gap-1.5 border-t border-gray-100 pt-2.5 mt-1">
                                                {isFinalized ? (
                                                    <div className="flex gap-2">
                                                        <RelatorioFiscalizacao fiscalizacao={f} />
                                                    </div>
                                                ) : (
                                                    <span className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                                                        Continuar inspeção →
                                                    </span>
                                                )}
                                                <div className="flex justify-end">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg"
                                                        onClick={(e) => handleDeleteClick(e, f.id)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="mt-auto py-5 text-center text-xs text-gray-400 bg-white border-t border-gray-200">
                AGEMS - Agência Estadual de Regulação de Serviços Públicos de MS
            </div>
            </div>

            {/* Delete Dialog */}
            <AlertDialog open={deleteConfirmation.open} onOpenChange={(open) => setDeleteConfirmation(prev => ({ ...prev, open }))}>
                <AlertDialogContent className="max-w-sm rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-rose-600 font-bold text-lg">Atenção!</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-600 text-sm">
                            Esta ação excluirá permanentemente os registros e fotos desta fiscalização localmente.
                            <br /><br />
                            Digite <strong>EXCLUIR</strong> no campo abaixo para confirmar:
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-2">
                        <Input
                            value={deleteConfirmation.inputValue}
                            onChange={(e) => setDeleteConfirmation(prev => ({ ...prev, inputValue: e.target.value }))}
                            placeholder="Digitar EXCLUIR..."
                            className="h-10 uppercase"
                        />
                    </div>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <Button
                            className="bg-rose-600 hover:bg-rose-700 text-white font-semibold"
                            onClick={handleConfirmDelete}
                            disabled={deleteConfirmation.inputValue.toUpperCase() !== 'EXCLUIR'}
                        >
                            Excluir Registro
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </CaterfLayout>
    );
}
