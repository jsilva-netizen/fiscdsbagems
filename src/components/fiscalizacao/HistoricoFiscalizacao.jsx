import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { History, User, Clock, FileEdit, Plus, Trash2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// ─── Mapeamentos ────────────────────────────────────────────────────────────

const ACTION_LABELS = {
  INSERT: { label: 'Criação',   color: 'bg-green-100 text-green-700', icon: Plus },
  UPDATE: { label: 'Alteração', color: 'bg-blue-100 text-blue-700',   icon: FileEdit },
  DELETE: { label: 'Exclusão',  color: 'bg-red-100 text-red-700',     icon: Trash2 },
};

const TABLE_LABELS = {
  fiscalizacoes:       'Fiscalização',
  unidades_fiscalizadas: 'Unidade',
  respostas_checklist: 'Resposta de checklist',
  constatacoes_manuais: 'Constatação manual',
  recomendacoes:       'Recomendação',
  determinacoes:       'Determinação',
  relatorios_jobs:     'Relatório',
};

// Campos que NÃO devem aparecer no diff (ruído técnico)
const IGNORED_FIELDS = new Set([
  'id', 'created_at', 'updated_at', 'last_modified_at',
  'fiscalizacao_id', 'unidade_fiscalizada_id', 'item_checklist_id',
  'nao_conformidade_id', 'requested_by', 'pdf_url',
]);

// Nomes amigáveis para campos relevantes
const FIELD_LABELS = {
  // Fiscalizações
  status:                  'Status',
  municipio_nome:          'Município',
  prestador_servico_nome:  'Prestador',
  numero_termo:            'Número do termo',
  data_inicio:             'Data de início',
  data_fim:                'Data de encerramento',
  fiscal_nome:             'Fiscal',
  last_modified_by:        'Modificado por',
  servicos:                'Serviços',
  // Unidades
  nome:                    'Nome',
  tipo_unidade:            'Tipo',
  codigo:                  'Código',
  endereco:                'Endereço',
  coordenadas:             'Coordenadas',
  ordem:                   'Ordem',
  // Respostas / Constatações
  resposta:                'Resposta',
  pergunta:                'Texto da constatação',
  observacao:              'Observação',
  numero_constatacao:      'Nº constatação',
  gera_nc:                 'Gera NC',
  // Determinações / Recomendações
  descricao:               'Texto',
  numero_determinacao:     'Nº determinação',
  numero_recomendacao:     'Nº recomendação',
  prazo_dias:              'Prazo (dias)',
  origem:                  'Origem',
  // Relatórios
  'status (job)':          'Status do job',
};

function labelFor(field) {
  return FIELD_LABELS[field] || field;
}

function formatValue(val) {
  if (val === null || val === undefined) return '—';
  if (typeof val === 'boolean') return val ? 'Sim' : 'Não';
  if (Array.isArray(val)) return val.join(', ') || '—';
  const s = String(val).trim();
  if (!s) return '—';
  // Datas ISO
  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    try { return format(new Date(s), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }); } catch { return s; }
  }
  return s.length > 120 ? s.slice(0, 120) + '…' : s;
}

/**
 * Retorna array de { field, before, after } com apenas campos que mudaram,
 * excluindo os campos de ruído técnico.
 */
function computeDiff(oldData, newData, tableName) {
  if (!oldData && !newData) return [];

  // Para INSERT, mostramos apenas os campos relevantes do novo registro
  if (!oldData && newData) {
    return Object.entries(newData)
      .filter(([k, v]) => !IGNORED_FIELDS.has(k) && v !== null && v !== undefined && v !== '')
      .map(([k, v]) => ({ field: labelFor(k), before: null, after: formatValue(v) }));
  }

  // Para DELETE, mostramos o que foi removido
  if (oldData && !newData) {
    return Object.entries(oldData)
      .filter(([k, v]) => !IGNORED_FIELDS.has(k) && v !== null && v !== undefined && v !== '')
      .map(([k, v]) => ({ field: labelFor(k), before: formatValue(v), after: null }));
  }

  // Para UPDATE, mostramos apenas o que mudou
  const allKeys = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]);
  const diffs = [];
  for (const k of allKeys) {
    if (IGNORED_FIELDS.has(k)) continue;
    const before = oldData?.[k];
    const after = newData?.[k];
    // Comparação profunda simplificada
    const bStr = JSON.stringify(before ?? null);
    const aStr = JSON.stringify(after ?? null);
    if (bStr === aStr) continue;
    // Ignora mudanças onde ambos são vazios/nulos
    const bEmpty = before === null || before === undefined || before === '';
    const aEmpty = after === null || after === undefined || after === '';
    if (bEmpty && aEmpty) continue;
    diffs.push({ field: labelFor(k), before: formatValue(before), after: formatValue(after) });
  }
  return diffs;
}

// ─── Componente de linha do diff ────────────────────────────────────────────

function DiffRow({ field, before, after }) {
  // INSERT: só mostra "after"
  if (before === null) {
    return (
      <div className="flex items-start gap-1 text-xs py-0.5">
        <span className="text-gray-500 min-w-[110px] shrink-0">{field}:</span>
        <span className="text-green-700 font-medium break-words">{after}</span>
      </div>
    );
  }
  // DELETE: só mostra "before"
  if (after === null) {
    return (
      <div className="flex items-start gap-1 text-xs py-0.5">
        <span className="text-gray-500 min-w-[110px] shrink-0">{field}:</span>
        <span className="text-red-600 line-through break-words">{before}</span>
      </div>
    );
  }
  // UPDATE: antes → depois
  return (
    <div className="flex items-start gap-1 text-xs py-0.5">
      <span className="text-gray-500 min-w-[110px] shrink-0">{field}:</span>
      <span className="text-red-500 line-through break-words mr-1">{before}</span>
      <span className="text-gray-400 shrink-0">→</span>
      <span className="text-green-700 font-medium break-words ml-1">{after}</span>
    </div>
  );
}

// ─── Componente de item de log ───────────────────────────────────────────────

function LogItem({ log }) {
  const [expanded, setExpanded] = useState(false);
  const action = ACTION_LABELS[log.action] || { label: log.action, color: 'bg-gray-100 text-gray-700', icon: RefreshCw };
  const ActionIcon = action.icon;
  const tableLabel = TABLE_LABELS[log.table_name] || log.table_name;
  const diffs = computeDiff(log.old_data, log.new_data, log.table_name);
  const hasDiff = diffs.length > 0;

  return (
    <div className="py-3 border-b last:border-b-0">
      <div className="flex items-start gap-3">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${action.color}`}>
          <ActionIcon className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          {/* Cabeçalho */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${action.color}`}>
              {action.label}
            </span>
            <span className="text-xs text-gray-600 font-medium">{tableLabel}</span>
            {hasDiff && (
              <button
                onClick={() => setExpanded(v => !v)}
                className="ml-auto text-xs text-blue-500 hover:text-blue-700 flex items-center gap-0.5"
              >
                {expanded ? 'Ocultar' : `Ver detalhes (${diffs.length})`}
                {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
            )}
          </div>

          {/* Diff expandido */}
          {expanded && hasDiff && (
            <div className="mt-2 bg-gray-50 rounded-md p-2 border border-gray-100 space-y-0.5">
              {diffs.map((d, i) => (
                <DiffRow key={i} field={d.field} before={d.before} after={d.after} />
              ))}
            </div>
          )}

          {/* Diff compacto (preview do primeiro campo alterado) */}
          {!expanded && hasDiff && log.action === 'UPDATE' && diffs[0] && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">
              {diffs[0].field}: <span className="line-through">{diffs[0].before}</span>
              {' → '}
              <span className="text-gray-600">{diffs[0].after}</span>
              {diffs.length > 1 ? ` +${diffs.length - 1} mais` : ''}
            </p>
          )}

          {/* Usuário e horário */}
          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
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
    </div>
  );
}

// ─── Componente principal ────────────────────────────────────────────────────

export default function HistoricoFiscalizacao({ fiscalizacao }) {
  const [open, setOpen] = useState(false);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['audit-logs', fiscalizacao.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .or(`and(table_name.eq.fiscalizacoes,record_id.eq.${fiscalizacao.id}),and(table_name.eq.relatorios_jobs,record_id.neq.00000000-0000-0000-0000-000000000000)`)
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;

      const { data: childData, error: cErr } = await supabase
        .from('audit_logs')
        .select('*')
        .neq('table_name', 'fiscalizacoes')
        .order('created_at', { ascending: false })
        .limit(300);
      if (cErr) throw cErr;

      const directLogs = (data || []).filter(
        l => l.table_name === 'fiscalizacoes' && l.record_id === fiscalizacao.id
      );
      const relatorioLogs = (data || []).filter(
        l => l.table_name === 'relatorios_jobs' &&
          ((l.new_data?.fiscalizacao_id === fiscalizacao.id) ||
           (l.old_data?.fiscalizacao_id === fiscalizacao.id))
      );
      const childLogs = (childData || []).filter(l => {
        const d = l.new_data || l.old_data;
        return d?.fiscalizacao_id === fiscalizacao.id;
      });

      const all = [...directLogs, ...relatorioLogs, ...childLogs];
      all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return all.slice(0, 150);
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
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
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
                {logs.map(log => <LogItem key={log.id} log={log} />)}
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
