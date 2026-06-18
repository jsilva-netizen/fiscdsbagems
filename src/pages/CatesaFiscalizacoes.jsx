import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Folder, MapPin, Building2, Calendar } from 'lucide-react';
import CatesaLayout from '@/components/camaras/CatesaLayout';

const STATUS_LABELS = {
  em_andamento: { label: 'Em andamento', color: 'bg-blue-100 text-blue-700' },
  finalizada:   { label: 'Finalizada',   color: 'bg-green-100 text-green-700' },
  cancelada:    { label: 'Cancelada',    color: 'bg-red-100 text-red-700' },
};

function fmt(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}

export default function CatesaFiscalizacoes() {
  const [busca, setBusca] = useState('');

  const { data: fiscalizacoes = [], isLoading } = useQuery({
    queryKey: ['catesa-fiscalizacoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('fiscalizacoes')
        .select('id, municipio_nome, prestador_servico_nome, servicos, status, data_inicio, data_fim, numero_termo, camara_tecnica_id')
        .eq('camara_tecnica_id', 'catesa')
        .order('data_inicio', { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filtradas = fiscalizacoes.filter((f) => {
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    return (
      (f.municipio_nome || '').toLowerCase().includes(q) ||
      (f.prestador_servico_nome || '').toLowerCase().includes(q) ||
      (f.numero_termo || '').toString().includes(q)
    );
  });

  return (
    <CatesaLayout>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar por município, prestador ou TV..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9 rounded-xl border-slate-200"
            />
          </div>
          <span className="text-sm text-slate-500">{filtradas.length} fiscalização(ões)</span>
        </div>

        {isLoading && (
          <p className="text-sm text-slate-400 text-center py-10">Carregando...</p>
        )}

        {!isLoading && filtradas.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <Folder className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Nenhuma fiscalização encontrada</p>
          </div>
        )}

        <div className="space-y-3">
          {filtradas.map((f) => {
            const status = STATUS_LABELS[f.status] || { label: f.status, color: 'bg-slate-100 text-slate-600' };
            return (
              <Card key={f.id} className="border border-slate-200 rounded-2xl shadow-sm hover:shadow-md transition-shadow bg-white">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {f.numero_termo && (
                          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                            TV {f.numero_termo}
                          </span>
                        )}
                        <Badge className={`rounded-full text-xs font-semibold ${status.color} border-0`}>
                          {status.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                        <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{f.prestador_servico_nome || '—'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span>{f.municipio_nome || '—'}</span>
                        {f.servicos?.length > 0 && (
                          <span className="ml-2 text-slate-400">· {f.servicos.join(', ')}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right text-xs text-slate-400 shrink-0 space-y-0.5">
                      <div className="flex items-center gap-1 justify-end">
                        <Calendar className="h-3 w-3" />
                        <span>{fmt(f.data_inicio)}</span>
                      </div>
                      {f.data_fim && <div>{fmt(f.data_fim)}</div>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </CatesaLayout>
  );
}
