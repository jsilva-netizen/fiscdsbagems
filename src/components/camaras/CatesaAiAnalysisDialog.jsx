import { Loader2, Sparkles, AlertTriangle, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useCatesaAiJob, markCatesaAiJobReviewed } from '@/lib/catesa/aiJobs';
import { useAuth } from '@/lib/AuthContext';

function verdictBadge(verdict) {
  if (verdict === 'adequate') {
    return <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700">Adequada</span>;
  }
  return <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700">Precisa revisão</span>;
}

// Dialog de revisão humana pra análise por IA de determinações da CATESA
// (determinação × resposta do prestador × evidências). Nada é gravado em
// respostas_determinacao automaticamente — cada "Aplicar veredito" chama
// explicitamente onApplyVerdict, e o job só fica "reviewed" ao fechar.
export default function CatesaAiAnalysisDialog({
  jobId,
  open,
  onOpenChange,
  determinacoes = [],
  onApplyVerdict,
}) {
  const { user } = useAuth();
  const { job, error } = useCatesaAiJob(open ? jobId : null);

  const handleClose = () => onOpenChange(false);

  const handleMarkReviewed = async () => {
    try {
      await markCatesaAiJobReviewed(jobId, user?.id);
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
            Análise por IA — determinação × resposta × evidências
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

        {job?.status === 'done' && (
          <div className="space-y-4">
            <section className="rounded-xl border border-slate-200 p-4">
              <div className="mb-1 flex items-center gap-2">
                {verdictBadge(job.result_json?.verdict)}
              </div>
              <p className="text-sm text-slate-700">{job.result_json?.rationale}</p>
            </section>

            <div className="space-y-2">
              {(job.result_json?.per_determinacao || []).map((item, idx) => {
                const det = determinacoes.find((d) => String(d.id) === String(item.determinacao_id));
                return (
                  <div key={idx} className="rounded-xl border border-slate-200 p-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-semibold text-slate-800">
                        {det?.numero_determinacao ? `${det.numero_determinacao} — ` : ''}
                        {det?.descricao || det?.texto || item.determinacao_id}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {item.evidence_reviewed && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            Evidência examinada
                          </span>
                        )}
                        {verdictBadge(item.verdict)}
                      </div>
                    </div>
                    <p className="text-xs text-slate-600">{item.rationale}</p>
                    {det && (
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => onApplyVerdict(det.id, item.verdict, item.rationale)}
                        >
                          <Check className="h-3.5 w-3.5" />
                          Aplicar veredito
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
