import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { History, User, Clock, FileEdit, Plus, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// ─── Constantes ───────────────────────────────────────────────────────────────

const ACTION_LABELS = {
  INSERT: { color: 'bg-green-100 text-green-700', icon: Plus },
  UPDATE: { color: 'bg-blue-100 text-blue-700',   icon: FileEdit },
  DELETE: { color: 'bg-red-100 text-red-700',     icon: Trash2 },
};

const STATUS_PT = {
  em_andamento: 'Em andamento',
  finalizada:   'Finalizada',
  pendente:     'Pendente',
  processando:  'Processando',
  concluido:    'Concluído',
  erro:         'Erro',
};

// Campos a ignorar completamente em qualquer tabela
const GLOBAL_NOISE = new Set([
  'id', 'created_at', 'updated_at', 'last_modified_at',
  'fiscalizacao_id', 'unidade_fiscalizada_id', 'tipo_unidade_id',
  'item_checklist_id', 'nao_conformidade_id', 'requested_by',
  'pdf_url', 'municipio_id', 'prestador_servico_id',
]);

// Campos a ignorar por tabela (além dos globais)
const TABLE_NOISE = {
  unidades_fiscalizadas: new Set(['total_constatacoes', 'total_ncs', 'data_hora_vistoria']),
  fiscalizacoes:         new Set(['last_modified_by', 'total_conformidades', 'total_nao_conformidades', 'municipio_nome', 'prestador_servico_nome']),
  respostas_checklist:   new Set([]),
  determinacoes:         new Set(['origem']),
  recomendacoes:         new Set(['origem']),
};

// Rótulos legíveis por campo
const FIELD_LABELS = {
  // Unidades
  nome_unidade:          'Nome',
  tipo_unidade_nome:     'Tipo',
  codigo_unidade:        'Código',
  endereco:              'Endereço',
  ordem:                 'Posição',
  status:                'Status',
  latitude:              'Latitude',
  longitude:             'Longitude',
  // Fiscalização
  fiscal_nome:           'Fiscal',
  numero_termo:          'Nº do termo',
  data_inicio:           'Data de início',
  data_fim:              'Data de encerramento',
  servicos:              'Serviços',
  // Checklist
  resposta:              'Resposta',
  pergunta:              'Texto da constatação',
  observacao:            'Observação',
  numero_constatacao:    'Nº constatação',
  gera_nc:               'Gera NC',
  // Determinações / Recomendações / Constatações
  descricao:             'Texto',
  texto:                 'Texto',
  numero_determinacao:   'Nº determinação',
  numero_recomendacao:   'Nº recomendacao',
  prazo_dias:            'Prazo (dias)',
  prazo:                 'Prazo',
  artigo_portaria:       'Artigo da portaria',
  texto_determinacao:    'Texto da determinação',
  texto_recomendacao:    'Texto da recomendação',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function trunc(str, max = 80) {
  if (!str) return '';
  const s = String(str).trim();
  return s.length > max ? s.slice(0, max) + '…' : s;
}

function fmtVal(v) {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não';
  if (Array.isArray(v)) return v.join(', ') || '—';
  const s = String(v).trim();
  if (!s) return '—';
  return STATUS_PT[s] ?? s;
}

function isNoise(field, tableName) {
  if (GLOBAL_NOISE.has(field)) return true;
  return TABLE_NOISE[tableName]?.has(field) ?? false;
}

/**
 * Calcula quais campos mudaram de forma semanticamente relevante.
 * Retorna array de { field, label, before, after }.
 */
function getMeaningfulDiffs(o, n, tableName) {
  if (!o && !n) return [];
  const source = o || n;
  const keys = new Set(Object.keys(source));
  if (n) Object.keys(n).forEach(k => keys.add(k));

  const diffs = [];
  for (const k of keys) {
    if (isNoise(k, tableName)) continue;
    const bv = o?.[k];
    const av = n?.[k];
    const bStr = JSON.stringify(bv ?? null);
    const aStr = JSON.stringify(av ?? null);
    if (bStr === aStr) continue;
    // Ignorar mudanças de vazio para vazio
    const bEmpty = bv === null || bv === undefined || bv === '';
    const aEmpty = av === null || av === undefined || av === '';
    if (bEmpty && aEmpty) continue;
    diffs.push({
      field: k,
      label: FIELD_LABELS[k] || k,
      before: fmtVal(bv),
      after:  fmtVal(av),
    });
  }
  return diffs;
}

// ─── Gerador de descrição ─────────────────────────────────────────────────────

function describeLog(log, unidades = []) {
  const { table_name: t, action: a, old_data: o, new_data: n } = log;

  const getUnidadeNome = (id) => {
    const u = unidades.find(x => x.id === id);
    if (!u) return 'Unidade';
    return u.nome_unidade || u.tipo_unidade_nome || `Unidade #${u.ordem || ''}`;
  };

  // ── Unidades ──────────────────────────────────────────────────────────────
  if (t === 'unidades_fiscalizadas') {
    const nomeNovo = n?.nome_unidade || n?.tipo_unidade_nome;
    const nomeVelho = o?.nome_unidade || o?.tipo_unidade_nome;
    const nome = nomeNovo || nomeVelho || getUnidadeNome(log.record_id);

    if (a === 'INSERT') {
      const tipo = n?.tipo_unidade_nome ? ` (${n.tipo_unidade_nome})` : '';
      return nome && nome !== 'Unidade'
        ? `Unidade "${nome}" adicionada.`
        : `Nova unidade adicionada${tipo}.`;
    }

    if (a === 'DELETE') {
      return nome && nome !== 'Unidade' ? `Unidade "${nome}" removida.` : `Unidade removida.`;
    }

    if (a === 'UPDATE') {
      const diffs = getMeaningfulDiffs(o, n, t);
      if (diffs.length === 0) return null;

      const lines = [];

      // Reordenação — exibe de forma especial
      const ordemDiff = diffs.find(d => d.field === 'ordem');
      if (ordemDiff) {
        lines.push(`Unidade "${nome}" reordenada (posição ${ordemDiff.before} → ${ordemDiff.after}).`);
      }

      // Renomeação
      const nomeDiff = diffs.find(d => d.field === 'nome_unidade');
      if (nomeDiff && nomeVelho && nomeNovo && nomeVelho !== nomeNovo) {
        lines.push(`Nome da unidade alterado de "${nomeVelho}" para "${nomeNovo}".`);
      }

      // Restante dos campos com mudança
      for (const d of diffs) {
        if (d.field === 'ordem' || d.field === 'nome_unidade') continue;
        lines.push(`Unidade "${nome}" — ${d.label}: "${trunc(d.before, 60)}" → "${trunc(d.after, 60)}".`);
      }

      return lines.length ? lines : null;
    }
  }

  // ── Respostas de checklist ────────────────────────────────────────────────
  if (t === 'respostas_checklist') {
    const diffs = getMeaningfulDiffs(o, n, t);
    if (a !== 'INSERT' && a !== 'DELETE' && diffs.length === 0) return null;

    const unitId = n?.unidade_fiscalizada_id || o?.unidade_fiscalizada_id;
    const uNome = getUnidadeNome(unitId);

    if (a === 'INSERT') {
      const resp = n?.resposta;
      const constatacao = trunc(n?.pergunta, 70);
      if (resp && constatacao) return `Resposta "${fmtVal(resp)}" registrada na unidade "${uNome}" — "${constatacao}"`;
      if (resp) return `Resposta "${fmtVal(resp)}" registrada na unidade "${uNome}".`;
      return null;
    }

    if (a === 'DELETE') {
      const constatacao = trunc(o?.pergunta, 70);
      return constatacao
        ? `Constatação de checklist removida na unidade "${uNome}": "${constatacao}".`
        : `Resposta de checklist removida na unidade "${uNome}".`;
    }

    if (a === 'UPDATE') {
      const lines = [];

      const respostaDiff = diffs.find(d => d.field === 'resposta');
      if (respostaDiff) {
        const constatacao = trunc(n?.pergunta || o?.pergunta, 60);
        lines.push(constatacao
          ? `Resposta "${respostaDiff.before}" → "${respostaDiff.after}" na unidade "${uNome}" — "${constatacao}"`
          : `Resposta alterada na unidade "${uNome}": "${respostaDiff.before}" → "${respostaDiff.after}".`
        );
      }

      for (const d of diffs) {
        if (d.field === 'resposta') continue;
        lines.push(`Checklist (unidade "${uNome}") — ${d.label}: "${trunc(d.before, 60)}" → "${trunc(d.after, 60)}".`);
      }

      return lines.length ? lines : null;
    }
  }

  // ── Constatações manuais ──────────────────────────────────────────────────
  if (t === 'constatacoes_manuais') {
    const diffs = getMeaningfulDiffs(o, n, t);
    const unitId = n?.unidade_fiscalizada_id || o?.unidade_fiscalizada_id;
    const uNome = getUnidadeNome(unitId);
    const textoNovo = trunc(n?.descricao || n?.texto, 80);
    const textoVelho = trunc(o?.descricao || o?.texto, 80);

    if (a === 'INSERT') return textoNovo ? `Constatação manual adicionada na unidade "${uNome}": "${textoNovo}".` : `Constatação manual adicionada na unidade "${uNome}".`;
    if (a === 'DELETE') return textoVelho ? `Constatação manual removida na unidade "${uNome}": "${textoVelho}".` : `Constatação manual removida na unidade "${uNome}".`;
    if (a === 'UPDATE') {
      if (diffs.length === 0) return null;
      return diffs.map(d => `Constatação (unidade "${uNome}") — ${d.label}: "${trunc(d.before, 65)}" → "${trunc(d.after, 65)}".`);
    }
  }

  // ── Determinações ─────────────────────────────────────────────────────────
  if (t === 'determinacoes') {
    const diffs = getMeaningfulDiffs(o, n, t);
    const unitId = n?.unidade_fiscalizada_id || o?.unidade_fiscalizada_id;
    const uNome = getUnidadeNome(unitId);
    const textoNovo = trunc(n?.descricao, 80);
    const textoVelho = trunc(o?.descricao, 80);

    if (a === 'INSERT') return textoNovo ? `Determinação adicionada na unidade "${uNome}": "${textoNovo}".` : `Determinação adicionada na unidade "${uNome}".`;
    if (a === 'DELETE') return textoVelho ? `Determinação removida na unidade "${uNome}": "${textoVelho}".` : `Determinação removida na unidade "${uNome}".`;
    if (a === 'UPDATE') {
      if (diffs.length === 0) return null;
      return diffs.map(d => `Determinação (unidade "${uNome}") — ${d.label}: "${trunc(d.before, 65)}" → "${trunc(d.after, 65)}".`);
    }
  }

  // ── Recomendações ─────────────────────────────────────────────────────────
  if (t === 'recomendacoes') {
    const diffs = getMeaningfulDiffs(o, n, t);
    const unitId = n?.unidade_fiscalizada_id || o?.unidade_fiscalizada_id;
    const uNome = getUnidadeNome(unitId);
    const textoNovo = trunc(n?.descricao, 80);
    const textoVelho = trunc(o?.descricao, 80);

    if (a === 'INSERT') return textoNovo ? `Recomendação adicionada na unidade "${uNome}": "${textoNovo}".` : `Recomendação adicionada na unidade "${uNome}".`;
    if (a === 'DELETE') return textoVelho ? `Recomendação removida na unidade "${uNome}": "${textoVelho}".` : `Recomendação removida na unidade "${uNome}".`;
    if (a === 'UPDATE') {
      if (diffs.length === 0) return null;
      return diffs.map(d => `Recomendação (unidade "${uNome}") — ${d.label}: "${trunc(d.before, 65)}" → "${trunc(d.after, 65)}".`);
    }
  }

  // ── Fiscalização ──────────────────────────────────────────────────────────
  if (t === 'fiscalizacoes') {
    if (a === 'INSERT') return `Fiscalização criada.`;
    if (a === 'DELETE') return `Fiscalização excluída.`;
    if (a === 'UPDATE') {
      const diffs = getMeaningfulDiffs(o, n, t);
      if (diffs.length === 0) return null;

      const lines = [];

      // Status
      const statusDiff = diffs.find(d => d.field === 'status');
      if (statusDiff) {
        if (n?.status === 'finalizada') lines.push(`Fiscalização finalizada.`);
        else if (o?.status === 'finalizada') lines.push(`Fiscalização reaberta para edição.`);
        else lines.push(`Status: ${statusDiff.before} → ${statusDiff.after}.`);
      }

      // Outros campos
      for (const d of diffs) {
        if (d.field === 'status') continue;
        lines.push(`${d.label}: "${trunc(d.before, 60)}" → "${trunc(d.after, 60)}".`);
      }

      return lines.length ? lines : null;
    }
  }

  // ── Relatórios ────────────────────────────────────────────────────────────
  if (t === 'relatorios_jobs') {
    if (a === 'INSERT') return `Relatório gerado.`;
    if (a === 'DELETE') return `Job de relatório removido.`;
    if (a === 'UPDATE') {
      const diffs = getMeaningfulDiffs(o, n, t);
      if (diffs.length === 0) return null;
      return diffs.map(d => `${d.label}: "${d.before}" → "${d.after}".`);
    }
  }

  return null;
}

// ─── Componente de item de log ────────────────────────────────────────────────

const TABLE_LABELS = {
  fiscalizacoes:         'Fiscalização',
  unidades_fiscalizadas: 'Unidade',
  respostas_checklist:   'Checklist',
  constatacoes_manuais:  'Constatação manual',
  recomendacoes:         'Recomendação',
  determinacoes:         'Determinação',
  relatorios_jobs:       'Relatório',
};

function LogItem({ log, unidades }) {
  const action = ACTION_LABELS[log.action] || { color: 'bg-gray-100 text-gray-700', icon: RefreshCw };
  const ActionIcon = action.icon;
  const tableLabel = TABLE_LABELS[log.table_name] || log.table_name;

  const raw = describeLog(log, unidades);
  if (!raw) return null;
  const lines = Array.isArray(raw) ? raw : [raw];

  return (
    <div className="py-3 border-b last:border-b-0">
      <div className="flex items-start gap-3">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${action.color}`}>
          <ActionIcon className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs text-gray-400 font-medium">{tableLabel}</span>
          <div className="mt-0.5 space-y-0.5">
            {lines.map((line, i) => (
              <p key={i} className="text-sm text-gray-800 leading-snug">{line}</p>
            ))}
          </div>
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

// ─── Componente principal ─────────────────────────────────────────────────────

export default function HistoricoFiscalizacao({ fiscalizacao }) {
  const [open, setOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', fiscalizacao.id],
    queryFn: async () => {
      // 1. Buscar todas as unidades da fiscalização
      const { data: unidades, error: uErr } = await supabase
        .from('unidades_fiscalizadas')
        .select('id, nome_unidade, tipo_unidade_nome, ordem')
        .eq('fiscalizacao_id', fiscalizacao.id);
      if (uErr) throw uErr;

      const unidadeIds = (unidades || []).map(u => u.id);

      // 2. Construir o filtro or do PostgREST
      let orFilter = '';
      if (unidadeIds.length > 0) {
        const idsStr = unidadeIds.map(id => `"${id}"`).join(',');
        orFilter = [
          `and(table_name.eq.fiscalizacoes,record_id.eq.${fiscalizacao.id})`,
          `and(table_name.eq.relatorios_jobs,new_data->>fiscalizacao_id.eq.${fiscalizacao.id})`,
          `and(table_name.eq.relatorios_jobs,old_data->>fiscalizacao_id.eq.${fiscalizacao.id})`,
          `and(table_name.eq.unidades_fiscalizadas,record_id.in.(${idsStr}))`,
          `new_data->>unidade_fiscalizada_id.in.(${idsStr})`,
          `old_data->>unidade_fiscalizada_id.in.(${idsStr})`
        ].join(',');
      } else {
        orFilter = [
          `and(table_name.eq.fiscalizacoes,record_id.eq.${fiscalizacao.id})`,
          `and(table_name.eq.relatorios_jobs,new_data->>fiscalizacao_id.eq.${fiscalizacao.id})`,
          `and(table_name.eq.relatorios_jobs,old_data->>fiscalizacao_id.eq.${fiscalizacao.id})`
        ].join(',');
      }

      // 3. Buscar logs de auditoria correspondentes
      const { data: logs, error: lErr } = await supabase
        .from('audit_logs')
        .select('*')
        .or(orFilter)
        .order('created_at', { ascending: false })
        .limit(300);

      if (lErr) throw lErr;

      return {
        logs: logs || [],
        unidades: unidades || [],
      };
    },
    enabled: open,
    staleTime: 30000,
  });

  const logs = data?.logs || [];
  const unidades = data?.unidades || [];

  const logsVisiveis = logs.filter(l => describeLog(l, unidades) !== null);

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
            ) : logsVisiveis.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhuma alteração registrada ainda.</p>
                <p className="text-xs mt-1 opacity-60">As alterações aparecem aqui após a aplicação do sistema de auditoria.</p>
              </div>
            ) : (
              <div>
                {logsVisiveis.map(log => <LogItem key={log.id} log={log} unidades={unidades} />)}
              </div>
            )}
          </div>

          <div className="flex-shrink-0 pt-3 border-t flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {logsVisiveis.length > 0 ? `${logsVisiveis.length} evento${logsVisiveis.length !== 1 ? 's' : ''}` : ''}
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
