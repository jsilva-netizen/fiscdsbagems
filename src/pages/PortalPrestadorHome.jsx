import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Repository } from '@/lib/offline/repository';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { createPageUrl } from '@/utils';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FileText, Clock, AlertTriangle, LogOut, Download, UploadCloud, Send } from 'lucide-react';

export default function PortalPrestadorHome() {
  const { user, logout } = useAuth();
  const [prestadorId, setPrestadorId] = useState(null);
  const [saindo, setSaindo] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('tns');
  const [defesaForms, setDefesaForms] = useState({});
  const [uploadingRemessa, setUploadingRemessa] = useState(false);
  const [salvandoDefesaAutoId, setSalvandoDefesaAutoId] = useState(null);
  const [enviandoDefesa, setEnviandoDefesa] = useState(false);

  const openArquivo = async (arq) => {
    try {
      const signed = await Repository.getSignedUrlFromAny(arq);
      if (signed) window.open(signed, '_blank', 'noopener,noreferrer');
    } catch (err) {
      alert('Erro ao abrir arquivo: ' + (err?.message || String(err)));
    }
  };

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

  const termosPublicados = useMemo(() => {
    return (termos || []).filter((t) => !!t?.arquivo_url && !!t?.arquivo_rfp_url && !t?.fluxo_manual);
  }, [termos]);

  const municipioIds = Array.from(new Set(termosPublicados.map(t => t?.municipio_id).filter(Boolean))).sort();
  const fiscalizacaoIds = Array.from(new Set(termosPublicados.map(t => t?.fiscalizacao_id).filter(Boolean))).sort();

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
    total: termosPublicados.length,
    aguardando_assinatura: termosPublicados.filter(t => getEffectiveStatus(t) === 'aguardando_assinatura_prestador').length,
    aguardando_resposta: termosPublicados.filter(t => getEffectiveStatus(t) === 'aguardando_resposta' || getEffectiveStatus(t) === 'prazo_vencido').length,
    respondido: termosPublicados.filter(t => getEffectiveStatus(t) === 'respondido').length,
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

  const formatRelatorioTN = (termo) => {
    const tipo = String(termo?.tipo_relatorio || 'RFP').trim().toUpperCase();
    const raw = termo?.numero_rfp;
    if (!raw) return '—';
    const str = String(raw).trim();
    if (/^(RFP|RFE|RAO)\//i.test(str) && str.includes('/')) return str;
    const camara = termo?.camara_tecnica ? String(termo.camara_tecnica).trim() : '';
    const anoBase = termo?.data_geracao || termo?.created_at || termo?.updated_at || Date.now();
    const ano = new Date(anoBase).getFullYear();
    const num = String(parseInt(str.replace(/\D/g, '') || '0', 10)).padStart(3, '0');
    if (!camara) return str;
    return `${tipo}/DSB/${camara}/${num}/${ano}`;
  };

  const { data: lotesAI = [] } = useQuery({
    queryKey: ['lotes-ai-prestador', prestadorId],
    queryFn: async () => {
      if (!prestadorId) return [];
      return Repository.listRemessasAIOnlineByPrestador(prestadorId);
    },
    enabled: !!prestadorId,
  });

  const { data: itensAutosAI = [] } = useQuery({
    queryKey: ['itens-autos-ai-prestador', prestadorId, lotesAI.map((r) => r?.id).join(',')],
    queryFn: async () => {
      if (!prestadorId) return [];
      const ids = (Array.isArray(lotesAI) ? lotesAI : []).map((r) => r?.id).filter(Boolean);
      if (ids.length === 0) return [];
      const { data, error } = await supabase
        .from('remessas_ai_itens')
        .select('id, remessa_ai_id, autos_infracao(*)')
        .in('remessa_ai_id', ids);
      if (error) throw error;
      return data || [];
    },
    enabled: !!prestadorId && Array.isArray(lotesAI),
  });

  const autosAI = useMemo(() => {
    const list = Array.isArray(itensAutosAI) ? itensAutosAI : [];
    const lotes = Array.isArray(lotesAI) ? lotesAI : [];
    const loteById = lotes.reduce((acc, r) => {
      if (r?.id) acc[r.id] = r;
      return acc;
    }, {});
    const mapped = list
      .map((it) => {
        const a = it?.autos_infracao;
        if (!a?.id) return null;
        const remessa = it?.remessa_ai_id ? loteById[it.remessa_ai_id] || null : null;
        return { ...a, _remessa: remessa, _remessaId: it?.remessa_ai_id || null, _itemId: it?.id || null };
      })
      .filter(Boolean);
    mapped.sort((a, b) => {
      const ra = a?._remessa?.criada_em || '';
      const rb = b?._remessa?.criada_em || '';
      if (ra !== rb) return String(rb).localeCompare(String(ra));
      return String(a?.numero_auto || '').localeCompare(String(b?.numero_auto || ''));
    });
    return mapped;
  }, [itensAutosAI, lotesAI]);

  const autosByRemessaId = useMemo(() => {
    const out = {};
    for (const a of autosAI) {
      const rid = a?._remessaId;
      if (!rid) continue;
      if (!out[rid]) out[rid] = [];
      out[rid].push(a);
    }
    return out;
  }, [autosAI]);

  const autosAiColumns = useMemo(() => {
    const first = (autosAI || [])[0] || {};
    return new Set(Object.keys(first));
  }, [autosAI]);

  const aiAssinadoPrestadorColumn = useMemo(() => {
    const candidatos = [
      'arquivo_ai_assinado_prestador_url',
      'arquivo_ai_assinado_url',
      'arquivo_ai_assinado_prestador',
      'arquivo_ai_assinado'
    ];
    for (const c of candidatos) {
      if (autosAiColumns.has(c)) return c;
    }
    return null;
  }, [autosAiColumns]);

  const getAiAssinadoPrestadorUrl = (auto) => {
    if (!aiAssinadoPrestadorColumn) return null;
    return auto?.[aiAssinadoPrestadorColumn] || null;
  };

  const kpisAI = useMemo(() => {
    const list = Array.isArray(autosAI) ? autosAI : [];
    const total = list.length;
    const aguardandoRecebimento = list.filter((a) => (a?._remessa?.status || '') === 'enviada' && !getAiAssinadoPrestadorUrl(a)).length;
    const aguardandoDefesa = list.filter((a) => (a?._remessa?.status || '') === 'recebida').length;
    const defesaEnviada = list.filter((a) => (a?._remessa?.status || '') === 'defesa_enviada').length;
    return { total, aguardandoRecebimento, aguardandoDefesa, defesaEnviada };
  }, [autosAI, aiAssinadoPrestadorColumn]);

  const cardsKpi = useMemo(() => {
    if (activeTab === 'ais') {
      return [
        { label: 'Total de Autos', value: kpisAI.total, valueClass: 'text-gray-900' },
        { label: 'Aguardando Recebimento', value: kpisAI.aguardandoRecebimento, valueClass: 'text-orange-600' },
        { label: 'Aguardando Defesa', value: kpisAI.aguardandoDefesa, valueClass: 'text-yellow-600' },
        { label: 'Defesa Enviada', value: kpisAI.defesaEnviada, valueClass: 'text-green-600' },
      ];
    }
    return [
      { label: 'Total de TNs', value: kpis.total, valueClass: 'text-gray-900' },
      { label: 'Aguardando Assinatura', value: kpis.aguardando_assinatura, valueClass: 'text-orange-600' },
      { label: 'Aguardando Resposta', value: kpis.aguardando_resposta, valueClass: 'text-yellow-600' },
      { label: 'Respondidos', value: kpis.respondido, valueClass: 'text-green-600' },
    ];
  }, [activeTab, kpis, kpisAI]);

  useEffect(() => {
    const next = {};
    for (const auto of autosAI || []) {
      if (!auto?.id) continue;
      next[auto.id] = {
        defesa_texto: auto?.defesa_texto || '',
        defesa_arquivos: Array.isArray(auto?.defesa_arquivos) ? auto.defesa_arquivos : []
      };
    }
    setDefesaForms(next);
  }, [autosAI]);

  const podeEnviarDefesaAuto = useMemo(() => {
    const out = {};
    for (const a of autosAI || []) {
      const rid = a?._remessaId;
      const r = a?._remessa;
      if (!rid || !r) continue;
      if ((r?.status || '') !== 'recebida') {
        out[a.id] = false;
        continue;
      }
      if (!r?.arquivo_oficio_defesa_url) {
        out[a.id] = false;
        continue;
      }
      const autosMesmoGrupo = autosByRemessaId[rid] || [];
      if (autosMesmoGrupo.length === 0) {
        out[a.id] = false;
        continue;
      }
      out[a.id] = autosMesmoGrupo.every((ax) => {
        const f = defesaForms[ax.id] || {};
        const hasTexto = !!String(f?.defesa_texto || '').trim();
        const hasAnexos = Array.isArray(f?.defesa_arquivos) && f.defesa_arquivos.length > 0;
        return hasTexto || hasAnexos;
      });
    }
    return out;
  }, [autosAI, autosByRemessaId, defesaForms]);

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
          <Button
            variant="outline"
            disabled={saindo}
            onClick={async () => {
              if (saindo) return;
              setSaindo(true);
              try {
                await logout();
                navigate('/login', { replace: true });
              } catch (err) {
                alert('Erro ao sair: ' + (err?.message || String(err)));
              } finally {
                setSaindo(false);
              }
            }}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-4 mb-8">
          {cardsKpi.map((c) => (
            <Card key={c.label}>
              <CardContent className="p-4 text-center">
                <p className="text-sm text-gray-600 mb-1">{c.label}</p>
                <p className={`text-2xl font-bold ${c.valueClass}`}>{c.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tns">TNs</TabsTrigger>
            <TabsTrigger value="ais">Autos de Infração</TabsTrigger>
          </TabsList>

          <TabsContent value="tns" className="space-y-3 mt-4">
            {termosPublicados.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-gray-500">
                  Nenhum TN disponível no portal (aguarde a publicação de TN + RFP)
                </CardContent>
              </Card>
            ) : (
              termosPublicados.map((termo) => {
                const effectiveStatus = getEffectiveStatus(termo);
                const prazoMax = termo.data_maxima_resposta;
                const daysLeft = prazoMax ? Math.ceil((new Date(prazoMax).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
                const prazoBadge = prazoMax ? (
                  <div className="flex items-center text-sm text-gray-600">
                    <Clock className="h-4 w-4 mr-1" />
                    {daysLeft !== null ? `${daysLeft} dias restantes` : 'Prazo não definido'}
                  </div>
                ) : null;

                const actionLabel =
                  effectiveStatus === 'aguardando_assinatura_prestador'
                    ? 'Assinar TN'
                    : effectiveStatus === 'respondido'
                      ? 'Ver resposta'
                      : 'Responder TN';

                const municipioNome = municipioNomeById[termo?.municipio_id] || termo?.municipio_nome || '—';
                const numeroRfp = formatRelatorioTN(termo);
                const tipoRelatorio = String(termo?.tipo_relatorio || 'RFP').trim().toUpperCase();
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
                          <span className="font-medium">{tipoRelatorio}:</span> {numeroRfp} <span className="text-gray-400">•</span>{' '}
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
                );
              })
            )}
          </TabsContent>

          <TabsContent value="ais" className="space-y-3 mt-4">
            {autosAI.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-gray-500">
                  Nenhum Auto de Infração disponível
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="space-y-3">
                  {autosAI.map((auto) => {
                    const r = auto?._remessa || null;
                    const f = defesaForms[auto.id] || { defesa_texto: '', defesa_arquivos: [] };
                    const disabledDefesa = (r?.status || '') !== 'recebida';
                    const podeEnviar = !!podeEnviarDefesaAuto?.[auto.id] && (r?.status || '') === 'recebida';
                    const hasAiAssinado = !!getAiAssinadoPrestadorUrl(auto);
                    return (
                      <Card key={auto.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="font-semibold">{auto.numero_auto || 'Auto de Infração'}</div>
                              <div className="mt-1 text-xs text-gray-600">
                                {r?.numero_rfp ? (
                                  <>
                                    <span className="font-medium">RFP:</span> {r.numero_rfp}
                                  </>
                                ) : null}
                                {r?.numero_tn ? (
                                  <>
                                    {r?.numero_rfp ? <span className="text-gray-400"> • </span> : null}
                                    <span className="font-medium">TN:</span> {r.numero_tn}
                                  </>
                                ) : null}
                              </div>
                              <div className="mt-2 flex flex-wrap items-center gap-2">
                                <Badge className="bg-gray-700">{r?.status || auto?.status || 'enviado'}</Badge>
                                {hasAiAssinado ? <Badge className="bg-green-600">AI assinado enviado</Badge> : null}
                                {r?.arquivo_oficio_defesa_url ? <Badge className="bg-blue-600">Ofício anexado</Badge> : null}
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {auto?.arquivo_url ? (
                                <Button variant="outline" size="sm" onClick={() => void openArquivo(auto.arquivo_url)}>
                                  <Download className="h-4 w-4 mr-2" />
                                  Baixar AI
                                </Button>
                              ) : null}
                              {r?.arquivo_oficio_defesa_url ? (
                                <Button variant="outline" size="sm" onClick={() => void openArquivo(r.arquivo_oficio_defesa_url)}>
                                  <Download className="h-4 w-4 mr-2" />
                                  Baixar ofício
                                </Button>
                              ) : null}
                            </div>
                          </div>

                          {r?.status === 'enviada' && !hasAiAssinado ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <Label className="text-sm">Enviar AI assinado (PDF)</Label>
                              <Input
                                type="file"
                                accept=".pdf,application/pdf"
                                disabled={uploadingRemessa}
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  if (!auto?._remessaId) return;
                                  if (!aiAssinadoPrestadorColumn) {
                                    alert('Configuração do sistema: falta a coluna de arquivo do AI assinado do prestador na tabela autos_infracao.');
                                    e.target.value = '';
                                    return;
                                  }
                                  setUploadingRemessa(true);
                                  try {
                                    const ts = Date.now();
                                    const rand = Math.random().toString(36).slice(2, 8);
                                    const path = `autos_infracao/${auto.id}/ai_assinado_prestador/${ts}-${rand}.pdf`;
                                    const up = await Repository.uploadDocumentoAutos(file, path);
                                    const url = `storage://${up.bucket}/${up.path}`;
                                    await Repository.updateAutoInfracaoOnline(auto.id, {
                                      [aiAssinadoPrestadorColumn]: url
                                    });

                                    const autosDoGrupo = autosByRemessaId[auto._remessaId] || [];
                                    const allAssinados = autosDoGrupo.every((ax) => {
                                      if (!ax?.id) return false;
                                      if (ax.id === auto.id) return true;
                                      return !!getAiAssinadoPrestadorUrl(ax);
                                    });
                                    if (allAssinados) {
                                      await Repository.updateRemessaAIOnline(auto._remessaId, {
                                        recebida_em: new Date().toISOString(),
                                        status: 'recebida'
                                      });
                                    }

                                    await queryClient.invalidateQueries({ queryKey: ['lotes-ai-prestador', prestadorId] });
                                    await queryClient.invalidateQueries({ queryKey: ['itens-autos-ai-prestador', prestadorId] });
                                    alert('AI assinado enviado');
                                  } catch (err) {
                                    alert('Erro ao enviar AI assinado: ' + (err?.message || String(err)));
                                  } finally {
                                    setUploadingRemessa(false);
                                    e.target.value = '';
                                  }
                                }}
                              />
                            </div>
                          ) : null}

                          <div>
                            <Label>Defesa (texto)</Label>
                            <Textarea
                              className="mt-1"
                              value={f.defesa_texto}
                              onChange={(e) => setDefesaForms((prev) => ({ ...prev, [auto.id]: { ...f, defesa_texto: e.target.value } }))}
                              disabled={disabledDefesa}
                            />
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Input
                              type="file"
                              accept=".pdf,image/*"
                              multiple
                              disabled={disabledDefesa}
                              onChange={async (e) => {
                                const files = Array.from(e.target.files || []);
                                if (files.length === 0) return;
                                try {
                                  setUploadingRemessa(true);
                                  const uploaded = [];
                                  for (const file of files) {
                                    const ext = file?.name && file.name.includes('.') ? file.name.split('.').pop() : 'bin';
                                    const ts = Date.now();
                                    const rand = Math.random().toString(36).slice(2, 8);
                                    const path = `autos_infracao/${auto.id}/defesa/${ts}-${rand}.${String(ext || 'bin').toLowerCase()}`;
                                    const up = await Repository.uploadDocumentoAutos(file, path);
                                    uploaded.push({ ...up, url: `storage://${up.bucket}/${up.path}` });
                                  }
                                  setDefesaForms((prev) => {
                                    const cur = prev[auto.id] || { defesa_texto: '', defesa_arquivos: [] };
                                    return { ...prev, [auto.id]: { ...cur, defesa_arquivos: [...(cur.defesa_arquivos || []), ...uploaded] } };
                                  });
                                } catch (err) {
                                  alert('Erro ao enviar anexo: ' + (err?.message || String(err)));
                                } finally {
                                  setUploadingRemessa(false);
                                  e.target.value = '';
                                }
                              }}
                            />
                            <Button
                              variant="outline"
                              disabled={disabledDefesa || salvandoDefesaAutoId === auto.id}
                              onClick={async () => {
                                setSalvandoDefesaAutoId(auto.id);
                                try {
                                  await Repository.updateAutoInfracaoOnline(auto.id, {
                                    defesa_texto: String((defesaForms[auto.id]?.defesa_texto || '')).trim(),
                                    defesa_arquivos: defesaForms[auto.id]?.defesa_arquivos || []
                                  });
                                  alert('Rascunho da defesa salvo');
                                } catch (err) {
                                  alert('Erro ao salvar defesa: ' + (err?.message || String(err)));
                                } finally {
                                  setSalvandoDefesaAutoId(null);
                                }
                              }}
                            >
                              <UploadCloud className="h-4 w-4 mr-2" />
                              {salvandoDefesaAutoId === auto.id ? 'Salvando...' : 'Salvar rascunho'}
                            </Button>
                          </div>

                          {Array.isArray(f?.defesa_arquivos) && f.defesa_arquivos.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                              {f.defesa_arquivos.map((a, idx) => (
                                <Badge key={idx} variant="outline" className="cursor-pointer" onClick={() => void openArquivo(a?.url || a)}>
                                  {a?.nome || a?.path || `Anexo ${idx + 1}`}
                                </Badge>
                              ))}
                            </div>
                          ) : null}

                          {(r?.status || '') === 'recebida' ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <Label className="text-sm">Ofício de envio da defesa (PDF)</Label>
                              <Input
                                type="file"
                                accept=".pdf,application/pdf"
                                disabled={uploadingRemessa || (r?.status || '') !== 'recebida'}
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  if (!auto?._remessaId) return;
                                  setUploadingRemessa(true);
                                  try {
                                    const ts = Date.now();
                                    const rand = Math.random().toString(36).slice(2, 8);
                                    const path = `remessas_ai/${auto._remessaId}/oficio_defesa/${ts}-${rand}.pdf`;
                                    const up = await Repository.uploadDocumentoAutos(file, path);
                                    const url = `storage://${up.bucket}/${up.path}`;
                                    await Repository.updateRemessaAIOnline(auto._remessaId, {
                                      arquivo_oficio_defesa_url: url
                                    });
                                    alert('Ofício anexado');
                                  } catch (err) {
                                    alert('Erro ao anexar ofício: ' + (err?.message || String(err)));
                                  } finally {
                                    setUploadingRemessa(false);
                                    e.target.value = '';
                                  }
                                }}
                              />
                            </div>
                          ) : null}

                          <div className="flex justify-end">
                            <Button
                              className="bg-purple-600 hover:bg-purple-700"
                              disabled={enviandoDefesa || !podeEnviar || !auto?._remessaId}
                              onClick={async () => {
                                if (!auto?._remessaId) return;
                                if (!window.confirm('Você está prestes a enviar a defesa para análise. Deseja continuar?')) return;
                                if (!window.confirm('Confirma o envio definitivo? Esta ação não pode ser desfeita.')) return;
                                setEnviandoDefesa(true);
                                try {
                                  const autosDoGrupo = autosByRemessaId[auto._remessaId] || [];
                                  for (const ax of autosDoGrupo) {
                                    const fx = defesaForms[ax.id] || { defesa_texto: '', defesa_arquivos: [] };
                                    await Repository.updateAutoInfracaoOnline(ax.id, {
                                      defesa_texto: String(fx.defesa_texto || '').trim(),
                                      defesa_arquivos: fx.defesa_arquivos || []
                                    });
                                  }
                                  await Repository.updateRemessaAIOnline(auto._remessaId, {
                                    defesa_enviada_em: new Date().toISOString(),
                                    status: 'defesa_enviada'
                                  });
                                  alert('Defesa enviada para análise');
                                } catch (err) {
                                  alert('Erro ao enviar defesa: ' + (err?.message || String(err)));
                                } finally {
                                  setEnviandoDefesa(false);
                                }
                              }}
                            >
                              <Send className="h-4 w-4 mr-2" />
                              {enviandoDefesa ? 'Enviando...' : 'Enviar defesa'}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
