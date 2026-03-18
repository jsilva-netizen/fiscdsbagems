import { useEffect, useMemo, useRef, useState } from 'react';
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
import { ArrowLeft, UploadCloud, CheckCircle, AlertCircle, Lock } from 'lucide-react';

export default function ResponderTermo() {
  const [searchParams] = useSearchParams();
  const termoId = searchParams.get('termo');
  const queryClient = useQueryClient();
  const [forms, setForms] = useState({});
  const [enviandoTN, setEnviandoTN] = useState(false);
  const [uploadingTnPrestador, setUploadingTnPrestador] = useState(false);
  const [assinaturaOpen, setAssinaturaOpen] = useState(false);
  const [assinaturaNome, setAssinaturaNome] = useState('');
  const [assinaturaSalvando, setAssinaturaSalvando] = useState(false);
  const canvasRef = useRef(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef({ x: 0, y: 0 });

  const openArquivo = async (arq) => {
    try {
      const signed = await Repository.getSignedUrlFromAny(arq);
      if (signed) window.open(signed, '_blank');
    } catch (err) {
      alert('Erro ao abrir arquivo: ' + (err?.message || String(err)));
    }
  };

  const isoToday = () => new Date().toISOString().slice(0, 10);

  const addDaysToIsoDate = (dateStr, days) => {
    if (!dateStr) return null;
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + (parseInt(days || 0, 10) || 0));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const bytesIncludes = (haystack, needle) => {
    if (!haystack || !needle || needle.length === 0) return false;
    outer: for (let i = 0; i <= haystack.length - needle.length; i++) {
      for (let j = 0; j < needle.length; j++) {
        if (haystack[i + j] !== needle[j]) continue outer;
      }
      return true;
    }
    return false;
  };

  const detectPdfDigitalSignature = async (file) => {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    const enc = (s) => new TextEncoder().encode(s);
    const hasByteRange = bytesIncludes(bytes, enc('/ByteRange')) || bytesIncludes(bytes, enc('/ByteRange['));
    const hasSigDict = bytesIncludes(bytes, enc('/Type/Sig')) || bytesIncludes(bytes, enc('/Type /Sig'));
    const hasSubFilter = bytesIncludes(bytes, enc('/SubFilter')) && (bytesIncludes(bytes, enc('adbe.pkcs7')) || bytesIncludes(bytes, enc('ETSI.CAdES')));
    return hasByteRange && (hasSigDict || hasSubFilter);
  };

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

  const unidadeIds = useMemo(() => unidadesFiscalizadas.map((u) => u.id), [unidadesFiscalizadas]);

  const { data: ncs = [] } = useQuery({
    queryKey: ['nao-conformidades', unidadeIds.join(',')],
    queryFn: async () => {
      const data = await Repository.listNaoConformidadesOnlineByUnidades(unidadeIds);
      return data || [];
    },
    enabled: unidadeIds.length > 0,
  });

  const respostaChecklistIds = useMemo(() => {
    const ids = [];
    for (const nc of ncs || []) {
      if (nc?.resposta_checklist_id) ids.push(nc.resposta_checklist_id);
    }
    return Array.from(new Set(ids));
  }, [ncs]);

  const { data: respostasChecklist = [] } = useQuery({
    queryKey: ['respostas-checklist', respostaChecklistIds.join(',')],
    queryFn: async () => {
      const data = await Repository.listRespostasChecklistOnlineByIds(respostaChecklistIds);
      return data || [];
    },
    enabled: respostaChecklistIds.length > 0,
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
      alert('Resposta ao TN enviada para análise');
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

  const podeResponder = (index) => {
    if (termo?.status === 'respondido') return false;
    if (!termo?.assinatura_prestador_valida || !termo?.arquivo_tn_prestador_url) return false;
    if (index === 0) return true;
    const detAnterior = determinacoes[index - 1];
    const statusAnterior = getStatusResposta(detAnterior.id);
    return statusAnterior === 'rascunho' || statusAnterior === 'aguardando_analise';
  };

  const isFormValid = (detId) => {
    const f = forms[detId] || {};
    return !!(f.manifestacao_prestador || (Array.isArray(f.evidencias) && f.evidencias.length > 0));
  };

  const todasRespondidas = determinacoes.every((d) => {
    const s = getStatusResposta(d.id);
    return s === 'aguardando_analise' || s === 'rascunho';
  });

  const assinaturaTnOk = !!termo?.arquivo_tn_prestador_url && !!termo?.assinatura_prestador_valida;

  const assinaturaExistente = Array.isArray(termo?.arquivos_resposta)
    ? termo.arquivos_resposta.find((a) => a?.categoria === 'assinatura')
    : null;

  const ensureCanvasReady = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#111827';
    return { canvas, ctx };
  };

  const clearAssinatura = () => {
    const res = ensureCanvasReady();
    if (!res) return;
    res.ctx.clearRect(0, 0, res.canvas.width, res.canvas.height);
  };

  const canvasHasInk = () => {
    const canvas = canvasRef.current;
    if (!canvas) return false;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] !== 0) return true;
    }
    return false;
  };

  const getPoint = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onPointerDown = (e) => {
    const res = ensureCanvasReady();
    if (!res) return;
    drawingRef.current = true;
    const p = getPoint(e);
    lastPointRef.current = p;
    res.ctx.beginPath();
    res.ctx.moveTo(p.x, p.y);
    try {
      res.canvas.setPointerCapture(e.pointerId);
    } catch {}
  };

  const onPointerMove = (e) => {
    const res = ensureCanvasReady();
    if (!res) return;
    if (!drawingRef.current) return;
    const p = getPoint(e);
    res.ctx.lineTo(p.x, p.y);
    res.ctx.stroke();
    lastPointRef.current = p;
  };

  const onPointerUp = () => {
    drawingRef.current = false;
  };

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
            <div className="mt-4 flex flex-wrap gap-2">
              {termo?.arquivo_url ? (
                <Button variant="outline" onClick={() => void openArquivo(termo.arquivo_url)}>
                  Baixar TN (AGEMS)
                </Button>
              ) : (
                <Badge variant="outline" className="text-gray-600 border-gray-300">
                  TN ainda não disponível
                </Badge>
              )}
              {termo?.arquivo_rfp_url ? (
                <Button variant="outline" onClick={() => void openArquivo(termo.arquivo_rfp_url)}>
                  Baixar RFP (AGEMS)
                </Button>
              ) : null}
              {assinaturaTnOk ? (
                <Badge className="bg-green-600 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  TN assinado (prestador)
                </Badge>
              ) : (
                <Badge className="bg-yellow-600">Aguardando assinatura do prestador</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {!assinaturaTnOk && (
          <Card className="mb-6 border-yellow-200">
            <CardHeader>
              <CardTitle>Assinar o TN</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-700 mb-3">
                Baixe o TN assinado pela AGEMS, assine digitalmente e envie o PDF assinado. O prazo começa a contar após o envio.
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="file"
                  accept=".pdf,application/pdf"
                  disabled={uploadingTnPrestador || !termo?.arquivo_url}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadingTnPrestador(true);
                    try {
                      const ok = await detectPdfDigitalSignature(file);
                      if (!ok) {
                        alert('Não foi possível detectar uma assinatura digital válida neste PDF.');
                        return;
                      }
                      const up = await Repository.uploadTermoNotificacaoFile(file, termo.id, 'tn_prestador');
                      const storageRef = `storage://${up.bucket}/${up.path}`;
                      const inicio = isoToday();
                      const prazoDias = parseInt(termo?.prazo_resposta_dias || 30, 10) || 30;
                      const dataMaxima = addDaysToIsoDate(inicio, prazoDias);
                      await Repository.updateTermoNotificacaoOnline(termo.id, {
                        arquivo_tn_prestador_url: storageRef,
                        assinatura_prestador_valida: true,
                        data_assinatura_prestador: new Date().toISOString(),
                        data_inicio_prazo: inicio,
                        data_maxima_resposta: dataMaxima,
                        status: termo?.status === 'respondido' ? 'respondido' : 'aguardando_resposta',
                        updated_at: new Date().toISOString(),
                      });
                      await queryClient.invalidateQueries({ queryKey: ['termo', termoId] });
                      await queryClient.invalidateQueries({ queryKey: ['termos-prestador'] });
                      alert('TN assinado enviado com sucesso!');
                    } catch (err) {
                      alert('Erro ao enviar TN assinado: ' + (err?.message || String(err)));
                    } finally {
                      setUploadingTnPrestador(false);
                      e.target.value = '';
                    }
                  }}
                />
                {uploadingTnPrestador ? (
                  <Badge variant="outline" className="text-gray-600 border-gray-300">
                    Enviando...
                  </Badge>
                ) : null}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {determinacoes.map((det, index) => {
            const status = getStatusResposta(det.id);
            const evidencias = forms[det.id]?.evidencias || [];
            const unidade = unidadesFiscalizadas.find((u) => u.id === det.unidade_fiscalizada_id);
            const nc = ncs.find((n) => n.id === det.nao_conformidade_id);
            const constatacao = nc?.resposta_checklist_id ? respostasChecklist.find((r) => r.id === nc.resposta_checklist_id) : null;
            const bloqueadoSequencia = !podeResponder(index);
            const bloqueadoPorEnvio = status === 'aguardando_analise';
            const bloqueadoPorAssinatura = !assinaturaTnOk;
            const bloqueado = bloqueadoSequencia || bloqueadoPorEnvio || bloqueadoPorAssinatura;
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
                      <div className="text-xs text-gray-600 space-y-1 mb-3">
                        {unidade && (
                          <div>
                            <span className="font-medium">Unidade:</span>{' '}
                            {unidade.nome_unidade || unidade.tipo_unidade_nome || unidade.codigo_unidade || unidade.id}
                          </div>
                        )}
                        {nc && (
                          <div>
                            <span className="font-medium">NC:</span> {nc.numero_nc || 'N/A'} {nc.descricao ? `- ${nc.descricao}` : ''}
                          </div>
                        )}
                        {constatacao && (
                          <div>
                            <span className="font-medium">Constatação:</span>{' '}
                            {constatacao.numero_constatacao || 'N/A'} {constatacao.pergunta ? `- ${constatacao.pergunta}` : ''}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm text-gray-600 mb-3">{det.descricao}</p>
                        {bloqueadoSequencia && (
                          <Badge variant="outline" className="text-gray-600 border-gray-300 flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            Responda a anterior
                          </Badge>
                        )}
                        {bloqueadoPorEnvio && (
                          <Badge variant="outline" className="text-yellow-700 border-yellow-200 bg-yellow-50 flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            Enviada
                          </Badge>
                        )}
                        {bloqueadoPorAssinatura && (
                          <Badge variant="outline" className="text-gray-600 border-gray-300 flex items-center gap-1">
                            <Lock className="h-3 w-3" />
                            Assine o TN
                          </Badge>
                        )}
                      </div>

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
                            disabled={bloqueado}
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
                            disabled={bloqueado}
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
                            disabled={bloqueado}
                          />
                          <Button
                            variant="outline"
                            onClick={() => salvarDraftMutation.mutate({ detId: det.id })}
                            disabled={!isFormValid(det.id) || bloqueado}
                          >
                            <UploadCloud className="h-4 w-4 mr-1" />
                            Salvar rascunho
                          </Button>
                          <Button
                            onClick={() => enviarRespostaMutation.mutate({ detId: det.id })}
                            disabled={!isFormValid(det.id) || bloqueado}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            Enviar resposta
                          </Button>
                        </div>

                        {evidencias.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {evidencias.map((ev, idx) => (
                              <Badge key={idx} variant="outline" className="cursor-pointer" onClick={() => void openArquivo(ev)}>
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
            onClick={() => setAssinaturaOpen(true)}
            disabled={!todasRespondidas || enviandoTN || !assinaturaTnOk}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {enviandoTN ? 'Enviando...' : 'Enviar resposta para análise'}
          </Button>
        </div>

        <Dialog
          open={assinaturaOpen}
          onOpenChange={(open) => {
            setAssinaturaOpen(open);
            if (open) {
              setTimeout(() => {
                clearAssinatura();
              }, 0);
            }
          }}
        >
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Assinatura digital da resposta ao TN</DialogTitle>
            </DialogHeader>

            {assinaturaExistente && (
              <div className="text-sm text-gray-700">
                Já existe uma assinatura anexada: <span className="font-medium">{assinaturaExistente?.nome}</span>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <Label>Nome do assinante</Label>
                <Input value={assinaturaNome} onChange={(e) => setAssinaturaNome(e.target.value)} placeholder="Digite o nome completo" />
              </div>

              <div>
                <Label>Assinatura</Label>
                <div className="border rounded-md bg-white p-2">
                  <canvas
                    ref={canvasRef}
                    width={700}
                    height={180}
                    className="w-full h-44 touch-none"
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerLeave={onPointerUp}
                  />
                </div>
                <div className="mt-2 flex justify-between gap-2">
                  <Button variant="outline" onClick={clearAssinatura} type="button">
                    Limpar
                  </Button>
                  <Button
                    onClick={async () => {
                      const nome = String(assinaturaNome || '').trim();
                      if (!nome) {
                        alert('Informe o nome do assinante.');
                        return;
                      }
                      if (!canvasHasInk()) {
                        alert('Faça a assinatura antes de enviar.');
                        return;
                      }
                      const canvas = canvasRef.current;
                      if (!canvas) return;
                      setAssinaturaSalvando(true);
                      setEnviandoTN(true);
                      try {
                        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
                        if (!blob) throw new Error('Não foi possível gerar a imagem da assinatura.');
                        const file = new File([blob], `assinatura_${termo.id}.png`, { type: 'image/png' });
                        const up = await Repository.uploadAssinaturaTermo(file, termo.id);
                        const meta = { ...up, categoria: 'assinatura', assinante: nome };
                        await Repository.appendArquivoRespostaTermoOnline(termo.id, meta);
                        await enviarTNMutation.mutateAsync();
                        setAssinaturaOpen(false);
                      } catch (err) {
                        alert('Erro ao enviar resposta: ' + (err?.message || String(err)));
                      } finally {
                        setAssinaturaSalvando(false);
                        setEnviandoTN(false);
                      }
                    }}
                    disabled={assinaturaSalvando}
                    className="bg-purple-600 hover:bg-purple-700"
                    type="button"
                  >
                    {assinaturaSalvando ? 'Salvando...' : 'Assinar e enviar resposta'}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
