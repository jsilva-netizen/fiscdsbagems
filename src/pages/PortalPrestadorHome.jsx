import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Repository } from '@/lib/offline/repository';
import { useAuth } from '@/lib/AuthContext';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

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

  const { data: termos = [] } = useQuery({
    queryKey: ['termos-prestador', prestadorId],
    queryFn: async () => {
      if (!prestadorId) return [];
      const list = await Repository.listTermosNotificacaoByPrestador(prestadorId);
      return list;
    },
    enabled: !!prestadorId,
  });

  const kpis = {
    total: termos.length,
    aguardando_resposta: termos.filter(t => t.status === 'aguardando_resposta').length,
    respondido: termos.filter(t => t.status === 'respondido').length,
    pendente_protocolo: termos.filter(t => t.status === 'pendente_protocolo').length,
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'aguardando_resposta':
        return <Badge className="bg-yellow-600">Aguardando Resposta</Badge>;
      case 'respondido':
        return <Badge className="bg-green-600">Respondido</Badge>;
      case 'pendente_protocolo':
        return <Badge className="bg-blue-600">Pendente Protocolo</Badge>;
      default:
        return <Badge className="bg-gray-600">{status || 'Pendente'}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Portal do Prestador</h1>
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
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-sm text-gray-600 mb-1">Pendente Protocolo</p>
              <p className="text-2xl font-bold text-blue-600">{kpis.pendente_protocolo}</p>
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
              const prazoMax = termo.data_maxima_resposta
              const daysLeft = prazoMax ? Math.ceil((new Date(prazoMax).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
              const prazoBadge = prazoMax ? (
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="h-4 w-4 mr-1" />
                  {daysLeft !== null ? `${daysLeft} dias restantes` : 'Prazo não definido'}
                </div>
              ) : null

              return (
                <Card key={termo.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-blue-600" />
                        <p className="font-semibold">{termo.numero_termo_notificacao || termo.numero_termo}</p>
                        {getStatusBadge(termo.status)}
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
                          Responder TN
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
