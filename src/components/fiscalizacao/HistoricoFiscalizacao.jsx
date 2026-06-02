import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { History, User, Clock, FileEdit, Plus, Trash2, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ACTION_LABELS = {
  INSERT: { label: 'Adição',    color: 'bg-green-100 text-green-700', icon: Plus },
  UPDATE: { label: 'Alteração', color: 'bg-blue-100 text-blue-700',   icon: FileEdit },
  DELETE: { label: 'Remoção',   color: 'bg-red-100 text-red-700',     icon: Trash2 },
};

const STATUS_PT = {
  em_andamento: 'Em andamento',
  finalizada:   'Finalizada',
  pendente:     'Pendente',
  processando:  'Processando',
  concluido:    'Concluído',
  erro:         'Erro',
};

function trunc(str, max = 80) {
  if (!str) return '';
  const s = String(str).trim();
  return s.length > max ? s.slice(0, max) + '…' : s;
}

function fmtVal(v) {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não';
  const s = String(v).trim();
  if (!s) return '—';
  if (STATUS_PT[s]) return STATUS_PT[s];
  return s;
}

// ─── Gerador de descrição legível por humanos ─────────────────────────────────

function describeLog(log) {
  const { table_name: t, action: a, old_data: o, new_data: n } = log;
  const d = n || o; // dados disponíveis

  // ── Unidades ──────────────────────────────────────────────────────────────
  if (t === 'unidades_fiscalizadas') {
    const nome = d?.nome || d?.tipo_unidade || 'Unidade sem nome';
    if (a === 'INSERT') return `Unidade "${nome}" adicionada.`;
    if (a === 'DELETE') return `Unidade "${nome}" removida.`;
    if (a === 'UPDATE') {
      const lines = [];
      // Reordenação
      if (o?.ordem !== undefined && n?.ordem !== undefined && o.ordem !== n.ordem) {
        lines.push(`Unidade "${n?.nome || nome}" reordenada (posição ${o.ordem} → ${n.ordem}).`);
      }
      // Renomeação
      if (o?.nome && n?.nome && o.nome !== n.nome) {
        lines.push(`Nome alterado de "${o.nome}" para "${n.nome}".`);
      }
      // Código
      if (o?.codigo !== n?.codigo && (o?.codigo || n?.codigo)) {
        lines.push(`Código alterado de "${fmtVal(o?.codigo)}" para "${fmtVal(n?.codigo)}".`);
      }
      // Endereço
      if (o?.endereco !== n?.endereco && (o?.endereco || n?.endereco)) {
        lines.push(`Endereço alterado de "${fmtVal(o?.endereco)}" para "${fmtVal(n?.endereco)}".`);
      }
      // Status
      if (o?.status !== n?.status) {
        lines.push(`Status alterado: ${fmtVal(o?.status)} → ${fmtVal(n?.status)}.`);
      }
      return lines.length ? lines : [`Unidade "${nome}" atualizada.`];
    }
  }

  // ── Respostas de checklist ────────────────────────────────────────────────
  if (t === 'respostas_checklist') {
    const pergunta = trunc(n?.pergunta || o?.pergunta || 'item do checklist', 70);
    if (a === 'INSERT') {
      const resp = n?.resposta;
      if (resp) return `Resposta "${fmtVal(resp)}" registrada para: ${pergunta}`;
      return `Resposta adicionada ao checklist.`;
    }
    if (a === 'DELETE') return `Resposta do checklist removida: ${pergunta}`;
    if (a === 'UPDATE') {
      const lines = [];
      if (o?.resposta !== n?.resposta) {
        lines.push(`Resposta alterada de "${fmtVal(o?.resposta)}" para "${fmtVal(n?.resposta)}" — ${pergunta}`);
      }
      if (o?.observacao !== n?.observacao) {
        lines.push(`Observação alterada: "${trunc(o?.observacao)}" → "${trunc(n?.observacao)}"`);
      }
      if (o?.pergunta !== n?.pergunta && n?.pergunta) {
        lines.push(`Texto da constatação alterado: "${trunc(o?.pergunta)}" → "${trunc(n?.pergunta)}"`);
      }
      if (o?.numero_constatacao !== n?.numero_constatacao) {
        lines.push(`Nº constatação: ${fmtVal(o?.numero_constatacao)} → ${fmtVal(n?.numero_constatacao)}`);
      }
      return lines.length ? lines : [`Resposta de checklist atualizada.`];
    }
  }

  // ── Constatações manuais ──────────────────────────────────────────────────
  if (t === 'constatacoes_manuais') {
    const texto = trunc(d?.descricao || d?.texto, 80);
    if (a === 'INSERT') return `Constatação manual adicionada: "${texto}"`;
    if (a === 'DELETE') return `Constatação manual removida: "${texto}"`;
    if (a === 'UPDATE') {
      const lines = [];
      if (o?.descricao !== n?.descricao) {
        lines.push(`Texto alterado de "${trunc(o?.descricao)}" para "${trunc(n?.descricao)}".`);
      }
      if (o?.numero_constatacao !== n?.numero_constatacao) {
        lines.push(`Nº constatação: ${fmtVal(o?.numero_constatacao)} → ${fmtVal(n?.numero_constatacao)}.`);
      }
      return lines.length ? lines : [`Constatação manual atualizada.`];
    }
  }

  // ── Determinações ─────────────────────────────────────────────────────────
  if (t === 'determinacoes') {
    const texto = trunc(d?.descricao, 80);
    if (a === 'INSERT') return `Determinação adicionada: "${texto}"`;
    if (a === 'DELETE') return `Determinação removida: "${texto}"`;
    if (a === 'UPDATE') {
      const lines = [];
      if (o?.descricao !== n?.descricao) {
        lines.push(`Texto alterado de "${trunc(o?.descricao)}" para "${trunc(n?.descricao)}".`);
      }
      if (o?.prazo_dias !== n?.prazo_dias) {
        lines.push(`Prazo alterado: ${fmtVal(o?.prazo_dias)} → ${fmtVal(n?.prazo_dias)} dias.`);
      }
      if (o?.numero_determinacao !== n?.numero_determinacao) {
        lines.push(`Nº determinação: ${fmtVal(o?.numero_determinacao)} → ${fmtVal(n?.numero_determinacao)}.`);
      }
      return lines.length ? lines : [`Determinação atualizada.`];
    }
  }

  // ── Recomendações ─────────────────────────────────────────────────────────
  if (t === 'recomendacoes') {
    const texto = trunc(d?.descricao, 80);
    if (a === 'INSERT') return `Recomendação adicionada: "${texto}"`;
    if (a === 'DELETE') return `Recomendação removida: "${texto}"`;
    if (a === 'UPDATE') {
      const lines = [];
      if (o?.descricao !== n?.descricao) {
        lines.push(`Texto alterado de "${trunc(o?.descricao)}" para "${trunc(n?.descricao)}".`);
      }
      if (o?.numero_recomendacao !== n?.numero_recomendacao) {
        lines.push(`Nº recomendação: ${fmtVal(o?.numero_recomendacao)} → ${fmtVal(n?.numero_recomendacao)}.`);
      }
      return lines.length ? lines : [`Recomendação atualizada.`];
    }
  }

  // ── Fiscalização (tabela pai) ─────────────────────────────────────────────
  if (t === 'fiscalizacoes') {
    if (a === 'INSERT') return `Fiscalização criada.`;
    if (a === 'DELETE') return `Fiscalização excluída.`;
    if (a === 'UPDATE') {
      const lines = [];
      if (o?.status !== n?.status) {
        lines.push(`Status alterado: ${fmtVal(o?.status)} → ${fmtVal(n?.status)}.`);
      }
      if (o?.fiscal_nome !== n?.fiscal_nome) {
        lines.push(`Fiscal alterado de "${fmtVal(o?.fiscal_nome)}" para "${fmtVal(n?.fiscal_nome)}".`);
      }
      if (o?.numero_termo !== n?.numero_termo) {
        lines.push(`Número do termo alterado: "${fmtVal(o?.numero_termo)}" → "${fmtVal(n?.numero_termo)}".`);
      }
      if (o?.data_inicio !== n?.data_inicio) {
        lines.push(`Data de início alterada.`);
      }
      if (o?.data_fim !== n?.data_fim) {
        lines.push(n?.data_fim ? `Fiscalização encerrada.` : `Data de encerramento removida.`);
      }
      return lines.length ? lines : [`Fiscalização atualizada.`];
    }
  }

  // ── Relatórios ────────────────────────────────────────────────────────────
  if (t === 'relatorios_jobs') {
    if (a === 'INSERT') return `Relatório gerado.`;
    if (a === 'DELETE') return `Job de relatório removido.`;
    if (a === 'UPDATE') {
      if (o?.status !== n?.status) return `Status do relatório: ${fmtVal(o?.status)} → ${fmtVal(n?.status)}.`;
      return `Relatório atualizado.`;
    }
  }

  // Fallback
  const fallback = {
    INSERT: 'Registro criado.',
    UPDATE: 'Registro atualizado.',
    DELETE: 'Registro removido.',
  };
  return fallback[a] || 'Evento registrado.';
}

// ─── Componente de item de log ────────────────────────────────────────────────

function LogItem({ log }) {
  const [expanded, setExpanded] = useState(false);
  const action = ACTION_LABELS[log.action] || { label: log.action, color: 'bg-gray-100 text-gray-700', icon: RefreshCw };
  const ActionIcon = action.icon;

  const tableLabels = {
    fiscalizacoes:        'Fiscalização',
    unidades_fiscalizadas:'Unidade',
    respostas_checklist:  'Checklist',
    constatacoes_manuais: 'Constatação manual',
    recomendacoes:        'Recomendação',
    determinacoes:        'Determinação',
    relatorios_jobs:      'Relatório',
  };
  const tableLabel = tableLabels[log.table_name] || log.table_name;

  const raw = describeLog(log);
  // describeLog pode retornar string ou array de strings
  const lines = Array.isArray(raw) ? raw : [raw];

  return (
    <div className="py-3 border-b last:border-b-0">
      <div className="flex items-start gap-3">
        {/* Ícone da ação */}
        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${action.color}`}>
          <ActionIcon className="h-3.5 w-3.5" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Badge de contexto */}
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs text-gray-400">{tableLabel}</span>
          </div>

          {/* Descrição em linguagem natural */}
          <div className="space-y-0.5">
            {lines.map((line, i) => (
              <p key={i} className="text-sm text-gray-800 leading-snug">{line}</p>
            ))}
          </div>

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

// ─── Componente principal ─────────────────────────────────────────────────────

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
        .limit(400);
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
                <p className="text-xs mt-1 opacity-60">As alterações aparecem aqui após a aplicação do sistema de auditoria.</p>
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
