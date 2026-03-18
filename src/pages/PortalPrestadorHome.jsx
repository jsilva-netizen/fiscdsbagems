import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Repository } from '@/lib/offline/repository';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Clock, AlertTriangle } from 'lucide-react';

export default function PortalPrestadorHome() {
  const { user } = useAuth();
  const [prestadorId, setPrestadorId] = useState(null);

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const p = await Repository.getProfileByIdOnline(user.id);
      setPrestadorId(p?.prestador_servico_id || null);
      return p;
    },
    enabled: !!user?.id,
  });

  const { data: prestador } = useQuery({
    queryKey: ['prestador-portal', prestadorId],
    queryFn: async () => {
      if (!prestadorId) return null;
      const { data, error } = await supabase
        .from('prestadores_servico')
        .select('id, nome')
        .eq('id', prestadorId)
        .maybeSingle();
      if (error) throw error;
      return data || null;
    },
    enabled: !!prestadorId,
  });

  const { data: termos = [] } = useQuery({
    queryKey: ['termos-prestador', prestadorId],
    queryFn: async () => {
      if (!prestadorId) return [];
      const list = await Repository.listTermosNotificacaoByPrestador(prestadorId);
      return list;
    },
    enabled: !!prestadorId,
  });

  const municipioIds = Array.from(new Set(termos.map(t => t?.municipio_id).filter(Boolean))).sort();
  const fiscalizacaoIds = Array.from(new Set(termos.map(t => t?.fiscalizacao_id).filter(Boolean))).sort();

  const { data: municipios = [] } = useQuery({
    queryKey: ['municipios-portal', municipioIds.join(',')],
    queryFn: async () => {
      if (municipioIds.length === 0) return [];
      const { data, error } = await supabase
        .from('municipios')
        .select('id, nome')
        .in('id', municipioIds);
      if (error) throw error;
      return data || [];
    },
    enabled: municipioIds.length > 0,
  });

  const { data: unidades = [] } = useQuery({
    queryKey: ['unidades-portal', fiscalizacaoIds.join(',')],
    queryFn: async () => {
      if (fiscalizacaoIds.length === 0) return [];
      const { data, error } = await supabase
        .from('unidades_fiscalizadas')
        .select('id, fiscalizacao_id')
        .in('fiscalizacao_id', fiscalizacaoIds);
      if (error) throw error;
      return data || [];
    },
    enabled: fiscalizacaoIds.length > 0,
  });

  const unidadeIds = Array.from(new Set(unidades.map(u => u?.id).filter(Boolean))).sort();

  const { data: determinacoes = [] } = useQuery({
    queryKey: ['determinacoes-portal', unidadeIds.join(',')],
    queryFn: async () => {
      if (unidadeIds.length === 0) return [];
      const { data, error } = await supabase
        .from('determinacoes')
        .select('id, unidade_fiscalizada_id')
        .in('unidade_fiscalizada_id', unidadeIds);
      if (error) throw error;
      return data || [];
    },
    enabled: unidadeIds.length > 0,
  });

  const municipioNomeById = municipios.reduce((acc, m) => {
    acc[m.id] = m.nome;
    return acc;
  }, {});

  const fiscalizacaoByUnidadeId = unidades.reduce((acc, u) => {
    acc[u.id] = u.fiscalizacao_id;
    return acc;
  }, {});

  const determinacoesCountByFiscalizacaoId = determinacoes.reduce((acc, d) => {
    const fiscId = fiscalizacaoByUnidadeId[d.unidade_fiscalizada_id];
    if (fiscId) acc[fiscId] = (acc[fiscId] || 0) + 1;
    return acc;
  }, {});

  const getEffectiveStatus = (termo) => {
    if (!termo?.arquivo_url) return termo?.status || 'pendente_tn';
    if (!termo?.arquivo_tn_prestador_url) return 'aguardando_assinatura_prestador';
    if (termo?.status === 'respondido') return 'respondido';
    if (termo?.data_maxima_resposta && new Date() > new Date(termo.data_maxima_resposta)) return 'prazo_vencido';
    return termo?.status || 'aguardando_resposta';
  };

  const kpis = {
    total: termos.length,
    aguardando_assinatura: termos.filter(t => getEffectiveStatus(t) === 'aguardando_assinatura_prestador').length,
    aguardando_resposta: termos.filter(t => getEffectiveStatus(t) === 'aguardando_resposta' || getEffectiveStatus(t) === 'prazo_vencido').length,
    respondido: termos.filter(t => getEffectiveStatus(t) === 'respondido').length,
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'aguardando_assinatura_prestador':
        return <Badge className="bg-orange-600">Aguardando Assinatura</Badge>;
      case 'aguardando_resposta':
        return <Badge className="bg-yellow-600">Aguardando Resposta</Badge>;
      case 'prazo_vencido':
        return <Badge className="bg-red-600">Prazo Vencido</Badge>;
      case 'respondido':
        return <Badge className="bg-green-600">Respondido</Badge>;
      default:
        return <Badge className="bg-gray-600">{status || 'Pendente'}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex flex-col">
            <h1 className="text-3xl font-bold">Portal do Prestador</h1>
            <p className="text-sm text-gray-600 mt-1">
              Prestador: <span className="font-medium text-gray-900">{prestador?.nome || '—'}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Total de TNs</p>
              <p className="text-2xl font-bold">{kpis.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Aguardando Assinatura</p>
              <p className="text-2xl font-bold text-orange-600">{kpis.aguardando_assinatura}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Aguardando Resposta</p>
              <p className="text-2xl font-bold text-yellow-600">{kpis.aguardando_resposta}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Respondidos</p>
              <p className="text-2xl font-bold text-green-600">{kpis.respondido}</p>
            </CardContent>
          </Card>
        </div>

        <h2 className="text-2xl font-semibold mb-4">Termos de Notificação</h2>
        <div className="space-y-3">
          {termos.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                Nenhum termo encontrado para seu perfil
              </CardContent>
            </Card>
          ) : (
            termos.map((termo) => {
              const effectiveStatus = getEffectiveStatus(termo);
              const prazoMax = termo.data_maxima_resposta
              const daysLeft = prazoMax ? Math.ceil((new Date(prazoMax).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
              const prazoBadge = prazoMax ? (
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="h-4 w-4 mr-1" />
                  {daysLeft !== null ? `${daysLeft} dias restantes` : 'Prazo não definido'}
                </div>
              ) : null

              const actionLabel =
                effectiveStatus === 'aguardando_assinatura_prestador'
                  ? 'Assinar TN'
                  : effectiveStatus === 'respondido'
                    ? 'Ver resposta'
                    : 'Responder TN';

              const municipioNome = municipioNomeById[termo?.municipio_id] || termo?.municipio_nome || '—';
              const numeroRfp = termo?.numero_rfp ? String(termo.numero_rfp) : '—';
              const determinacoesCount = termo?.fiscalizacao_id ? (determinacoesCountByFiscalizacaoId[termo.fiscalizacao_id] || 0) : 0;

              return (
                <Card key={termo.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <p className="font-semibold">{termo.numero_termo_notificacao || termo.numero_termo}</p>
                        {getStatusBadge(effectiveStatus)}
                      </div>
                      <div className="mt-1 text-sm text-gray-600">
                        <span className="font-medium">Município:</span> {municipioNome} <span className="text-gray-400">•</span>{' '}
                        <span className="font-medium">RFP:</span> {numeroRfp} <span className="text-gray-400">•</span>{' '}
                        <span className="font-medium">Determinações:</span> {determinacoesCount}
                      </div>
                      <div className="mt-1 text-sm text-gray-600 flex items-center gap-4">
                        {prazoBadge}
                        {termo.camara_tecnica && (
                          <div className="flex items-center">
                            <AlertTriangle className="h-4 w-4 mr-1 text-orange-600" />
                            {termo.camara_tecnica}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <Link to={`${createPageUrl('ResponderTermo')}?termo=${encodeURIComponent(termo.id)}`}>
                        <Button className="bg-blue-600 hover:bg-blue-700">
                          {actionLabel}
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </div>
    </div>
  );
}
