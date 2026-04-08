import React from 'react';
import { supabase } from '@/lib/supabase';
import { useSyncStatus } from '@/lib/SyncStatusContext.jsx';
import { getSyncPendingForFiscalizacao } from '@/lib/offline/syncEngine';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Loader2, FileText, RefreshCcw } from 'lucide-react';
import { db } from '@/lib/offline/db';

export default function RelatorioFiscalizacao({ fiscalizacao }) {
    const queryClient = useQueryClient();
    const [isRequesting, setIsRequesting] = React.useState(false);
    const [jobId, setJobId] = React.useState(null);
    const [job, setJob] = React.useState(null);
    const [error, setError] = React.useState(null);
    const [pendingLocal, setPendingLocal] = React.useState({ outboxCount: 0, fotosCount: 0 });
    const syncStatus = useSyncStatus?.() || { online: true, sessionValid: true, outboxCount: 0, lastSyncAt: undefined };

    const ensureAuth = async () => {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        return data?.session?.access_token;
    };

    const invokeEdgeFunction = async (functionName, body) => {
        const baseUrl = import.meta.env.VITE_SUPABASE_URL;
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        const jwt = await ensureAuth();
        
        const url = `${String(baseUrl).replace(/\/$/, '')}/functions/v1/${functionName}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 
                'apikey': anonKey,
                'Authorization': `Bearer ${anonKey}`,
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ ...(body || {}), jwt })
        });
        
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error || `Erro ${res.status}`);
        return json;
    };

    const resolveServerFiscalizacaoId = async () => {
        const localFiscId = typeof fiscalizacao.id === 'string' ? fiscalizacao.id : undefined;
        const map = localFiscId
            ? await db.id_map.where('local_id').equals(localFiscId).and(m => m.entity === 'fiscalizacoes').first()
            : null;
        return map?.server_id || (localFiscId || fiscalizacao.id);
    };

    const carregarUltimoJob = async () => {
        try {
            await ensureAuth();
            
            const fiscalizacao_id = await resolveServerFiscalizacaoId();
            const { data, error: qErr } = await supabase
                .from('relatorios_jobs')
                .select('id, status, progress_unidades, progress_fotos, error_message, storage_path, created_at, updated_at')
                .eq('fiscal_id' as any, fiscalizacao_id) // Fallback common column name check
                .order('created_at', { ascending: false })
                .limit(1);
            
            // Try actual column name from schema if 'fiscal_id' fails, usually 'fiscalizacao_id'
            const actualQuery = qErr ? supabase.from('relatorios_jobs').select('*').eq('fiscalizacao_id', fiscalizacao_id) : null;
            const finalData = qErr ? (await actualQuery).data : data;

            const row = Array.isArray(finalData) ? finalData[0] : null;
            if (!row) {
                setJob(null);
                setJobId(null);
                return;
            }

            if (row.status === 'done') {
                try {
                    const st = await invokeEdgeFunction('relatorios_status', { job_id: row.id });
                    if (!st?.signed_url) {
                        setError(null);
                        setJob(null);
                        setJobId(null);
                        return;
                    }
                    setJob({ ...row, signed_url: st.signed_url });
                    setJobId(null);
                    return;
                } catch {
                    setError(null);
                    setJob(null);
                    setJobId(null);
                    return;
                }
            }

            setJob(row);
            const active = row.status === 'queued' || row.status === 'processing';
            setJobId(active ? row.id : null);
        } catch (err) {
            console.error('Erro ao carregar histórico de relatórios:', err);
            setError(err?.message || 'Erro ao carregar histórico de relatórios.');
        }
    };

    const solicitarGeracao = async () => {
        if (isRequesting) return;
        
        try {
            const pending = await getSyncPendingForFiscalizacao(String(fiscalizacao.id));
            if (pending.outboxCount > 0 || pending.fotosCount > 0) {
                setError(`Existem ${pending.outboxCount + pending.fotosCount} itens pendentes de sincronização. Aguarde a finalização da sincronia.`);
                return;
            }
        } catch (e) {
            console.error('Erro ao verificar sincronia:', e);
        }

        setError(null);
        setIsRequesting(true);
        try {
            const fiscalizacao_id = await resolveServerFiscalizacaoId();
            const data = await invokeEdgeFunction('relatorios_enqueue', { fiscalizacao_id });
            if (!data?.job_id) throw new Error('Falha ao criar job');
            
            queryClient.invalidateQueries({ queryKey: ['fiscalizacoes'] });

            setJobId(data.job_id);
            setJob({ status: 'queued', progress_unidades: 0, progress_fotos: 0 });
        } catch (err) {
            console.error('Erro ao solicitar relatório:', err);
            setError(err?.message || 'Erro ao solicitar relatório.');
        } finally {
            setIsRequesting(false);
        }
    };

    React.useEffect(() => {
        if (!jobId) return;
        let stopped = false;
        let intervalId;
        const poll = async () => {
            try {
                const data = await invokeEdgeFunction('relatorios_status', { job_id: jobId });
                if (stopped) return;
                if (data?.status === 'done' && !data?.signed_url) {
                    stopped = true;
                    clearInterval(intervalId);
                    setJobId(null);
                    setJob(null);
                    setError(null);
                    return;
                }
                setJob(data);
                if (data?.status === 'done' && data?.signed_url) {
                    stopped = true;
                    clearInterval(intervalId);
                    setJobId(null);
                }
                if (data?.status === 'error') {
                    stopped = true;
                    clearInterval(intervalId);
                    setJobId(null);
                    setError(data?.error_message || 'Falha ao gerar relatório.');
                }
            } catch (err) {
                if (stopped) return;
                setError(err?.message || 'Erro ao consultar status.');
            }
        };
        poll();
        intervalId = window.setInterval(poll, 3000);
        return () => {
            stopped = true;
            clearInterval(intervalId);
        };
    }, [jobId]);

    const isOnlineAndReady = syncStatus.online && syncStatus.sessionValid;
    React.useEffect(() => {
        if (!isOnlineAndReady) return;
        carregarUltimoJob();
    }, [isOnlineAndReady, fiscalizacao?.id, fiscalizacao?.status]);

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

    const baixarJob = async (selectedJobId) => {
        try {
            const data = await invokeEdgeFunction('relatorios_status', { job_id: selectedJobId });
            if (data?.signed_url) {
                window.open(data.signed_url, '_blank', 'noopener,noreferrer');
            } else {
                setError('Relatório ainda não está pronto para download.');
            }
        } catch (err) {
            console.error('Erro ao obter URL de download:', err);
            setError(err?.message || 'Erro ao obter URL de download.');
        }
    };

    const isRunning = job?.status && job.status !== 'done' && job.status !== 'error';
    const isDone = job?.status === 'done' && !!job?.signed_url;
    const localOutbox = pendingLocal?.outboxCount || 0;
    const localFotos = pendingLocal?.fotosCount || 0;
    const canRequest = isOnlineAndReady && localOutbox === 0 && localFotos === 0;
    const msg = !syncStatus.online || !syncStatus.sessionValid
        ? 'Conecte-se ao servidor para gerar/baixar relatório.'
        : (localOutbox > 0 || localFotos > 0)
        ? 'Sincronize esta fiscalização antes para gerar um novo relatório.'
        : null;

    return (
        <div className="space-y-2">
            {error ? (
                <div className="text-sm text-red-700 bg-red-100 border border-red-200 rounded px-3 py-2">
                    {error}
                </div>
            ) : null}
            {msg ? (
                <div className="text-sm text-yellow-700 bg-yellow-100 border border-yellow-200 rounded px-3 py-2">
                    {msg}
                    {syncStatus.online && syncStatus.sessionValid && (localOutbox > 0 || localFotos > 0)
                        ? ` (${localOutbox} itens, ${localFotos} fotos)`
                        : ''}
                </div>
            ) : null}
            {job?.status ? (
                <div className="text-xs text-gray-600">
                    Status: {job.status}
                    {typeof job.progress_unidades === 'number' ? ` | Unidades: ${job.progress_unidades}` : ''}
                    {typeof job.progress_fotos === 'number' ? ` | Fotos: ${job.progress_fotos}` : ''}
                </div>
            ) : null}
            <div className="flex gap-2">
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
                    disabled={!isOnlineAndReady || isRequesting || isRunning || (!isDone && !canRequest)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                    size="sm"
                >
                    {isRequesting || isRunning ? (
                        <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            Gerando...
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
                        disabled={!isOnlineAndReady || isRequesting || isRunning || !canRequest}
                        variant="outline"
                        className="text-orange-600 border-orange-200 hover:bg-orange-50"
                        size="sm"
                        title="Gerar novo relatório com dados atuais"
                    >
                        <RefreshCcw className={`h-4 w-4 ${isRequesting || isRunning ? 'animate-spin' : ''}`} />
                    </Button>
                )}
            </div>
        </div>
    );
}
