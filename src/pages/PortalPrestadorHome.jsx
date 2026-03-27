import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  const [remessaSelecionadaId, setRemessaSelecionadaId] = useState(null);
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

  const formatRfp = (termo) => {
    const raw = termo?.numero_rfp;
    if (!raw) return '—';
    const str = String(raw).trim();
    if (/^RFP\//i.test(str) && str.includes('/')) return str;
    const camara = termo?.camara_tecnica ? String(termo.camara_tecnica).trim() : '';
    const anoBase = termo?.data_geracao || termo?.created_at || termo?.updated_at || Date.now();
    const ano = new Date(anoBase).getFullYear();
    const num = String(parseInt(str.replace(/\D/g, '') || '0', 10)).padStart(3, '0');
    if (!camara) return str;
    return `RFP/DSB/${camara}/${num}/${ano}`;
  };

  const { data: remessasAI = [] } = useQuery({
    queryKey: ['remessas-ai-prestador', prestadorId],
    queryFn: async () => {
      if (!prestadorId) return [];
      return Repository.listRemessasAIOnlineByPrestador(prestadorId);
    },
    enabled: !!prestadorId,
  });

  const remessaSelecionada = useMemo(() => remessasAI.find(r => r.id === remessaSelecionadaId) || null, [remessasAI, remessaSelecionadaId]);

  const { data: remessaItens = [] } = useQuery({
    queryKey: ['remessa-ai-itens', remessaSelecionadaId],
    queryFn: async () => {
      if (!remessaSelecionadaId) return [];
      return Repository.listRemessaAIItens(remessaSelecionadaId);
    },
    enabled: !!remessaSelecionadaId,
  });

  useEffect(() => {
    if (!remessaSelecionadaId) return;
    const next = {};
    for (const it of remessaItens || []) {
      const auto = it?.autos_infracao;
      if (!auto?.id) continue;
      next[auto.id] = {
        defesa_texto: auto?.defesa_texto || '',
        defesa_arquivos: Array.isArray(auto?.defesa_arquivos) ? auto.defesa_arquivos : []
      };
    }
    setDefesaForms(next);
  }, [remessaSelecionadaId, remessaItens]);

  const remessaPodeEnviarDefesa = useMemo(() => {
    if (!remessaSelecionada) return false;
    if ((remessaSelecionada?.status || '') !== 'recebida') return false;
    if (!remessaSelecionada?.arquivo_recebimento_assinado_url) return false;
    if (!remessaSelecionada?.arquivo_oficio_defesa_url) return false;
    const autos = (remessaItens || []).map(i => i?.autos_infracao).filter(Boolean);
    if (autos.length === 0) return false;
    return autos.every((a) => {
      const f = defesaForms[a.id] || {};
      const hasTexto = !!String(f?.defesa_texto || '').trim();
      const hasFiles = Array.isArray(f?.defesa_arquivos) && f.defesa_arquivos.length > 0;
      return hasTexto || hasFiles;
    });
  }, [remessaSelecionada, remessaItens, defesaForms]);

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

        <Tabs defaultValue="tns" className="w-full">
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
                const numeroRfp = formatRfp(termo);
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
                );
              })
            )}
          </TabsContent>

          <TabsContent value="ais" className="space-y-3 mt-4">
            {remessasAI.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-gray-500">
                  Nenhuma remessa de Autos de Infração disponível
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {remessasAI.map((r) => (
                    <Card key={r.id} className={remessaSelecionadaId === r.id ? 'border-blue-300' : ''}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="font-semibold">{r.numero_rfp || 'RFP'}</div>
                            {r.numero_tn ? <div className="text-xs text-gray-600 mt-1">TN: {r.numero_tn}</div> : null}
                            <div className="mt-2">
                              <Badge className="bg-gray-700">{r.status || 'preparada'}</Badge>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => setRemessaSelecionadaId(r.id)}>
                            Abrir
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {remessaSelecionada ? (
                  <Card className="border-blue-200">
                    <CardContent className="p-4 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="font-semibold">Remessa: {remessaSelecionada.numero_rfp || remessaSelecionada.id}</div>
                        <Button variant="outline" size="sm" onClick={() => setRemessaSelecionadaId(null)}>
                          Fechar
                        </Button>
                      </div>

                      <div className="flex flex-wrap gap-2 items-center">
                        {remessaSelecionada?.arquivo_lista_pdf_url ? (
                          <Button variant="outline" onClick={() => void openArquivo(remessaSelecionada.arquivo_lista_pdf_url)}>
                            <Download className="h-4 w-4 mr-2" />
                            Baixar lista de AIs
                          </Button>
                        ) : null}

                        {remessaSelecionada?.status === 'enviada' && !remessaSelecionada?.arquivo_recebimento_assinado_url ? (
                          <Input
                            type="file"
                            accept=".pdf,application/pdf"
                            disabled={uploadingRemessa}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setUploadingRemessa(true);
                              try {
                                const ts = Date.now();
                                const rand = Math.random().toString(36).slice(2, 8);
                                const path = `remessas_ai/${remessaSelecionada.id}/recebimento/${ts}-${rand}.pdf`;
                                const up = await Repository.uploadDocumentoAutos(file, path);
                                const url = `storage://${up.bucket}/${up.path}`;
                                await Repository.updateRemessaAIOnline(remessaSelecionada.id, {
                                  arquivo_recebimento_assinado_url: url,
                                  recebida_em: new Date().toISOString(),
                                  status: 'recebida'
                                });
                                alert('Recebimento registrado');
                              } catch (err) {
                                alert('Erro ao enviar recebimento: ' + (err?.message || String(err)));
                              } finally {
                                setUploadingRemessa(false);
                                e.target.value = '';
                              }
                            }}
                          />
                        ) : null}

                        {remessaSelecionada?.arquivo_recebimento_assinado_url ? (
                          <Badge className="bg-green-600">Recebido</Badge>
                        ) : null}
                      </div>

                      <div className="space-y-3">
                        {(remessaItens || []).map((it) => {
                          const auto = it?.autos_infracao;
                          if (!auto?.id) return null;
                          const f = defesaForms[auto.id] || { defesa_texto: '', defesa_arquivos: [] };
                          const disabledDefesa = !remessaSelecionada?.arquivo_recebimento_assinado_url || remessaSelecionada?.status !== 'recebida';
                          return (
                            <Card key={auto.id}>
                              <CardContent className="p-4 space-y-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <div className="font-semibold">{auto.numero_auto || 'AI'}</div>
                                  {auto?.arquivo_url ? (
                                    <Button variant="outline" size="sm" onClick={() => void openArquivo(auto.arquivo_url)}>
                                      <Download className="h-4 w-4 mr-2" />
                                      Baixar AI
                                    </Button>
                                  ) : null}
                                </div>

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
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>

                      <Card className="border-yellow-200">
                        <CardContent className="p-4 space-y-3">
                          <div className="font-semibold">Ofício de envio da defesa</div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Input
                              type="file"
                              accept=".pdf,application/pdf"
                              disabled={uploadingRemessa || !remessaSelecionada?.arquivo_recebimento_assinado_url || remessaSelecionada?.status !== 'recebida'}
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                setUploadingRemessa(true);
                                try {
                                  const ts = Date.now();
                                  const rand = Math.random().toString(36).slice(2, 8);
                                  const path = `remessas_ai/${remessaSelecionada.id}/oficio_defesa/${ts}-${rand}.pdf`;
                                  const up = await Repository.uploadDocumentoAutos(file, path);
                                  const url = `storage://${up.bucket}/${up.path}`;
                                  await Repository.updateRemessaAIOnline(remessaSelecionada.id, {
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
                            {remessaSelecionada?.arquivo_oficio_defesa_url ? (
                              <Button variant="outline" onClick={() => void openArquivo(remessaSelecionada.arquivo_oficio_defesa_url)}>
                                <Download className="h-4 w-4 mr-2" />
                                Baixar ofício
                              </Button>
                            ) : null}
                          </div>
                        </CardContent>
                      </Card>

                      <div className="flex justify-end">
                        <Button
                          className="bg-purple-600 hover:bg-purple-700"
                          disabled={enviandoDefesa || !remessaPodeEnviarDefesa}
                          onClick={async () => {
                            if (!remessaSelecionada) return;
                            if (!window.confirm('Você está prestes a enviar a defesa para análise. Deseja continuar?')) return;
                            if (!window.confirm('Confirma o envio definitivo? Esta ação não pode ser desfeita.')) return;
                            setEnviandoDefesa(true);
                            try {
                              for (const it of remessaItens || []) {
                                const auto = it?.autos_infracao;
                                if (!auto?.id) continue;
                                const f = defesaForms[auto.id] || { defesa_texto: '', defesa_arquivos: [] };
                                await Repository.updateAutoInfracaoOnline(auto.id, {
                                  defesa_texto: String(f.defesa_texto || '').trim(),
                                  defesa_arquivos: f.defesa_arquivos || []
                                });
                              }
                              await Repository.updateRemessaAIOnline(remessaSelecionada.id, {
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
                ) : null}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
