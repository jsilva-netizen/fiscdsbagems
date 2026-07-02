import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, FileText, MapPin, Building2, Calendar, Clock } from 'lucide-react';
import CatersLayout from '@/components/caters/CatersLayout';

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}

function diasRestantes(dataMax) {
  if (!dataMax) return null;
  const diff = Math.ceil((new Date(dataMax) - new Date()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function CatersTermos() {
  const [busca, setBusca] = useState('');

  const { data: termos = [], isLoading } = useQuery({
    queryKey: ['caters-termos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('termos_notificacao')
        .select(`
          id, numero_termo_notificacao, numero_rfp,
          data_protocolo, data_maxima_resposta, prazo_resposta_dias,
          data_recebimento_resposta, recebida_no_prazo, data_geracao,
          fiscalizacoes!inner(municipio_nome, prestador_servico_nome, camara_tecnica_id)
        `)
        .eq('fiscalizacoes.camara_tecnica_id', 'caters')
        .order('data_geracao', { ascending: false });
      if (error) throw error;
      return (data || []).map((t) => ({
        ...t,
        municipio_nome: t.fiscalizacoes?.municipio_nome || '—',
        prestador_nome: t.fiscalizacoes?.prestador_servico_nome || '—',
      }));
    },
  });

  const filtrados = termos.filter((t) => {
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    return (
      (t.municipio_nome || '').toLowerCase().includes(q) ||
      (t.prestador_nome || '').toLowerCase().includes(q) ||
      (t.numero_rfp || '').toLowerCase().includes(q) ||
      (t.numero_termo_notificacao || '').toLowerCase().includes(q)
    );
  });

  return (
    <CatersLayout>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por município, prestador ou TN..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9 rounded-xl border-slate-200"
            />
          </div>
          <span className="text-sm text-slate-500">{filtrados.length} termo(s)</span>
        </div>

        {isLoading && (
          <p className="text-sm text-slate-400 text-center py-10">Carregando...</p>
        )}

        {!isLoading && filtrados.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Nenhum termo encontrado</p>
          </div>
        )}

        <div className="space-y-3">
          {filtrados.map((t) => {
            const dias = diasRestantes(t.data_maxima_resposta);
            const respondido = !!t.data_recebimento_resposta;
            const vencido = !respondido && dias !== null && dias < 0;
            const urgente = !respondido && dias !== null && dias >= 0 && dias <= 7;

            return (
              <Card key={t.id} className="border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow bg-white">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {t.numero_rfp && (
                          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            {t.numero_rfp}
                          </span>
                        )}
                        {t.numero_termo_notificacao && (
                          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            TN {t.numero_termo_notificacao}
                          </span>
                        )}
                        {respondido && (
                          <Badge className="rounded-full text-xs bg-green-100 text-green-700 border-0">Respondido</Badge>
                        )}
                        {vencido && (
                          <Badge className="rounded-full text-xs bg-red-100 text-red-700 border-0">Vencido</Badge>
                        )}
                        {urgente && (
                          <Badge className="rounded-full text-xs bg-amber-100 text-amber-700 border-0">Urgente</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                        <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{t.prestador_nome}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span>{t.municipio_nome}</span>
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-400 shrink-0 space-y-1">
                      <div className="flex items-center gap-1 justify-end">
                        <Calendar className="h-3 w-3" />
                        <span>Protocolo: {fmt(t.data_protocolo)}</span>
                      </div>
                      {t.data_maxima_resposta && (
                        <div className={`flex items-center gap-1 justify-end ${vencido ? 'text-red-500' : urgente ? 'text-amber-600' : ''}`}>
                          <Clock className="h-3 w-3" />
                          <span>Prazo: {fmt(t.data_maxima_resposta)}</span>
                          {!respondido && dias !== null && (
                            <span>({dias >= 0 ? `${dias}d` : `${Math.abs(dias)}d atraso`})</span>
                          )}
                        </div>
                      )}
                      {respondido && (
                        <div className="text-green-600">
                          Resp.: {fmt(t.data_recebimento_resposta)}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </CatersLayout>
  );
}
