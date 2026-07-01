import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  CheckCircle,
  ClipboardList,
  Clock,
  Eye,
  FileText,
  History,
  Loader2,
  Mail,
  Paperclip,
  Pencil,
  Plus,
  RefreshCw,
  Reply,
  Save,
  Send,
  Trash2,
  Check,
  Upload,
  X,
  Link2,
  CalendarClock,
  Ban,
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
import { fetchMunicipalityResponse, upsertMunicipalityResponse } from '@/lib/caters/municipalityResponses';
import { fetchHistory, createHistory, deleteHistory, HISTORY_ACTION_LABELS, HISTORY_ACTION_OPTIONS } from '@/lib/caters/history';
import { fetchExtraDocuments, createExtraDocument, deleteExtraDocument, uploadCatersFile } from '@/lib/caters/documents';
import { fetchDeadlineExtensions, createDeadlineExtension, deleteDeadlineExtension } from '@/lib/caters/deadlineExtensions';
import { formatIsoDateHuman, daysFromToday, addDaysToIsoDate } from '@/lib/caters/dates';
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
import { cn } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: 'aguardando_analise', label: 'Aguardando análise' },
  { value: 'em_analise', label: 'Em análise' },
  { value: 'dilacao_solicitada', label: 'Dilação solicitada' },
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
    case 'dilacao_solicitada': return 'bg-violet-50 text-violet-700';
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

const EMPTY_DILACAO = { reference_date: '', extension_days: '30', municipality_request_at: '', municipality_protocol: '', notes: '' };

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
  const initialTab = params.get('tab') ?? 'info';
  const qc = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = useState(initialTab);
  const [editingProcess, setEditingProcess] = useState(false);
  const [processForm, setProcessForm] = useState(null);

  // Recomendações
  const [showRecForm, setShowRecForm] = useState(false);
  const [recForm, setRecForm] = useState(EMPTY_REC);
  const [editingRecId, setEditingRecId] = useState(null);

  // Resposta municipal
  const [respForm, setRespForm] = useState({ received_at: '', protocol_number: '', cronograma_status: 'pendente', notes: '' });

  // Histórico
  const [histForm, setHistForm] = useState({ action_type: 'observacao', description: '', related_document_url: '' });

  // Documentos extras
  const [extraTitle, setExtraTitle] = useState('');
  const [extraDesc, setExtraDesc] = useState('');
  const [extraFile, setExtraFile] = useState(null);
  const extraFileRef = useRef(null);

  // Dilação de prazo
  const [dilacaoForm, setDilacaoForm] = useState(EMPTY_DILACAO);
  const [showDilacaoForm, setShowDilacaoForm] = useState(false);

  // ── Queries ───────────────────────────────────────────────────────────

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

  const respQ = useQuery({
    queryKey: ['caters-municipality-response', processId],
    queryFn: () => fetchMunicipalityResponse(processId),
    enabled: !!processId,
  });

  const histQ = useQuery({
    queryKey: ['caters-history', processId],
    queryFn: () => fetchHistory(processId),
    enabled: !!processId,
  });

  const extraDocsQ = useQuery({
    queryKey: ['caters-extra-docs', processId],
    queryFn: () => fetchExtraDocuments(processId),
    enabled: !!processId,
  });

  const dilacaoQ = useQuery({
    queryKey: ['caters-deadline-extensions', processId],
    queryFn: () => fetchDeadlineExtensions(processId),
    enabled: !!processId,
  });

  // ── Mutations ─────────────────────────────────────────────────────────
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

  const upsertRespMut = useMutation({
    mutationFn: async (params) => {
      const payload = { process_id: processId, created_by: user?.id, ...params };
      const saved = await upsertMunicipalityResponse(payload);
      const nextStatus =
        process.status === 'encerrado'
          ? 'encerrado'
          : params.cronograma_status === 'adequacao'
            ? 'em_analise'
            : 'respondido';
      await updateProcess(processId, { status: nextStatus });
      return saved;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caters-municipality-response', processId] });
      qc.invalidateQueries({ queryKey: ['caters-process', processId] });
      qc.invalidateQueries({ queryKey: ['caters-processes'] });
      qc.invalidateQueries({ queryKey: ['caters-dashboard'] });
      toast({ title: 'Resposta municipal salva.' });
    },
    onError: (e) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const createHistMut = useMutation({
    mutationFn: () => createHistory({
      process_id: processId,
      action_type: histForm.action_type,
      description: histForm.description.trim(),
      related_document_url: histForm.related_document_url.trim() || null,
      performed_by: user?.id,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caters-history', processId] });
      setHistForm({ action_type: 'observacao', description: '', related_document_url: '' });
      toast({ title: 'Evento registrado.' });
    },
    onError: (e) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const deleteHistMut = useMutation({
    mutationFn: (id) => deleteHistory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['caters-history', processId] }),
    onError: (e) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const uploadStdDocMut = useMutation({
    mutationFn: async ({ field, kind, file }) => {
      const { url } = await uploadCatersFile({ processId, kind, file });
      await updateProcess(processId, { [field]: url });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caters-process', processId] });
      toast({ title: 'Documento enviado.' });
    },
    onError: (e) => toast({ title: 'Erro no upload', description: e.message, variant: 'destructive' }),
  });

  const uploadExtraMut = useMutation({
    mutationFn: async () => {
      if (!extraFile) throw new Error('Selecione um arquivo.');
      const { url } = await uploadCatersFile({ processId, kind: 'extras', file: extraFile });
      return createExtraDocument({
        process_id: processId,
        title: extraTitle.trim(),
        description: extraDesc.trim() || null,
        file_url: url,
        created_by: user?.id,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caters-extra-docs', processId] });
      setExtraTitle('');
      setExtraDesc('');
      setExtraFile(null);
      if (extraFileRef.current) extraFileRef.current.value = '';
      toast({ title: 'Documento extra adicionado.' });
    },
    onError: (e) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const deleteExtraMut = useMutation({
    mutationFn: (id) => deleteExtraDocument(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['caters-extra-docs', processId] }),
    onError: (e) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const createDilacaoMut = useMutation({
    mutationFn: async ({ status }) => {
      const refDate = dilacaoForm.reference_date;
      const days = parseInt(dilacaoForm.extension_days, 10);
      if (!refDate || isNaN(days) || days <= 0) throw new Error('Informe a data de referência e os dias.');
      const calcDate = addDaysToIsoDate(refDate, days);
      const ext = await createDeadlineExtension({
        process_id: processId,
        reference_date: refDate,
        extension_days: days,
        calculated_date: calcDate,
        municipality_request_at: dilacaoForm.municipality_request_at || null,
        municipality_protocol: dilacaoForm.municipality_protocol.trim() || null,
        notes: dilacaoForm.notes.trim() || null,
        status,
        created_by: user?.id,
      });
      if (status === 'aprovado') {
        await updateProcess(processId, { titular_response_due_at: calcDate, status: 'dilacao_solicitada' });
        await createHistory({
          process_id: processId,
          action_type: 'prazo_estendido',
          description: `Dilação aprovada: +${days} dias a partir de ${formatIsoDateHuman(refDate)} → novo prazo: ${formatIsoDateHuman(calcDate)}`,
          performed_by: user?.id,
        });
      }
      return ext;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['caters-deadline-extensions', processId] });
      qc.invalidateQueries({ queryKey: ['caters-process', processId] });
      qc.invalidateQueries({ queryKey: ['caters-processes'] });
      qc.invalidateQueries({ queryKey: ['caters-history', processId] });
      qc.invalidateQueries({ queryKey: ['caters-dashboard'] });
      setDilacaoForm(EMPTY_DILACAO);
      setShowDilacaoForm(false);
      toast({ title: 'Dilação registrada.' });
    },
    onError: (e) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const deleteDilacaoMut = useMutation({
    mutationFn: (id) => deleteDeadlineExtension(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['caters-deadline-extensions', processId] }),
    onError: (e) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  // ── Data ──────────────────────────────────────────────────────────────
  const process = procQ.data;
  const recs = recsQ.data ?? [];
  const resp = respQ.data;
  const history = histQ.data ?? [];
  const extraDocs = extraDocsQ.data ?? [];
  const dilacoes = dilacaoQ.data ?? [];

  // Computed deadline values
  const computedResponseDueAt = useMemo(() => {
    if (!process) return null;
    return process.titular_response_due_at
      ?? (process.ar_received_at ? addDaysToIsoDate(process.ar_received_at, 30) : null)
      ?? (process.report_sent_at ? addDaysToIsoDate(process.report_sent_at, 30) : null);
  }, [process]);

  const computedDays = useMemo(() => {
    if (!computedResponseDueAt) return null;
    return daysFromToday(computedResponseDueAt);
  }, [computedResponseDueAt]);

  const isConcluded = process?.status === 'respondido' || process?.status === 'encerrado';
  const isDeadlineRelevant = process
    ? !['respondido', 'encerrado', 'em_analise'].includes(process.status)
    : false;

  // Sync resp form when data loads
  useMemo(() => {
    if (resp) {
      setRespForm({
        received_at: resp.received_at ?? '',
        protocol_number: resp.protocol_number ?? '',
        cronograma_status: resp.cronograma_status ?? 'pendente',
        notes: resp.notes ?? '',
      });
    }
  }, [resp]);

  // ── Guards ────────────────────────────────────────────────────────────
  if (!processId) {
    return (
      <CatersLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-slate-500">ID do processo não informado.</p>
        </div>
      </CatersLayout>
    );
  }

  if (procQ.isLoading) {
    return (
      <CatersLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      </CatersLayout>
    );
  }

  if (procQ.isError || !process) {
    return (
      <CatersLayout>
        <div className="px-8 pt-8">
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            Processo não encontrado ou erro ao carregar.
          </div>
        </div>
      </CatersLayout>
    );
  }

  // ── Handlers ──────────────────────────────────────────────────────────
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

  const handleSaveResp = (overrides = {}) => {
    if (!respForm.received_at && !overrides.received_at) {
      toast({ title: 'Informe a data de recebimento.', variant: 'destructive' });
      return;
    }
    upsertRespMut.mutate({ ...respForm, ...overrides });
  };

  const TABS = [
    { id: 'info', label: 'Informações', icon: FileText },
    { id: 'prazos', label: 'Prazos', icon: CalendarDays },
    { id: 'resposta', label: 'Resposta', icon: Reply },
    { id: 'documentos', label: 'Documentos', icon: Paperclip },
    { id: 'recomendacoes', label: `Recomendações (${recs.length})`, icon: ClipboardList },
    { id: 'historico', label: 'Histórico', icon: History },
  ];

  const STD_DOCS = [
    { field: 'relatorio_url', kind: 'relatorio', label: 'Relatório de Fiscalização', icon: FileText },
    { field: 'termo_notificacao_url', kind: 'termo', label: 'Termo de Notificação', icon: Bell },
    { field: 'ar_digitalizado_url', kind: 'ar', label: 'AR Digitalizado', icon: Mail },
    { field: 'oficio_resposta_url', kind: 'oficio', label: 'Ofício de Resposta', icon: Reply },
    { field: 'cronograma_url', kind: 'cronograma', label: 'Cronograma', icon: CalendarDays },
  ];

  return (
    <CatersLayout>
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
                  >
                    {syncMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
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
            <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={cn(
                    'flex items-center gap-2 whitespace-nowrap px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px',
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

            {/* ── Tab: Informações ── */}
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
                      <div className="space-y-1.5"><Label>Nº protocolo AR</Label><Input value={processForm.ar_protocol_number} onChange={(e) => setProcessForm((f) => ({ ...f, ar_protocol_number: e.target.value }))} /></div>
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

            {/* ── Tab: Prazos ── */}
            {tab === 'prazos' && (
              <div className="space-y-6">
                {/* Timeline */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-8">
                  <div className="text-sm font-bold uppercase tracking-widest text-slate-700 mb-8">Linha do Tempo</div>
                  {(() => {
                    const hasSent = !!process.ar_sent_at;
                    const hasAR = !!process.ar_received_at;
                    const hasDue = !!(isDeadlineRelevant && computedResponseDueAt);
                    const progress = isConcluded ? 100 : hasDue ? 66 : hasAR ? 33 : hasSent ? 16 : 0;

                    const steps = [
                      { icon: Send, label: 'Expedição', date: formatIsoDateHuman(process.ar_sent_at), done: hasSent, active: !hasSent },
                      { icon: Mail, label: 'Recebimento AR', date: formatIsoDateHuman(process.ar_received_at), done: hasAR, active: hasSent && !hasAR },
                      { icon: CalendarDays, label: 'Data Limite', date: hasDue ? formatIsoDateHuman(computedResponseDueAt) : '—', done: false, active: hasDue },
                      { icon: CheckCircle, label: 'Conclusão', date: isConcluded ? 'Concluído' : 'Pendente', done: isConcluded, active: false },
                    ];

                    return (
                      <div className="relative flex items-center justify-between">
                        <div className="absolute left-0 top-5 h-1 w-full rounded-full bg-slate-200" />
                        <div className="absolute left-0 top-5 h-1 rounded-full bg-slate-900 transition-all" style={{ width: `${progress}%` }} />
                        {steps.map((s, i) => (
                          <div key={i} className="relative z-10 flex flex-col items-center gap-3">
                            <div className={cn(
                              'flex h-10 w-10 items-center justify-center rounded-full ring-8 ring-white',
                              s.done ? 'bg-slate-900 text-white' : s.active ? 'border-2 border-slate-900 bg-white text-slate-900' : 'bg-slate-200 text-slate-500'
                            )}>
                              <s.icon className="h-4 w-4" />
                            </div>
                            <div className="text-center">
                              <div className="text-xs font-bold text-slate-900">{s.label}</div>
                              <div className="text-[10px] text-slate-500">{s.date}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Countdown widget */}
                {isDeadlineRelevant && computedDays !== null && (
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <section className="relative overflow-hidden rounded-xl bg-gradient-to-b from-slate-900 to-slate-800 p-8 text-white shadow-sm">
                      <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
                      <div className="relative z-10">
                        <div className="text-xs font-bold uppercase tracking-widest text-white/70">Prazo Remanescente</div>
                        <div className="mt-2 text-5xl font-extrabold tracking-tighter">
                          {Math.abs(computedDays)} <span className="text-2xl">dias</span>
                        </div>
                        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-white/90">
                          <Clock className="h-4 w-4" />
                          {computedDays < 0
                            ? `Venceu em ${formatIsoDateHuman(computedResponseDueAt)}`
                            : `Vence em ${formatIsoDateHuman(computedResponseDueAt)}`}
                        </div>
                        {computedDays < 0 && (
                          <div className="mt-3 inline-flex rounded-full bg-red-500/20 px-3 py-1 text-xs font-bold text-red-100">
                            Resposta atrasada
                          </div>
                        )}
                        <div className="mt-8 space-y-2 border-t border-white/20 pt-6">
                          {(() => {
                            const pct = Math.max(0, Math.min(100, Math.round(((30 - computedDays) / 30) * 100)));
                            return (
                              <>
                                <div className="flex justify-between text-xs text-white/80">
                                  <span>Progresso Legal</span>
                                  <span className="font-bold">{pct}%</span>
                                </div>
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/20">
                                  <div className="h-full rounded-full bg-white" style={{ width: `${pct}%` }} />
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    </section>

                    <section className="rounded-xl border border-slate-200 bg-slate-50 p-6">
                      <div className="text-xs font-bold uppercase tracking-tight text-slate-700">Cálculo do Prazo</div>
                      <div className="mt-4 grid grid-cols-2 gap-4">
                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                          <div className="text-[10px] font-bold uppercase text-slate-500">Prazo (AR + 30d)</div>
                          <div className="mt-1 text-sm font-semibold text-slate-900">
                            {computedResponseDueAt ? formatIsoDateHuman(computedResponseDueAt) : '—'}
                          </div>
                        </div>
                        <div className="rounded-lg border border-slate-200 bg-white p-3">
                          <div className="text-[10px] font-bold uppercase text-slate-500">Dias restantes</div>
                          <div className={cn('mt-1 text-sm font-semibold', computedDays < 0 ? 'text-red-600' : computedDays <= 5 ? 'text-amber-600' : 'text-emerald-600')}>
                            {computedDays < 0 ? `${Math.abs(computedDays)}d em atraso` : `${computedDays}d`}
                          </div>
                        </div>
                      </div>
                    </section>
                  </div>
                )}

                {!isDeadlineRelevant && (
                  <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
                    Prazo de resposta não aplicável para o status atual ({formatProcessStatus(process.status)}).
                  </div>
                )}

                {/* Histórico de dilações */}
                {dilacoes.length > 0 && (
                  <section className="rounded-xl border border-violet-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4 text-sm font-bold text-slate-900">
                      <CalendarClock className="h-4 w-4 text-violet-600" />
                      Dilações de Prazo
                    </div>
                    <div className="space-y-2">
                      {dilacoes.map((d) => (
                        <div key={d.id} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                          <span className={cn(
                            'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                            d.status === 'aprovado' ? 'bg-violet-100 text-violet-700' : 'bg-red-100 text-red-700'
                          )}>
                            {d.status === 'aprovado' ? 'Aprovado' : 'Negado'}
                          </span>
                          <div className="flex-1 min-w-0">
                            <span className="font-semibold text-slate-900">+{d.extension_days} dias</span>
                            <span className="mx-2 text-slate-400">a partir de</span>
                            <span className="text-slate-700">{formatIsoDateHuman(d.reference_date)}</span>
                            {d.status === 'aprovado' && (
                              <>
                                <span className="mx-2 text-slate-400">→</span>
                                <span className="font-semibold text-violet-700">{formatIsoDateHuman(d.calculated_date)}</span>
                              </>
                            )}
                          </div>
                          {d.municipality_protocol && (
                            <span className="shrink-0 text-xs text-slate-500">{d.municipality_protocol}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}

            {/* ── Tab: Resposta ── */}
            {tab === 'resposta' && (
              <div className="space-y-6">
                <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center gap-2 text-lg font-bold text-slate-900 mb-1">
                    <Reply className="h-5 w-5" />
                    Resposta do Município
                  </div>
                  <p className="text-sm text-slate-500 mb-5">
                    Ao salvar, o status do processo é ajustado automaticamente.
                  </p>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Data de recebimento *</Label>
                      <Input type="date" value={respForm.received_at}
                        onChange={(e) => setRespForm((f) => ({ ...f, received_at: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Protocolo / Referência</Label>
                      <Input placeholder="Ex: PMB-2025-0042" value={respForm.protocol_number}
                        onChange={(e) => setRespForm((f) => ({ ...f, protocol_number: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label>Status do cronograma</Label>
                      <select value={respForm.cronograma_status}
                        onChange={(e) => setRespForm((f) => ({ ...f, cronograma_status: e.target.value }))}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                        <option value="pendente">Pendente</option>
                        <option value="adequacao">Pendente de adequação</option>
                        <option value="aprovado">Aprovado</option>
                        <option value="dispensado">Dispensado</option>
                      </select>
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label>Observações</Label>
                      <textarea rows={4} placeholder="Pontos principais da análise da resposta municipal…"
                        value={respForm.notes} onChange={(e) => setRespForm((f) => ({ ...f, notes: e.target.value }))}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-5">
                    <Button variant="ghost" size="sm" className="gap-2"
                      onClick={() => setRespForm((f) => ({ ...f, received_at: new Date().toISOString().slice(0, 10) }))}>
                      <CalendarDays className="h-4 w-4" />
                      Marcar hoje
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-2 text-amber-700 hover:bg-amber-50"
                      disabled={upsertRespMut.isPending}
                      onClick={() => handleSaveResp({ cronograma_status: 'adequacao' })}>
                      <Reply className="h-4 w-4" />
                      Solicitar adequação
                    </Button>
                    <Button variant="ghost" size="sm" className="gap-2 text-emerald-700 hover:bg-emerald-50"
                      disabled={upsertRespMut.isPending}
                      onClick={() => handleSaveResp({ cronograma_status: 'aprovado' })}>
                      <CheckCircle className="h-4 w-4" />
                      Aprovar cronograma
                    </Button>
                    <Button
                      onClick={() => handleSaveResp()}
                      disabled={upsertRespMut.isPending}
                      className="ml-auto gap-2 bg-emerald-600 hover:bg-emerald-700"
                    >
                      {upsertRespMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Salvar resposta
                    </Button>
                  </div>
                </section>

                {resp && (
                  <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-600">
                    <span className="font-semibold text-slate-800">Resposta registrada:</span>{' '}
                    {formatIsoDateHuman(resp.received_at)} · {resp.protocol_number || '(sem protocolo)'} ·{' '}
                    <span className="capitalize">{resp.cronograma_status}</span>
                  </div>
                )}

                {/* ── Dilações de Prazo ── */}
                <section className="rounded-xl border border-violet-200 bg-white p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-lg font-bold text-slate-900">
                      <CalendarClock className="h-5 w-5 text-violet-600" />
                      Dilações de Prazo
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowDilacaoForm((v) => !v)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Registrar dilação
                    </button>
                  </div>

                  {showDilacaoForm && (() => {
                    const refDate = dilacaoForm.reference_date;
                    const days = parseInt(dilacaoForm.extension_days, 10);
                    const preview = refDate && !isNaN(days) && days > 0 ? addDaysToIsoDate(refDate, days) : null;
                    return (
                      <div className="mb-5 rounded-xl border border-violet-100 bg-violet-50 p-4 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700">Data de referência *</label>
                            <input type="date" value={dilacaoForm.reference_date}
                              onChange={(e) => setDilacaoForm((f) => ({ ...f, reference_date: e.target.value }))}
                              className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                            <p className="text-[10px] text-slate-500">Ex: data do email de cobrança</p>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700">Dias concedidos *</label>
                            <input type="number" min="1" value={dilacaoForm.extension_days}
                              onChange={(e) => setDilacaoForm((f) => ({ ...f, extension_days: e.target.value }))}
                              className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                            {preview && (
                              <p className="text-[10px] font-semibold text-violet-700">→ Vence em {formatIsoDateHuman(preview)}</p>
                            )}
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700">Data do ofício municipal</label>
                            <input type="date" value={dilacaoForm.municipality_request_at}
                              onChange={(e) => setDilacaoForm((f) => ({ ...f, municipality_request_at: e.target.value }))}
                              className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-slate-700">Protocolo do ofício</label>
                            <input type="text" placeholder="Ex: PMB-2025-0099" value={dilacaoForm.municipality_protocol}
                              onChange={(e) => setDilacaoForm((f) => ({ ...f, municipality_protocol: e.target.value }))}
                              className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-semibold text-slate-700">Observações</label>
                          <textarea rows={2} value={dilacaoForm.notes}
                            onChange={(e) => setDilacaoForm((f) => ({ ...f, notes: e.target.value }))}
                            className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
                        </div>
                        <div className="flex gap-2 justify-end pt-1">
                          <button type="button"
                            onClick={() => { setShowDilacaoForm(false); setDilacaoForm(EMPTY_DILACAO); }}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                            Cancelar
                          </button>
                          <button type="button" disabled={createDilacaoMut.isPending}
                            onClick={() => createDilacaoMut.mutate({ status: 'negado' })}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50">
                            <Ban className="h-3.5 w-3.5" />
                            Negar
                          </button>
                          <button type="button" disabled={createDilacaoMut.isPending}
                            onClick={() => createDilacaoMut.mutate({ status: 'aprovado' })}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50">
                            {createDilacaoMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />}
                            Aprovar e atualizar prazo
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {dilacaoQ.isLoading ? (
                    <div className="text-xs text-slate-500">Carregando…</div>
                  ) : !dilacoes.length ? (
                    <p className="text-sm text-slate-400 italic">Nenhuma dilação registrada.</p>
                  ) : (
                    <div className="space-y-2">
                      {dilacoes.map((d) => (
                        <div key={d.id} className="group flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                          <div className="flex items-start gap-3 min-w-0">
                            <span className={cn(
                              'mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase',
                              d.status === 'aprovado' ? 'bg-violet-100 text-violet-700' : 'bg-red-100 text-red-700'
                            )}>
                              {d.status === 'aprovado' ? 'Aprovado' : 'Negado'}
                            </span>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900">
                                +{d.extension_days} dias a partir de {formatIsoDateHuman(d.reference_date)}
                                {d.status === 'aprovado' && (
                                  <span className="ml-2 font-normal text-violet-700">→ {formatIsoDateHuman(d.calculated_date)}</span>
                                )}
                              </div>
                              {(d.municipality_request_at || d.municipality_protocol) && (
                                <div className="text-xs text-slate-500">
                                  Ofício: {[d.municipality_protocol, d.municipality_request_at ? formatIsoDateHuman(d.municipality_request_at) : null].filter(Boolean).join(' · ')}
                                </div>
                              )}
                              {d.notes && <div className="text-xs text-slate-500 italic">{d.notes}</div>}
                            </div>
                          </div>
                          <button type="button"
                            onClick={() => { if (confirm('Remover esta dilação?')) deleteDilacaoMut.mutate(d.id); }}
                            className="hidden rounded-md p-1.5 text-red-400 hover:bg-red-50 group-hover:inline-flex shrink-0">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            )}

            {/* ── Tab: Documentos ── */}
            {tab === 'documentos' && (
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-7">
                {/* Documentos padrão */}
                <section className="lg:col-span-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-slate-900">Documentos padrão</div>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-0.5 text-xs text-slate-600">5 itens</span>
                  </div>
                  {uploadStdDocMut.isError && (
                    <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                      Falha no upload: {uploadStdDocMut.error?.message}
                    </div>
                  )}
                  {STD_DOCS.map(({ field, kind, label, icon: Icon }) => {
                    const hasFile = !!process[field];
                    return (
                      <div key={field} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="grid h-10 w-10 place-items-center rounded-lg bg-slate-100">
                              <Icon className="h-5 w-5 text-slate-700" />
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-slate-900">{label}</div>
                              <div className={cn('text-xs', hasFile ? 'text-emerald-600' : 'italic text-slate-400')}>
                                {hasFile ? 'Arquivo enviado' : 'Aguardando upload…'}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {hasFile && (
                              <a href={process[field]} target="_blank" rel="noreferrer"
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                                <Eye className="h-3.5 w-3.5" />
                                Abrir
                              </a>
                            )}
                            <label className={cn(
                              'inline-flex cursor-pointer items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm',
                              uploadStdDocMut.isPending ? 'cursor-not-allowed opacity-60' : '',
                              hasFile ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-slate-900 text-white hover:bg-slate-800'
                            )}>
                              <Upload className="h-3.5 w-3.5" />
                              {hasFile ? 'Alterar' : 'Enviar'}
                              <input type="file" className="hidden" disabled={uploadStdDocMut.isPending}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  uploadStdDocMut.mutate({ field, kind, file });
                                  e.target.value = '';
                                }} />
                            </label>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </section>

                {/* Documentos extras */}
                <section className="lg:col-span-3 space-y-3">
                  <div className="text-sm font-semibold text-slate-900">Documentos extras</div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3">
                    <div className="text-xs font-semibold text-slate-700">Adicionar documento</div>
                    <div className="space-y-2">
                      <Input placeholder="Título *" value={extraTitle} onChange={(e) => setExtraTitle(e.target.value)} />
                      <textarea rows={2} placeholder="Descrição (opcional)"
                        value={extraDesc} onChange={(e) => setExtraDesc(e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className={cn(
                        'flex-1 cursor-pointer rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:border-slate-400',
                        uploadExtraMut.isPending ? 'cursor-not-allowed opacity-60' : ''
                      )}>
                        <div className="flex items-center gap-2">
                          <Upload className="h-3.5 w-3.5" />
                          <span className="truncate">{extraFile ? extraFile.name : 'Escolher arquivo'}</span>
                        </div>
                        <input ref={extraFileRef} type="file" className="hidden" disabled={uploadExtraMut.isPending}
                          onChange={(e) => setExtraFile(e.target.files?.[0] ?? null)} />
                      </label>
                      <Button size="sm" disabled={uploadExtraMut.isPending || !extraTitle.trim() || !extraFile}
                        onClick={() => uploadExtraMut.mutate()}
                        className="gap-1 bg-emerald-600 hover:bg-emerald-700 shrink-0">
                        {uploadExtraMut.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                        Adicionar
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {extraDocsQ.isLoading ? (
                      <div className="text-xs text-slate-500">Carregando…</div>
                    ) : !extraDocs.length ? (
                      <div className="rounded-lg border border-slate-200 bg-white p-4 text-xs text-slate-500">Nenhum documento extra.</div>
                    ) : extraDocs.map((d) => (
                      <div key={d.id} className="group flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
                        <div className="flex items-start gap-2 min-w-0">
                          <FileText className="h-4 w-4 shrink-0 text-slate-500 mt-0.5" />
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-slate-900">{d.title}</div>
                            <div className="text-xs text-slate-500">{formatIsoDateHuman(d.created_at?.slice(0, 10))}</div>
                            {d.description && <div className="mt-0.5 text-xs text-slate-500 line-clamp-2">{d.description}</div>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <a href={d.file_url} target="_blank" rel="noreferrer"
                            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100">
                            <Eye className="h-3.5 w-3.5" />
                          </a>
                          <button type="button" onClick={() => deleteExtraMut.mutate(d.id)}
                            className="rounded-md p-1.5 text-red-500 hover:bg-red-50">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {/* ── Tab: Recomendações ── */}
            {tab === 'recomendacoes' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500">{recs.length} recomendação{recs.length !== 1 ? 'ões' : ''}</p>
                  <Button size="sm" onClick={() => { setEditingRecId(null); setRecForm(EMPTY_REC); setShowRecForm(true); }}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700">
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
                                {r.item_code && <span className="text-xs font-bold text-slate-500 font-mono">{r.item_code}</span>}
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${recStatusColor(computed)}`}>
                                  {formatRecommendationStatus(computed)}
                                </span>
                                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${priorityColor(r.priority)}`}>
                                  {formatRecommendationPriority(r.priority)}
                                </span>
                                {r.category && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">{r.category}</span>}
                              </div>
                              <p className="mt-1.5 text-sm text-slate-800">{r.description}</p>
                              <div className="mt-1 flex flex-wrap gap-3 text-xs text-slate-500">
                                {r.promised_due_at && (
                                  <span className={days !== null && days < 0 ? 'text-red-600 font-semibold' : ''}>
                                    Prazo: {formatIsoDateHuman(r.promised_due_at)}
                                    {days !== null && days < 0 && ` (${Math.abs(days)}d atraso)`}
                                  </span>
                                )}
                                {r.fulfilled_at && <span className="text-emerald-600">Cumprido em: {formatIsoDateHuman(r.fulfilled_at)}</span>}
                              </div>
                              {r.titular_response && <p className="mt-1.5 text-xs text-slate-500 italic">Resposta: {r.titular_response}</p>}
                            </div>
                            <div className="flex gap-1 shrink-0">
                              {computed !== 'cumprido' && (
                                <button type="button" title="Marcar como cumprido" onClick={() => markRecFulfilled(r)}
                                  className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50">
                                  <Check className="h-4 w-4" />
                                </button>
                              )}
                              <button type="button" title="Editar" onClick={() => openEditRec(r)}
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100">
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button type="button" title="Remover"
                                onClick={() => { if (confirm('Remover esta recomendação?')) deleteRecMut.mutate(r.id); }}
                                className="rounded-lg p-1.5 text-red-500 hover:bg-red-50">
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

            {/* ── Tab: Histórico ── */}
            {tab === 'historico' && (
              <div className="space-y-5">
                {/* Novo evento */}
                <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
                  <div className="text-sm font-semibold text-slate-800">Registrar evento</div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Tipo de ação</Label>
                      <select value={histForm.action_type}
                        onChange={(e) => setHistForm((f) => ({ ...f, action_type: e.target.value }))}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                        {HISTORY_ACTION_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>URL do documento (opcional)</Label>
                      <Input placeholder="https://…" value={histForm.related_document_url}
                        onChange={(e) => setHistForm((f) => ({ ...f, related_document_url: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Descrição *</Label>
                    <textarea rows={2} placeholder="Descreva o evento…"
                      value={histForm.description} onChange={(e) => setHistForm((f) => ({ ...f, description: e.target.value }))}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
                  </div>
                  <div className="flex justify-end">
                    <Button size="sm" disabled={!histForm.description.trim() || createHistMut.isPending}
                      onClick={() => createHistMut.mutate()}
                      className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                      {createHistMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                      Registrar
                    </Button>
                  </div>
                </div>

                {/* Lista de eventos */}
                {histQ.isLoading ? (
                  <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-slate-400" /></div>
                ) : !history.length ? (
                  <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500 text-center">
                    Nenhum evento registrado.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {history.map((h) => (
                      <div key={h.id} className="group flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
                        <div className="flex gap-3 min-w-0">
                          <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-100">
                            <History className="h-4 w-4 text-slate-600" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                                {HISTORY_ACTION_LABELS[h.action_type] ?? h.action_type}
                              </span>
                              <span className="text-xs text-slate-400">{formatIsoDateHuman(h.created_at?.slice(0, 10))}</span>
                            </div>
                            <div className="mt-0.5 text-sm text-slate-800">{h.description}</div>
                            {h.related_document_url && (
                              <a href={h.related_document_url} target="_blank" rel="noreferrer"
                                className="mt-0.5 inline-flex items-center gap-1 text-xs text-blue-600 hover:underline">
                                <Eye className="h-3 w-3" />
                                Ver documento
                              </a>
                            )}
                          </div>
                        </div>
                        <button type="button"
                          onClick={() => { if (confirm('Remover este evento?')) deleteHistMut.mutate(h.id); }}
                          className="hidden rounded-md p-1.5 text-red-400 hover:bg-red-50 group-hover:inline-flex">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
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
                <Label>Código do item</Label>
                <Input placeholder="Ex: 3.1.2" value={recForm.item_code} onChange={(e) => setRecForm((f) => ({ ...f, item_code: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Input placeholder="Ex: Coleta seletiva" value={recForm.category} onChange={(e) => setRecForm((f) => ({ ...f, category: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Descrição *</Label>
              <textarea required rows={3} placeholder="Descreva a recomendação…"
                value={recForm.description} onChange={(e) => setRecForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Prioridade</Label>
                <select value={recForm.priority} onChange={(e) => setRecForm((f) => ({ ...f, priority: e.target.value }))}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  {[{ value: 'baixa', label: 'Baixa' }, { value: 'media', label: 'Média' }, { value: 'alta', label: 'Alta' }, { value: 'critica', label: 'Crítica' }]
                    .map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <select value={recForm.status} onChange={(e) => setRecForm((f) => ({ ...f, status: e.target.value }))}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                  {[{ value: 'pendente', label: 'Pendente' }, { value: 'em_andamento', label: 'Em andamento' }, { value: 'cumprido', label: 'Cumprido' }]
                    .map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Prazo prometido</Label>
                <Input type="date" value={recForm.promised_due_at} onChange={(e) => setRecForm((f) => ({ ...f, promised_due_at: e.target.value }))} />
              </div>
              {editingRecId && (
                <div className="space-y-1.5">
                  <Label>Data de cumprimento</Label>
                  <Input type="date" value={recForm.fulfilled_at ?? ''} onChange={(e) => setRecForm((f) => ({ ...f, fulfilled_at: e.target.value }))} />
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Resposta do titular</Label>
              <textarea rows={2} placeholder="Resposta recebida…"
                value={recForm.titular_response} onChange={(e) => setRecForm((f) => ({ ...f, titular_response: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="space-y-1.5">
              <Label>Observações internas</Label>
              <textarea rows={2} value={recForm.notes} onChange={(e) => setRecForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowRecForm(false)}>Cancelar</Button>
              <Button type="submit" disabled={createRecMut.isPending || updateRecMut.isPending}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700">
                {(createRecMut.isPending || updateRecMut.isPending) && <Loader2 className="h-4 w-4 animate-spin" />}
                {editingRecId ? 'Salvar' : 'Criar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </CatersLayout>
  );
}
