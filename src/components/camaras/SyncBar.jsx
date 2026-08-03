import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useSyncStatus } from '@/lib/SyncStatusContext.jsx';
import { runFullSync } from '@/lib/offline/syncEngine';
import { db } from '@/lib/offline/db';
import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Wifi, WifiOff, RefreshCw, Download } from 'lucide-react';
import { MODULOS_POR_DIRETORIA } from '@/hooks/useModulo';

/**
 * Compact status box (online/offline, última sync, sincronizar, baixar backup) —
 * feito para ser embutido no canto superior direito do cabeçalho escuro (CamaraLayout/Home).
 *
 * @param {string} [diretoria] - 'dsb' | 'dtr' | 'dge'. Quando informado (CamaraLayout sempre
 *   passa o da câmara atual), o backup local baixa só os dados desse módulo — a base local
 *   (Dexie) guarda fiscalizações de todos os módulos misturadas, então sem esse filtro o
 *   backup feito dentro do DTR, por exemplo, também levava fiscalizações do DSB junto.
 */
export default function SyncBar({ diretoria } = {}) {
  const { online, lastSyncAt, refetchSyncStatus } = useSyncStatus?.() || { online: true, lastSyncAt: undefined, refetchSyncStatus: () => {} };
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const syncInFlightRef = useRef(false);
  const lastSyncToastDismissRef = useRef(null);

  const handleSync = async () => {
    if (syncInFlightRef.current) return;
    syncInFlightRef.current = true;
    setSyncing(true);
    setSyncProgress('Iniciando...');
    try {
      try {
        const persisted = await navigator.storage?.persisted?.();
        if (!persisted && navigator.storage?.persist) await navigator.storage.persist();
      } catch {}
      const res = await runFullSync((msg, isError) => {
        setSyncProgress(msg);
        if (isError) console.error('[Sync Error]', msg);
      });
      await queryClient.invalidateQueries();
      await queryClient.refetchQueries();
      setSyncProgress('');
      if (typeof lastSyncToastDismissRef.current === 'function') lastSyncToastDismissRef.current();
      const t = toast({
        title: 'Sincronização concluída',
        description: res.lastSyncAt ? `Atualizado em ${format(new Date(res.lastSyncAt), 'dd/MM HH:mm', { locale: ptBR })}` : 'Dados atualizados'
      });
      lastSyncToastDismissRef.current = t?.dismiss;
      const { removedCount = 0, recreatedCount = 0 } = res.deletedRemotely || {};
      if (removedCount > 0) {
        toast({
          title: 'Fiscalizações removidas em outro dispositivo',
          description: `${removedCount} fiscalização(ões) foram excluídas em outro dispositivo e removidas localmente (sem alterações pendentes).`,
          variant: 'destructive',
          duration: 15000
        });
      }
      if (recreatedCount > 0) {
        toast({
          title: 'Alterações offline preservadas',
          description: `${recreatedCount} fiscalização(ões) foram excluídas em outro dispositivo, mas havia alterações salvas offline aqui — foram preservadas como nova(s) fiscalização(ões) e serão sincronizadas normalmente.`,
          duration: 15000
        });
      }
    } catch (err) {
      setSyncProgress('Erro na sincronização');
      if (typeof lastSyncToastDismissRef.current === 'function') lastSyncToastDismissRef.current();
      const t = toast({ title: 'Falha na sincronização', description: err?.message || 'Verifique sua conexão e tente novamente', variant: 'destructive' });
      lastSyncToastDismissRef.current = t?.dismiss;
    } finally {
      setSyncing(false);
      syncInFlightRef.current = false;
      refetchSyncStatus?.();
    }
  };

  const handleBackup = async () => {
    try {
      toast({ title: 'Preparando backup', description: 'Coletando dados e fotos, isso pode levar alguns segundos...' });
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();

      // A base local (Dexie) guarda fiscalizações de todos os módulos misturadas — sem
      // filtrar por diretoria aqui, um backup feito dentro do DTR (por exemplo) também
      // levaria fiscalizações do DSB (ou vice-versa) que não têm nada a ver com o módulo
      // sendo usado no momento.
      const modulosPermitidos = diretoria ? MODULOS_POR_DIRETORIA[diretoria] : null;
      const todasFiscalizacoes = await db.fiscalizacoes.toArray();
      const fiscalizacoesFiltradas = modulosPermitidos
        ? todasFiscalizacoes.filter((f) => modulosPermitidos.includes(f.tipo_modulo))
        : todasFiscalizacoes;
      const fiscIds = new Set(fiscalizacoesFiltradas.map((f) => f.id));

      const todasUnidades = await db.unidades.toArray();
      const unidadesFiltradas = modulosPermitidos
        ? todasUnidades.filter((u) => fiscIds.has(u.fiscalizacao_id))
        : todasUnidades;
      const unidadeIds = new Set(unidadesFiltradas.map((u) => u.id));

      const filtrarPorUnidade = async (tabela) => {
        const todos = await db[tabela].toArray();
        return modulosPermitidos ? todos.filter((r) => unidadeIds.has(r.unidade_fiscalizada_id)) : todos;
      };

      const backup = {
        fiscalizacoes: fiscalizacoesFiltradas,
        unidades: unidadesFiltradas,
        respostas: await filtrarPorUnidade('respostas'),
        constatacoes_manuais: await filtrarPorUnidade('constatacoes_manuais'),
        recomendacoes: await filtrarPorUnidade('recomendacoes'),
        fila_mutacoes: modulosPermitidos
          ? (await db.fila_mutacoes.toArray()).filter((m) => {
              const p = m?.payload || {};
              const candidateIds = [p?.id, p?.fiscalizacao_id, p?.unidade_fiscalizada_id].filter(Boolean);
              return candidateIds.some((id) => fiscIds.has(id) || unidadeIds.has(id));
            })
          : await db.fila_mutacoes.toArray(),
        fotos_local: modulosPermitidos
          ? (await db.fotos_local.toArray()).filter((f) => unidadeIds.has(f.unidadeLocalId))
          : await db.fotos_local.toArray()
      };
      zip.file('dados.json', JSON.stringify(backup, null, 2));
      const unidadesList = backup.unidades || [];
      const fotosLocal = backup.fotos_local || [];
      const fotosFolder = zip.folder('fotos');
      for (const foto of fotosLocal) {
        let folderName = foto.unidadeLocalId || 'desconhecida';
        const unidade = unidadesList.find(u => u.id === foto.unidadeLocalId);
        if (unidade?.nome_unidade) {
          folderName = `${unidade.nome_unidade.replace(/[^a-zA-Z0-9 -]/g, '_')} - ${foto.unidadeLocalId.substring(0, 4)}`;
        }
        const unidadeFolder = fotosFolder.folder(folderName);
        let content = foto.blob;
        if (!content && foto.base64) { const res = await fetch(foto.base64); content = await res.blob(); }
        if (content) unidadeFolder.file(`${foto.localId}.jpg`, content);
      }
      const zipContent = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(zipContent);
      const a = document.createElement('a');
      a.href = url; a.download = `backup_emergencia_android_${Date.now()}.zip`; a.click();
      URL.revokeObjectURL(url);
      toast({ title: 'Backup concluído', description: 'Arquivo ZIP baixado com sucesso.' });
    } catch (err) {
      toast({ title: 'Erro no backup', description: err.message, variant: 'destructive' });
    }
  };

  const statusLabel = syncing && syncProgress
    ? syncProgress
    : lastSyncAt
      ? `Sync ${format(new Date(lastSyncAt), 'dd/MM HH:mm', { locale: ptBR })}`
      : 'Sem sincronização';

  return (
    <div className="w-full min-w-0 space-y-1.5 rounded-lg border border-white/15 bg-white/10 p-2">
      <div className="flex min-w-0 items-center justify-between gap-1.5">
        <span className={`flex shrink-0 items-center gap-1 text-xs font-semibold ${online ? 'text-emerald-300' : 'text-amber-300'}`}>
          {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {online ? 'Online' : 'Offline'}
        </span>
        <span className="min-w-0 truncate text-[10px] text-blue-200">{statusLabel}</span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          disabled={syncing || !online}
          className="h-7 min-w-0 flex-1 gap-1 rounded-md px-1.5 text-[11px] text-blue-100 hover:bg-white/10 hover:text-white"
          onClick={handleSync}
        >
          <RefreshCw className={`h-3.5 w-3.5 shrink-0 ${syncing ? 'animate-spin' : ''}`} />
          <span className="truncate">{syncing ? 'Sincronizando...' : 'Sincronizar'}</span>
        </Button>
        <Button
          size="icon"
          variant="ghost"
          title="Baixar backup local"
          className="h-7 w-7 shrink-0 rounded-md text-blue-200 hover:bg-white/10 hover:text-white"
          onClick={handleBackup}
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
