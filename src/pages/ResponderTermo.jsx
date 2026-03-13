import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Repository } from '@/lib/offline/repository';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ArrowLeft, UploadCloud, CheckCircle, AlertCircle } from 'lucide-react';

export default function ResponderTermo() {
  const [searchParams] = useSearchParams();
  const termoId = searchParams.get('termo');
  const queryClient = useQueryClient();
  const [detalheDeterminacao, setDetalheDeterminacao] = useState(null);
  const [forms, setForms] = useState({});
  const [enviandoTN, setEnviandoTN] = useState(false);

  const { data: termo } = useQuery({
    queryKey: ['termo', termoId],
    queryFn: async () => {
      const data = await Repository.getTermoNotificacaoByIdOnline(termoId);
      return data;
    },
    enabled: !!termoId,
  });

  const { data: unidadesFiscalizadas = [] } = useQuery({
    queryKey: ['unidades-fiscalizadas-online', termo?.fiscalizacao_id],
    queryFn: async () => {
      const data = await Repository.listUnidadesFiscalizacaoOnline(termo.fiscalizacao_id);
      return data;
    },
    enabled: !!termo?.fiscalizacao_id,
  });

  const { data: determinacoes = [] } = useQuery({
    queryKey: ['determinacoes', unidadesFiscalizadas],
    queryFn: async () => {
      if (unidadesFiscalizadas.length === 0) return [];
      const unidadeIds = unidadesFiscalizadas.map((u) => u.id);
      const data = await Repository.listDeterminacoesOnlineByUnidades(unidadeIds);
      return data.sort((a, b) => {
        const numA = parseInt(a.numero_determinacao?.replace(/\D/g, '') || '0');
        const numB = parseInt(b.numero_determinacao?.replace(/\D/g, '') || '0');
        return numA - numB;
      });
    },
    enabled: unidadesFiscalizadas.length > 0,
  });

  const determinacaoIds = useMemo(() => determinacoes.map((d) => d.id), [determinacoes]);

  const { data: respostas = [] } = useQuery({
    queryKey: ['respostas-determinacao', determinacaoIds],
    queryFn: async () => {
      const data = await Repository.listRespostasDeterminacaoOnlineByDeterminacoes(determinacaoIds);
      return data || [];
    },
    enabled: determinacaoIds.length > 0,
  });

  useEffect(() => {
    if (determinacoes.length > 0) {
      const initial = {};
      for (const det of determinacoes) {
        const resp = respostas.find((r) => r.determinacao_id === det.id);
        initial[det.id] = {
          manifestacao_prestador: resp?.manifestacao_prestador || '',
          descricao_atendimento: resp?.descricao_atendimento || '',
          evidencias: Array.isArray(resp?.evidencias) ? resp.evidencias : [],
          status: resp?.status || '',
        };
      }
      setForms(initial);
    }
  }, [determinacoes, respostas]);

  const salvarDraftMutation = useMutation({
    mutationFn: async ({ detId }) => {
      const det = determinacoes.find((d) => d.id === detId);
      const resp = respostas.find((r) => r.determinacao_id === detId);
      const payload = {
        determinacao_id: detId,
        unidade_fiscalizada_id: det?.unidade_fiscalizada_id,
        fiscalizacao_id: termo.fiscalizacao_id,
        prestador_servico_id: termo.prestador_servico_id,
        manifestacao_prestador: forms[detId]?.manifestacao_prestador || '',
        descricao_atendimento: forms[detId]?.descricao_atendimento || '',
        evidencias: forms[detId]?.evidencias || [],
        status: 'rascunho',
      };
      if (resp) {
        const data = await Repository.updateRespostaDeterminacaoOnline(resp.id, payload);
        return data;
      } else {
        const data = await Repository.createRespostaDeterminacaoOnline(payload);
        return data;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['respostas-determinacao'] });
      alert('Rascunho salvo');
    },
  });

  const enviarRespostaMutation = useMutation({
    mutationFn: async ({ detId }) => {
      const det = determinacoes.find((d) => d.id === detId);
      const resp = respostas.find((r) => r.determinacao_id === detId);
      const hoje = new Date().toISOString();
      const dentroPrazo =
        termo?.data_maxima_resposta ? new Date(hoje) <= new Date(termo.data_maxima_resposta) : true;
      const payload = {
        determinacao_id: detId,
        unidade_fiscalizada_id: det?.unidade_fiscalizada_id,
        fiscalizacao_id: termo.fiscalizacao_id,
        prestador_servico_id: termo.prestador_servico_id,
        manifestacao_prestador: forms[detId]?.manifestacao_prestador || '',
        descricao_atendimento: forms[detId]?.descricao_atendimento || '',
        evidencias: forms[detId]?.evidencias || [],
        status: 'aguardando_analise',
        data_resposta: hoje,
        dentro_prazo: dentroPrazo,
      };
      if (resp) {
        const data = await Repository.updateRespostaDeterminacaoOnline(resp.id, payload);
        return data;
      } else {
        const data = await Repository.createRespostaDeterminacaoOnline(payload);
        return data;
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['respostas-determinacao'] });
      alert('Resposta enviada');
    },
  });

  const enviarTNMutation = useMutation({
    mutationFn: async () => {
      // Subir todas as respostas em rascunho para 'aguardando_analise'
      for (const det of determinacoes) {
        const resp = respostas.find((r) => r.determinacao_id === det.id);
        const form = forms[det.id] || {};
        const precisaEnviar =
          !resp || resp.status === 'rascunho' || resp.status === '' || resp.status === null;
        if (precisaEnviar) {
          await enviarRespostaMutation.mutateAsync({ detId: det.id });
        }
      }
      // Finalizar TN
      await Repository.finalizeTNResponses(termo.id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['termo', termoId] });
      alert('TN enviado para análise');
    },
  });

  const onUploadEvidencias = async (detId, files) => {
    const arr = Array.from(files || []);
    if (arr.length === 0) return;
    const metas = [];
    for (const file of arr) {
      const meta = await Repository.uploadEvidenciaDeterminacao(file, detId);
      metas.push(meta);
    }
    setForms((prev) => {
      const cur = prev[detId] || {};
      return {
        ...prev,
        [detId]: {
          ...cur,
          evidencias: [...(cur.evidencias || []), ...metas],
        },
      };
    });
  };

  if (!termoId || !termo) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600 mb-4">Carregando...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusResposta = (detId) => {
    const resp = respostas.find((r) => r.determinacao_id === detId);
    return resp?.status || '';
  };

  const isFormValid = (detId) => {
    const f = forms[detId] || {};
    return !!(f.manifestacao_prestador || (Array.isArray(f.evidencias) && f.evidencias.length > 0));
  };

  const todasRespondidas = determinacoes.every((d) => {
    const s = getStatusResposta(d.id);
    return s === 'aguardando_analise' || s === 'rascunho';
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Link to={createPageUrl('PortalPrestadorHome')}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Responder Termo de Notificação</h1>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{termo.numero_termo_notificacao || termo.numero_termo}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Câmara:</span> {termo.camara_tecnica}
              </div>
              <div>
                <span className="font-medium">Prazo máximo:</span>{' '}
                {termo.data_maxima_resposta || 'N/A'}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {determinacoes.map((det) => {
            const status = getStatusResposta(det.id);
            const evidencias = forms[det.id]?.evidencias || [];
            return (
              <Card key={det.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {status === 'aguardando_analise' ? (
                          <AlertCircle className="h-5 w-5 text-yellow-600" />
                        ) : status === 'rascunho' ? (
                          <AlertCircle className="h-5 w-5 text-gray-600" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-gray-400" />
                        )}
                        <h3 className="font-semibold text-lg">{det.numero_determinacao}</h3>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{det.descricao}</p>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Manifestação do Prestador</Label>
                          <Textarea
                            placeholder="Descreva a manifestação..."
                            value={forms[det.id]?.manifestacao_prestador || ''}
                            onChange={(e) =>
                              setForms((prev) => ({
                                ...prev,
                                [det.id]: { ...(prev[det.id] || {}), manifestacao_prestador: e.target.value },
                              }))
                            }
                            className="min-h-24"
                          />
                        </div>
                        <div>
                          <Label>Descrição do Atendimento (opcional)</Label>
                          <Textarea
                            placeholder="Descrição adicional..."
                            value={forms[det.id]?.descricao_atendimento || ''}
                            onChange={(e) =>
                              setForms((prev) => ({
                                ...prev,
                                [det.id]: { ...(prev[det.id] || {}), descricao_atendimento: e.target.value },
                              }))
                            }
                            className="min-h-24"
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <Label className="mb-2 block">Evidências</Label>
                        <div className="flex items-center gap-2 mb-2">
                          <Input
                            type="file"
                            multiple
                            accept=".pdf,image/*"
                            onChange={(e) => onUploadEvidencias(det.id, e.target.files)}
                          />
                          <Button
                            variant="outline"
                            onClick={() => salvarDraftMutation.mutate({ detId: det.id })}
                            disabled={!isFormValid(det.id)}
                          >
                            <UploadCloud className="h-4 w-4 mr-1" />
                            Salvar rascunho
                          </Button>
                          <Button
                            onClick={() => enviarRespostaMutation.mutate({ detId: det.id })}
                            disabled={!isFormValid(det.id)}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Enviar resposta
                          </Button>
                        </div>

                        {evidencias.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {evidencias.map((ev, idx) => (
                              <Badge key={idx} variant="outline" className="cursor-pointer" onClick={() => window.open(ev.url, '_blank')}>
                                {ev.nome}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            onClick={async () => {
              setEnviandoTN(true);
              try {
                await enviarTNMutation.mutateAsync();
              } finally {
                setEnviandoTN(false);
              }
            }}
            disabled={!todasRespondidas || enviandoTN}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {enviandoTN ? 'Enviando...' : 'Enviar TN para Análise'}
          </Button>
        </div>
      </div>
    </div>
  );
}
