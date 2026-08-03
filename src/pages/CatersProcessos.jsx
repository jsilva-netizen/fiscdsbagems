import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Filter,
  FolderSearch,
  Loader2,
  Plus,
  Search,
  X,
  Link2,
  Link2Off,
} from 'lucide-react';
import AdminShell from '@/components/layout/AdminShell';
import {
  fetchProcesses,
  createProcess,
  formatProcessStatus,
  computeResponseDueAt,
  fetchFiscalizacoesParaVincular,
  importFromFiscalizacao,
} from '@/lib/caters/processes';
import { formatIsoDateHuman, daysFromToday } from '@/lib/caters/dates';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';

const PAGE_SIZE = 25;

const QUICK_TABS = [
  { id: '', label: 'Visão Geral' },
  { id: 'encerrado', label: 'Arquivados' },
  { id: 'aguardando_analise', label: 'Pendentes' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'aguardando_analise', label: 'Aguardando análise' },
  { value: 'em_analise', label: 'Em análise' },
  { value: 'respondido', label: 'Respondido' },
  { value: 'no_prazo', label: 'No prazo' },
  { value: 'critico', label: 'Crítico' },
  { value: 'atrasado', label: 'Resposta atrasada' },
  { value: 'encerrado', label: 'Encerrado' },
];

function statusColor(status) {
  switch (status) {
    case 'encerrado': return 'bg-slate-100 text-slate-600';
    case 'respondido': return 'bg-blue-50 text-blue-700';
    case 'em_analise': return 'bg-amber-50 text-amber-700';
    case 'aguardando_analise': return 'bg-slate-50 text-slate-500';
    case 'critico': return 'bg-red-50 text-red-700';
    case 'atrasado': return 'bg-orange-50 text-orange-700';
    case 'no_prazo': return 'bg-emerald-50 text-emerald-700';
    default: return 'bg-slate-100 text-slate-600';
  }
}

function StatusBadge({ p }) {
  const hasOpenRecs = (p.recommendations_overdue ?? 0) + (p.recommendations_on_time ?? 0) > 0;
  const isFollowUp = p.status === 'respondido' && hasOpenRecs;
  const hasOverdueRecs = (p.recommendations_overdue ?? 0) > 0;

  const label = isFollowUp ? 'Em acompanhamento' : formatProcessStatus(p.status);
  const className = isFollowUp
    ? (hasOverdueRecs ? 'bg-red-50 text-red-700' : 'bg-indigo-50 text-indigo-700')
    : statusColor(p.status);

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${isFollowUp ? (hasOverdueRecs ? 'bg-red-600' : 'bg-indigo-600') : 'bg-current'}`} />
      {label}
    </span>
  );
}

const EMPTY_FORM = {
  process_number: '',
  municipality: '',
  object: '',
  status: 'aguardando_analise',
  technician_name: '',
  ar_sent_at: '',
  ar_received_at: '',
  ar_tracking_code: '',
  ar_protocol_number: '',
  report_sent_at: '',
  titular_response_due_at: '',
  observations: '',
};

export default function CatersProcessos() {
  const qc = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  // Filters (applied on search button click)
  const [searchApplied, setSearchApplied] = useState('');
  const [municipalityApplied, setMunicipalityApplied] = useState('');
  const [statusApplied, setStatusApplied] = useState('');

  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  // Drafts
  const [searchDraft, setSearchDraft] = useState('');
  const [municipalityDraft, setMunicipalityDraft] = useState('');
  const [statusDraft, setStatusDraft] = useState('');
  const [createdFromDraft, setCreatedFromDraft] = useState('');
  const [createdToDraft, setCreatedToDraft] = useState('');

  // Applied date range
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');

  // Quick tab
  const [quickTab, setQuickTab] = useState('');

  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedFiscalizacaoId, setSelectedFiscalizacaoId] = useState('');

  const processesQ = useQuery({
    queryKey: ['caters-processes', searchApplied, municipalityApplied, statusApplied || quickTab],
    queryFn: () => fetchProcesses({ search: searchApplied, municipality: municipalityApplied, status: statusApplied || quickTab }),
    staleTime: 30_000,
  });

  const fiscalizacoesQ = useQuery({
    queryKey: ['caters-fiscalizacoes-vincular'],
    queryFn: fetchFiscalizacoesParaVincular,
    enabled: showForm,
    staleTime: 60_000,
  });

  const createMut = useMutation({
    mutationFn: async (data) => {
      const proc = await createProcess({ ...data, created_by: user?.id });
      if (selectedFiscalizacaoId) await importFromFiscalizacao(selectedFiscalizacaoId, proc.id);
      return proc;
    },
    onSuccess: (proc) => {
      qc.invalidateQueries({ queryKey: ['caters-processes'] });
      qc.invalidateQueries({ queryKey: ['caters-dashboard'] });
      setShowForm(false);
      setForm(EMPTY_FORM);
      setSelectedFiscalizacaoId('');
      toast({ title: selectedFiscalizacaoId ? 'Processo criado e recomendações importadas.' : 'Processo criado.' });
    },
    onError: (e) => toast({ title: 'Erro ao criar processo', description: e.message, variant: 'destructive' }),
  });

  const handleApplyFilters = () => {
    setSearchApplied(searchDraft);
    setMunicipalityApplied(municipalityDraft);
    setStatusApplied(statusDraft);
    setCreatedFrom(createdFromDraft);
    setCreatedTo(createdToDraft);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearchDraft(''); setMunicipalityDraft(''); setStatusDraft('');
    setCreatedFromDraft(''); setCreatedToDraft('');
    setSearchApplied(''); setMunicipalityApplied(''); setStatusApplied('');
    setCreatedFrom(''); setCreatedTo('');
    setPage(1);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, v === '' ? null : v])
    );
    createMut.mutate(payload);
  };

  const handleFiscalizacaoSelect = (fiscalizacaoId) => {
    setSelectedFiscalizacaoId(fiscalizacaoId);
    if (!fiscalizacaoId) return;
    const fisc = (fiscalizacoesQ.data ?? []).find((f) => f.id === fiscalizacaoId);
    if (!fisc) return;
    const dataBase = fisc.data_fim ?? fisc.data_inicio ?? '';
    const prazoDate = dataBase
      ? new Date(new Date(dataBase).getTime() + 30 * 86400000).toISOString().split('T')[0]
      : '';
    setForm((f) => ({
      ...f,
      municipality: fisc.municipality ?? f.municipality,
      technician_name: fisc.technician_name ?? f.technician_name,
      process_number: f.process_number || (fisc.numero_termo ? `CATERS-${fisc.numero_termo}` : f.process_number),
      titular_response_due_at: prazoDate || f.titular_response_due_at,
      status: 'em_analise',
    }));
  };

  // Client-side date range filter
  const allProcesses = processesQ.data ?? [];
  const filteredProcesses = useMemo(() => {
    if (!createdFrom && !createdTo) return allProcesses;
    return allProcesses.filter((p) => {
      const d = p.created_at?.slice(0, 10);
      if (!d) return true;
      if (createdFrom && d < createdFrom) return false;
      if (createdTo && d > createdTo) return false;
      return true;
    });
  }, [allProcesses, createdFrom, createdTo]);

  const totalPages = Math.max(1, Math.ceil(filteredProcesses.length / PAGE_SIZE));
  const effectivePage = Math.min(page, totalPages);
  const pageItems = filteredProcesses.slice((effectivePage - 1) * PAGE_SIZE, effectivePage * PAGE_SIZE);

  const paginationLabel = useMemo(() => {
    const total = filteredProcesses.length;
    if (!total) return '0 processos';
    const start = (effectivePage - 1) * PAGE_SIZE + 1;
    const end = Math.min(total, effectivePage * PAGE_SIZE);
    return `${start}-${end} de ${total} processos`;
  }, [effectivePage, filteredProcesses.length]);

  const hasActiveFilters = searchApplied || municipalityApplied || statusApplied || createdFrom || createdTo;

  return (
    <AdminShell title="CATERS" subtitle="Câmara Técnica de Resíduos Sólidos">
      <div className="min-h-full bg-slate-50">
        <div className="px-8 pb-12 pt-8">
          <div className="mx-auto max-w-6xl space-y-6">

            {/* Header */}
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-xs font-bold uppercase tracking-widest text-slate-400">Processos</h1>
              </div>
              <Button onClick={() => { setForm(EMPTY_FORM); setShowForm(true); }} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                <Plus className="h-4 w-4" />
                Novo processo
              </Button>
            </div>

            {/* Quick tabs */}
            <nav className="flex items-center gap-5 border-b border-slate-200">
              {QUICK_TABS.map((t) => (
                <button key={t.id} type="button"
                  onClick={() => { setQuickTab(t.id); setStatusApplied(''); setStatusDraft(''); setPage(1); }}
                  className={`-mb-px border-b-2 pb-2.5 text-sm font-semibold transition-colors ${
                    quickTab === t.id
                      ? 'border-emerald-600 text-emerald-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}>
                  {t.label}
                </button>
              ))}
            </nav>

            {/* Filtros */}
            <div className="rounded-xl border border-slate-200 bg-slate-100 shadow-sm">
              <button
                type="button"
                onClick={() => setFiltrosAbertos(!filtrosAbertos)}
                className="flex items-center gap-2 w-full text-left p-4"
              >
                <Filter className="h-4 w-4 text-slate-500" />
                <span className="font-semibold text-sm text-slate-700">Filtros</span>
                {hasActiveFilters && <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />}
                <ChevronDown className={`h-4 w-4 text-slate-400 ml-auto transition-transform ${filtrosAbertos ? 'rotate-180' : ''}`} />
              </button>
              {filtrosAbertos && (
              <div className="flex flex-wrap items-end gap-3 p-4 pt-0">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input className="pl-9 bg-white" placeholder="Buscar por número…"
                    value={searchDraft} onChange={(e) => setSearchDraft(e.target.value)} />
                </div>
                <Input className="w-48 bg-white" placeholder="Município…"
                  value={municipalityDraft} onChange={(e) => setMunicipalityDraft(e.target.value)} />
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <select value={statusDraft} onChange={(e) => setStatusDraft(e.target.value)}
                    className="h-10 rounded-md border border-input bg-white pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                    {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="flex items-end gap-2">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-slate-500">De</div>
                    <Input type="date" className="w-36 bg-white" value={createdFromDraft}
                      onChange={(e) => setCreatedFromDraft(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-slate-500">Até</div>
                    <Input type="date" className="w-36 bg-white" value={createdToDraft}
                      onChange={(e) => setCreatedToDraft(e.target.value)} />
                  </div>
                </div>
                <Button onClick={handleApplyFilters} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                  <Filter className="h-4 w-4" />
                  Filtrar
                </Button>
                {hasActiveFilters && (
                  <Button variant="ghost" size="icon" onClick={handleClearFilters} title="Limpar filtros">
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              )}
            </div>

            {/* Tabela */}
            {processesQ.isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : processesQ.isError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Erro: {String(processesQ.error?.message)}
              </div>
            ) : !filteredProcesses.length ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300/60 bg-white py-16 text-center">
                <FolderSearch className="mb-3 h-12 w-12 text-slate-200" />
                <p className="font-medium text-slate-500">Nenhum processo encontrado</p>
                <p className="mt-1 text-sm text-slate-400">
                  {hasActiveFilters ? 'Tente ajustar os filtros.' : 'Crie o primeiro processo com o botão acima.'}
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-sm border-collapse">
                  <thead className="bg-slate-100 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                    <tr>
                      <th className="border-b border-slate-200 px-5 py-3 text-left">Processo</th>
                      <th className="border-b border-slate-200 px-5 py-3 text-left">Município</th>
                      <th className="hidden border-b border-slate-200 px-5 py-3 text-left md:table-cell">Status</th>
                      <th className="hidden border-b border-slate-200 px-5 py-3 text-left lg:table-cell">Prazo resposta</th>
                      <th className="hidden border-b border-slate-200 px-5 py-3 text-left lg:table-cell">Criado em</th>
                      <th className="hidden border-b border-slate-200 px-5 py-3 text-center xl:table-cell">Recom.</th>
                      <th className="border-b border-slate-200 px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/70">
                    {pageItems.map((p, idx) => {
                      const dueAt = computeResponseDueAt(p);
                      const days = dueAt ? daysFromToday(dueAt) : null;
                      const isOverdue = days !== null && days < 0;
                      return (
                        <tr key={p.id} className={`group transition-colors hover:bg-slate-50 ${idx % 2 === 1 ? 'bg-slate-50/30' : 'bg-white'}`}>
                          <td className="px-5 py-3.5 font-bold text-indigo-600">{p.process_number}</td>
                          <td className="px-5 py-3.5 text-slate-600">{p.municipality}</td>
                          <td className="hidden px-5 py-3.5 md:table-cell">
                            <StatusBadge p={p} />
                          </td>
                          <td className="hidden px-5 py-3.5 lg:table-cell">
                            {dueAt ? (
                              <span className={isOverdue ? 'font-semibold text-red-600' : 'text-slate-600'}>
                                {formatIsoDateHuman(dueAt)}
                                {isOverdue && ` (${Math.abs(days)}d)`}
                              </span>
                            ) : <span className="text-slate-400">—</span>}
                          </td>
                          <td className="hidden px-5 py-3.5 text-slate-500 lg:table-cell">
                            {formatIsoDateHuman(p.created_at?.slice(0, 10))}
                          </td>
                          <td className="hidden px-5 py-3.5 xl:table-cell">
                            <div className="flex items-center justify-center gap-1.5">
                              {(p.recommendations_on_time ?? 0) > 0 && (
                                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                  {p.recommendations_on_time}✓
                                </span>
                              )}
                              {(p.recommendations_overdue ?? 0) > 0 && (
                                <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">
                                  {p.recommendations_overdue}✗
                                </span>
                              )}
                              {!(p.recommendations_on_time) && !(p.recommendations_overdue) && (
                                <span className="text-slate-400">—</span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <Link
                              to={`${createPageUrl('CatersProcessoDetalhe')}?id=${p.id}`}
                              className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-50"
                            >
                              Ver detalhes
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Paginação */}
                {filteredProcesses.length > 0 && (
                  <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-white px-5 py-3">
                    <div className="text-xs font-medium text-slate-500">{paginationLabel}</div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" disabled={effectivePage <= 1}
                        onClick={() => setPage((p) => Math.max(1, p - 1))} className="gap-1 text-slate-500">
                        <ChevronLeft className="h-4 w-4" />
                        Anterior
                      </Button>
                      <div className="rounded-lg bg-slate-100 px-4 py-1.5 text-xs font-bold text-emerald-700">
                        {effectivePage} / {totalPages}
                      </div>
                      <Button variant="ghost" size="sm" disabled={effectivePage >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="gap-1 text-slate-500">
                        Próxima
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal criar processo */}
      <Dialog open={showForm} onOpenChange={(open) => { setShowForm(open); if (!open) { setSelectedFiscalizacaoId(''); setForm(EMPTY_FORM); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Novo processo</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Vincular à fiscalização */}
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                {selectedFiscalizacaoId ? <Link2 className="h-4 w-4" /> : <Link2Off className="h-4 w-4" />}
                Vincular a uma fiscalização do app
              </div>
              <p className="text-xs text-emerald-700">
                Selecione para importar automaticamente as recomendações com prazo de 30 dias.
              </p>
              <select value={selectedFiscalizacaoId} onChange={(e) => handleFiscalizacaoSelect(e.target.value)}
                className="h-9 w-full rounded-md border border-emerald-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">— Sem vínculo (cadastro manual) —</option>
                {fiscalizacoesQ.isLoading && <option disabled>Carregando…</option>}
                {(fiscalizacoesQ.data ?? []).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.municipality}
                    {f.numero_termo ? ` · ${f.numero_termo}` : ''}
                    {f.data_fim ? ` · ${new Date(f.data_fim).toLocaleDateString('pt-BR')}` : ''}
                    {f.ja_vinculada ? ' ✓ já vinculada' : ''}
                    {` · ${f.total_recomendacoes} rec.`}
                    {f.total_determinacoes > 0 ? ` + ${f.total_determinacoes} det.` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="process_number">Número do processo *</Label>
                <Input id="process_number" required value={form.process_number}
                  onChange={(e) => setForm((f) => ({ ...f, process_number: e.target.value }))} placeholder="Ex: CATERS-2024-001" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="municipality">Município *</Label>
                <Input id="municipality" required value={form.municipality}
                  onChange={(e) => setForm((f) => ({ ...f, municipality: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="object">Objeto *</Label>
              <Input id="object" required value={form.object}
                onChange={(e) => setForm((f) => ({ ...f, object: e.target.value }))} placeholder="Descreva o objeto da fiscalização" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  {STATUS_OPTIONS.filter((o) => o.value).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Técnico responsável</Label>
                <Input value={form.technician_name} onChange={(e) => setForm((f) => ({ ...f, technician_name: e.target.value }))} />
              </div>
            </div>
            <div className="rounded-lg bg-slate-50 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">AR / Notificação</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><Label>Envio do AR</Label><Input type="date" value={form.ar_sent_at} onChange={(e) => setForm((f) => ({ ...f, ar_sent_at: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>Recebimento do AR</Label><Input type="date" value={form.ar_received_at} onChange={(e) => setForm((f) => ({ ...f, ar_received_at: e.target.value }))} /></div>
                <div className="space-y-1.5"><Label>Código de rastreio</Label><Input value={form.ar_tracking_code} onChange={(e) => setForm((f) => ({ ...f, ar_tracking_code: e.target.value }))} placeholder="Ex: BR123456789BR" /></div>
                <div className="space-y-1.5"><Label>Nº protocolo</Label><Input value={form.ar_protocol_number} onChange={(e) => setForm((f) => ({ ...f, ar_protocol_number: e.target.value }))} /></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Envio do relatório</Label><Input type="date" value={form.report_sent_at} onChange={(e) => setForm((f) => ({ ...f, report_sent_at: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>Prazo de resposta</Label><Input type="date" value={form.titular_response_due_at} onChange={(e) => setForm((f) => ({ ...f, titular_response_due_at: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5">
              <Label>Observações</Label>
              <textarea rows={3} value={form.observations} onChange={(e) => setForm((f) => ({ ...f, observations: e.target.value }))}
                placeholder="Observações adicionais…"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
              <Button type="submit" disabled={createMut.isPending} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                {createMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Criar processo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
