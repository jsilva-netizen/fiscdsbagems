import { useEffect, useState } from 'react';
import { Loader2, Sparkles, AlertTriangle, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCatersAiJob, markCatersAiJobReviewed } from '@/lib/caters/aiJobs';
import { useAuth } from '@/lib/AuthContext';

const PRIORITY_OPTIONS = ['baixa', 'media', 'alta', 'critica'];

function verdictBadge(verdict) {
  if (verdict === 'adequate') {
    return <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">Adequada</span>;
  }
  return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">Precisa revisão</span>;
}

// Dialog de revisão humana para sugestões geradas por IA (extração de PDF ou
// análise de resposta). Nada é gravado nas tabelas oficiais automaticamente —
// cada ação de "aplicar" abaixo chama explicitamente as mutations do
// chamador, e o job só fica "reviewed" quando o usuário fecha com aprovação.
export default function AiSuggestionReviewDialog({
  jobId,
  open,
  onOpenChange,
  recommendations = [],
  onApplyProcessSuggestion,
  onCreateRecommendationSuggestion,
  onAppendRecommendationNote,
}) {
  const { user } = useAuth();
  const { job, error } = useCatersAiJob(open ? jobId : null);
  const [recDrafts, setRecDrafts] = useState([]);
  const [appliedProcess, setAppliedProcess] = useState(false);
  const [createdRecIdx, setCreatedRecIdx] = useState(() => new Set());

  useEffect(() => {
    if (job?.status === 'done' && job?.job_type === 'extract_pdf') {
      setRecDrafts((job.result_json?.recommendations || []).map((r) => ({ ...r })));
    }
  }, [job]);

  const handleClose = () => onOpenChange(false);

  const handleMarkReviewed = async () => {
    try {
      await markCatersAiJobReviewed(jobId, user?.id);
    } finally {
      handleClose();
    }
  };

  const isLoading = !job || job.status === 'queued' || job.status === 'processing';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-600" />
            Sugestão da IA — revisão obrigatória
          </DialogTitle>
        </DialogHeader>

        {isLoading && (
          <div className="flex flex-col items-center gap-2 py-10 text-slate-500">
            <Loader2 className="h-6 w-6 animate-spin" />
            <p className="text-sm">Analisando com IA… isso pode levar alguns segundos.</p>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {job?.status === 'done' && job.job_type === 'extract_pdf' && (
          <div className="space-y-5">
            {job.result_json?.confidence_notes && (
              <div className="rounded-md border border-violet-200 bg-violet-50 px-3 py-2 text-xs text-violet-800">
                <span className="font-semibold">Observações da IA: </span>
                {job.result_json.confidence_notes}
              </div>
            )}

            {job.result_json?.process && (
              <section className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="text-sm font-semibold text-slate-900">Dados do processo sugeridos</div>
                  {!appliedProcess ? (
                    <Button
                      size="sm"
                      className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                      onClick={async () => {
                        await onApplyProcessSuggestion(job.result_json.process);
                        setAppliedProcess(true);
                      }}
                    >
                      <Check className="h-3.5 w-3.5" />
                      Aplicar ao processo
                    </Button>
                  ) : (
                    <span className="text-xs font-semibold text-emerald-600">Aplicado</span>
                  )}
                </div>
                <dl className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                  {Object.entries(job.result_json.process).map(([k, v]) => (
                    <div key={k}>
                      <dt className="font-semibold text-slate-500">{k}</dt>
                      <dd>{String(v ?? '-')}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}

            <section className="space-y-3">
              <div className="text-sm font-semibold text-slate-900">
                Recomendações sugeridas ({recDrafts.length})
              </div>
              {recDrafts.map((rec, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 p-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Descrição</Label>
                      <textarea
                        rows={2}
                        value={rec.description || ''}
                        onChange={(e) => setRecDrafts((d) => d.map((r, i) => i === idx ? { ...r, description: e.target.value } : r))}
                        className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Código do item</Label>
                      <Input className="h-8 text-xs" value={rec.item_code || ''}
                        onChange={(e) => setRecDrafts((d) => d.map((r, i) => i === idx ? { ...r, item_code: e.target.value } : r))} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Prioridade</Label>
                      <select
                        value={rec.priority || 'media'}
                        onChange={(e) => setRecDrafts((d) => d.map((r, i) => i === idx ? { ...r, priority: e.target.value } : r))}
                        className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    {!createdRecIdx.has(idx) ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        disabled={!rec.description?.trim()}
                        onClick={async () => {
                          await onCreateRecommendationSuggestion(rec);
                          setCreatedRecIdx((s) => new Set(s).add(idx));
                        }}
                      >
                        <Check className="h-3.5 w-3.5" />
                        Adicionar recomendação
                      </Button>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-600">Adicionada</span>
                    )}
                  </div>
                </div>
              ))}
            </section>
          </div>
        )}

        {job?.status === 'done' && job.job_type === 'analyze_response' && (
          <div className="space-y-4">
            <section className="rounded-xl border border-slate-200 p-4">
              <div className="mb-1 flex items-center gap-2">
                {verdictBadge(job.result_json?.verdict)}
              </div>
              <p className="text-sm text-slate-700">{job.result_json?.rationale}</p>
            </section>

            <div className="space-y-2">
              {(job.result_json?.per_recommendation || []).map((item, idx) => {
                const rec = recommendations.find((r) => String(r.id) === String(item.recommendation_id));
                return (
                  <div key={idx} className="rounded-xl border border-slate-200 p-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-semibold text-slate-800">
                        {rec?.description || item.recommendation_id}
                      </span>
                      {verdictBadge(item.verdict)}
                    </div>
                    <p className="text-xs text-slate-600">{item.rationale}</p>
                    {rec && (
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => onAppendRecommendationNote(rec, item.rationale)}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Salvar como observação
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={handleClose}>Fechar sem revisar</Button>
          <Button
            className="bg-emerald-600 hover:bg-emerald-700"
            disabled={isLoading}
            onClick={handleMarkReviewed}
          >
            Marcar como revisado
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
