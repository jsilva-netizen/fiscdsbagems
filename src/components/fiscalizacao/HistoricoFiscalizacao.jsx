import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { History, X, User, Clock, FileEdit, Plus, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

const ACTION_LABELS = {
  INSERT: { label: 'Criação', color: 'bg-green-100 text-green-700', icon: Plus },
  UPDATE: { label: 'Alteração', color: 'bg-blue-100 text-blue-700', icon: FileEdit },
  DELETE: { label: 'Exclusão', color: 'bg-red-100 text-red-700', icon: Trash2 },
};

const TABLE_LABELS = {
  fiscalizacoes: 'Fiscalização',
  unidades_fiscalizadas: 'Unidade',
  respostas_checklist: 'Checklist',
  constatacoes_manuais: 'Constatação manual',
  recomendacoes: 'Recomendação',
  determinacoes: 'Determinação',
  relatorios_jobs: 'Relatório',
};

function getRecordSummary(tableName, data) {
  if (!data) return null;
  switch (tableName) {
    case 'fiscalizacoes':
      return data.municipio_nome || data.numero_termo || null;
    case 'unidades_fiscalizadas':
      return data.nome || data.tipo_unidade || null;
    case 'constatacoes_manuais':
      return data.texto ? `"${data.texto.substring(0, 60)}${data.texto.length > 60 ? '…' : ''}"` : null;
    case 'determinacoes':
      return data.texto ? `"${data.texto.substring(0, 60)}${data.texto.length > 60 ? '…' : ''}"` : null;
    case 'recomendacoes':
      return data.texto ? `"${data.texto.substring(0, 60)}${data.texto.length > 60 ? '…' : ''}"` : null;
    case 'relatorios_jobs':
      return data.status ? `Status: ${data.status}` : null;
    default:
      return null;
  }
}

function LogItem({ log }) {
  const action = ACTION_LABELS[log.action] || { label: log.action, color: 'bg-gray-100 text-gray-700', icon: RefreshCw };
  const ActionIcon = action.icon;
  const tableLabel = TABLE_LABELS[log.table_name] || log.table_name;
  const summary = getRecordSummary(log.table_name, log.new_data || log.old_data);

  return (
    <div className="flex items-start gap-3 py-3 border-b last:border-b-0">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${action.color}`}>
        <ActionIcon className="h-3.5 w-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${action.color}`}>
            {action.label}
          </span>
          <span className="text-xs text-gray-600 font-medium">{tableLabel}</span>
        </div>
        {summary && (
          <p className="text-xs text-gray-500 mt-0.5 truncate">{summary}</p>
        )}
        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <User className="h-3 w-3" />
            {log.user_email || 'Sistema'}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function HistoricoFiscalizacao({ fiscalizacao }) {
  const [open, setOpen] = useState(false);

  const { data: logs = [], isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', fiscalizacao.id],
    queryFn: async () => {
      // Busca logs da fiscalização principal e de todos os registros filhos
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .or(`and(table_name.eq.fiscalizacoes,record_id.eq.${fiscalizacao.id}),and(table_name.eq.relatorios_jobs,record_id.neq.00000000-0000-0000-0000-000000000000)`)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Filtra apenas logs desta fiscalização (via record_id direto OU via unidades filhas)
      // Para tabelas filhas (unidades, respostas, etc.) precisamos de uma query separada
      const { data: unidades, error: uErr } = await supabase
        .from('audit_logs')
        .select('*')
        .neq('table_name', 'fiscalizacoes')
        .order('created_at', { ascending: false })
        .limit(200);

      if (uErr) throw uErr;

      // Combina e ordena todos os logs por data
      const directLogs = (data || []).filter(
        l => l.table_name === 'fiscalizacoes' && l.record_id === fiscalizacao.id
      );

      // Filtra logs de relatórios vinculados a esta fiscalização
      const relatorioLogs = (data || []).filter(
        l => l.table_name === 'relatorios_jobs' &&
          ((l.new_data?.fiscalizacao_id === fiscalizacao.id) ||
           (l.old_data?.fiscalizacao_id === fiscalizacao.id))
      );

      // Para as tabelas filhas, filtramos pelos dados que contêm o fiscalizacao_id
      const childLogs = (unidades || []).filter(l => {
        const d = l.new_data || l.old_data;
        if (!d) return false;
        if (d.fiscalizacao_id === fiscalizacao.id) return true;
        return false;
      });

      const allLogs = [...directLogs, ...relatorioLogs, ...childLogs];
      allLogs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return allLogs.slice(0, 100);
    },
    enabled: open,
    staleTime: 30000,
  });

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 px-2 h-7"
        title="Ver histórico de alterações"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
      >
        <History className="h-3.5 w-3.5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4 text-blue-600" />
              Histórico de Alterações
            </DialogTitle>
            <p className="text-sm text-gray-500 mt-0.5">
              {fiscalizacao.municipio_nome}
              {fiscalizacao.numero_termo ? ` — Termo ${fiscalizacao.numero_termo}` : ''}
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0 -mx-6 px-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-8 text-gray-400">
                <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                Carregando histórico...
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhuma alteração registrada ainda.</p>
                <p className="text-xs mt-1 text-gray-300">As alterações aparecem aqui após a migração do sistema de auditoria.</p>
              </div>
            ) : (
              <div>
                {logs.map((log) => (
                  <LogItem key={log.id} log={log} />
                ))}
              </div>
            )}
          </div>

          <div className="flex-shrink-0 pt-3 border-t flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {logs.length > 0 ? `${logs.length} registro${logs.length !== 1 ? 's' : ''}` : ''}
            </span>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
