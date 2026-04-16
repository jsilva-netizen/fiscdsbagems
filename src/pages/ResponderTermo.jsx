import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Repository } from '@/lib/offline/repository';
import { supabase } from '@/lib/supabase';
import { jsPDF } from 'jspdf';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import OptimizedImage from '@/components/fiscalizacao/OptimizedImage.jsx';
import { ArrowLeft, UploadCloud, CheckCircle, AlertCircle, Download, Image as ImageIcon } from 'lucide-react';

export default function ResponderTermo() {
  const [searchParams] = useSearchParams();
  const termoId = searchParams.get('termo');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [forms, setForms] = useState({});
  const [enviandoTN, setEnviandoTN] = useState(false);
  const [uploadingTnPrestador, setUploadingTnPrestador] = useState(false);
  const [enviandoTermoEnvio, setEnviandoTermoEnvio] = useState(false);
  const [evidenciasOpen, setEvidenciasOpen] = useState(false);
  const [signedFotosByKey, setSignedFotosByKey] = useState({});
  const [salvandoDetId, setSalvandoDetId] = useState(null);
  const tnPrestadorFileInputRef = useRef(null);

  const openArquivo = async (arq) => {
    try {
      const signed = await Repository.getSignedUrlFromAny(arq);
      if (signed) window.open(signed, '_blank');
    } catch (err) {
      alert('Erro ao abrir arquivo: ' + (err?.message || String(err)));
    }
  };

  const evidenciaKey = (ev) => {
    if (!ev) return '';
    if (typeof ev === 'string') {
      const parsed = Repository.parseStorageUrl(ev);
      if (parsed?.bucket && parsed?.path) return `${parsed.bucket}:${parsed.path}`;
      return ev;
    }
    if (ev?.bucket && ev?.path) return `${ev.bucket}:${ev.path}`;
    if (typeof ev?.url === 'string' && ev.url) {
      const parsed = Repository.parseStorageUrl(ev.url);
      if (parsed?.bucket && parsed?.path) return `${parsed.bucket}:${parsed.path}`;
      return ev.url;
    }
    return JSON.stringify(ev);
  };

  const dedupeEvidencias = (list) => {
    const arr = Array.isArray(list) ? list : [];
    const seen = new Set();
    const out = [];
    for (const ev of arr) {
      const k = evidenciaKey(ev);
      if (!k || seen.has(k)) continue;
      seen.add(k);
      out.push(ev);
    }
    return out;
  };

  const isoToday = () => new Date().toISOString().slice(0, 10);

  const addDaysToIsoDate = (dateStr, days) => {
    if (!dateStr) return null;
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + (parseInt(days || 0, 10) || 0));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  const formatRfp = (t) => {
    const raw = t?.numero_rfp || t?.numero_rfp_agems;
    if (!raw) return 'N/A';
    const str = String(raw).trim();
    if (/^RFP\//i.test(str) && str.includes('/')) return str;
    const camara = t?.camara_tecnica ? String(t.camara_tecnica).trim() : '';
    const anoBase = t?.data_geracao || t?.created_at || t?.updated_at || Date.now();
    const ano = new Date(anoBase).getFullYear();
    const num = String(parseInt(str.replace(/\D/g, '') || '0', 10)).padStart(3, '0');
    if (!camara) return str;
    return `RFP/DSB/${camara}/${num}/${ano}`;
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

  const { data: respostasChecklist = [] } = useQuery({
    queryKey: ['respostas-checklist-unidades', unidadeIds.join(',')],
    queryFn: async () => {
      if (unidadeIds.length === 0) return [];
      const { data, error } = await supabase
        .from('respostas_checklist')
        .select('id, unidade_fiscalizada_id, resposta, numero_constatacao, created_at, pergunta, observacao')
        .in('unidade_fiscalizada_id', unidadeIds);
      if (error) throw error;
      return data || [];
    },
    enabled: unidadeIds.length > 0,
  });

  const { data: constatacoesManuais = [] } = useQuery({
    queryKey: ['constatacoes-manuais-unidades', unidadeIds.join(',')],
    queryFn: async () => {
      if (unidadeIds.length === 0) return [];
      const { data, error } = await supabase
        .from('constatacoes_manuais')
        .select('id, unidade_fiscalizada_id, numero_constatacao, created_at, descricao')
        .in('unidade_fiscalizada_id', unidadeIds);
      if (error) throw error;
      return data || [];
    },
    enabled: unidadeIds.length > 0,
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
      const arquivosResposta = Array.isArray(termo?.arquivos_resposta) ? termo.arquivos_resposta : []
      setForms((prev) => {
        const next = { ...(prev || {}) };
        for (const det of determinacoes) {
          const resp = respostas.find((r) => r.determinacao_id === det.id);
          const fallbackEv = arquivosResposta.filter(
            (a) => a?.categoria === 'evidencia_determinacao' && a?.determinacao_id === det.id
          );
          const evidenciasResp = Array.isArray(resp?.evidencias) ? resp.evidencias : [];
          const cur = next[det.id] || {};

          const textoCur = String(cur?.manifestacao_prestador || '');
          const textoResp = String(resp?.manifestacao_prestador || '');
          const manifestacao_prestador = textoCur.trim() ? textoCur : (textoResp || '');

          const evidencias = dedupeEvidencias([...(cur?.evidencias || []), ...evidenciasResp, ...fallbackEv].filter(Boolean));

          next[det.id] = {
            ...cur,
            manifestacao_prestador,
            evidencias,
            status: resp?.status || cur?.status || '',
          };
        }
        return next;
      });
    }
  }, [determinacoes, respostas, termo]);

  const salvarDraftMutation = useMutation({
    mutationFn: async ({ detId }) => {
      const det = determinacoes.find((d) => d.id === detId);
      const resp = respostas.find((r) => r.determinacao_id === detId);
      const evidenciasDedup = dedupeEvidencias(forms[detId]?.evidencias || []);
      const payload = {
        determinacao_id: detId,
        unidade_fiscalizada_id: det?.unidade_fiscalizada_id,
        fiscalizacao_id: termo.fiscalizacao_id,
        prestador_servico_id: termo.prestador_servico_id,
        manifestacao_prestador: forms[detId]?.manifestacao_prestador || '',
        evidencias: evidenciasDedup,
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
    onError: (err) => {
      alert('Erro ao salvar rascunho: ' + (err?.message || String(err)));
    },
  });

  const enviarRespostaMutation = useMutation({
    mutationFn: async ({ detId }) => {
      const det = determinacoes.find((d) => d.id === detId);
      const resp = respostas.find((r) => r.determinacao_id === detId);
      const hoje = new Date().toISOString();
      const dentroPrazo =
        termo?.data_maxima_resposta ? new Date(hoje) <= new Date(termo.data_maxima_resposta) : true;
      const evidenciasDedup = dedupeEvidencias(forms[detId]?.evidencias || []);
      const payload = {
        determinacao_id: detId,
        unidade_fiscalizada_id: det?.unidade_fiscalizada_id,
        fiscalizacao_id: termo.fiscalizacao_id,
        prestador_servico_id: termo.prestador_servico_id,
        manifestacao_prestador: forms[detId]?.manifestacao_prestador || '',
        evidencias: evidenciasDedup,
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
    }
  });

  const enviarTNMutation = useMutation({
    mutationFn: async () => {
      // Subir todas as respostas em rascunho para 'aguardando_analise'
      for (const det of determinacoes) {
        const resp = respostas.find((r) => r.determinacao_id === det.id);
        const form = forms[det.id] || {};
        const precisaEnviar =
          !resp || resp.status === 'rascunho' || resp.status === '' || resp.status === null;
        const hasConteudo = !!String(form?.manifestacao_prestador || '').trim() || (Array.isArray(form?.evidencias) && form.evidencias.length > 0);
        if (precisaEnviar && hasConteudo) await enviarRespostaMutation.mutateAsync({ detId: det.id });
      }
      // Finalizar TN
      await Repository.finalizeTNResponses(termo.id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['termo', termoId] });
      await queryClient.invalidateQueries({ queryKey: ['termos-prestador'] });
      alert('Resposta ao TN enviada para análise');
      navigate(createPageUrl('PortalPrestadorHome'));
    },
    onError: (err) => {
      alert('Erro ao enviar resposta ao TN: ' + (err?.message || String(err)));
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
    try {
      for (const m of metas) {
        const persisted = { ...m, categoria: 'evidencia_determinacao', determinacao_id: detId };
        await Repository.appendArquivoRespostaTermoOnline(termoId, persisted);
      }
      await queryClient.invalidateQueries({ queryKey: ['termo', termoId] });
    } catch {}
    setForms((prev) => {
      const cur = prev[detId] || {};
      return {
        ...prev,
        [detId]: {
          ...cur,
          evidencias: dedupeEvidencias([...(cur.evidencias || []), ...metas]),
        },
      };
    });
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

  const mapeamentoByUnidadeId = useMemo(() => {
    const unidades = Array.isArray(unidadesFiscalizadas) ? [...unidadesFiscalizadas] : [];
    unidades.sort((a, b) => {
      const ca = a?.created_at || '';
      const cb = b?.created_at || '';
      if (ca !== cb) return String(ca).localeCompare(String(cb));
      return String(a?.id || '').localeCompare(String(b?.id || ''));
    });

    const contadores = { constatacoes: 0, ncs: 0 };
    const out = {};

    const parseNumeroConstatacao = (valor) => {
      const n = parseInt(String(valor || '').replace(/[^\d]/g, ''), 10);
      return Number.isFinite(n) ? n : 9999;
    };

    for (const u of unidades) {
      const unidadeId = u?.id;
      if (!unidadeId) continue;

      const respostasU = (respostasChecklist || []).filter((r) => r?.unidade_fiscalizada_id === unidadeId);
      const manuaisU = (constatacoesManuais || []).filter((m) => m?.unidade_fiscalizada_id === unidadeId);
      const ncsU = (ncs || []).filter((n) => n?.unidade_fiscalizada_id === unidadeId);
      const detsU = (determinacoes || []).filter((d) => d?.unidade_fiscalizada_id === unidadeId);

      const mapeamentoUnidade = { constatacoes: {}, ncs: {}, determinacoes: {} };

      const constItensOrdenados = [
        ...respostasU
          .filter((r) => r?.resposta === 'SIM' || r?.resposta === 'NAO')
          .map((r) => ({ id: r.id, numero_constatacao: r.numero_constatacao, created_at: r.created_at })),
        ...manuaisU.map((m) => ({ id: m.id, numero_constatacao: m.numero_constatacao, created_at: m.created_at }))
      ].sort((a, b) => {
        const numA = parseNumeroConstatacao(a.numero_constatacao);
        const numB = parseNumeroConstatacao(b.numero_constatacao);
        if (numA !== numB) return numA - numB;
        const createdA = a.created_at || '';
        const createdB = b.created_at || '';
        if (createdA !== createdB) return String(createdA).localeCompare(String(createdB));
        return String(a.id).localeCompare(String(b.id));
      });

      constItensOrdenados.forEach((c) => {
        contadores.constatacoes++;
        mapeamentoUnidade.constatacoes[c.id] = contadores.constatacoes;
      });

      const ncsOrd = [...ncsU].sort((a, b) => {
        const respA = respostasU.find((r) => r.id === a.resposta_checklist_id);
        const respB = respostasU.find((r) => r.id === b.resposta_checklist_id);
        const manualA = manuaisU.find(
          (cm) => !a.resposta_checklist_id && a.descricao && cm?.numero_constatacao && a.descricao.includes(cm.numero_constatacao)
        );
        const manualB = manuaisU.find(
          (cm) => !b.resposta_checklist_id && b.descricao && cm?.numero_constatacao && b.descricao.includes(cm.numero_constatacao)
        );
        const ordConstA = respA
          ? mapeamentoUnidade.constatacoes[respA.id]
          : manualA
            ? mapeamentoUnidade.constatacoes[manualA.id]
            : 9999;
        const ordConstB = respB
          ? mapeamentoUnidade.constatacoes[respB.id]
          : manualB
            ? mapeamentoUnidade.constatacoes[manualB.id]
            : 9999;
        return (ordConstA ?? 9999) - (ordConstB ?? 9999);
      });

      ncsOrd.forEach((nc) => {
        contadores.ncs++;
        mapeamentoUnidade.ncs[nc.id] = contadores.ncs;
      });

      const detsOrd = [...detsU].sort((a, b) => {
        const ordNcA = mapeamentoUnidade.ncs[a.nao_conformidade_id] ?? 9999;
        const ordNcB = mapeamentoUnidade.ncs[b.nao_conformidade_id] ?? 9999;
        if (ordNcA !== ordNcB) return ordNcA - ordNcB;
        const numA = parseInt(String(a.numero_determinacao || '').replace(/[^\d]/g, '') || '999', 10);
        const numB = parseInt(String(b.numero_determinacao || '').replace(/[^\d]/g, '') || '999', 10);
        return numA - numB;
      });

      detsOrd.forEach((det) => {
        const numNcRelacionado = mapeamentoUnidade.ncs[det.nao_conformidade_id];
        const fallback = parseInt(String(det.numero_determinacao || '').replace(/[^\d]/g, '') || '999', 10);
        mapeamentoUnidade.determinacoes[det.id] = numNcRelacionado ?? fallback;
      });

      out[unidadeId] = mapeamentoUnidade;
    }

    return out;
  }, [unidadesFiscalizadas, respostasChecklist, constatacoesManuais, ncs, determinacoes]);

  const determinacoesSorted = useMemo(() => {
    const unidades = Array.isArray(unidadesFiscalizadas) ? unidadesFiscalizadas : [];
    const unidadeIndex = unidades.reduce((acc, u, idx) => {
      if (u?.id) acc[u.id] = idx;
      return acc;
    }, {});

    const list = Array.isArray(determinacoes) ? [...determinacoes] : [];
    list.sort((a, b) => {
      const idxA = unidadeIndex[a?.unidade_fiscalizada_id] ?? 9999;
      const idxB = unidadeIndex[b?.unidade_fiscalizada_id] ?? 9999;
      if (idxA !== idxB) return idxA - idxB;

      const mapA = mapeamentoByUnidadeId[a?.unidade_fiscalizada_id];
      const mapB = mapeamentoByUnidadeId[b?.unidade_fiscalizada_id];
      const ordA = mapA?.determinacoes?.[a?.id] ?? 9999;
      const ordB = mapB?.determinacoes?.[b?.id] ?? 9999;
      if (ordA !== ordB) return ordA - ordB;

      const numA = parseInt(String(a?.numero_determinacao || '').replace(/[^\d]/g, '') || '999', 10);
      const numB = parseInt(String(b?.numero_determinacao || '').replace(/[^\d]/g, '') || '999', 10);
      return numA - numB;
    });
    return list;
  }, [determinacoes, unidadesFiscalizadas, mapeamentoByUnidadeId]);

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

  const allDeterminacoesRespondidas = useMemo(() => {
    return (determinacoes || []).every((d) => {
      const f = forms[d.id] || {};
      const hasTexto = !!String(f?.manifestacao_prestador || '').trim();
      const hasEv = Array.isArray(f?.evidencias) && f.evidencias.length > 0;
      return hasTexto || hasEv;
    });
  }, [determinacoes, forms]);

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

  const assinaturaTnOk = !!termo?.arquivo_tn_prestador_url && !!termo?.assinatura_prestador_valida;

  const municipioNome = municipio?.nome || termo?.municipio_nome || termo?.municipio || 'N/A';
  const numeroRfp = formatRfp(termo);
  const prazoMaxText = termo?.data_maxima_resposta
    ? termo.data_maxima_resposta
    : termo?.prazo_resposta_dias
      ? `${termo.prazo_resposta_dias} dias (após assinatura)`
      : 'N/A';

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
                {prazoMaxText}
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
                <input
                  ref={tnPrestadorFileInputRef}
                  type="file"
                  accept=".pdf,application/pdf"
                  className="hidden"
                  disabled={uploadingTnPrestador || !termo?.arquivo_url}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadingTnPrestador(true);
                    try {
                      const up = await Repository.uploadTermoNotificacaoFile(file, termo.id, 'tn_prestador');
                      const storageRef = `storage://${up.bucket}/${up.path}`;
                      const inicio = isoToday();
                      const prazoDias = parseInt(termo?.prazo_resposta_dias || 30, 10) || 30;
                      const dataMaxima = addDaysToIsoDate(inicio, prazoDias);
                      await Repository.updateTermoNotificacaoOnline(termo.id, {
                        arquivo_tn_prestador_url: storageRef,
                        assinatura_prestador_valida: true,
                        data_assinatura_prestador: new Date().toISOString(),
                        data_protocolo: inicio,
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
                <Button
                  disabled={uploadingTnPrestador || !termo?.arquivo_url}
                  onClick={() => tnPrestadorFileInputRef.current?.click()}
                >
                  <UploadCloud className="h-4 w-4 mr-2" />
                  Enviar TN assinado (PDF)
                </Button>
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
              {determinacoesSorted.map((det) => {
                const status = getStatusResposta(det.id);
                const evidencias = forms[det.id]?.evidencias || [];
                const unidade = unidadesFiscalizadas.find((u) => u.id === det.unidade_fiscalizada_id);
                const nc = ncs.find((n) => n.id === det.nao_conformidade_id);
                const bloqueado = termo?.status === 'respondido' || status === 'aguardando_analise';

                const mapeamento = mapeamentoByUnidadeId[det.unidade_fiscalizada_id] || null;
                const novoNumDetVal = mapeamento?.determinacoes?.[det.id];
                const novoNumDet = novoNumDetVal ? `D${novoNumDetVal}` : det.numero_determinacao || 'D';

                const novoNumNcVal = nc?.id ? mapeamento?.ncs?.[nc.id] : null;
                const novoNumNC = novoNumNcVal ? `NC${novoNumNcVal}` : nc?.numero_nc || '';

                let constNumero = '';
                let constTexto = '';
                if (nc?.resposta_checklist_id) {
                  const resp = respostasChecklist.find((r) => r.id === nc.resposta_checklist_id);
                  const n = resp?.id ? mapeamento?.constatacoes?.[resp.id] : null;
                  if (n) constNumero = `C${n}`;
                  constTexto = resp?.pergunta
                    ? `${resp.pergunta}${resp.observacao ? ` Observação: ${resp.observacao}` : ''}`
                    : '';
                } else if (nc?.descricao) {
                  const manual = constatacoesManuais.find(
                    (cm) => cm?.numero_constatacao && String(nc.descricao).includes(cm.numero_constatacao)
                  );
                  const n = manual?.id ? mapeamento?.constatacoes?.[manual.id] : null;
                  if (n) constNumero = `C${n}`;
                  constTexto = manual?.descricao || '';
                }

                const descricaoNC =
                  nc && constNumero
                    ? `Constatação ${constNumero}: não cumprimento do ${nc.artigo_portaria || 'artigo'};`
                    : nc?.descricao || '';

                let textoDet = String(det?.descricao || '').trim();
                if (textoDet && novoNumNC) {
                  textoDet = textoDet.replace(/NC\d+/g, novoNumNC);
                }
                if (textoDet && !textoDet.endsWith('.')) textoDet = `${textoDet}.`;
                if (textoDet && !textoDet.includes('Prazo:') && det?.prazo_dias) {
                  textoDet = `${textoDet} Prazo: ${det.prazo_dias} dias.`;
                }

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
                            <h3 className="text-lg">
                              <span className="font-semibold">{novoNumDet}</span>
                              {textoDet ? <span className="font-bold">{` - ${textoDet}`}</span> : null}
                            </h3>
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
                                <span className="font-medium">NC:</span> {novoNumNC || 'N/A'} {descricaoNC ? `- ${descricaoNC}` : ''}
                              </div>
                            )}
                            {constNumero && (
                              <div>
                                <span className="font-medium">Constatação:</span>{' '}
                                {constNumero} {constTexto ? `- ${constTexto}` : ''}
                              </div>
                            )}
                          </div>
                          <div className="grid grid-cols-1 gap-3">
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
                                onClick={async () => {
                                  if (!isFormValid(det.id) || bloqueado) return;
                                  setSalvandoDetId(det.id);
                                  try {
                                    await salvarDraftMutation.mutateAsync({ detId: det.id });
                                  } finally {
                                    setSalvandoDetId(null);
                                  }
                                }}
                                disabled={!isFormValid(det.id) || bloqueado || salvandoDetId === det.id}
                              >
                                <UploadCloud className="h-4 w-4 mr-1" />
                                {salvandoDetId === det.id ? 'Salvando...' : 'Salvar rascunho'}
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
                  Baixe o modelo do termo de envio, assine digitalmente e envie o PDF assinado. O envio da resposta só será liberado após o envio deste arquivo.
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button variant="outline" onClick={downloadTermoEnvioModelo} type="button" disabled={!allDeterminacoesRespondidas}>
                    <Download className="h-4 w-4 mr-2" />
                    Baixar modelo
                  </Button>
                  <Input
                    type="file"
                    accept=".pdf,application/pdf"
                    disabled={enviandoTermoEnvio || !allDeterminacoesRespondidas}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (!allDeterminacoesRespondidas) {
                        alert('Preencha todas as determinações (texto e/ou evidência) para liberar o termo de envio.');
                        e.target.value = '';
                        return;
                      }
                      setEnviandoTermoEnvio(true);
                      try {
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
                  if (!allDeterminacoesRespondidas) {
                    alert('Há determinações sem manifestação ou evidência. Complete antes de enviar.');
                    return;
                  }
                  if (!window.confirm('Você está prestes a enviar a manifestação completa para análise. Deseja continuar?')) return;
                  if (!window.confirm('Confirma o envio definitivo? Esta ação não pode ser desfeita.')) return;
                  setEnviandoTN(true);
                  try {
                    await enviarTNMutation.mutateAsync();
                  } finally {
                    setEnviandoTN(false);
                  }
                }}
                disabled={enviandoTN || !termoEnvioOk || !allDeterminacoesRespondidas}
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
