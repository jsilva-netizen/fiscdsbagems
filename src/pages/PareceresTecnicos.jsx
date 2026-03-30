import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Repository } from '@/lib/offline/repository';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Download, Loader2, Save, Send } from 'lucide-react';
 
export default function PareceresTecnicos() {
  const queryClient = useQueryClient();
  const [loteAbertoId, setLoteAbertoId] = useState(null);
  const [parecerForms, setParecerForms] = useState({});
  const [salvandoAutoId, setSalvandoAutoId] = useState(null);
  const [uploadingAutoId, setUploadingAutoId] = useState(null);
  const [enviandoLoteId, setEnviandoLoteId] = useState(null);
 
  const { data: remessas = [] } = useQuery({
    queryKey: ['remessas-ai'],
    queryFn: async () => Repository.listRemessasAIOnlineAll(),
  });
 
  const { data: remessaItens = [] } = useQuery({
    queryKey: ['remessa-ai-itens', loteAbertoId],
    queryFn: async () => {
      if (!loteAbertoId) return [];
      return Repository.listRemessaAIItens(loteAbertoId);
    },
    enabled: !!loteAbertoId,
  });
 
  const { data: pareceres = [] } = useQuery({
    queryKey: ['pareceres-tecnicos'],
    queryFn: async () => Repository.listPareceresTecnicosOnlineAll(),
  });
 
  const { data: prestadores = [] } = useQuery({
    queryKey: ['prestadores'],
    queryFn: async () => {
      const { data, error } = await supabase.from('prestadores_servico').select('*');
      if (error) throw error;
      return data || [];
    },
  });
 
  const { data: fiscalizacoes = [] } = useQuery({
    queryKey: ['fiscalizacoes'],
    queryFn: async () => {
      const { data, error } = await supabase.from('fiscalizacoes').select('*');
      if (error) throw error;
      return data || [];
    },
  });
 
  const { data: municipios = [] } = useQuery({
    queryKey: ['municipios'],
    queryFn: async () => {
      const { data, error } = await supabase.from('municipios').select('*');
      if (error) throw error;
      return data || [];
    },
  });
 
  const pendentes = useMemo(() => remessas.filter((r) => String(r?.status || '') === 'defesa_enviada'), [remessas]);
  const encaminhados = useMemo(() => remessas.filter((r) => String(r?.status || '') === 'parecer_enviado'), [remessas]);
 
  const getPrestadorNome = (id) => {
    const p = prestadores.find((x) => x.id === id);
    return p?.nome || 'N/A';
  };
 
  const getFiscalizacao = (id) => fiscalizacoes.find((f) => f.id === id) || null;
  const getMunicipioNomeFromFiscalizacao = (fiscId) => {
    const fisc = getFiscalizacao(fiscId);
    const mun = municipios.find((m) => m.id === fisc?.municipio_id);
    return mun?.nome || 'N/A';
  };
 
  const openArquivo = async (arq) => {
    try {
      const signed = await Repository.getSignedUrlFromAny(arq);
      if (signed) window.open(signed, '_blank', 'noopener,noreferrer');
    } catch (err) {
      alert('Erro ao abrir arquivo: ' + (err?.message || String(err)));
    }
  };
 
  useEffect(() => {
    if (!loteAbertoId) return;
    const next = {};
    for (const it of remessaItens || []) {
      const a = it?.autos_infracao;
      if (!a?.id) continue;
      const p = (pareceres || []).find((pp) => pp.auto_id === a.id) || null;
      next[a.id] = {
        recomendacao: p?.recomendacao || 'aplicar_multa',
        valor_multa_sugerido: p?.valor_multa_sugerido != null ? String(p.valor_multa_sugerido) : '',
        analise_tecnica: p?.analise_tecnica || '',
        arquivo_parecer_assinado_url: p?.arquivo_parecer_assinado_url || '',
      };
    }
    setParecerForms(next);
  }, [loteAbertoId, remessaItens, pareceres]);
 
  const salvarRascunho = async (autoId) => {
    if (!autoId || salvandoAutoId) return;
    setSalvandoAutoId(autoId);
    try {
      const f = parecerForms[autoId] || {};
      await Repository.upsertParecerTecnicoForAuto(autoId, {
        recomendacao: f.recomendacao || 'aplicar_multa',
        valor_multa_sugerido: f.valor_multa_sugerido ? Number(String(f.valor_multa_sugerido).replace(',', '.')) : null,
        analise_tecnica: f.analise_tecnica || '',
        status: 'rascunho',
      });
      await queryClient.invalidateQueries({ queryKey: ['pareceres-tecnicos'] });
      alert('Rascunho salvo');
    } catch (err) {
      alert('Erro ao salvar rascunho: ' + (err?.message || String(err)));
    } finally {
      setSalvandoAutoId(null);
    }
  };
 
  const salvarParecerAssinado = async (autoId, file) => {
    if (!autoId || !file || uploadingAutoId) return;
    setUploadingAutoId(autoId);
    try {
      const ts = Date.now();
      const rand = Math.random().toString(36).slice(2, 8);
      const path = `autos_infracao/${autoId}/parecer/${ts}-${rand}.pdf`;
      const up = await Repository.uploadDocumentoAutos(file, path);
      const url = `storage://${up.bucket}/${up.path}`;
      const f = parecerForms[autoId] || {};
      await Repository.upsertParecerTecnicoForAuto(autoId, {
        recomendacao: f.recomendacao || 'aplicar_multa',
        valor_multa_sugerido: f.valor_multa_sugerido ? Number(String(f.valor_multa_sugerido).replace(',', '.')) : null,
        analise_tecnica: f.analise_tecnica || '',
        arquivo_parecer_assinado_url: url,
        status: 'finalizado',
      });
      await queryClient.invalidateQueries({ queryKey: ['pareceres-tecnicos'] });
      setParecerForms((prev) => ({
        ...prev,
        [autoId]: { ...(prev[autoId] || {}), arquivo_parecer_assinado_url: url },
      }));
      alert('Parecer assinado salvo');
    } catch (err) {
      alert('Erro ao salvar parecer: ' + (err?.message || String(err)));
    } finally {
      setUploadingAutoId(null);
    }
  };
 
  const podeEncaminhar = useMemo(() => {
    if (!loteAbertoId) return false;
    const autoIds = (remessaItens || []).map((it) => it?.autos_infracao?.id).filter(Boolean);
    if (autoIds.length === 0) return false;
    return autoIds.every((id) => {
      const p = (pareceres || []).find((pp) => pp.auto_id === id);
      return !!p?.arquivo_parecer_assinado_url;
    });
  }, [loteAbertoId, remessaItens, pareceres]);
 
  const encaminharParaCamara = async () => {
    if (!loteAbertoId || enviandoLoteId) return;
    setEnviandoLoteId(loteAbertoId);
    try {
      if (!podeEncaminhar) throw new Error('Todos os autos precisam ter parecer assinado antes de encaminhar');
      await Repository.updateRemessaAIOnline(loteAbertoId, {
        parecer_enviado_em: new Date().toISOString(),
        status: 'parecer_enviado',
      });
      await queryClient.invalidateQueries({ queryKey: ['remessas-ai'] });
      alert('Parecer encaminhado à Câmara');
    } catch (err) {
      alert('Erro ao encaminhar: ' + (err?.message || String(err)));
    } finally {
      setEnviandoLoteId(null);
    }
  };
 
  const loteAberto = useMemo(() => remessas.find((r) => r?.id === loteAbertoId) || null, [remessas, loteAbertoId]);
  const autosDoLote = useMemo(() => (remessaItens || []).map((it) => it?.autos_infracao).filter(Boolean), [remessaItens]);
 
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link to={createPageUrl('Home')}>
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Pareceres Técnicos</h1>
          {loteAbertoId && (
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setLoteAbertoId(null)}
              >
                Trocar lote
              </Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                disabled={!podeEncaminhar || enviandoLoteId === loteAbertoId}
                onClick={() => void encaminharParaCamara()}
              >
                {enviandoLoteId === loteAbertoId ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Encaminhar à Câmara
              </Button>
            </div>
          )}
        </div>
      </div>
 
      <div className="max-w-6xl mx-auto px-4 py-6">
        {!loteAbertoId && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold">Pendentes</div>
                  <Badge variant="outline">{pendentes.length}</Badge>
                </div>
                <div className="space-y-3">
                  {pendentes.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 rounded border p-3 bg-white">
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          RFP: {r?.numero_rfp || '—'} | TN: {r?.numero_tn || '—'}
                        </div>
                        <div className="text-xs text-gray-600">
                          Prestador: {getPrestadorNome(r?.prestador_servico_id)} | Município: {getMunicipioNomeFromFiscalizacao(r?.fiscalizacao_id)}
                        </div>
                      </div>
                      <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setLoteAbertoId(r.id)}>
                        Abrir
                      </Button>
                    </div>
                  ))}
                  {pendentes.length === 0 && <div className="text-sm text-gray-600">Nenhum lote pendente.</div>}
                </div>
              </CardContent>
            </Card>
 
            <Card className="border">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="font-semibold">Encaminhados</div>
                  <Badge variant="outline">{encaminhados.length}</Badge>
                </div>
                <div className="space-y-3">
                  {encaminhados.map((r) => (
                    <div key={r.id} className="flex items-center gap-3 rounded border p-3 bg-white">
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          RFP: {r?.numero_rfp || '—'} | TN: {r?.numero_tn || '—'}
                        </div>
                        <div className="text-xs text-gray-600">
                          Prestador: {getPrestadorNome(r?.prestador_servico_id)} | Município: {getMunicipioNomeFromFiscalizacao(r?.fiscalizacao_id)}
                        </div>
                      </div>
                      <Button variant="outline" onClick={() => setLoteAbertoId(r.id)}>
                        Ver
                      </Button>
                    </div>
                  ))}
                  {encaminhados.length === 0 && <div className="text-sm text-gray-600">Nenhum lote encaminhado.</div>}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
 
        {loteAbertoId && (
          <div className="space-y-4">
            <Card className="border">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">
                    RFP: {loteAberto?.numero_rfp || '—'} | TN: {loteAberto?.numero_tn || '—'}
                  </div>
                  <div className="text-xs text-gray-600">
                    Prestador: {getPrestadorNome(loteAberto?.prestador_servico_id)} | Município: {getMunicipioNomeFromFiscalizacao(loteAberto?.fiscalizacao_id)}
                  </div>
                </div>
                <Badge variant="outline">Autos: {autosDoLote.length}</Badge>
              </CardContent>
            </Card>
 
            {autosDoLote.map((a) => {
              const form = parecerForms[a.id] || { recomendacao: 'aplicar_multa', valor_multa_sugerido: '', analise_tecnica: '', arquivo_parecer_assinado_url: '' };
              const parecerExistente = (pareceres || []).find((p) => p.auto_id === a.id) || null;
              const parecerUrl = form.arquivo_parecer_assinado_url || parecerExistente?.arquivo_parecer_assinado_url || '';
              const defesaArquivos = Array.isArray(a?.defesa_arquivos) ? a.defesa_arquivos : [];
              const fisc = getFiscalizacao(a?.fiscalizacao_id);
              const munNome = getMunicipioNomeFromFiscalizacao(a?.fiscalizacao_id);
              return (
                <Card key={a.id} className="border">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">Auto {a?.numero_auto || '—'}</div>
                        <div className="text-xs text-gray-600">
                          Município: {munNome} | Processo: {fisc?.numero_processo || 'N/A'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={() => void openArquivo(a?.arquivo_url)} disabled={!a?.arquivo_url}>
                          <Download className="h-4 w-4 mr-2" />
                          Abrir AI
                        </Button>
                        <Badge variant="outline">{a?.status || '—'}</Badge>
                      </div>
                    </div>
 
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="text-sm font-medium">Defesa</div>
                        <div className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded border p-3 min-h-[96px]">
                          {String(a?.defesa_texto || '').trim() ? a.defesa_texto : 'Sem texto de defesa.'}
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 mb-1">Anexos da defesa</div>
                          <div className="space-y-1">
                            {defesaArquivos.map((arq, idx) => (
                              <Button
                                key={idx}
                                variant="outline"
                                size="sm"
                                className="w-full justify-start"
                                onClick={() => void openArquivo(arq)}
                              >
                                <Download className="h-4 w-4 mr-2" />
                                {arq?.nome || `Anexo ${idx + 1}`}
                              </Button>
                            ))}
                            {defesaArquivos.length === 0 && <div className="text-xs text-gray-600">Nenhum anexo.</div>}
                          </div>
                        </div>
                      </div>
 
                      <div className="space-y-3">
                        <div className="text-sm font-medium">Parecer técnico</div>
 
                        <div>
                          <Label className="text-xs">Recomendação</Label>
                          <select
                            className="w-full mt-1 border rounded px-3 py-2 text-sm bg-white"
                            value={form.recomendacao || 'aplicar_multa'}
                            onChange={(e) =>
                              setParecerForms((prev) => ({
                                ...prev,
                                [a.id]: { ...(prev[a.id] || {}), recomendacao: e.target.value },
                              }))
                            }
                          >
                            <option value="aplicar_multa">Aplicar multa</option>
                            <option value="arquivar">Arquivar</option>
                          </select>
                        </div>
 
                        <div>
                          <Label className="text-xs">Valor de multa sugerido</Label>
                          <Input
                            className="mt-1"
                            value={form.valor_multa_sugerido || ''}
                            onChange={(e) =>
                              setParecerForms((prev) => ({
                                ...prev,
                                [a.id]: { ...(prev[a.id] || {}), valor_multa_sugerido: e.target.value },
                              }))
                            }
                            placeholder="Ex: 1000,00"
                          />
                        </div>
 
                        <div>
                          <Label className="text-xs">Análise técnica</Label>
                          <Textarea
                            className="mt-1"
                            value={form.analise_tecnica || ''}
                            onChange={(e) =>
                              setParecerForms((prev) => ({
                                ...prev,
                                [a.id]: { ...(prev[a.id] || {}), analise_tecnica: e.target.value },
                              }))
                            }
                            rows={6}
                          />
                        </div>
 
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            disabled={salvandoAutoId === a.id}
                            onClick={() => void salvarRascunho(a.id)}
                          >
                            {salvandoAutoId === a.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                            Salvar rascunho
                          </Button>
                          {parecerUrl && (
                            <Button variant="outline" onClick={() => void openArquivo(parecerUrl)}>
                              <Download className="h-4 w-4 mr-2" />
                              Ver assinado
                            </Button>
                          )}
                        </div>
 
                        <div>
                          <Label className="text-xs">Parecer assinado (PDF)</Label>
                          <Input
                            className="mt-1"
                            type="file"
                            accept="application/pdf"
                            disabled={uploadingAutoId === a.id}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) void salvarParecerAssinado(a.id, file);
                              e.target.value = '';
                            }}
                          />
                          {uploadingAutoId === a.id && (
                            <div className="text-xs text-gray-600 mt-1 flex items-center">
                              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                              Enviando...
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
        )}
      </div>
    </div>
  );
}
