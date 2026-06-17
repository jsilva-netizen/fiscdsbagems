import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  ClipboardList,
  FileText,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  Check,
  X,
  RefreshCw,
  Link2,
} from 'lucide-react';
import CatersLayout from '@/components/caters/CatersLayout';
import { fetchProcessById, updateProcess, formatProcessStatus, importFromFiscalizacao } from '@/lib/caters/processes';
import {
  fetchRecommendationsByProcess,
  createRecommendation,
  updateRecommendation,
  deleteRecommendation,
  deriveRecommendationStatus,
  formatRecommendationPriority,
  formatRecommendationStatus,
} from '@/lib/caters/recommendations';
import { fetchAlertsData } from '@/lib/caters/dashboard';
import { formatIsoDateHuman, daysFromToday } from '@/lib/caters/dates';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS = [
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

function recStatusColor(status) {
  switch (status) {
    case 'cumprido': return 'bg-emerald-50 text-emerald-700';
    case 'em_andamento': return 'bg-blue-50 text-blue-700';
    case 'vencido': return 'bg-red-50 text-red-700';
    default: return 'bg-slate-50 text-slate-600';
  }
}

function priorityColor(p) {
  switch (p) {
    case 'critica': return 'bg-red-50 text-red-700';
    case 'alta': return 'bg-orange-50 text-orange-700';
    case 'media': return 'bg-amber-50 text-amber-700';
    default: return 'bg-slate-50 text-slate-600';
  }
}

const EMPTY_REC = {
  description: '',
  item_code: '',
  category: '',
  priority: 'media',
  status: 'pendente',
  promised_due_at: '',
  titular_response: '',
  notes: '',
};

export default function CatersProcessoDetalhe() {
  const [params] = useSearchParams();
  const processId = params.get('id');
  const qc = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = useState('info');
  const [editingProcess, setEditingProcess] = useState(false);
  const [processForm, setProcessForm] = useState(null);
  const [showRecForm, setShowRecForm] = useState(false);
  const [recForm, setRecForm] = useState(EMPTY_REC);
  const [editingRecId, setEditingRecId] = useState(null);

  const alertsQ = useQuery({
    queryKey: ['caters-alerts'],
    queryFn: fetchAlertsData,
    staleTime: 60_000,
  });
  const alertCount = useMemo(() => {
    const d = alertsQ.data;
    if (!d) return 0;
    return d.awaitingAnalysis.length + d.overdueResponses.length + d.overdueRecommendations.length;
  }, [alertsQ.data]);

  const procQ = useQuery({
    queryKey: ['caters-process', processId],
    queryFn: () => fetchProcessById(processId),
    enabled: !!processId,
  });

  const recsQ = useQuery({
    queryKey: ['caters-recommendations', processId],
    queryFn: () => fetchRecommendationsByProcess(processId),
    enabled: !!processId,
  });

  const updateProcMut = useMutation({
    mutationFn: (data) => updateProcess(processId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caters-process', processId] });
      qc.invalidateQueries({ queryKey: ['caters-processes'] });
      qc.invalidateQueries({ queryKey: ['caters-dashboard'] });
      setEditingProcess(false);
      toast({ title: 'Processo atualizado.' });
    },
    onError: (e) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const syncMut = useMutation({
    mutationFn: () => importFromFiscalizacao(process.fiscalizacao_id, processId),
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ['caters-recommendations', processId] });
      qc.invalidateQueries({ queryKey: ['caters-dashboard'] });
      toast({
        title: count > 0
          ? `${count} nova${count !== 1 ? 's' : ''} recomendação${count !== 1 ? 'ões' : ''} importada${count !== 1 ? 's' : ''}.`
          : 'Nenhuma novidade — tudo já estava importado.',
      });
    },
    onError: (e) => toast({ title: 'Erro na sincronização', description: e.message, variant: 'destructive' }),
  });

  const createRecMut = useMutation({
    mutationFn: (data) => createRecommendation({ ...data, process_id: processId, created_by: user?.id }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caters-recommendations', processId] });
      qc.invalidateQueries({ queryKey: ['caters-dashboard'] });
      setShowRecForm(false);
      setRecForm(EMPTY_REC);
      toast({ title: 'Recomendação criada.' });
    },
    onError: (e) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const updateRecMut = useMutation({
    mutationFn: ({ id, data }) => updateRecommendation(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caters-recommendations', processId] });
      qc.invalidateQueries({ queryKey: ['caters-dashboard'] });
      setEditingRecId(null);
      toast({ title: 'Recomendação atualizada.' });
    },
    onError: (e) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const deleteRecMut = useMutation({
    mutationFn: (id) => deleteRecommendation(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caters-recommendations', processId] });
      qc.invalidateQueries({ queryKey: ['caters-dashboard'] });
      toast({ title: 'Recomendação removida.' });
    },
    onError: (e) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const process = procQ.data;
  const recs = recsQ.data ?? [];

  if (!processId) {
    return (
      <CatersLayout alertCount={alertCount}>
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-500">ID do processo não informado.</p>
        </div>
      </CatersLayout>
    );
  }

  if (procQ.isLoading) {
    return (
      <CatersLayout alertCount={alertCount}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      </CatersLayout>
    );
  }

  if (procQ.isError || !process) {
    return (
      <CatersLayout alertCount={alertCount}>
        <div className="px-8 pt-8">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Processo não encontrado ou erro ao carregar.
          </div>
        </div>
      </CatersLayout>
    );
  }

  const startEditProcess = () => {
    setProcessForm({
      process_number: process.process_number ?? '',
      municipality: process.municipality ?? '',
      object: process.object ?? '',
      status: process.status ?? 'aguardando_analise',
      technician_name: process.technician_name ?? '',
      ar_sent_at: process.ar_sent_at ?? '',
      ar_received_at: process.ar_received_at ?? '',
      ar_tracking_code: process.ar_tracking_code ?? '',
      ar_protocol_number: process.ar_protocol_number ?? '',
      report_sent_at: process.report_sent_at ?? '',
      titular_response_due_at: process.titular_response_due_at ?? '',
      fatal_date: process.fatal_date ?? '',
      observations: process.observations ?? '',
    });
    setEditingProcess(true);
  };

  const handleSaveProcess = () => {
    const payload = Object.fromEntries(
      Object.entries(processForm).map(([k, v]) => [k, v === '' ? null : v])
    );
    updateProcMut.mutate(payload);
  };

  const handleRecFormSubmit = (e) => {
    e.preventDefault();
    const data = Object.fromEntries(
      Object.entries(recForm).map(([k, v]) => [k, v === '' ? null : v])
    );
    if (editingRecId) {
      updateRecMut.mutate({ id: editingRecId, data });
    } else {
      createRecMut.mutate(data);
    }
  };

  const openEditRec = (rec) => {
    setEditingRecId(rec.id);
    setRecForm({
      description: rec.description ?? '',
      item_code: rec.item_code ?? '',
      category: rec.category ?? '',
      priority: rec.priority ?? 'media',
      status: rec.status ?? 'pendente',
      promised_due_at: rec.promised_due_at ?? '',
      fulfilled_at: rec.fulfilled_at ?? '',
      titular_response: rec.titular_response ?? '',
      notes: rec.notes ?? '',
    });
    setShowRecForm(true);
  };

  const markRecFulfilled = (rec) => {
    const today = new Date().toISOString().split('T')[0];
    updateRecMut.mutate({ id: rec.id, data: { fulfilled_at: today, status: 'cumprido' } });
  };

  return (
    <CatersLayout alertCount={alertCount}>
      <div className="min-h-full bg-slate-50">
        <div className="px-8 pb-12 pt-8">
          <div className="mx-auto max-w-5xl space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Link to={createPageUrl('CatersProcessos')} className="flex items-center gap-1 hover:text-slate-800">
                <ArrowLeft className="h-4 w-4" />
                Processos
              </Link>
              <span>/</span>
              <span className="font-medium text-slate-900">{process.process_number}</span>
            </div>

            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
                    {process.process_number}
                  </h1>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusColor(process.status)}`}>
                    {formatProcessStatus(process.status)}
                  </span>
                  {process.fiscalizacao_id && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                      <Link2 className="h-3 w-3" />
                      Vinculado à fiscalização do app
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-500">{process.municipality} · {process.object}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {process.fiscalizacao_id && !editingProcess && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => syncMut.mutate()}
                    disabled={syncMut.isPending}
                    className="gap-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                    title="Importar novas recomendações da fiscalização"
                  >
                    {syncMut.isPending
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <RefreshCw className="h-3.5 w-3.5" />}
                    Sincronizar
                  </Button>
                )}
                {!editingProcess && (
                  <Button variant="outline" size="sm" onClick={startEditProcess} className="gap-2">
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </Button>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-slate-200">
              {[
                { id: 'info', label: 'Informações', icon: FileText },
                { id: 'recomendacoes', label: `Recomendações (${recs.length})`, icon: ClipboardList },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
                    tab === t.id
                      ? 'border-emerald-600 text-emerald-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  )}
                >
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab: Informações */}
            {tab === 'info' && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                {editingProcess && processForm ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Número do processo</Label>
                        <Input value={processForm.process_number} onChange={(e) => setProcessForm((f) => ({ ...f, process_number: e.target.value }))} />
                      </div>
                      <div className="space-y-1.5">
                        <Label>Município</Label>
                        <Input value={processForm.municipality} onChange={(e) => setProcessForm((f) => ({ ...f, municipality: e.target.value }))} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Objeto</Label>
                      <Input value={processForm.object} onChange={(e) => setProcessForm((f) => ({ ...f, object: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Status</Label>
                        <select value={processForm.status} onChange={(e) => setProcessForm((f) => ({ ...f, status: e.target.value }))}
                          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Técnico responsável</Label>
                        <Input value={processForm.technician_name} onChange={(e) => setProcessForm((f) => ({ ...f, technician_name: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5"><Label>Envio AR</Label><Input type="date" value={processForm.ar_sent_at} onChange={(e) => setProcessForm((f) => ({ ...f, ar_sent_at: e.target.value }))} /></div>
                      <div className="space-y-1.5"><Label>Recebimento AR</Label><Input type="date" value={processForm.ar_received_at} onChange={(e) => setProcessForm((f) => ({ ...f, ar_received_at: e.target.value }))} /></div>
                      <div className="space-y-1.5"><Label>Código rastreio</Label><Input value={processForm.ar_tracking_code} onChange={(e) => setProcessForm((f) => ({ ...f, ar_tracking_code: e.target.value }))} /></div>
                      <div className="space-y-1.5"><Label>Nº protocolo</Label><Input value={processForm.ar_protocol_number} onChange={(e) => setProcessForm((f) => ({ ...f, ar_protocol_number: e.target.value }))} /></div>
                      <div className="space-y-1.5"><Label>Envio relatório</Label><Input type="date" value={processForm.report_sent_at} onChange={(e) => setProcessForm((f) => ({ ...f, report_sent_at: e.target.value }))} /></div>
                      <div className="space-y-1.5"><Label>Prazo de resposta</Label><Input type="date" value={processForm.titular_response_due_at} onChange={(e) => setProcessForm((f) => ({ ...f, titular_response_due_at: e.target.value }))} /></div>
                      <div className="space-y-1.5"><Label>Data fatal</Label><Input type="date" value={processForm.fatal_date} onChange={(e) => setProcessForm((f) => ({ ...f, fatal_date: e.target.value }))} /></div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Observações</Label>
                      <textarea rows={3} value={processForm.observations} onChange={(e) => setProcessForm((f) => ({ ...f, observations: e.target.value }))}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button onClick={handleSaveProcess} disabled={updateProcMut.isPending} className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                        {updateProcMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Salvar
                      </Button>
                      <Button variant="outline" onClick={() => setEditingProcess(false)}>Cancelar</Button>
                    </div>
                  </div>
                ) : (
                  <dl className="grid grid-cols-2 gap-x-8 gap-y-5 text-sm">
                    {[
                      { label: 'Número', value: process.process_number },
                      { label: 'Município', value: process.municipality },
                      { label: 'Objeto', value: process.object },
                      { label: 'Técnico', value: process.technician_name || '—' },
                      { label: 'Envio AR', value: formatIsoDateHuman(process.ar_sent_at) },
                      { label: 'Recebimento AR', value: formatIsoDateHuman(process.ar_received_at) },
                      { label: 'Código rastreio', value: process.ar_tracking_code || '—' },
                      { label: 'Nº protocolo', value: process.ar_protocol_number || '—' },
                      { label: 'Envio relatório', value: formatIsoDateHuman(process.report_sent_at) },
                      { label: 'Prazo de resposta', value: formatIsoDateHuman(process.titular_response_due_at) },
                      { label: 'Data fatal', value: formatIsoDateHuman(process.fatal_date) },
                      { label: 'Criado em', value: formatIsoDateHuman(process.created_at) },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
                        <dd className="mt-0.5 font-medium text-slate-900">{value}</dd>
                      </div>
                    ))}
                    {process.observations && (
                      <div className="col-span-2">
                        <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">Observações</dt>
                        <dd className="mt-0.5 text-slate-700 whitespace-pre-wrap">{process.observations}</dd>
                      </div>
                    )}
                  </dl>
                )}
              </div>
            )}

            {/* Tab: Recomendações */}
            {tab === 'recomendacoes' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500">{recs.length} recomendação{recs.length !== 1 ? 'ões' : ''}</p>
                  <Button
                    size="sm"
                    onClick={() => { setEditingRecId(null); setRecForm(EMPTY_REC); setShowRecForm(true); }}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar
                  </Button>
                </div>

                {recsQ.isLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
                ) : !recs.length ? (
                  <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300/60 bg-white py-12">
                    <ClipboardList className="mb-2 h-8 w-8 text-slate-300" />
                    <p className="text-sm text-slate-500">Nenhuma recomendação cadastrada</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recs.map((r) => {
                      const computed = deriveRecommendationStatus({
                        promised_due_at: r.promised_due_at,
                        fulfilled_at: r.fulfilled_at,
                        current_status: r.status,
                      });
                      const days = r.promised_due_at ? daysFromToday(r.promised_due_at) : null;
                      return (
                        <div key={r.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                {r.item_code && (
                                  <span className="text-xs font-bold text-slate-500 font-mono">{r.item_code}</span>
                                )}
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight ${recStatusColor(computed)}`}>
                                  {formatRecommendationStatus(computed)}
                                </span>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-tight ${priorityColor(r.priority)}`}>
                                  {formatRecommendationPriority(r.priority)}
                                </span>
                                {r.category && (
                                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                                    {r.category}
                                  </span>
                                )}
                              </div>
                              <p className="mt-1.5 text-sm text-slate-800">{r.description}</p>
                              <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                                {r.promised_due_at && (
                                  <span className={days !== null && days < 0 ? 'text-red-600 font-semibold' : ''}>
                                    Prazo: {formatIsoDateHuman(r.promised_due_at)}
                                    {days !== null && days < 0 && ` (${Math.abs(days)}d atraso)`}
                                  </span>
                                )}
                                {r.fulfilled_at && (
                                  <span className="text-emerald-600">Cumprido em: {formatIsoDateHuman(r.fulfilled_at)}</span>
                                )}
                              </div>
                              {r.titular_response && (
                                <p className="mt-1.5 text-xs text-slate-500 italic">Resposta: {r.titular_response}</p>
                              )}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              {computed !== 'cumprido' && (
                                <button
                                  type="button"
                                  title="Marcar como cumprido"
                                  onClick={() => markRecFulfilled(r)}
                                  className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                type="button"
                                title="Editar"
                                onClick={() => openEditRec(r)}
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                title="Remover"
                                onClick={() => {
                                  if (confirm('Remover esta recomendação?')) deleteRecMut.mutate(r.id);
                                }}
                                className="rounded-lg p-1.5 text-red-500 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal recomendação */}
      <Dialog open={showRecForm} onOpenChange={(open) => { setShowRecForm(open); if (!open) setEditingRecId(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingRecId ? 'Editar recomendação' : 'Nova recomendação'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRecFormSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="r-item">Código do item</Label>
                <Input id="r-item" placeholder="Ex: 3.1.2" value={recForm.item_code} onChange={(e) => setRecForm((f) => ({ ...f, item_code: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-cat">Categoria</Label>
                <Input id="r-cat" placeholder="Ex: Coleta seletiva" value={recForm.category} onChange={(e) => setRecForm((f) => ({ ...f, category: e.target.value }))} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="r-desc">Descrição *</Label>
              <textarea
                id="r-desc"
                required
                rows={3}
                value={recForm.description}
                onChange={(e) => setRecForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Descreva a recomendação…"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Prioridade</Label>
                <select value={recForm.priority} onChange={(e) => setRecForm((f) => ({ ...f, priority: e.target.value }))}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  {[
                    { value: 'baixa', label: 'Baixa' },
                    { value: 'media', label: 'Média' },
                    { value: 'alta', label: 'Alta' },
                    { value: 'critica', label: 'Crítica' },
                  ].map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select value={recForm.status} onChange={(e) => setRecForm((f) => ({ ...f, status: e.target.value }))}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  {[
                    { value: 'pendente', label: 'Pendente' },
                    { value: 'em_andamento', label: 'Em andamento' },
                    { value: 'cumprido', label: 'Cumprido' },
                  ].map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="r-due">Prazo prometido</Label>
                <Input id="r-due" type="date" value={recForm.promised_due_at} onChange={(e) => setRecForm((f) => ({ ...f, promised_due_at: e.target.value }))} />
              </div>
              {editingRecId && (
                <div className="space-y-1.5">
                  <Label htmlFor="r-fulfilled">Data de cumprimento</Label>
                  <Input id="r-fulfilled" type="date" value={recForm.fulfilled_at ?? ''} onChange={(e) => setRecForm((f) => ({ ...f, fulfilled_at: e.target.value }))} />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="r-resp">Resposta do titular</Label>
              <textarea
                id="r-resp"
                rows={2}
                value={recForm.titular_response}
                onChange={(e) => setRecForm((f) => ({ ...f, titular_response: e.target.value }))}
                placeholder="Resposta recebida do titular…"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="r-notes">Observações internas</Label>
              <textarea
                id="r-notes"
                rows={2}
                value={recForm.notes}
                onChange={(e) => setRecForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowRecForm(false)}>Cancelar</Button>
              <Button
                type="submit"
                disabled={createRecMut.isPending || updateRecMut.isPending}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                {(createRecMut.isPending || updateRecMut.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingRecId ? 'Salvar alterações' : 'Criar recomendação'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </CatersLayout>
  );
}
