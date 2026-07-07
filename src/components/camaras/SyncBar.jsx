import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { useSyncStatus } from '@/lib/SyncStatusContext.jsx';
import { runFullSync } from '@/lib/offline/syncEngine';
import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Wifi, WifiOff, RefreshCw, Download } from 'lucide-react';

/**
 * Compact status box (online/offline, última sync, sincronizar, baixar backup) —
 * feito para ser embutido no canto superior direito do cabeçalho escuro (CamaraLayout/Home).
 */
export default function SyncBar() {
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
      const { db } = await import('@/lib/offline/db');
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const tabelas = ['fiscalizacoes', 'unidades', 'respostas', 'constatacoes_manuais', 'recomendacoes', 'fila_mutacoes', 'fotos_local'];
      const backup = {};
      for (const t of tabelas) { if (db[t]) backup[t] = await db[t].toArray(); }
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
    <div className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-2 py-1.5 flex-shrink-0">
      <span className={`flex items-center gap-1 text-xs font-semibold ${online ? 'text-emerald-300' : 'text-amber-300'}`}>
        {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
        <span className="hidden lg:inline">{online ? 'Online' : 'Offline'}</span>
      </span>

      <span className="hidden xl:inline whitespace-nowrap border-l border-white/15 pl-2 text-[11px] text-blue-200">
        {statusLabel}
      </span>

      <div className="flex items-center gap-0.5 border-l border-white/15 pl-1.5">
        <Button
          size="sm"
          variant="ghost"
          disabled={syncing || !online}
          className="h-7 gap-1 rounded-md px-2 text-[11px] text-blue-100 hover:bg-white/10 hover:text-white"
          onClick={handleSync}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{syncing ? 'Sincronizando...' : 'Sincronizar'}</span>
        </Button>
        <Button
          size="icon"
          variant="ghost"
          title="Baixar backup local"
          className="h-7 w-7 rounded-md text-blue-200 hover:bg-white/10 hover:text-white"
          onClick={handleBackup}
        >
          <Download className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
