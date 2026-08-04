import React from 'react';
import { useSyncStatus } from '@/lib/SyncStatusContext.jsx';
import { getSyncPendingForFiscalizacao, runFullSync } from '@/lib/offline/syncEngine';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, RefreshCcw } from 'lucide-react';
import { db } from '@/lib/offline/db';
import { invokeEdgeFunction } from '@/lib/edgeFunctions';

// Relatório pronto pra baixar: ou tem signed_url (caminho de 1 arquivo), ou é multi-parte
// (parts_count > 1) — nesse caso o app baixa cada parte e junta tudo no navegador.
const isJobReady = (st) => st?.status === 'done' && (!!st?.signed_url || Number(st?.parts_count || 1) > 1);
const isActiveStatus = (st) => st?.status === 'queued' || st?.status === 'processing';

// O localStorage é por domínio do site, não por projeto Supabase. Incluir a URL do projeto
// na chave garante que, ao trocar de banco/ambiente (ex: migração de projeto Supabase), o
// cache de "último job" antigo fica automaticamente órfão em vez de continuar sendo lido
// como se fosse válido no backend novo.
const STORAGE_NAMESPACE = (() => {
    try {
        const url = String(import.meta.env.VITE_SUPABASE_URL || '');
        const match = /^https?:\/\/([^./]+)/.exec(url);
        return match ? match[1] : 'default';
    } catch {
        return 'default';
    }
})();

const relatorioJobKey = (fiscalizacaoId) => `relatorio_last_job:${STORAGE_NAMESPACE}:${String(fiscalizacaoId)}`;

export default function RelatorioFiscalizacao({ fiscalizacao, showStatusOnly = false, showButtonsOnly = false }) {
    const queryClient = useQueryClient();
    const [isRequesting, setIsRequesting] = React.useState(false);
    const [isSyncingBeforeReport, setIsSyncingBeforeReport] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [pendingLocal, setPendingLocal] = React.useState({ outboxCount: 0, fotosCount: 0 });
    // Progresso da montagem de relatórios multi-parte: { phase: 'baixando'|'montando', current?, total? }
    const [downloadStep, setDownloadStep] = React.useState(null);
    const syncStatus = useSyncStatus?.() || { online: true, sessionValid: true, outboxCount: 0, lastSyncAt: undefined };
    const isOnlineAndReady = syncStatus.online && syncStatus.sessionValid;

    const resolveServerFiscalizacaoId = async () => {
        const localFiscId = typeof fiscalizacao.id === 'string' ? fiscalizacao.id : undefined;
        const map = localFiscId
            ? await db.id_map.where('local_id').equals(localFiscId).and(m => m.entity === 'fiscalizacoes').first()
            : null;
        return map?.server_id || (localFiscId || fiscalizacao.id);
    };

    // Chave compartilhada pelo React Query entre as instâncias showStatusOnly e
    // showButtonsOnly da MESMA fiscalização: ambas leem/escrevem o mesmo cache, então
    // gerar um relatório numa instância atualiza a outra automaticamente (mesmo objeto
    // de estado, sem precisar levantar estado pro componente pai).
    const jobQueryKey = React.useMemo(
        () => ['relatorio_job_status', STORAGE_NAMESPACE, String(fiscalizacao.id)],
        [fiscalizacao?.id]
    );

    const { data: job, error: queryError } = useQuery({
        queryKey: jobQueryKey,
        queryFn: async () => {
            const fiscalizacao_id = await resolveServerFiscalizacaoId();
            try {
                const st = await invokeEdgeFunction('relatorios_status', { fiscalizacao_id });
                if (st?.status === 'not_found') return null;
                if (st?.status === 'done' && !isJobReady(st)) return null;
                return st;
            } catch (err) {
                const msg = String(err?.message || '').toLowerCase();
                if (msg.includes('job_not_found') || msg.includes('500') || msg.includes('internal server error')) {
                    return null;
                }
                if (msg.includes('unauthorized') || msg.includes('forbidden')) {
                    // Checagem passiva ("já existe relatório?") — sessão instável ou sem
                    // permissão não deve virar um erro alarmante pro usuário aqui; ele
                    // ainda pode tentar gerar o relatório manualmente pelo botão.
                    const silent = new Error(err?.message || 'unauthorized');
                    silent.silent = true;
                    throw silent;
                }
                throw err;
            }
        },
        initialData: () => {
            try {
                const stored = localStorage.getItem(`${relatorioJobKey(fiscalizacao.id)}:data`);
                return stored ? JSON.parse(stored) : undefined;
            } catch {
                return undefined;
            }
        },
        enabled: isOnlineAndReady,
        staleTime: 0,
        retry: false,
        refetchInterval: (query) => (isActiveStatus(query.state.data) ? 3000 : false),
        refetchIntervalInBackground: true,
    });

    React.useEffect(() => {
        if (queryError && !queryError.silent) {
            console.error('Erro ao carregar histórico de relatórios:', queryError);
            setError(queryError.message || 'Erro ao carregar histórico de relatórios.');
        }
    }, [queryError]);

    // Mantém uma cópia local pra pintura instantânea (antes da 1ª resposta de rede) na
    // próxima vez que a página carregar.
    React.useEffect(() => {
        try {
            const key = `${relatorioJobKey(fiscalizacao.id)}:data`;
            if (job) {
                localStorage.setItem(key, JSON.stringify(job));
            } else {
                localStorage.removeItem(key);
            }
        } catch {}
    }, [job, fiscalizacao?.id]);

    const solicitarGeracao = async () => {
        if (isRequesting) return;

        try {
            if (syncStatus.online && syncStatus.sessionValid) {
                setIsSyncingBeforeReport(true);
                try {
                    await runFullSync();
                } finally {
                    setIsSyncingBeforeReport(false);
                }

                const pending2 = await getSyncPendingForFiscalizacao(String(fiscalizacao.id));
                if (pending2.outboxCount > 0 || pending2.fotosCount > 0) {
                    let extra = '';
                    try {
                        const unidades = await db.unidades.where('fiscalizacao_id').equals(String(fiscalizacao.id)).toArray();
                        const unidadeIds = new Set((unidades || []).map(u => String(u?.id || '')).filter(Boolean));
                        const muts = await db.fila_mutacoes.where('status').anyOf('pending', 'error').toArray();
                        const related = (muts || []).filter(m => {
                            const entity = String(m?.entity || '');
                            const p = m?.payload || {};
                            const uid = String(p?.unidade_fiscalizada_id || p?.id || '');
                            if (entity === 'fiscalizacoes' || entity === 'finalizacao_fiscalizacao') {
                                return String(p?.id || p?.fiscalizacao_id || '') === String(fiscalizacao.id);
                            }
                            if (entity === 'unidades' || entity === 'finalizacao_unidade') {
                                const pfisc = String(p?.fiscalizacao_id || '');
                                if (pfisc && pfisc === String(fiscalizacao.id)) return true;
                                return uid ? unidadeIds.has(uid) : false;
                            }
                            if (entity === 'respostas' || entity === 'constatacoes_manuais' || entity === 'recomendacoes' || entity === 'fotos') {
                                return uid ? unidadeIds.has(uid) : false;
                            }
                            return false;
                        }).slice(0, 3);

                        if (related.length > 0) {
                            extra = ` Pendência: ${related.map(r => `${r.entity}:${r.tipo}:${r.status}${r.lastError ? `(${String(r.lastError).slice(0, 80)})` : ''}`).join(' | ')}`;
                        }
                    } catch {}

                    setError(`Ainda existem ${pending2.outboxCount + pending2.fotosCount} itens pendentes de sincronização. Finalize a sincronia antes de gerar o relatório.${extra}`);
                    return;
                }
            }
        } catch (e) {
            console.error('Falha ao sincronizar antes do relatório:', e);
            setError(e?.message || 'Falha ao sincronizar antes do relatório.');
            return;
        }

        setError(null);
        setIsRequesting(true);
        try {
            const fiscalizacao_id = await resolveServerFiscalizacaoId();
            const data = await invokeEdgeFunction('relatorios_enqueue', { fiscalizacao_id });
            if (!data?.job_id) throw new Error('Falha ao criar job');

            queryClient.invalidateQueries({ queryKey: ['fiscalizacoes'] });
            const newJob = { status: 'queued', progress_unidades: 0, progress_fotos: 0, id: data.job_id, fiscalizacao_id };
            // Escreve direto no cache compartilhado: a instância showStatusOnly (se
            // houver uma montada em paralelo pra essa mesma fiscalização) reflete o
            // job novo imediatamente, e o refetchInterval assume o polling a partir daqui.
            queryClient.setQueryData(jobQueryKey, newJob);
        } catch (err) {
            console.error('Erro ao solicitar relatório:', err);
            setError(err?.message || 'Erro ao solicitar relatório.');
        } finally {
            setIsRequesting(false);
        }
    };

    React.useEffect(() => {
        let stopped = false;
        const refresh = async () => {
            try {
                if (!fiscalizacao?.id) return;
                const data = await getSyncPendingForFiscalizacao(String(fiscalizacao.id));
                if (stopped) return;
                setPendingLocal(data);
            } catch {}
        };
        refresh();
        const t = window.setInterval(refresh, 4000);
        return () => {
            stopped = true;
            clearInterval(t);
        };
    }, [fiscalizacao?.id]);

    // Relatórios divididos em várias partes (fiscalizações com muitas fotos, acima do limite
    // de 50MB por objeto do Storage) não têm um único arquivo pra abrir direto: o app baixa
    // cada parte (signed_url) e junta tudo num único PDF aqui mesmo, mostrando o progresso
    // pro usuário em vez de travar sem feedback num request só.
    const baixarPartesUnificadas = async (partUrls, fiscalizacaoId) => {
        const total = partUrls.length;
        const partBytesList = [];
        for (let i = 0; i < total; i++) {
            setDownloadStep({ phase: 'baixando', current: i + 1, total });
            const res = await fetch(partUrls[i]);
            if (!res.ok) throw new Error(`Falha ao baixar parte ${i + 1} de ${total} (${res.status}).`);
            partBytesList.push(new Uint8Array(await res.arrayBuffer()));
        }

        setDownloadStep({ phase: 'montando' });
        const { PDFDocument } = await import('pdf-lib');
        const merged = await PDFDocument.create();
        for (const partBytes of partBytesList) {
            const part = await PDFDocument.load(partBytes);
            const pages = await merged.copyPages(part, part.getPageIndices());
            for (const p of pages) merged.addPage(p);
        }
        const mergedBytes = await merged.save();

        const blob = new Blob([mergedBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        try {
            const a = document.createElement('a');
            a.href = url;
            a.download = `relatorio-${fiscalizacaoId || 'fiscalizacao'}.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } finally {
            setTimeout(() => URL.revokeObjectURL(url), 10000);
        }
    };

    const baixarJob = async (selectedJobId) => {
        try {
            const data = await invokeEdgeFunction('relatorios_status', { job_id: selectedJobId });
            if (data?.status === 'not_found') {
                setError(null);
                return;
            }
            if (data?.signed_url) {
                window.open(data.signed_url, '_blank', 'noopener,noreferrer');
                return;
            }
            if (Array.isArray(data?.part_urls) && data.part_urls.length > 0 && data?.status === 'done') {
                try {
                    await baixarPartesUnificadas(data.part_urls, data.fiscalizacao_id);
                } finally {
                    setDownloadStep(null);
                }
                return;
            }
            setError('Relatório ainda não está pronto para download.');
        } catch (err) {
            console.error('Erro ao obter URL de download:', err);
            const msg = err?.message || 'Erro ao obter URL de download.'
            if (String(msg).toLowerCase().includes('job_not_found')) {
                setError(null);
                return;
            }
            setError(msg);
        }
    };

    const isRunning = job?.status && job.status !== 'done' && job.status !== 'error';
    const isDone = isJobReady(job);
    const isDownloading = !!downloadStep;
    const downloadStepLabel = downloadStep?.phase === 'baixando'
        ? `Baixando parte ${downloadStep.current} de ${downloadStep.total}...`
        : downloadStep?.phase === 'montando'
            ? 'Montando PDF...'
            : null;
    const localOutbox = pendingLocal?.outboxCount || 0;
    const localFotos = pendingLocal?.fotosCount || 0;
    const canRequest = isOnlineAndReady && localOutbox === 0 && localFotos === 0;
    const msg = !syncStatus.online || !syncStatus.sessionValid
        ? 'Conecte-se ao servidor para gerar/baixar relatório.'
        : null;

    if (showStatusOnly) {
        return (
            <>
                {error ? (
                    <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded px-3 py-2 mb-2 w-full">
                        {error}
                    </div>
                ) : null}
                {msg ? (
                    <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-2 w-full">
                        {msg}
                    </div>
                ) : null}
                {job?.status ? (
                    <div className="text-xs text-gray-600 mb-2 w-full">
                        Status: {job.status}
                        {typeof job.progress_unidades === 'number' ? ` | Unidades: ${job.progress_unidades}` : ''}
                        {typeof job.progress_fotos === 'number' ? ` | Fotos: ${job.progress_fotos}` : ''}
                    </div>
                ) : null}
                {downloadStepLabel ? (
                    <div className="text-xs text-gray-600 mb-2 w-full flex items-center gap-1.5">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        {downloadStepLabel}
                    </div>
                ) : null}
            </>
        );
    }

    if (showButtonsOnly) {
        return (
            <div className="flex gap-2 items-center">
                <Button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (isDone) {
                            baixarJob(job.id);
                            return;
                        }
                        solicitarGeracao();
                    }}
                    disabled={!isOnlineAndReady || isRequesting || isSyncingBeforeReport || isRunning || isDownloading}
                    variant="brand"
                    className="h-9 font-medium"
                    size="sm"
                >
                    {isRequesting || isSyncingBeforeReport || isRunning || isDownloading ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            {isSyncingBeforeReport ? 'Sincronizando...' : isDownloading ? downloadStepLabel : 'Gerando...'}
                        </>
                    ) : (
                        <>
                            <FileText className="h-4 w-4 mr-2" />
                            {isDone ? 'Baixar' : 'Gerar Relatório'}
                        </>
                    )}
                </Button>

                {isDone && (
                    <Button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            solicitarGeracao();
                        }}
                        disabled={!isOnlineAndReady || isRequesting || isSyncingBeforeReport || isRunning || isDownloading}
                        variant="outline"
                        className="text-amber-600 border-amber-200 hover:bg-amber-50 h-9 rounded-xl"
                        size="sm"
                        title="Gerar novo relatório com dados atuais"
                    >
                        <RefreshCcw className={`h-4 w-4 ${isRequesting || isRunning ? 'animate-spin' : ''}`} />
                    </Button>
                )}
            </div>
        );
    }

    return (
        <>
            {error ? (
                <div className="text-sm text-rose-700 bg-rose-50 border border-rose-200 rounded px-3 py-2 mb-2 w-full">
                    {error}
                </div>
            ) : null}
            {msg ? (
                <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2 mb-2 w-full">
                    {msg}
                </div>
            ) : null}
            {job?.status ? (
                <div className="text-xs text-gray-600 mb-2 w-full">
                    Status: {job.status}
                    {typeof job.progress_unidades === 'number' ? ` | Unidades: ${job.progress_unidades}` : ''}
                    {typeof job.progress_fotos === 'number' ? ` | Fotos: ${job.progress_fotos}` : ''}
                </div>
            ) : null}
            {downloadStepLabel ? (
                <div className="text-xs text-gray-600 mb-2 w-full flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {downloadStepLabel}
                </div>
            ) : null}
            <div className="flex gap-2 items-center">
                <Button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (isDone) {
                            baixarJob(job.id);
                            return;
                        }
                        solicitarGeracao();
                    }}
                    disabled={!isOnlineAndReady || isRequesting || isSyncingBeforeReport || isRunning || isDownloading}
                    variant="brand"
                    className="h-9 font-medium"
                    size="sm"
                >
                    {isRequesting || isSyncingBeforeReport || isRunning || isDownloading ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            {isSyncingBeforeReport ? 'Sincronizando...' : isDownloading ? downloadStepLabel : 'Gerando...'}
                        </>
                    ) : (
                        <>
                            <FileText className="h-4 w-4 mr-2" />
                            {isDone ? 'Baixar' : 'Gerar Relatório'}
                        </>
                    )}
                </Button>

                {isDone && (
                    <Button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            solicitarGeracao();
                        }}
                        disabled={!isOnlineAndReady || isRequesting || isSyncingBeforeReport || isRunning || isDownloading}
                        variant="outline"
                        className="text-amber-600 border-amber-200 hover:bg-amber-50 h-9 rounded-xl"
                        size="sm"
                        title="Gerar novo relatório com dados atuais"
                    >
                        <RefreshCcw className={`h-4 w-4 ${isRequesting || isRunning ? 'animate-spin' : ''}`} />
                    </Button>
                )}
            </div>
        </>
    );
}
