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
import { Search, SlidersHorizontal, Trash2, Calendar, Map, CheckCircle2, Clock, Plus, Compass, Loader2, Download, ChevronRight, AlertTriangle } from 'lucide-react';
import RelatorioFiscalizacao from '@/components/fiscalizacao/RelatorioFiscalizacao';
import AdminShell from '@/components/layout/AdminShell';
import EmptyState from '@/components/design/EmptyState';
import JSZip from 'jszip';
import { supabase } from '@/lib/supabase';

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
    const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
    const [expandedIds, setExpandedIds] = useState(() => new Set());
    const toggleExpanded = (id) => setExpandedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
    });
    const [deleteConfirmation, setDeleteConfirmation] = useState({ open: false, fiscId: null, step: 1, inputValue: '' });
    const [downloadingFiscId, setDownloadingFiscId] = useState(null);
    const [downloadProgress, setDownloadProgress] = useState('');

    // Mesma lógica de ordenação usada no relatório PDF (relatorios_worker/index.ts:
    // parseKmToNumber/perRodoviaKmSort) — reproduzida aqui pra que a numeração das pastas
    // e das fotos no ZIP baixado bata exatamente com a tabela e as legendas "Foto N" do PDF.
    const parseKmToNumber = (kmStr) => {
        const s = String(kmStr || '').trim();
        if (!s) return Number.POSITIVE_INFINITY;
        const plusMatch = s.match(/^(\d+)\s*\+\s*(\d+)/);
        if (plusMatch) return Number(plusMatch[1]) + Number(plusMatch[2]) / 1000;
        const num = parseFloat(s.replace(',', '.'));
        return Number.isFinite(num) ? num : Number.POSITIVE_INFINITY;
    };

    const perRodoviaKmSort = (a, b, fiscRodovia) => {
        const perA = String(a.per || a.item_contrato || '');
        const perB = String(b.per || b.item_contrato || '');
        if (perA !== perB) return perA.localeCompare(perB);
        const rodA = String(a.rodovia || fiscRodovia || '');
        const rodB = String(b.rodovia || fiscRodovia || '');
        if (rodA !== rodB) return rodA.localeCompare(rodB);
        return parseKmToNumber(a.km) - parseKmToNumber(b.km);
    };

    const handleDownloadPhotos = async (e, fiscalizacao) => {
        e.preventDefault();
        e.stopPropagation();

        setDownloadingFiscId(fiscalizacao.id);
        setDownloadProgress('Carregando dados...');
        try {
            // 1. Carrega unidades da fiscalização ordenadas por ordem e data
            const { data: unidades, error: uErr } = await supabase
                .from('unidades_fiscalizadas')
                .select('id, ordem, nome_unidade, km, rodovia, per, item_contrato, tipo_ocorrencia, fotos_unidade, created_at')
                .eq('fiscalizacao_id', fiscalizacao.id)
                .order('ordem', { ascending: true, nullsFirst: true })
                .order('created_at', { ascending: true });

            if (uErr) throw uErr;
            if (!unidades || unidades.length === 0) {
                alert('Nenhuma ocorrência ou foto encontrada nesta fiscalização.');
                setDownloadingFiscId(null);
                return;
            }

            // Constatações antes de Não Conformidades, cada seção numerada a partir de 1,
            // igual à tabela do relatório (seções VIII e IX).
            const constatacoes = unidades
                .filter((u) => u.tipo_ocorrencia === 'constatacao')
                .sort((a, b) => perRodoviaKmSort(a, b, fiscalizacao.rodovia));
            const naoConformidades = unidades
                .filter((u) => u.tipo_ocorrencia === 'nc')
                .sort((a, b) => perRodoviaKmSort(a, b, fiscalizacao.rodovia));

            const kmClean = (km) => String(km || '').replace(/[+/]/g, '-').trim();
            const rodoviaClean = (rodovia) => String(rodovia || fiscalizacao.rodovia || 'SEM-RODOVIA').replace(/\s+/g, '_');

            // Monta a fila de downloads (com e sem marca d'água) já com o número global de
            // "Foto N" (mesmo contador usado no PDF) e a pasta da ocorrência (item + rodovia + km).
            let globalFotoNum = 0;
            let temFotoSemVersaoLimpa = false;
            const jobs = [];
            const buildJobsForSection = (list) => {
                list.forEach((u, idx) => {
                    const fotos = Array.isArray(u.fotos_unidade) ? u.fotos_unidade : [];
                    if (fotos.length === 0) return;
                    const itemNum = String(idx + 1).padStart(2, '0');
                    const occFolder = `${itemNum}_${rodoviaClean(u.rodovia)}_KM_${kmClean(u.km) || 'SN'}`;
                    fotos.forEach((f) => {
                        globalFotoNum++;
                        const filename = `Foto_${globalFotoNum}.jpg`;
                        const marcada = Repository.parseStorageUrl(f.url) || { bucket: f.bucket, path: f.path };
                        const limpa = f.cleanBucket && f.cleanPath ? { bucket: f.cleanBucket, path: f.cleanPath } : null;
                        if (!limpa) temFotoSemVersaoLimpa = true;
                        jobs.push({ occFolder, filename, marcada, limpa });
                    });
                });
            };
            buildJobsForSection(constatacoes);
            buildJobsForSection(naoConformidades);

            if (jobs.length === 0) {
                alert('Nenhuma foto encontrada nesta fiscalização.');
                setDownloadingFiscId(null);
                return;
            }

            const totalDownloads = jobs.reduce((acc, j) => acc + (j.marcada?.bucket && j.marcada?.path ? 1 : 0) + (j.limpa ? 1 : 0), 0);
            setDownloadProgress(`Iniciando (${totalDownloads} arquivos)...`);
            const zip = new JSZip();

            // 2. Faz o download das fotos (com e sem marca d'água) em sequência
            let baixadas = 0;
            for (const job of jobs) {
                if (job.marcada?.bucket && job.marcada?.path) {
                    setDownloadProgress(`Baixando ${baixadas + 1}/${totalDownloads}...`);
                    try {
                        const { data: blob, error: dlErr } = await supabase.storage
                            .from(job.marcada.bucket)
                            .download(job.marcada.path);
                        if (dlErr) throw dlErr;
                        if (blob) zip.file(`Com_Marca_Dagua/${job.occFolder}/${job.filename}`, blob);
                    } catch (err) {
                        console.error('Falha ao baixar foto (com marca d\'água):', job.marcada.path, err);
                    }
                    baixadas++;
                }
                if (job.limpa) {
                    setDownloadProgress(`Baixando ${baixadas + 1}/${totalDownloads}...`);
                    try {
                        const { data: blob, error: dlErr } = await supabase.storage
                            .from(job.limpa.bucket)
                            .download(job.limpa.path);
                        if (dlErr) throw dlErr;
                        if (blob) zip.file(`Sem_Marca_Dagua/${job.occFolder}/${job.filename}`, blob);
                    } catch (err) {
                        console.error('Falha ao baixar foto (sem marca d\'água):', job.limpa.path, err);
                    }
                    baixadas++;
                }
            }

            setDownloadProgress('Criando ZIP...');
            const content = await zip.generateAsync({ type: 'blob' });

            // 3. Salva o arquivo no navegador do usuário
            const rodoviaFilename = String(fiscalizacao.rodovia || 'DTR').replace(/\s+/g, '_');
            const dataFmt = format(new Date(fiscalizacao.data_inicio || new Date()), 'yyyy-MM-dd');
            const zipFilename = `Fotos_Fiscalizacao_${rodoviaFilename}_${dataFmt}.zip`;

            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = zipFilename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(link.href);

            setDownloadProgress('');
            setDownloadingFiscId(null);
            if (temFotoSemVersaoLimpa) {
                alert('Download concluído. Fotos capturadas antes do recurso de "foto sem marca d\'água" só têm a versão com marca d\'água no ZIP (o arquivo original não foi preservado para elas).');
            }
        } catch (err) {
            console.error('[Download Photos Error]', err);
            alert('Falha ao baixar fotos: ' + (err?.message || String(err)));
            setDownloadingFiscId(null);
        }
    };

    const { data: fiscalizacoes = [], isLoading } = useQuery({
        queryKey: ['fiscalizacoes'],
        queryFn: async () => await Repository.listFiscalizacoes(100),
        staleTime: 30000
    });

    // total_constatacoes/total_ncs da própria fiscalização só é gravado na finalização e nem
    // sempre reflete a realidade. A fonte confiável é somar por unidade/ocorrência vistoriada
    // (já trata o modelo de ocorrências da DTR — cada unidade É uma constatação, e as
    // marcadas 'nc' contam como não conformidade).
    const fiscalizacaoIds = fiscalizacoes.map((f) => f.id);
    const { data: totaisPorFiscalizacao = {} } = useQuery({
        queryKey: ['fiscalizacoes-dtr-totais', fiscalizacaoIds.join(',')],
        queryFn: () => Repository.getTotaisPorFiscalizacao(fiscalizacaoIds),
        enabled: fiscalizacaoIds.length > 0,
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
        <AdminShell
            title="Fiscalizações"
            subtitle={`${filtered.length} registro${filtered.length === 1 ? '' : 's'}`}
            actions={
                <Link to={createPageUrl('NovaFiscalizacaoDTR')} className="hidden sm:inline-flex">
                    <Button className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow gap-1.5 h-9 px-4 text-sm">
                        <Plus className="h-4 w-4" /> Nova Fiscalização
                    </Button>
                </Link>
            }
        >
            <div className="min-h-full flex flex-col">
            {/* Content */}
            <div className="flex-1 max-w-6xl w-full mx-auto px-4 pt-6 pb-5 flex flex-col gap-4">
                {/* Nova Fiscalização — no cabeçalho fixo ela fica espremida no mobile, então
                    aqui ganha um botão de largura total, fácil de alcançar. */}
                <Link to={createPageUrl('NovaFiscalizacaoDTR')} className="block sm:hidden">
                    <Button className="w-full justify-center bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow gap-1.5 h-11 text-sm">
                        <Plus className="h-4 w-4" />
                        Nova Fiscalização
                    </Button>
                </Link>

                {/* Gatilho discreto — só no mobile. A busca/filtros completos só aparecem ao
                    tocar aqui; no desktop eles já ficam sempre visíveis abaixo. */}
                <button
                    type="button"
                    onClick={() => setMobileSearchOpen((o) => !o)}
                    className="sm:hidden w-full flex items-center gap-2 h-10 px-4 rounded-xl bg-white border border-gray-200 text-sm text-gray-400"
                >
                    <Search className="h-4 w-4 flex-shrink-0" />
                    <span className="flex-1 text-left truncate">{search || 'Buscar por rodovia ou concessionária...'}</span>
                    <SlidersHorizontal className="h-4 w-4 text-gray-300 flex-shrink-0" />
                </button>

                <div className={`${mobileSearchOpen ? 'block' : 'hidden'} sm:block space-y-3`}>
                    {/* Busca + filtros (sempre visíveis no desktop) */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar por rodovia ou concessionária..."
                                className="pl-10 h-10 rounded-xl bg-white border-gray-200"
                            />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="h-10 w-full sm:w-44 rounded-xl bg-white border-gray-200 text-xs text-gray-700">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-gray-200">
                                <SelectItem value="todos">Todos os status</SelectItem>
                                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                                <SelectItem value="finalizada">Finalizados</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={rodoviaFilter} onValueChange={setRodoviaFilter}>
                            <SelectTrigger className="h-10 w-full sm:w-48 rounded-xl bg-white border-gray-200 text-xs text-gray-700">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-gray-200">
                                <SelectItem value="todos">Todas as rodovias</SelectItem>
                                {rodoviasDisponiveis.map(r => (
                                    <SelectItem key={r} value={r}>{r}</SelectItem>
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
                        <div className="flex flex-col sm:flex-row gap-3 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                            <div className="flex-1 space-y-1">
                                <label className="text-xs text-gray-500 font-medium">Início</label>
                                <Input
                                    type="date"
                                    value={dataInicio}
                                    onChange={e => setDataInicio(e.target.value)}
                                    className="h-9 text-xs"
                                />
                            </div>
                            <div className="flex-1 space-y-1">
                                <label className="text-xs text-gray-500 font-medium">Fim</label>
                                <Input
                                    type="date"
                                    value={dataFim}
                                    onChange={e => setDataFim(e.target.value)}
                                    className="h-9 text-xs"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* List */}
                <div className="space-y-3">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <Loader2 className="h-8 w-8 text-[#0066B3] animate-spin" />
                            <p className="text-sm text-gray-400">Carregando vistorias...</p>
                        </div>
                    ) : filtered.length === 0 ? (
                        <EmptyState
                            icon={Compass}
                            title="Nenhuma vistoria encontrada"
                            description="Abra uma nova vistoria DTR para começar."
                        />
                    ) : (
                        filtered.map(f => {
                            const dataFmt = f.data_inicio
                                ? format(new Date(f.data_inicio), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
                                : '—';
                            const horaFmt = f.data_inicio
                                ? format(new Date(f.data_inicio), 'HH:mm')
                                : '';

                            const isFinalized = f.status === 'finalizada';
                            const { total_constatacoes = 0, total_ncs = 0 } = totaisPorFiscalizacao[f.id] || {};
                            const isExpanded = expandedIds.has(f.id);

                            return (
                                <Card key={f.id} className="border border-gray-200 rounded-2xl overflow-hidden bg-white">
                                    <CardContent className="p-0">
                                        {/* Cabeçalho — clique expande; clique de novo (já expandido) abre a fiscalização */}
                                        <div className="w-full flex items-center gap-1 p-4 sm:p-5">
                                            <button
                                                type="button"
                                                onClick={() => toggleExpanded(f.id)}
                                                className="flex-1 min-w-0 flex items-center gap-3 text-left"
                                            >
                                                <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${isFinalized ? 'bg-emerald-50' : 'bg-sky-50'}`}>
                                                    {isFinalized ? (
                                                        <CheckCircle2 className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-500" />
                                                    ) : (
                                                        <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-sky-500" />
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="font-bold text-gray-800 flex items-center gap-1.5 text-sm sm:text-base">
                                                        <Map className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                                        <span className="truncate">{f.rodovia || 'Rodovia Indefinida'}</span>
                                                    </h3>
                                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                                        {f.prestador_servico_nome && (
                                                            <Badge className="pointer-events-none text-[10px] bg-indigo-50 text-indigo-700 border-none font-semibold">
                                                                {f.prestador_servico_nome}
                                                            </Badge>
                                                        )}
                                                        <Badge className={`pointer-events-none text-[10px] font-semibold border-none ${isFinalized ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'}`}>
                                                            {isFinalized ? 'Finalizada' : 'Em andamento'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </button>
                                            <Link
                                                to={createPageUrl('ExecutarFiscalizacaoDTR') + `?id=${f.id}`}
                                                title="Abrir fiscalização"
                                                className="grid place-items-center h-9 w-9 rounded-lg text-gray-300 hover:text-[#0066B3] hover:bg-blue-50 flex-shrink-0 transition-colors"
                                            >
                                                <ChevronRight className="h-5 w-5" />
                                            </Link>
                                        </div>

                                        {/* Detalhes — só aparecem expandido */}
                                        {isExpanded && (
                                            <div className="px-4 sm:px-5 pb-5 border-t border-gray-100">
                                                <p className="text-xs text-gray-400 flex items-center gap-1 pt-4">
                                                    <Calendar className="h-3 w-3" />
                                                    {dataFmt} {horaFmt}
                                                </p>

                                                {(total_constatacoes > 0 || total_ncs > 0) && (
                                                    <div className="flex gap-4 mt-3 pt-3 border-t border-gray-100 text-xs">
                                                        <span className="flex items-center gap-1 text-emerald-600 font-medium">
                                                            <CheckCircle2 className="h-3 w-3" /> {total_constatacoes} Constatações
                                                        </span>
                                                        <span className="flex items-center gap-1 text-rose-600 font-medium">
                                                            <AlertTriangle className="h-3 w-3" /> {total_ncs} NCs
                                                        </span>
                                                    </div>
                                                )}

                                                {/* Ações — relatório, fotos e exclusão alinhadas na mesma linha, abaixo do status */}
                                                <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-2">
                                                    {isFinalized && <RelatorioFiscalizacao fiscalizacao={f} showStatusOnly />}
                                                    <div className="flex flex-wrap gap-2 items-center">
                                                        {isFinalized ? (
                                                            <RelatorioFiscalizacao fiscalizacao={f} showButtonsOnly />
                                                        ) : (
                                                            <span className="text-xs font-semibold text-gray-400">
                                                                Em andamento
                                                            </span>
                                                        )}

                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="border-gray-200 hover:bg-blue-50 hover:text-[#0066B3] hover:border-blue-200 text-gray-600 rounded-xl h-9 font-medium text-xs flex items-center gap-1.5"
                                                            disabled={downloadingFiscId === f.id}
                                                            onClick={(e) => handleDownloadPhotos(e, f)}
                                                        >
                                                            {downloadingFiscId === f.id ? (
                                                                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {downloadProgress}</>
                                                            ) : (
                                                                <><Download className="h-3.5 w-3.5" /> Baixar Fotos (ZIP)</>
                                                            )}
                                                        </Button>

                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 h-9 rounded-xl ml-auto"
                                                            onClick={(e) => handleDeleteClick(e, f.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
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
        </AdminShell>
    );
}
