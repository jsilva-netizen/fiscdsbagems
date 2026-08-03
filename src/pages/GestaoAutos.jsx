import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Repository } from '@/lib/offline/repository';
import jsPDF from 'jspdf';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import FluxoUploadDocumentos from '@/components/autos/FluxoUploadDocumentos';
import { Loader2, Save, Download, Send } from 'lucide-react';
import AdminShell from '@/components/layout/AdminShell';

export default function GestaoAutos() {
     const [searchParams] = useSearchParams();
     const defaultTabRaw = String(searchParams.get('tab') || '').trim();
     const defaultTab = ['gerados', 'enviados', 'analise', 'finalizados', 'remessas'].includes(defaultTabRaw) ? defaultTabRaw : 'gerados';
     const [tab, setTab] = useState(defaultTab);
     const queryClient = useQueryClient();
     const [uploadingFile, setUploadingFile] = useState(false);
     const [penaBase, setPenaBase] = useState({});
     const [salvandoAutoId, setSalvandoAutoId] = useState(null);
     const [remessaAbertaId, setRemessaAbertaId] = useState(null);
     const [criandoRemessaKey, setCriandoRemessaKey] = useState(null);
     const [enviandoParecerRemessaId, setEnviandoParecerRemessaId] = useState(null);
     const [uploadingParecerAutoId, setUploadingParecerAutoId] = useState(null);
     const [parecerForms, setParecerForms] = useState({});

    const { data: autos = [] } = useQuery({
        queryKey: ['autos-infracao'],
        queryFn: async () => {
            const { data, error } = await supabase.from('autos_infracao').select('*');
            if (error) throw error;
            return data;
        }
    });

    const { data: respostas = [] } = useQuery({
        queryKey: ['respostas-determinacoes'],
        queryFn: async () => {
            const { data, error } = await supabase.from('respostas_determinacao').select('*');
            if (error) throw error;
            return data;
        }
    });


    const { data: prestadores = [] } = useQuery({
       queryKey: ['prestadores'],
       queryFn: async () => {
           const { data, error } = await supabase.from('prestadores_servico').select('*');
           if (error) throw error;
           return data;
       }
    });

    const { data: fiscalizacoes = [] } = useQuery({
       queryKey: ['fiscalizacoes'],
       queryFn: async () => {
           const { data, error } = await supabase.from('fiscalizacoes').select('*');
           if (error) throw error;
           return data;
       }
    });

    const { data: termos = [] } = useQuery({
        queryKey: ['termos-notificacao'],
        queryFn: async () => {
            const data = await Repository.listTermosNotificacaoOnline();
            return data;
        }
    });

    const { data: municipios = [] } = useQuery({
       queryKey: ['municipios'],
       queryFn: async () => {
           const { data, error } = await supabase.from('municipios').select('*');
           if (error) throw error;
           return data;
       }
    });

    const { data: remessas = [] } = useQuery({
        queryKey: ['remessas-ai'],
        queryFn: async () => {
            const data = await Repository.listRemessasAIOnlineAll();
            return data;
        }
    });

    const { data: remessaItens = [] } = useQuery({
        queryKey: ['remessa-ai-itens', remessaAbertaId],
        queryFn: async () => {
            if (!remessaAbertaId) return [];
            const data = await Repository.listRemessaAIItens(remessaAbertaId);
            return data;
        },
        enabled: !!remessaAbertaId
    });

    const { data: pareceres = [] } = useQuery({
        queryKey: ['pareceres-tecnicos'],
        queryFn: async () => {
            const data = await Repository.listPareceresTecnicosOnlineAll();
            return data;
        }
    });

    const autosColumns = useMemo(() => {
        const first = autos?.[0] || {};
        return new Set(Object.keys(first));
    }, [autos]);

    const penaBaseRsColumn = useMemo(() => {
        const candidatos = [
            'pena_base_rs',
            'pena_base_reais',
            'pena_base_real',
            'pena_base_em_reais',
            'pena_base_valor_rs',
            'pena_base_valor'
        ];
        for (const c of candidatos) {
            if (autosColumns.has(c)) return c;
        }
        return null;
    }, [autosColumns]);


    const parseIntSafe = (valor) => {
        const n = parseInt(String(valor ?? '').replace(/[^\d-]/g, ''), 10);
        return Number.isFinite(n) ? n : 0;
    };

    const parseFloatSafe = (valor) => {
        const n = parseFloat(String(valor ?? '').replace(/[^\d,.-]/g, '').replace(',', '.'));
        return Number.isFinite(n) ? n : 0;
    };

    const getPenaUfermsInput = (auto) => {
        return penaBase[`${auto.id}-uferms`] ?? (auto?.pena_base_uferms != null ? String(auto.pena_base_uferms) : '');
    };

    const getPenaRsInput = (auto) => {
        if (!penaBaseRsColumn) return penaBase[`${auto.id}-rs`] ?? '';
        return penaBase[`${auto.id}-rs`] ?? (auto?.[penaBaseRsColumn] != null ? String(auto[penaBaseRsColumn]) : '');
    };

     const salvarPenaBaseMutation = useMutation({
         mutationFn: async ({ autoId, penaUferms, penaRs }) => {
             const uferms = parseIntSafe(penaUferms);
             const rs = parseFloatSafe(penaRs);
             const updateBody = { pena_base_uferms: uferms };
             if (penaBaseRsColumn) updateBody[penaBaseRsColumn] = rs;
             const { error } = await supabase.from('autos_infracao').update(updateBody).eq('id', autoId);
             if (error) throw error;
         },
         onMutate: ({ autoId }) => {
             setSalvandoAutoId(autoId);
         },
         onSuccess: () => {
             queryClient.invalidateQueries({ queryKey: ['autos-infracao'] });
             alert('Pena base salva com sucesso!');
         },
         onError: (err) => {
             alert('Erro ao salvar pena base: ' + (err?.message || String(err)));
         },
         onSettled: () => {
             setSalvandoAutoId(null);
         }
     });

    const handleUploadAuto = async (autoId, e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploadingFile(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${autoId}/${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('documentos-autos')
                .upload(filePath, file);

            if (uploadError) throw uploadError;
            await supabase.from('autos_infracao').update({
                arquivo_url: `storage://documentos-autos/${filePath}`
            }).eq('id', autoId);

            queryClient.invalidateQueries({ queryKey: ['autos-infracao'] });
            alert('Arquivo do auto salvo!');
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao fazer upload: ' + error.message);
        } finally {
            setUploadingFile(false);
        }
    };

    const openArquivo = async (arq) => {
        try {
            const signed = await Repository.getSignedUrlFromAny(arq);
            if (signed) window.open(signed, '_blank', 'noopener,noreferrer');
        } catch (err) {
            alert('Erro ao abrir arquivo: ' + (err?.message || String(err)));
        }
    };

    const getPrestadorNome = (id) => {
        const p = prestadores.find(pres => pres.id === id);
        return p?.nome || 'N/A';
    };

    useEffect(() => {
        if (!remessaAbertaId) return;
        const next = {};
        for (const it of remessaItens || []) {
            const a = it?.autos_infracao;
            if (!a?.id) continue;
            const p = (pareceres || []).find(pp => pp.auto_id === a.id) || null;
            next[a.id] = {
                recomendacao: p?.recomendacao || 'aplicar_multa',
                valor_multa_sugerido: p?.valor_multa_sugerido != null ? String(p.valor_multa_sugerido) : '',
                analise_tecnica: p?.analise_tecnica || '',
                arquivo_parecer_assinado_url: p?.arquivo_parecer_assinado_url || ''
            };
        }
        setParecerForms(next);
    }, [remessaAbertaId, remessaItens, pareceres]);

    const salvarParecerAssinado = async (autoId, file) => {
        if (!autoId || !file || uploadingParecerAutoId) return;
        setUploadingParecerAutoId(autoId);
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
                status: 'finalizado'
            });
            await queryClient.invalidateQueries({ queryKey: ['pareceres-tecnicos'] });
            setParecerForms(prev => ({
                ...prev,
                [autoId]: { ...(prev[autoId] || {}), arquivo_parecer_assinado_url: url }
            }));
            alert('Parecer assinado salvo');
        } catch (err) {
            alert('Erro ao salvar parecer: ' + (err?.message || String(err)));
        } finally {
            setUploadingParecerAutoId(null);
        }
    };

    const encaminharParecerRemessa = async (remessa) => {
        if (!remessa?.id || enviandoParecerRemessaId) return;
        setEnviandoParecerRemessaId(remessa.id);
        try {
            const autoIds = (remessaItens || []).map(it => it?.autos_infracao?.id).filter(Boolean);
            const ok = autoIds.length > 0 && autoIds.every((id) => {
                const p = (pareceres || []).find(pp => pp.auto_id === id);
                return !!p?.arquivo_parecer_assinado_url;
            });
            if (!ok) throw new Error('Todos os autos precisam ter parecer assinado antes de encaminhar');
            await Repository.updateRemessaAIOnline(remessa.id, {
                parecer_enviado_em: new Date().toISOString(),
                status: 'parecer_enviado'
            });
            await queryClient.invalidateQueries({ queryKey: ['remessas-ai'] });
            alert('Parecer encaminhado à Câmara');
        } catch (err) {
            alert('Erro ao encaminhar: ' + (err?.message || String(err)));
        } finally {
            setEnviandoParecerRemessaId(null);
        }
    };

    const getMunicipioNome = (autoId) => {
         const auto = autos.find(a => a.id === autoId);
         const fisc = fiscalizacoes.find(f => f.id === auto?.fiscalizacao_id);
         const mun = municipios.find(m => m.id === fisc?.municipio_id);
         return mun?.nome || 'N/A';
     };

     const getNumeroProcesso = (autoId) => {
         const auto = autos.find(a => a.id === autoId);
         const termo = termos.find(t => t.fiscalizacao_id === auto?.fiscalizacao_id && t.prestador_servico_id === auto?.prestador_servico_id) || null;
         const fisc = fiscalizacoes.find(f => f.id === auto?.fiscalizacao_id);
         return termo?.numero_processo || fisc?.numero_processo || 'N/A';
     };

    const formatRfp = (termo) => {
        const tipo = String(termo?.tipo_relatorio || 'RFP').trim().toUpperCase();
        const raw = termo?.numero_rfp;
        if (!raw) return 'N/A';
        const str = String(raw).trim();
        if (/^(RFP|RFE|RAO)\//i.test(str) && str.includes('/')) return str;
        const camara = termo?.camara_tecnica || 'CT';
        const numero = String(parseInt(str.replace(/\D/g, '') || '0', 10)).padStart(3, '0');
        const year = termo?.data_geracao ? new Date(termo.data_geracao).getFullYear() : new Date().getFullYear();
        return `${tipo}/DSB/${camara}/${numero}/${year}`;
    };

    const getIdsRelacionados = (auto) => {
        const termo = termos.find(t => t.fiscalizacao_id === auto?.fiscalizacao_id && t.prestador_servico_id === auto?.prestador_servico_id) || null;
        const numeroTN = termo?.numero_termo_notificacao || termo?.numero_tn || termo?.numero_termo || 'N/A';
        const numeroRfp = formatRfp(termo);
        const numeroAm = termo?.numero_am || 'N/A';
        const fluxoManual = !!termo?.fluxo_manual;
        return { termo, numeroTN, numeroRfp, numeroAm, fluxoManual };
    };

    const formatDateBR = (valor) => {
        if (!valor) return '—';
        const d = new Date(valor);
        if (Number.isNaN(d.getTime())) return '—';
        return d.toLocaleDateString('pt-BR');
    };

    const autosPorStatus = {
        gerados: autos.filter(a => a.status === 'gerado'),
        enviados: autos.filter(a => a.status === 'enviado'),
        em_analise: autos.filter(a => a.status === 'em_analise'),
        finalizados: autos.filter(a => a.status === 'finalizado')
    };

    const gruposGerados = useMemo(() => {
        const acc = {};
        for (const a of autosPorStatus.gerados || []) {
            const key = `${a.prestador_servico_id}|${a.fiscalizacao_id}`;
            if (!acc[key]) {
                const ids = getIdsRelacionados(a);
                acc[key] = {
                    key,
                    prestadorId: a.prestador_servico_id,
                    fiscalizacaoId: a.fiscalizacao_id,
                    numeroTN: ids.numeroTN,
                    numeroRfp: ids.numeroRfp,
                    numeroAm: ids.numeroAm,
                    fluxoManual: ids.fluxoManual,
                    autos: []
                };
            }
            acc[key].autos.push(a);
        }
        return Object.values(acc).sort((a, b) => {
            const tnA = String(a.numeroTN || '');
            const tnB = String(b.numeroTN || '');
            if (tnA !== tnB) return tnA.localeCompare(tnB);
            return String(a.key).localeCompare(String(b.key));
        });
    }, [autosPorStatus.gerados, termos]);

    const gruposEnviados = useMemo(() => {
        const acc = {};
        for (const a of autosPorStatus.enviados || []) {
            const key = `${a.prestador_servico_id}|${a.fiscalizacao_id}`;
            if (!acc[key]) {
                const ids = getIdsRelacionados(a);
                const remessa = [...(remessas || [])]
                    .filter(r => r?.prestador_servico_id === a.prestador_servico_id && r?.fiscalizacao_id === a.fiscalizacao_id && String(r?.status || '') === 'enviada')
                    .sort((r1, r2) => String(r2?.enviada_em || '').localeCompare(String(r1?.enviada_em || '')))[0] || null;
                acc[key] = {
                    key,
                    prestadorId: a.prestador_servico_id,
                    fiscalizacaoId: a.fiscalizacao_id,
                    numeroTN: ids.numeroTN,
                    numeroRfp: ids.numeroRfp,
                    numeroAm: ids.numeroAm,
                    enviadoEm: remessa?.enviada_em || a?.data_envio || null,
                    autos: []
                };
            }
            acc[key].autos.push(a);
        }
        return Object.values(acc).sort((a, b) => {
            const tnA = String(a.numeroTN || '');
            const tnB = String(b.numeroTN || '');
            if (tnA !== tnB) return tnA.localeCompare(tnB);
            return String(a.key).localeCompare(String(b.key));
        });
    }, [autosPorStatus.enviados, termos, remessas]);

    const getAutoPenaRs = (auto) => {
        if (!penaBaseRsColumn) return 0;
        return Number(auto?.[penaBaseRsColumn] || 0);
    };

    const autosProntosParaRemessa = autosPorStatus.gerados.filter(a => {
        const penaUferms = Number(a?.pena_base_uferms || 0);
        const penaRs = getAutoPenaRs(a);
        return !!a?.arquivo_url && !!a?.prestador_servico_id && !!a?.fiscalizacao_id && penaUferms > 0 && penaRs > 0;
    });
    const gruposProntos = Object.values(
        autosProntosParaRemessa.reduce((acc, a) => {
            const key = `${a.prestador_servico_id}|${a.fiscalizacao_id}`;
            if (!acc[key]) acc[key] = { key, prestadorId: a.prestador_servico_id, fiscalizacaoId: a.fiscalizacao_id, autos: [] };
            acc[key].autos.push(a);
            return acc;
        }, {})
    );

    const criarEEnviarRemessa = async (grupo) => {
        const groupKey = grupo?.key;
        if (!groupKey || criandoRemessaKey) return;
        setCriandoRemessaKey(groupKey);
        try {
            const termo = termos.find(t => t.fiscalizacao_id === grupo.fiscalizacaoId && t.prestador_servico_id === grupo.prestadorId) || null;
            if (!termo?.id) throw new Error('TN não encontrado para este prestador/fiscalização');

            const jaExiste = remessas.some(r => r?.termo_id === termo.id && ['preparada', 'enviada', 'recebida', 'defesa_enviada', 'parecer_enviado'].includes(String(r?.status || '')));
            if (jaExiste) throw new Error('Já existe remessa para este TN');

            const remessa = await Repository.createRemessaAIOnline({
                termo_id: termo.id,
                fiscalizacao_id: grupo.fiscalizacaoId,
                prestador_servico_id: grupo.prestadorId,
                numero_rfp: formatRfp(termo) || termo.numero_rfp || null,
                numero_tn: termo.numero_tn || null,
                status: 'preparada',
                criada_em: new Date().toISOString()
            });

            for (const a of grupo.autos || []) {
                await Repository.addRemessaAIItem(remessa.id, a.id);
            }

            const doc = new jsPDF();
            doc.setFontSize(14);
            doc.text('Remessa de Autos de Infração', 14, 18);
            doc.setFontSize(10);
            doc.text(`Relatório: ${formatRfp(termo) || '—'}`, 14, 28);
            doc.text(`TN: ${termo.numero_tn || '—'}`, 14, 34);
            doc.text(`Prestador: ${getPrestadorNome(grupo.prestadorId)}`, 14, 40);
            doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`, 14, 46);

            doc.setFontSize(11);
            doc.text('Autos incluídos:', 14, 58);
            doc.setFontSize(10);
            let y = 66;
            const autosOrdenados = [...(grupo.autos || [])].sort((a, b) => String(a.numero_auto || '').localeCompare(String(b.numero_auto || '')));
            for (const a of autosOrdenados) {
                if (y > 280) {
                    doc.addPage();
                    y = 20;
                }
                doc.text(`- ${a.numero_auto || a.id}`, 16, y);
                y += 6;
            }

            const blob = doc.output('blob');
            const file = new File([blob], `remessa_${remessa.id}.pdf`, { type: 'application/pdf' });
            const ts = Date.now();
            const rand = Math.random().toString(36).slice(2, 8);
            const path = `remessas_ai/${remessa.id}/lista/${ts}-${rand}.pdf`;
            const up = await Repository.uploadDocumentoAutos(file, path);
            const url = `storage://${up.bucket}/${up.path}`;

            await Repository.updateRemessaAIOnline(remessa.id, {
                arquivo_lista_pdf_url: url,
                enviada_em: new Date().toISOString(),
                status: 'enviada'
            });

            const enviadaEm = new Date().toISOString();
            const prazoDias = 30;
            const dataLimite = new Date(Date.now() + prazoDias * 24 * 60 * 60 * 1000).toISOString();
            for (const a of grupo.autos || []) {
                const { error: updErr } = await supabase
                    .from('autos_infracao')
                    .update({ status: 'enviado', data_envio: enviadaEm, data_limite_manifestacao: dataLimite })
                    .eq('id', a.id);
                if (updErr) {
                    await Repository.updateAutoInfracaoOnlineStatus(a.id, 'enviado');
                }
            }

            await queryClient.invalidateQueries({ queryKey: ['remessas-ai'] });
            await queryClient.invalidateQueries({ queryKey: ['autos-infracao'] });
            setRemessaAbertaId(remessa.id);
            alert('Remessa enviada ao prestador');
        } catch (err) {
            alert('Erro ao enviar remessa: ' + (err?.message || String(err)));
        } finally {
            setCriandoRemessaKey(null);
        }
    };

    return (
        <AdminShell title="CATESA" subtitle="Câmara Técnica de Saneamento Básico">
            <div className="max-w-6xl mx-auto px-4 pt-8 pb-6">

                {/* Header */}
                <div className="mb-6">
                    <h1 className="text-xs font-bold uppercase tracking-widest text-slate-400">Autos de Infração</h1>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-8">
                    <Card className="border border-gray-200 rounded-2xl shadow-sm bg-white">
                        <CardContent className="p-5 text-center">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Gerados</p>
                            <p className="text-3xl font-bold text-gray-800">{autosPorStatus.gerados.length}</p>
                        </CardContent>
                    </Card>
                    <Card className="border border-gray-200 rounded-2xl shadow-sm bg-white">
                        <CardContent className="p-5 text-center">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Enviados</p>
                            <p className="text-3xl font-bold text-blue-600">{autosPorStatus.enviados.length}</p>
                        </CardContent>
                    </Card>
                    <Card className="border border-gray-200 rounded-2xl shadow-sm bg-white">
                        <CardContent className="p-5 text-center">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Em Análise</p>
                            <p className="text-3xl font-bold text-amber-600">{autosPorStatus.em_analise.length}</p>
                        </CardContent>
                    </Card>
                    <Card className="border border-gray-200 rounded-2xl shadow-sm bg-white">
                        <CardContent className="p-5 text-center">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Finalizados</p>
                            <p className="text-3xl font-bold text-emerald-600">{autosPorStatus.finalizados.length}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs */}
                <Tabs value={tab} onValueChange={setTab} className="w-full">
                    <TabsList className="flex w-full justify-start gap-1 overflow-x-auto sm:grid sm:grid-cols-5 sm:overflow-visible">
                        <TabsTrigger value="gerados" className="shrink-0">Gerados ({autosPorStatus.gerados.length})</TabsTrigger>
                        <TabsTrigger value="enviados" className="shrink-0">Enviados ({autosPorStatus.enviados.length})</TabsTrigger>
                        <TabsTrigger value="analise" className="shrink-0">Em Análise ({autosPorStatus.em_analise.length})</TabsTrigger>
                        <TabsTrigger value="finalizados" className="shrink-0">Finalizados ({autosPorStatus.finalizados.length})</TabsTrigger>
                        <TabsTrigger value="remessas" className="shrink-0">Remessas ({remessas.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="gerados" className="space-y-4">
                        {gruposGerados.map((grupo) => {
                            const first = (grupo.autos || [])[0] || null;
                            const infos = [];
                            if (grupo.numeroTN !== 'N/A') infos.push(`TN: ${grupo.numeroTN}`);
                            if (grupo.numeroRfp !== 'N/A') infos.push(`RFP: ${grupo.numeroRfp}`);
                            if (grupo.numeroAm !== 'N/A') infos.push(`AM: ${grupo.numeroAm}`);

                            const allReady = (grupo.autos || []).every((a) => {
                                const penaUferms = parseIntSafe(getPenaUfermsInput(a));
                                const penaRs = parseFloatSafe(getPenaRsInput(a));
                                return !!a?.arquivo_url && penaUferms > 0 && penaRs > 0;
                            });
                            const readyCount = (grupo.autos || []).filter((a) => {
                                const penaUferms = parseIntSafe(getPenaUfermsInput(a));
                                const penaRs = parseFloatSafe(getPenaRsInput(a));
                                return !!a?.arquivo_url && penaUferms > 0 && penaRs > 0;
                            }).length;

                            return (
                                <Card key={grupo.key}>
                                    <CardContent className="p-4 space-y-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <h3 className="font-semibold">
                                                    {infos.length > 0 ? infos.join(' | ') : 'Grupo de AIs'}
                                                </h3>
                                                {first ? (
                                                    <>
                                                        <p className="text-xs text-gray-500 mt-1">Prestador: {getPrestadorNome(first.prestador_servico_id)}</p>
                                                        <p className="text-xs text-gray-500">Município: {getMunicipioNome(first.id)}</p>
                                                        <p className="text-xs text-gray-500">Processo: {getNumeroProcesso(first.id)}</p>
                                                    </>
                                                ) : null}
                                            </div>
                                            {!grupo.fluxoManual ? (
                                                <div className="text-xs text-gray-600">
                                                    Prontos: {readyCount}/{(grupo.autos || []).length}
                                                </div>
                                            ) : null}
                                        </div>

                                        <div className="space-y-3">
                                            {(grupo.autos || [])
                                                .slice()
                                                .sort((a, b) => String(a.numero_auto || '').localeCompare(String(b.numero_auto || '')))
                                                .map((auto) => (
                                                    <div key={auto.id} className="border rounded p-3 bg-white">
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="flex-1">
                                                                <div className="font-medium">{auto.numero_auto}</div>
                                                                <div className="text-xs text-gray-500 mt-1">{auto.motivo_infracao}</div>
                                                            </div>
                                                            <FluxoUploadDocumentos
                                                                auto={auto}
                                                                fluxoManual={grupo.fluxoManual}
                                                                onUpdate={() => queryClient.invalidateQueries({ queryKey: ['autos-infracao'] })}
                                                            />
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-4 mt-3">
                                                            <div>
                                                                <Label>Pena Base (UFERMS)</Label>
                                                                <Input
                                                                    type="number"
                                                                    placeholder="0"
                                                                    className="mt-1"
                                                                    value={getPenaUfermsInput(auto)}
                                                                    onChange={(e) => setPenaBase(prev => ({ ...prev, [`${auto.id}-uferms`]: e.target.value }))}
                                                                />
                                                            </div>
                                                            <div>
                                                                <Label>Pena Base (R$)</Label>
                                                                <Input
                                                                    type="number"
                                                                    placeholder="0"
                                                                    step="0.01"
                                                                    className="mt-1"
                                                                    value={getPenaRsInput(auto)}
                                                                    onChange={(e) => setPenaBase(prev => ({ ...prev, [`${auto.id}-rs`]: e.target.value }))}
                                                                />
                                                            </div>
                                                        </div>

                                                        <Button
                                                            size="sm"
                                                            className="w-full bg-green-600 hover:bg-green-700 mt-3"
                                                            onClick={() => {
                                                                if (!penaBaseRsColumn && parseFloatSafe(getPenaRsInput(auto)) > 0) {
                                                                    alert('Configuração do banco: coluna da pena base (R$) não encontrada na tabela autos_infracao. Salvando apenas UFERMS.');
                                                                }
                                                                salvarPenaBaseMutation.mutate({
                                                                    autoId: auto.id,
                                                                    penaUferms: getPenaUfermsInput(auto),
                                                                    penaRs: getPenaRsInput(auto)
                                                                });
                                                            }}
                                                            disabled={salvandoAutoId === auto.id}
                                                        >
                                                            {salvandoAutoId === auto.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                                            {salvandoAutoId === auto.id ? 'Salvando...' : 'Salvar Alterações'}
                                                        </Button>
                                                    </div>
                                                ))}
                                        </div>

                                        {!grupo.fluxoManual ? (
                                            <>
                                                <Button
                                                    size="sm"
                                                    className="w-full bg-blue-600 hover:bg-blue-700"
                                                    disabled={!penaBaseRsColumn || !allReady || criandoRemessaKey === grupo.key || salvandoAutoId != null}
                                                    onClick={async () => {
                                                        try {
                                                            if (!penaBaseRsColumn) {
                                                                alert('Configuração do banco: coluna da pena base (R$) não encontrada na tabela autos_infracao.');
                                                                return;
                                                            }
                                                            for (const a of grupo.autos || []) {
                                                                await salvarPenaBaseMutation.mutateAsync({
                                                                    autoId: a.id,
                                                                    penaUferms: getPenaUfermsInput(a),
                                                                    penaRs: getPenaRsInput(a)
                                                                });
                                                            }
                                                            await criarEEnviarRemessa({
                                                                key: grupo.key,
                                                                prestadorId: grupo.prestadorId,
                                                                fiscalizacaoId: grupo.fiscalizacaoId,
                                                                autos: grupo.autos
                                                            });
                                                        } catch (_) {}
                                                    }}
                                                >
                                                    <Send className="h-4 w-4 mr-2" />
                                                    {criandoRemessaKey === grupo.key ? 'Enviando...' : 'Enviar ao prestador'}
                                                </Button>
                                                {!penaBaseRsColumn ? (
                                                    <p className="text-xs text-gray-500">
                                                        Configuração necessária: criar/ajustar a coluna da pena base (R$) na tabela autos_infracao.
                                                    </p>
                                                ) : !allReady ? (
                                                    <p className="text-xs text-gray-500">
                                                        Para enviar: todos os AIs do grupo precisam ter AI assinado e penas base preenchidas.
                                                    </p>
                                                ) : null}
                                            </>
                                        ) : null}
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </TabsContent>

                    <TabsContent value="enviados" className="space-y-4">
                        {gruposEnviados.map((grupo) => {
                            const infos = [];
                            if (grupo.numeroTN !== 'N/A') infos.push(`TN: ${grupo.numeroTN}`);
                            if (grupo.numeroRfp !== 'N/A') infos.push(`RFP: ${grupo.numeroRfp}`);
                            if (grupo.numeroAm !== 'N/A') infos.push(`AM: ${grupo.numeroAm}`);
                            const enviadosOrdenados = [...(grupo.autos || [])].sort((a, b) => String(a.numero_auto || '').localeCompare(String(b.numero_auto || '')));
                            const prazoAny = enviadosOrdenados.map(a => a?.data_limite_manifestacao).find(Boolean) || null;
                            return (
                                <Card key={grupo.key} className="border-blue-300">
                                    <CardContent className="p-4 space-y-3">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="flex-1">
                                                <div className="font-semibold">{infos.length > 0 ? infos.join(' | ') : 'Grupo de AIs'}</div>
                                                <p className="text-xs text-gray-500 mt-1">Enviado: {formatDateBR(grupo.enviadoEm)}</p>
                                                <p className="text-xs text-gray-500">Prazo até: {formatDateBR(prazoAny)}</p>
                                            </div>
                                            <Badge className="bg-blue-600">Enviado</Badge>
                                        </div>
                                        <div className="space-y-2">
                                            {enviadosOrdenados.map((auto) => (
                                                <div key={auto.id} className="flex items-center justify-between gap-3 border rounded p-3 bg-white">
                                                    <div className="text-sm font-medium">{auto.numero_auto}</div>
                                                    <div className="text-xs text-gray-600">{auto.motivo_infracao}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </TabsContent>

                    <TabsContent value="analise" className="space-y-4">
                        {autosPorStatus.em_analise.map(auto => (
                            <Card key={auto.id} className="border-orange-300">
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h3 className="font-semibold">{auto.numero_auto}</h3>
                                            <p className="text-xs text-gray-500">Aguardando parecer técnico</p>
                                            <p className="text-xs text-gray-500 mt-2">{auto.motivo_infracao}</p>
                                        </div>
                                        <Badge className="bg-orange-600">Em Análise</Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </TabsContent>

                    <TabsContent value="finalizados" className="space-y-4">
                        {autosPorStatus.finalizados.map(auto => (
                            <Card key={auto.id} className="border-purple-300">
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h3 className="font-semibold">{auto.numero_auto}</h3>
                                            <p className="text-xs text-gray-500">Prestador: {getPrestadorNome(auto.prestador_servico_id)}</p>
                                            <p className="text-xs text-gray-500">Município: {getMunicipioNome(auto.id)}</p>
                                        </div>
                                        <Badge className="bg-purple-600">Finalizado</Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </TabsContent>

                    <TabsContent value="remessas" className="space-y-4">
                        <Card className="border-green-200">
                            <CardContent className="p-4 space-y-3">
                                <div className="font-semibold">Criar e enviar remessas (AIs com PDF)</div>
                                {gruposProntos.length === 0 ? (
                                    <div className="text-sm text-gray-600">Nenhum grupo pronto (status gerado + AI assinada).</div>
                                ) : (
                                    <div className="space-y-2">
                                        {gruposProntos.map((g) => (
                                            <div key={g.key} className="flex flex-wrap items-center justify-between gap-2 border rounded p-3 bg-white">
                                                <div className="text-sm">
                                                    <div className="font-medium">{getPrestadorNome(g.prestadorId)}</div>
                                                    <div className="text-xs text-gray-600">{g.autos.length} autos</div>
                                                </div>
                                                <Button
                                                    className="bg-green-600 hover:bg-green-700"
                                                    disabled={criandoRemessaKey === g.key}
                                                    onClick={() => void criarEEnviarRemessa(g)}
                                                >
                                                    <Send className="h-4 w-4 mr-2" />
                                                    {criandoRemessaKey === g.key ? 'Enviando...' : 'Enviar remessa'}
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="p-4 space-y-3">
                                <div className="font-semibold">Remessas registradas</div>
                                {remessas.length === 0 ? (
                                    <div className="text-sm text-gray-600">Nenhuma remessa criada.</div>
                                ) : (
                                    <div className="space-y-2">
                                        {remessas.map((r) => (
                                            <Card key={r.id} className={remessaAbertaId === r.id ? 'border-blue-300' : ''}>
                                                <CardContent className="p-4 space-y-3">
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <div>
                                                            <div className="font-medium">{r.numero_rfp || 'RFP'}</div>
                                                            {r.numero_tn ? <div className="text-xs text-gray-600">TN: {r.numero_tn}</div> : null}
                                                            <div className="mt-1">
                                                                <Badge className="bg-gray-700">{r.status || 'preparada'}</Badge>
                                                            </div>
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {r.arquivo_lista_pdf_url ? (
                                                                <Button variant="outline" size="sm" onClick={() => void openArquivo(r.arquivo_lista_pdf_url)}>
                                                                    <Download className="h-4 w-4 mr-2" />
                                                                    Lista
                                                                </Button>
                                                            ) : null}
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => setRemessaAbertaId(remessaAbertaId === r.id ? null : r.id)}
                                                            >
                                                                {remessaAbertaId === r.id ? 'Fechar' : 'Abrir'}
                                                            </Button>
                                                        </div>
                                                    </div>

                                                    {remessaAbertaId === r.id ? (
                                                        <div className="space-y-3">
                                                            {(remessaItens || []).length === 0 ? (
                                                                <div className="text-sm text-gray-600">Nenhum item.</div>
                                                            ) : (
                                                                <>
                                                                    {r.status === 'defesa_enviada' ? (
                                                                        <div className="flex justify-end">
                                                                            <Button
                                                                                className="bg-purple-600 hover:bg-purple-700"
                                                                                disabled={enviandoParecerRemessaId === r.id || !((remessaItens || []).length > 0 && (remessaItens || []).every((it) => {
                                                                                    const a = it?.autos_infracao;
                                                                                    if (!a?.id) return false;
                                                                                    const p = (pareceres || []).find(pp => pp.auto_id === a.id);
                                                                                    return !!(p?.arquivo_parecer_assinado_url);
                                                                                }))}
                                                                                onClick={() => void encaminharParecerRemessa(r)}
                                                                            >
                                                                                {enviandoParecerRemessaId === r.id ? 'Encaminhando...' : 'Encaminhar parecer à Câmara'}
                                                                            </Button>
                                                                        </div>
                                                                    ) : null}

                                                                    {(remessaItens || []).map((it) => {
                                                                        const a = it?.autos_infracao;
                                                                        if (!a?.id) return null;
                                                                        const form = parecerForms[a.id] || { recomendacao: 'aplicar_multa', valor_multa_sugerido: '', analise_tecnica: '', arquivo_parecer_assinado_url: '' };
                                                                        const defesaArquivos = Array.isArray(a?.defesa_arquivos) ? a.defesa_arquivos : [];
                                                                        const parecerExistente = (pareceres || []).find(pp => pp.auto_id === a.id) || null;
                                                                        const parecerUrl = form.arquivo_parecer_assinado_url || parecerExistente?.arquivo_parecer_assinado_url || '';
                                                                        return (
                                                                            <Card key={it.id} className="border-gray-200">
                                                                                <CardContent className="p-4 space-y-3">
                                                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                                                        <div className="text-sm font-medium">{a.numero_auto || a.id}</div>
                                                                                        <div className="flex flex-wrap gap-2">
                                                                                            {a.arquivo_url ? (
                                                                                                <Button variant="outline" size="sm" onClick={() => void openArquivo(a.arquivo_url)}>
                                                                                                    <Download className="h-4 w-4 mr-2" />
                                                                                                    AI
                                                                                                </Button>
                                                                                            ) : (
                                                                                                <Badge className="bg-yellow-600">Sem PDF</Badge>
                                                                                            )}
                                                                                            {parecerUrl ? (
                                                                                                <Button variant="outline" size="sm" onClick={() => void openArquivo(parecerUrl)}>
                                                                                                    <Download className="h-4 w-4 mr-2" />
                                                                                                    Parecer
                                                                                                </Button>
                                                                                            ) : null}
                                                                                        </div>
                                                                                    </div>

                                                                                    {String(a?.defesa_texto || '').trim() ? (
                                                                                        <div className="text-sm">
                                                                                            <div className="text-xs text-gray-600 mb-1">Defesa (texto)</div>
                                                                                            <div className="border rounded p-2 bg-white text-gray-800">{a.defesa_texto}</div>
                                                                                        </div>
                                                                                    ) : null}

                                                                                    {defesaArquivos.length > 0 ? (
                                                                                        <div className="space-y-2">
                                                                                            <div className="text-xs text-gray-600">Defesa (anexos)</div>
                                                                                            <div className="flex flex-wrap gap-2">
                                                                                                {defesaArquivos.map((arq, idx) => (
                                                                                                    <Button key={idx} size="sm" variant="outline" onClick={() => void openArquivo(arq)}>
                                                                                                        <Download className="h-4 w-4 mr-2" />
                                                                                                        {arq?.nome || `Anexo ${idx + 1}`}
                                                                                                    </Button>
                                                                                                ))}
                                                                                            </div>
                                                                                        </div>
                                                                                    ) : null}

                                                                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                                                                        <div>
                                                                                            <Label className="text-xs">Recomendação</Label>
                                                                                            <Input
                                                                                                value={form.recomendacao || ''}
                                                                                                onChange={(e) => setParecerForms(prev => ({ ...prev, [a.id]: { ...(prev[a.id] || {}), recomendacao: e.target.value } }))}
                                                                                            />
                                                                                        </div>
                                                                                        <div>
                                                                                            <Label className="text-xs">Valor sugerido (R$)</Label>
                                                                                            <Input
                                                                                                type="number"
                                                                                                value={form.valor_multa_sugerido || ''}
                                                                                                onChange={(e) => setParecerForms(prev => ({ ...prev, [a.id]: { ...(prev[a.id] || {}), valor_multa_sugerido: e.target.value } }))}
                                                                                            />
                                                                                        </div>
                                                                                        <div>
                                                                                            <Label className="text-xs">Parecer assinado (PDF)</Label>
                                                                                            <Input
                                                                                                type="file"
                                                                                                accept=".pdf,application/pdf"
                                                                                                disabled={uploadingParecerAutoId === a.id}
                                                                                                onChange={async (e) => {
                                                                                                    const file = e.target.files?.[0];
                                                                                                    if (!file) return;
                                                                                                    await salvarParecerAssinado(a.id, file);
                                                                                                    e.target.value = '';
                                                                                                }}
                                                                                            />
                                                                                        </div>
                                                                                    </div>

                                                                                    <div>
                                                                                        <Label className="text-xs">Análise técnica</Label>
                                                                                        <Textarea
                                                                                            value={form.analise_tecnica || ''}
                                                                                            onChange={(e) => setParecerForms(prev => ({ ...prev, [a.id]: { ...(prev[a.id] || {}), analise_tecnica: e.target.value } }))}
                                                                                            className="min-h-20"
                                                                                        />
                                                                                    </div>
                                                                                </CardContent>
                                                                            </Card>
                                                                        );
                                                                    })}
                                                                </>
                                                            )}
                                                        </div>
                                                    ) : null}
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </AdminShell>
    );
}
