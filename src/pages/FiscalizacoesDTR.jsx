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
import { ArrowLeft, Search, Filter, Trash2, Calendar, Map, CheckCircle2, Clock, Plus, Compass } from 'lucide-react';
import RelatorioFiscalizacao from '@/components/fiscalizacao/RelatorioFiscalizacao';

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

        const matchSearch = (f.municipio_nome || '').toLowerCase().includes(search.toLowerCase()) ||
            (f.rodovia || '').toLowerCase().includes(search.toLowerCase()) ||
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
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 border-b border-indigo-600/30">
                <div className="max-w-md mx-auto px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link to={createPageUrl('Home')}>
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-lg font-bold">Vistorias DTR</h1>
                            <p className="text-indigo-200 text-xs">Histórico e Execução de Rodovias</p>
                        </div>
                    </div>
                    <Link to={createPageUrl('NovaFiscalizacaoDTR')}>
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full">
                            <Plus className="h-4 w-4 mr-1" /> Novo
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 max-w-md w-full mx-auto px-4 py-5 flex flex-col gap-4">
                {/* Search Bar */}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-500" />
                        <Input 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Buscar por rodovia, município..."
                            className="bg-slate-800 border-slate-750 text-slate-100 pl-10 h-11 rounded-xl placeholder:text-slate-500"
                        />
                    </div>
                    <Button 
                        variant="outline" 
                        size="icon"
                        className={`h-11 w-11 rounded-xl transition-all ${mostrarFiltros ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-800 border-slate-750 text-slate-350'}`}
                        onClick={() => setMostrarFiltros(!mostrarFiltros)}
                    >
                        <Filter className="h-5 w-5" />
                    </Button>
                </div>

                {/* Expanded Filters */}
                {mostrarFiltros && (
                    <Card className="border border-slate-850 bg-slate-800/60 p-4 rounded-xl space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 font-medium">Status</label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="bg-slate-800 border-slate-750 text-xs h-9 text-slate-200">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700 text-slate-150">
                                        <SelectItem value="todos">Todos</SelectItem>
                                        <SelectItem value="em_andamento">Em Andamento</SelectItem>
                                        <SelectItem value="finalizada">Finalizados</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 font-medium">Rodovia</label>
                                <Select value={rodoviaFilter} onValueChange={setRodoviaFilter}>
                                    <SelectTrigger className="bg-slate-800 border-slate-750 text-xs h-9 text-slate-200">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700 text-slate-150">
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
                                <label className="text-xs text-slate-400 font-medium">Início</label>
                                <Input 
                                    type="date" 
                                    value={dataInicio} 
                                    onChange={e => setDataInicio(e.target.value)}
                                    className="bg-slate-800 border-slate-750 h-9 text-xs text-slate-200"
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs text-slate-400 font-medium">Fim</label>
                                <Input 
                                    type="date" 
                                    value={dataFim} 
                                    onChange={e => setDataFim(e.target.value)}
                                    className="bg-slate-800 border-slate-750 h-9 text-xs text-slate-200"
                                />
                            </div>
                        </div>
                    </Card>
                )}

                {/* List */}
                <div className="space-y-3">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <Loader2 className="h-8 w-8 text-indigo-400 animate-spin" />
                            <p className="text-sm text-slate-400">Carregando vistorias...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-12 bg-slate-800/20 border border-slate-800/40 rounded-2xl">
                            <Compass className="h-10 w-10 text-slate-600 mx-auto mb-2" />
                            <p className="text-sm text-slate-400 font-medium">Nenhuma vistoria encontrada</p>
                            <p className="text-xs text-slate-500 mt-1">Abra uma nova vistoria DTR para começar.</p>
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
                                    className="block transition-all transform active:scale-98"
                                >
                                    <Card className="bg-slate-800 border border-slate-750/70 hover:border-indigo-500/50 transition-all rounded-xl shadow-md overflow-hidden relative">
                                        <CardContent className="p-4 flex flex-col justify-between gap-3">
                                            {/* Top info */}
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="font-bold text-slate-200 text-sm flex items-center gap-1.5">
                                                        <Map className="h-4 w-4 text-indigo-400" />
                                                        {f.rodovia || 'Rodovia Indefinida'}
                                                    </h3>
                                                    <p className="text-xs text-slate-400 mt-0.5">{f.prestador_servico_nome}</p>
                                                </div>
                                                <Badge 
                                                    variant="outline" 
                                                    className={`text-[10px] px-2 py-0.5 rounded-full ${isFinalized ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/5' : 'border-sky-500/40 text-sky-400 bg-sky-500/5'}`}
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
                                            <div className="text-xs text-slate-400 bg-slate-850/50 p-2.5 rounded-lg border border-slate-750/40 flex flex-col gap-1">
                                                <p><strong>Município:</strong> {f.municipio_nome}</p>
                                                <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500 font-mono">
                                                    <span className="flex items-center gap-1">
                                                        <Calendar className="h-3 w-3" />
                                                        {dataFmt} {horaFmt}
                                                    </span>
                                                    <span>{f.id.substring(0, 8).toUpperCase()}</span>
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex items-center justify-between border-t border-slate-750/60 pt-2.5 mt-1">
                                                {isFinalized ? (
                                                    <div className="flex gap-2">
                                                        <RelatorioFiscalizacao fiscalizacaoId={f.id} customLabel="Laudo PDF" className="bg-slate-700 hover:bg-slate-655 text-xs text-slate-200 rounded-lg px-3 py-1.5 h-auto" />
                                                    </div>
                                                ) : (
                                                    <span className="text-xs font-semibold text-sky-400 hover:text-sky-350">
                                                        Continuar inspeção →
                                                    </span>
                                                )}
                                                
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-slate-500 hover:text-rose-400 hover:bg-rose-950/20 rounded-lg"
                                                    onClick={(e) => handleDeleteClick(e, f.id)}
                                                >
                                                    <Trash2 className="h-4.5 w-4.5" />
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Delete Dialog */}
            <AlertDialog open={deleteConfirmation.open} onOpenChange={(open) => setDeleteConfirmation(prev => ({ ...prev, open }))}>
                <AlertDialogContent className="bg-slate-800 border border-slate-700 text-slate-100 max-w-sm rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-rose-400 font-bold text-lg">Atenção!</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-300 text-sm">
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
                            className="bg-slate-900 border-slate-700 text-slate-100 placeholder:text-slate-600 h-10 uppercase"
                        />
                    </div>
                    <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel className="bg-slate-700 hover:bg-slate-600 border-none text-slate-200">
                            Cancelar
                        </AlertDialogCancel>
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

            {/* Footer */}
            <div className="py-4 text-center text-xs text-slate-500">
                AGEMS - DTR
            </div>
        </div>
    );
}
