import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Plus,
  Search,
  X,
  FolderOpen,
  ChevronRight,
  Loader2,
  Filter,
  Link2,
  Link2Off,
} from 'lucide-react';
import CatersLayout from '@/components/caters/CatersLayout';
import {
  fetchProcesses,
  createProcess,
  formatProcessStatus,
  computeResponseDueAt,
  fetchFiscalizacoesParaVincular,
  importFromFiscalizacao,
} from '@/lib/caters/processes';
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

  const [search, setSearch] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [status, setStatus] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedFiscalizacaoId, setSelectedFiscalizacaoId] = useState('');

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

  const processesQ = useQuery({
    queryKey: ['caters-processes', search, municipality, status],
    queryFn: () => fetchProcesses({ search, municipality, status }),
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
      if (selectedFiscalizacaoId) {
        await importFromFiscalizacao(selectedFiscalizacaoId, proc.id);
      }
      return proc;
    },
    onSuccess: (proc, _vars) => {
      qc.invalidateQueries({ queryKey: ['caters-processes'] });
      qc.invalidateQueries({ queryKey: ['caters-dashboard'] });
      qc.invalidateQueries({ queryKey: ['caters-recommendations', proc.id] });
      setShowForm(false);
      setForm(EMPTY_FORM);
      setSelectedFiscalizacaoId('');
      toast({
        title: selectedFiscalizacaoId
          ? 'Processo criado e recomendações importadas.'
          : 'Processo criado com sucesso.',
      });
    },
    onError: (e) => toast({ title: 'Erro ao criar processo', description: e.message, variant: 'destructive' }),
  });

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

  const processes = processesQ.data ?? [];

  return (
    <CatersLayout alertCount={alertCount}>
      <div className="min-h-full bg-slate-50">
        <div className="px-8 pb-12 pt-8">
          <div className="mx-auto max-w-6xl space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Processos</h1>
                <p className="mt-1 text-sm text-slate-500">
                  Acompanhamento de processos de fiscalização — CATERS
                </p>
              </div>
              <Button
                onClick={() => { setForm(EMPTY_FORM); setShowForm(true); }}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                <Plus className="h-4 w-4" />
                Novo processo
              </Button>
            </div>

            {/* Filtros */}
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  className="pl-9"
                  placeholder="Buscar por número…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Input
                className="w-52"
                placeholder="Município…"
                value={municipality}
                onChange={(e) => setMunicipality(e.target.value)}
              />
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="h-10 rounded-md border border-input bg-background pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              {(search || municipality || status) && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { setSearch(''); setMunicipality(''); setStatus(''); }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Lista */}
            {processesQ.isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : processesQ.isError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Erro: {String(processesQ.error?.message)}
              </div>
            ) : !processes.length ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300/60 bg-white py-16 text-center">
                <FolderOpen className="mb-3 h-10 w-10 text-slate-300" />
                <p className="font-medium text-slate-500">Nenhum processo encontrado</p>
                <p className="mt-1 text-sm text-slate-400">
                  {search || municipality || status ? 'Tente ajustar os filtros.' : 'Crie o primeiro processo com o botão acima.'}
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3 text-left">Processo</th>
                      <th className="px-5 py-3 text-left">Município</th>
                      <th className="hidden px-5 py-3 text-left md:table-cell">Status</th>
                      <th className="hidden px-5 py-3 text-left lg:table-cell">Prazo resposta</th>
                      <th className="hidden px-5 py-3 text-center xl:table-cell">Recom.</th>
                      <th className="px-5 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {processes.map((p) => {
                      const dueAt = computeResponseDueAt(p);
                      const days = dueAt ? daysFromToday(dueAt) : null;
                      const isOverdue = days !== null && days < 0;
                      return (
                        <tr key={p.id} className="group hover:bg-slate-50">
                          <td className="px-5 py-3.5 font-medium text-slate-900">{p.process_number}</td>
                          <td className="px-5 py-3.5 text-slate-600">{p.municipality}</td>
                          <td className="hidden px-5 py-3.5 md:table-cell">
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusColor(p.status)}`}>
                              {formatProcessStatus(p.status)}
                            </span>
                          </td>
                          <td className="hidden px-5 py-3.5 lg:table-cell">
                            {dueAt ? (
                              <span className={isOverdue ? 'font-semibold text-red-600' : 'text-slate-600'}>
                                {formatIsoDateHuman(dueAt)}
                                {isOverdue && ` (${Math.abs(days)}d atraso)`}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="hidden px-5 py-3.5 text-center xl:table-cell">
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
                              Detalhe
                              <ChevronRight className="h-3.5 w-3.5" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
            {/* Vincular à fiscalização existente */}
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                {selectedFiscalizacaoId ? <Link2 className="h-4 w-4" /> : <Link2Off className="h-4 w-4" />}
                Vincular a uma fiscalização do app
              </div>
              <p className="text-xs text-emerald-700">
                Selecione para importar automaticamente as recomendações com prazo de 30 dias.
                Deixe em branco para cadastro manual.
              </p>
              <select
                value={selectedFiscalizacaoId}
                onChange={(e) => handleFiscalizacaoSelect(e.target.value)}
                className="h-9 w-full rounded-md border border-emerald-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">— Sem vínculo (processo manual) —</option>
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
                <Input
                  id="process_number"
                  required
                  value={form.process_number}
                  onChange={(e) => setForm((f) => ({ ...f, process_number: e.target.value }))}
                  placeholder="Ex: DSB-2024-001"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="municipality">Município *</Label>
                <Input
                  id="municipality"
                  required
                  value={form.municipality}
                  onChange={(e) => setForm((f) => ({ ...f, municipality: e.target.value }))}
                  placeholder="Ex: Campo Grande"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="object">Objeto *</Label>
              <Input
                id="object"
                required
                value={form.object}
                onChange={(e) => setForm((f) => ({ ...f, object: e.target.value }))}
                placeholder="Descreva o objeto da fiscalização"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {STATUS_OPTIONS.filter((o) => o.value).map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="technician_name">Técnico responsável</Label>
                <Input
                  id="technician_name"
                  value={form.technician_name}
                  onChange={(e) => setForm((f) => ({ ...f, technician_name: e.target.value }))}
                  placeholder="Nome do técnico"
                />
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 p-4 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">AR / Notificação</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ar_sent_at">Envio do AR</Label>
                  <Input
                    id="ar_sent_at"
                    type="date"
                    value={form.ar_sent_at}
                    onChange={(e) => setForm((f) => ({ ...f, ar_sent_at: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ar_received_at">Recebimento do AR</Label>
                  <Input
                    id="ar_received_at"
                    type="date"
                    value={form.ar_received_at}
                    onChange={(e) => setForm((f) => ({ ...f, ar_received_at: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ar_tracking_code">Código de rastreio</Label>
                  <Input
                    id="ar_tracking_code"
                    value={form.ar_tracking_code}
                    onChange={(e) => setForm((f) => ({ ...f, ar_tracking_code: e.target.value }))}
                    placeholder="Ex: BR123456789BR"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ar_protocol_number">Nº de protocolo</Label>
                  <Input
                    id="ar_protocol_number"
                    value={form.ar_protocol_number}
                    onChange={(e) => setForm((f) => ({ ...f, ar_protocol_number: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="report_sent_at">Envio do relatório</Label>
                <Input
                  id="report_sent_at"
                  type="date"
                  value={form.report_sent_at}
                  onChange={(e) => setForm((f) => ({ ...f, report_sent_at: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="titular_response_due_at">Prazo de resposta</Label>
                <Input
                  id="titular_response_due_at"
                  type="date"
                  value={form.titular_response_due_at}
                  onChange={(e) => setForm((f) => ({ ...f, titular_response_due_at: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="observations">Observações</Label>
              <textarea
                id="observations"
                rows={3}
                value={form.observations}
                onChange={(e) => setForm((f) => ({ ...f, observations: e.target.value }))}
                placeholder="Observações adicionais…"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createMut.isPending}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                {createMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Criar processo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </CatersLayout>
  );
}
