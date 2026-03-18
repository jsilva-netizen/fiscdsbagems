import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Repository } from '@/lib/offline/repository';
import { supabase } from '@/lib/supabase';
import { jsPDF } from 'jspdf';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import OptimizedImage from '@/components/fiscalizacao/OptimizedImage.jsx';
import { ArrowLeft, UploadCloud, CheckCircle, AlertCircle, Lock, Download, Image as ImageIcon } from 'lucide-react';

export default function ResponderTermo() {
  const [searchParams] = useSearchParams();
  const termoId = searchParams.get('termo');
  const queryClient = useQueryClient();
  const [forms, setForms] = useState({});
  const [enviandoTN, setEnviandoTN] = useState(false);
  const [uploadingTnPrestador, setUploadingTnPrestador] = useState(false);
  const [enviandoTermoEnvio, setEnviandoTermoEnvio] = useState(false);
  const [evidenciasOpen, setEvidenciasOpen] = useState(false);
  const [signedFotosByKey, setSignedFotosByKey] = useState({});

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

  const validatePdfDigitalSignature = async (file) => {
    const buf = await file.arrayBuffer();
    const bytes = new Uint8Array(buf);
    const enc = (s) => new TextEncoder().encode(s);
    const hasByteRangeToken = bytesIncludes(bytes, enc('/ByteRange'));
    const hasSigDict = bytesIncludes(bytes, enc('/Type/Sig')) || bytesIncludes(bytes, enc('/Type /Sig'));
    const hasSubFilter =
      bytesIncludes(bytes, enc('/SubFilter')) &&
      (bytesIncludes(bytes, enc('adbe.pkcs7')) || bytesIncludes(bytes, enc('ETSI.CAdES')));

    if (!hasByteRangeToken || !(hasSigDict || hasSubFilter)) {
      return { valid: false, reason: 'PDF sem marcação de assinatura digital' };
    }

    let text = '';
    try {
      text = new TextDecoder('latin1').decode(bytes);
    } catch {
      text = new TextDecoder().decode(bytes);
    }

    const m = text.match(/\/ByteRange\s*\[\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*\]/);
    if (!m) return { valid: false, reason: 'ByteRange não encontrado' };
    const a = Number(m[1]);
    const b = Number(m[2]);
    const c = Number(m[3]);
    const d = Number(m[4]);
    const fileLen = bytes.length;

    if (![a, b, c, d].every(Number.isFinite)) return { valid: false, reason: 'ByteRange inválido' };
    if (a !== 0 || b <= 0 || c <= 0 || d <= 0) return { valid: false, reason: 'ByteRange inválido' };
    if (c <= b) return { valid: false, reason: 'ByteRange inválido' };
    if (c + d !== fileLen) return { valid: false, reason: 'Assinatura incompleta (ByteRange não cobre o arquivo)' };
    const gap = c - (a + b);
    if (gap <= 0) return { valid: false, reason: 'Assinatura incompleta (gap inválido)' };

    const contentsMatch = text.match(/\/Contents\s*<([0-9A-Fa-f]+)>/);
    const contentsHex = contentsMatch?.[1] || '';
    if (contentsHex.length < 512) return { valid: false, reason: 'Conteúdo de assinatura ausente' };

    const looksPkcs7 = /adbe\.pkcs7|ETSI\.CAdES/i.test(text);
    if (!looksPkcs7) return { valid: false, reason: 'SubFilter de assinatura não identificado' };

    return { valid: true, reason: '' };
  };

  const { data: termo } = useQuery({
    queryKey: ['termo', termoId],
    queryFn: async () => {
      const data = await Repository.getTermoNotificacaoByIdOnline(termoId);
      return data;
    },
    enabled: !!termoId,
  });

  const { data: municipio } = useQuery({
    queryKey: ['municipio-termo', termo?.municipio_id],
    queryFn: async () => {
      if (!termo?.municipio_id) return null;
      const { data, error } = await supabase
        .from('municipios')
        .select('id, nome')
        .eq('id', termo.municipio_id)
        .maybeSingle();
      if (error) throw error;
      return data || null;
    },
    enabled: !!termo?.municipio_id,
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

  const assinaturaTnOk = !!termo?.arquivo_tn_prestador_url && !!termo?.assinatura_prestador_valida;

  const municipioNome = municipio?.nome || termo?.municipio_nome || termo?.municipio || 'N/A';
  const numeroRfp = termo?.numero_rfp || termo?.numero_rfp_agems || 'N/A';

  const termoEnvioExistente = Array.isArray(termo?.arquivos_resposta)
    ? termo.arquivos_resposta.slice().reverse().find((a) => a?.categoria === 'termo_envio')
    : null;
  const termoEnvioOk = !!termoEnvioExistente?.assinatura_digital_valida;

  const downloadTermoEnvioModelo = () => {
    const doc = new jsPDF();
    const tn = termo.numero_termo_notificacao || termo.numero_termo || '';
    const rfp = String(numeroRfp || '');
    const prestador = termo?.prestador_servico_nome || termo?.prestador_nome || '';

    doc.setFontSize(14);
    doc.text('TERMO DE ENVIO DE RESPOSTA AO TERMO DE NOTIFICAÇÃO', 14, 18);
    doc.setFontSize(11);
    doc.text(`TN: ${tn}`, 14, 30);
    doc.text(`RFP: ${rfp}`, 14, 36);
    doc.text(`Município: ${municipioNome}`, 14, 42);
    if (prestador) doc.text(`Prestador: ${prestador}`, 14, 48);

    const lines = doc.splitTextToSize(
      'Declaro, para os devidos fins, que estou enviando a resposta ao Termo de Notificação acima identificado, contendo as manifestações e evidências referentes às determinações. Assinar digitalmente este documento e anexar o PDF assinado no sistema para liberar o envio da resposta.',
      180
    );
    doc.text(lines, 14, 62);
    doc.text('Local e data:', 14, 120);
    doc.text('Assinatura digital do responsável:', 14, 140);
    doc.save(`termo_envio_${tn || termo.id}.pdf`);
  };

  const fotoKey = (foto, unidadeId, idx) => {
    if (!foto) return `${unidadeId}:${idx}`;
    if (foto.bucket && foto.path) return `${foto.bucket}:${foto.path}`;
    const url = foto.url || foto;
    const parsed = Repository.parseStorageUrl(url);
    if (parsed) return `${parsed.bucket}:${parsed.path}`;
    return String(url || `${unidadeId}:${idx}`);
  };

  const resolveFotoUrl = (foto, unidadeId, idx) => {
    const k = fotoKey(foto, unidadeId, idx);
    return signedFotosByKey[k] || '';
  };

  const fotosPorUnidade = useMemo(() => {
    return (unidadesFiscalizadas || []).map((u) => {
      const fotos = Array.isArray(u?.fotos_unidade) ? u.fotos_unidade : [];
      return {
        unidade: u,
        fotos,
      };
    });
  }, [unidadesFiscalizadas]);

  const temEvidencias = useMemo(() => {
    for (const item of fotosPorUnidade) {
      if (Array.isArray(item?.fotos) && item.fotos.length > 0) return true;
    }
    return false;
  }, [fotosPorUnidade]);

  useEffect(() => {
    if (!evidenciasOpen) return;
    let cancelled = false;
    const run = async () => {
      const next = {};
      for (const item of fotosPorUnidade) {
        const unidadeId = item?.unidade?.id || 'unidade';
        const fotos = Array.isArray(item?.fotos) ? item.fotos : [];
        for (let i = 0; i < fotos.length; i++) {
          const foto = fotos[i];
          const k = fotoKey(foto, unidadeId, i);
          if (next[k]) continue;
          try {
            const source = typeof foto === 'string' ? foto : foto?.url ? foto : foto;
            const signed = await Repository.getSignedUrlFromAny(source);
            if (signed) next[k] = signed;
          } catch {}
        }
      }
      if (!cancelled) setSignedFotosByKey(next);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [evidenciasOpen, fotosPorUnidade]);

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
                <span className="font-medium">Município:</span> {municipioNome}
              </div>
              <div>
                <span className="font-medium">Nº RFP:</span> {numeroRfp}
              </div>
              <div>
                <span className="font-medium">Prazo máximo:</span>{' '}
                {termo.data_maxima_resposta || 'N/A'}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {termo?.arquivo_url ? (
                <Button variant="outline" onClick={() => void openArquivo(termo.arquivo_url)}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar TN (AGEMS)
                </Button>
              ) : (
                <Badge variant="outline" className="text-gray-600 border-gray-300">
                  TN ainda não disponível
                </Badge>
              )}
              {termo?.arquivo_rfp_url ? (
                <Button variant="outline" onClick={() => void openArquivo(termo.arquivo_rfp_url)}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar RFP (AGEMS)
                </Button>
              ) : null}
              {termo?.arquivo_tn_prestador_url ? (
                <Button variant="outline" onClick={() => void openArquivo(termo.arquivo_tn_prestador_url)}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar TN (prestador)
                </Button>
              ) : null}
              {temEvidencias ? (
                <Button variant="outline" onClick={() => setEvidenciasOpen(true)}>
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Ver Evidências
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
                      const sig = await validatePdfDigitalSignature(file);
                      if (!sig.valid) {
                        alert(sig.reason || 'Não foi possível validar a assinatura digital neste PDF.');
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

        {assinaturaTnOk ? (
          <>
            <div className="space-y-4">
              {determinacoes.map((det, index) => {
                const status = getStatusResposta(det.id);
                const evidencias = forms[det.id]?.evidencias || [];
                const unidade = unidadesFiscalizadas.find((u) => u.id === det.unidade_fiscalizada_id);
                const nc = ncs.find((n) => n.id === det.nao_conformidade_id);
                const constatacao = nc?.resposta_checklist_id ? respostasChecklist.find((r) => r.id === nc.resposta_checklist_id) : null;
                const bloqueadoSequencia = !podeResponder(index);
                const bloqueadoPorEnvio = status === 'aguardando_analise';
                const bloqueado = bloqueadoSequencia || bloqueadoPorEnvio;

                const lat = unidade?.latitude ?? unidade?.lat;
                const lon = unidade?.longitude ?? unidade?.lng;
                const coordsStr = unidade?.coordenadas || unidade?.coordenadas_geograficas || '';
                const coordsText =
                  coordsStr ||
                  (lat !== null && lat !== undefined && lon !== null && lon !== undefined ? `${String(lat)}, ${String(lon)}` : '');
                const hasCoords = !!coordsText;

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
                                <div>
                                  <span className="font-medium">Unidade:</span> {unidade.codigo_unidade || unidade.id}
                                </div>
                                {unidade.endereco ? (
                                  <div>
                                    <span className="font-medium">Endereço:</span> {unidade.endereco}
                                  </div>
                                ) : null}
                                {hasCoords ? (
                                  <div>
                                    <span className="font-medium">Coordenadas:</span> {coordsText}
                                  </div>
                                ) : null}
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

            <Card className="mt-6 border-yellow-200">
              <CardHeader>
                <CardTitle>Termo de Envio</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-gray-700 mb-3">
                  Baixe o modelo do termo de envio, assine digitalmente e envie o PDF assinado. O envio da resposta só será liberado após a validação da assinatura.
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" onClick={downloadTermoEnvioModelo} type="button">
                    <Download className="h-4 w-4 mr-2" />
                    Baixar modelo
                  </Button>
                  <Input
                    type="file"
                    accept=".pdf,application/pdf"
                    disabled={enviandoTermoEnvio}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setEnviandoTermoEnvio(true);
                      try {
                        const sig = await validatePdfDigitalSignature(file);
                        if (!sig.valid) {
                          alert(sig.reason || 'Não foi possível validar a assinatura digital neste PDF.');
                          return;
                        }
                        const up = await Repository.uploadTermoNotificacaoFile(file, termo.id, 'termo_envio');
                        const meta = { ...up, categoria: 'termo_envio', assinatura_digital_valida: true };
                        await Repository.appendArquivoRespostaTermoOnline(termo.id, meta);
                        await queryClient.invalidateQueries({ queryKey: ['termo', termoId] });
                        alert('Termo de envio assinado enviado com sucesso!');
                      } catch (err) {
                        alert('Erro ao enviar termo de envio: ' + (err?.message || String(err)));
                      } finally {
                        setEnviandoTermoEnvio(false);
                        e.target.value = '';
                      }
                    }}
                  />
                  {termoEnvioOk ? (
                    <Badge className="bg-green-600 flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Termo de envio assinado
                    </Badge>
                  ) : (
                    <Badge className="bg-yellow-600">Aguardando termo de envio</Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="mt-6 flex justify-end">
              <Button
                onClick={async () => {
                  if (!termoEnvioOk) {
                    alert('Envie o termo de envio assinado para liberar o envio da resposta.');
                    return;
                  }
                  const faltando = determinacoes.filter((d) => !isFormValid(d.id));
                  if (faltando.length > 0) {
                    alert('Há determinações sem manifestação ou evidência. Complete antes de enviar.');
                    return;
                  }
                  setEnviandoTN(true);
                  try {
                    await enviarTNMutation.mutateAsync();
                  } catch (err) {
                    alert('Erro ao enviar resposta ao TN: ' + (err?.message || String(err)));
                  } finally {
                    setEnviandoTN(false);
                  }
                }}
                disabled={enviandoTN || !termoEnvioOk}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {enviandoTN ? 'Enviando...' : 'Enviar resposta para análise'}
              </Button>
            </div>
          </>
        ) : null}

        <Dialog open={evidenciasOpen} onOpenChange={setEvidenciasOpen}>
          <DialogContent className="max-w-5xl">
            <DialogHeader>
              <DialogTitle>Evidências da Fiscalização</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 max-h-[70vh] overflow-auto pr-1">
              {fotosPorUnidade.map((item) => {
                const unidade = item?.unidade;
                const fotos = Array.isArray(item?.fotos) ? item.fotos : [];
                if (!unidade || fotos.length === 0) return null;
                return (
                  <div key={unidade.id} className="space-y-2">
                    <div className="text-sm font-medium">
                      {unidade.codigo_unidade || unidade.id} {unidade.endereco ? `- ${unidade.endereco}` : ''}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {fotos.map((foto, idx) => {
                        const src = resolveFotoUrl(foto, unidade.id, idx);
                        const legenda = typeof foto === 'object' && foto ? foto.legenda : '';
                        const k = fotoKey(foto, unidade.id, idx);
                        return (
                          <div key={k} className="rounded-lg overflow-hidden border bg-white">
                            {src ? (
                              <OptimizedImage
                                src={src}
                                alt={`Foto ${idx + 1}`}
                                className="w-full h-32 object-cover cursor-pointer"
                                onClick={() => window.open(src, '_blank')}
                              />
                            ) : (
                              <div className="w-full h-32 bg-gray-100 flex items-center justify-center text-xs text-gray-500">
                                Carregando...
                              </div>
                            )}
                            {legenda ? <div className="text-xs text-gray-700 p-2">{legenda}</div> : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {!temEvidencias ? <div className="text-sm text-gray-600">Nenhuma evidência encontrada.</div> : null}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
