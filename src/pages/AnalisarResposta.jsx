import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Repository } from '@/lib/offline/repository';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { Download, CheckCircle, XCircle, AlertCircle, Eye, Lock } from 'lucide-react';
import CatesaLayout from '@/components/camaras/CatesaLayout';





export default function AnalisarResposta() {
    const [searchParams] = useSearchParams();
    const termoId = searchParams.get('termo');
    const queryClient = useQueryClient();
    const [detalheDeterminacao, setDetalheDeterminacao] = useState(null);
    const [analiseForm, setAnaliseForm] = useState({
        status: '',
        manifestacao_prestador: '',
        descricao_atendimento: '',
        dentro_prazo: true
    });
    const [confirmDialog, setConfirmDialog] = useState({ open: false, determinacao: null });
    const [signedEvidencias, setSignedEvidencias] = useState({});

    const formatDateBr = (input) => {
        if (!input) return 'N/A';
        const raw = String(input);
        const d = new Date(raw.includes('T') ? raw : `${raw}T00:00:00`);
        if (Number.isNaN(d.getTime())) return raw;
        return d.toLocaleDateString('pt-BR');
    };

    const formatRelatorioTN = (t) => {
        const tipo = String(t?.tipo_relatorio || 'RFP').trim().toUpperCase();
        const raw = t?.numero_rfp || '';
        if (!raw) return '';
        const str = String(raw).trim();
        if (/^(RFP|RFE|RAO)\//i.test(str) && str.includes('/')) return str;
        const camara = t?.camara_tecnica ? String(t.camara_tecnica).trim() : '';
        const anoBase = t?.data_geracao || t?.created_at || t?.updated_at || Date.now();
        const ano = new Date(anoBase).getFullYear();
        const num = String(parseInt(str.replace(/\D/g, '') || '0', 10)).padStart(3, '0');
        if (!camara) return str;
        return `${tipo}/DSB/${camara}/${num}/${ano}`;
    };

    const openArquivo = async (arq) => {
        try {
            const signed = await Repository.getSignedUrlFromAny(arq);
            if (signed) window.open(signed, '_blank');
        } catch (err) {
            alert('Erro ao abrir arquivo: ' + (err?.message || String(err)));
        }
    };

    const { data: termo } = useQuery({
        queryKey: ['termo', termoId],
        queryFn: async () => {
            const data = await Repository.getTermoNotificacaoByIdOnline(termoId);
            return data;
        },
        enabled: !!termoId
    });

    const { data: fiscalizacao } = useQuery({
        queryKey: ['fiscalizacao', termo?.fiscalizacao_id],
        queryFn: async () => {
            const data = await Repository.getFiscalizacaoById(termo.fiscalizacao_id);
            return data;
        },
        enabled: !!termo
    });

    const { data: unidadesFiscalizadas = [] } = useQuery({
        queryKey: ['unidades-fiscalizadas', fiscalizacao?.id],
        queryFn: async () => {
            const data = await Repository.listUnidadesByFiscalizacao(fiscalizacao.id, 200);
            return data;
        },
        enabled: !!fiscalizacao
    });

    const { data: determinacoes = [] } = useQuery({
        queryKey: ['determinacoes', unidadesFiscalizadas],
        queryFn: async () => {
            if (unidadesFiscalizadas.length === 0) return [];
            const unidadeIds = unidadesFiscalizadas.map(u => u.id);
            const data = await Repository.listDeterminacoesOnlineByUnidades(unidadeIds);
            return data.sort((a, b) => {
                const numA = parseInt(a.numero_determinacao?.replace(/\D/g, '') || '0');
                const numB = parseInt(b.numero_determinacao?.replace(/\D/g, '') || '0');
                return numA - numB;
            });
        },
        enabled: unidadesFiscalizadas.length > 0
    });

    const unidadeIds = useMemo(() => unidadesFiscalizadas.map((u) => u.id), [unidadesFiscalizadas]);

    const { data: ncs = [] } = useQuery({
        queryKey: ['nao-conformidades', unidadeIds.join(',')],
        queryFn: async () => {
            const data = await Repository.listNaoConformidadesOnlineByUnidades(unidadeIds);
            return data || [];
        },
        enabled: unidadeIds.length > 0
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
        enabled: unidadeIds.length > 0
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
        enabled: unidadeIds.length > 0
    });

    const { data: respostas = [] } = useQuery({
        queryKey: ['respostas-determinacao'],
        queryFn: async () => {
            const data = await Repository.listRespostasDeterminacaoOnlineAll();
            return data;
        }
    });

    const { data: municipios = [] } = useQuery({
        queryKey: ['municipios'],
        queryFn: async () => {
            const data = await Repository.listMunicipios();
            return data;
        }
    });

    const { data: prestadores = [] } = useQuery({
        queryKey: ['prestadores'],
        queryFn: async () => {
            const data = await Repository.listPrestadoresFull();
            return data;
        }
    });

    const salvarAnaliseMutation = useMutation({
        mutationFn: async ({ determinacaoId, status, manifestacao, descricao }) => {
            const resposta = respostas.find(r => r.determinacao_id === determinacaoId);
            
            if (resposta) {
                const data = await Repository.updateRespostaDeterminacaoOnline(resposta.id, {
                    status,
                    descricao_atendimento: descricao,
                    data_resposta: new Date().toISOString()
                });
                return data;
            } else {
                const data = await Repository.createRespostaDeterminacaoOnline({
                    determinacao_id: determinacaoId,
                    status,
                    manifestacao_prestador: manifestacao,
                    descricao_atendimento: descricao,
                    data_resposta: new Date().toISOString(),
                    dentro_prazo: true
                });
                return data;
            }
        },
        onSuccess: async (data, variables) => {
            await queryClient.invalidateQueries({ queryKey: ['respostas-determinacao'] });

            alert('Análise salva com sucesso!');
            setDetalheDeterminacao(null);
            setAnaliseForm({ status: '', manifestacao_prestador: '', descricao_atendimento: '', dentro_prazo: true });
        }
    });

    const { data: autosExistentes = [] } = useQuery({
        queryKey: ['autos-da-fiscalizacao', fiscalizacao?.id],
        queryFn: async () => {
            if (!fiscalizacao?.id) return [];
            const { data, error } = await supabase
                .from('autos_infracao')
                .select('id, determinacao_id')
                .eq('fiscalizacao_id', fiscalizacao.id);
            if (error) throw error;
            return data || [];
        },
        enabled: !!fiscalizacao?.id
    });

    const gerarAutosMutation = useMutation({
        mutationFn: async (dets) => {
            if (!fiscalizacao?.id) throw new Error('Fiscalização não encontrada');
            const records = dets.map(det => ({
                fiscalizacao_id: fiscalizacao.id,
                determinacao_id: det.id,
                prestador_servico_id: fiscalizacao.prestador_servico_id,
                descricao: det.descricao || det.texto || `Determinação ${det.numero_determinacao || det.id}`,
                status: 'pendente',
            }));
            const { error } = await supabase.from('autos_infracao').insert(records);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['autos-da-fiscalizacao', fiscalizacao?.id] });
            alert('Autos de Infração gerados com sucesso!');
        },
        onError: (err) => {
            alert('Erro ao gerar autos: ' + (err?.message || String(err)));
        }
    });

    const getMunicipioNome = (id) => municipios.find(m => m.id === id)?.nome || 'N/A';
    const getPrestadorNome = (id) => prestadores.find(p => p.id === id)?.nome || 'N/A';

    const getStatusResposta = (detId) => {
        const resp = respostas.find(r => r.determinacao_id === detId);
        return resp?.status || 'pendente';
    };

    const unidadesOrdenadas = useMemo(() => {
        const arr = unidadesFiscalizadas.slice();
        arr.sort((a, b) => {
            const ca = a?.created_at || '';
            const cb = b?.created_at || '';
            if (ca !== cb) return String(ca).localeCompare(String(cb));
            return String(a?.id || '').localeCompare(String(b?.id || ''));
        });
        return arr;
    }, [unidadesFiscalizadas]);

    const numeracaoByUnidadeId = useMemo(() => {
        let contadores = { constatacoes: 0, ncs: 0 };

        const parseNumeroConstatacao = (valor) => {
            const n = parseInt(String(valor || '').replace(/[^\d]/g, ''), 10);
            return Number.isFinite(n) ? n : 9999;
        };

        const out = {};

        for (const u of unidadesOrdenadas) {
            const respostasU = (respostasChecklist || []).filter(r => r?.unidade_fiscalizada_id === u.id);
            const manuaisU = (constatacoesManuais || []).filter(m => m?.unidade_fiscalizada_id === u.id);
            const ncsU = (ncs || []).filter(n => n?.unidade_fiscalizada_id === u.id);
            const detsU = (determinacoes || []).filter(d => d?.unidade_fiscalizada_id === u.id);

            const mapeamento = { constatacoes: {}, ncs: {}, determinacoes: {} };

            const constItensOrdenados = [
                ...respostasU
                    .filter(r => r?.resposta === 'SIM' || r?.resposta === 'NAO')
                    .map(r => ({ id: r.id, numero_constatacao: r.numero_constatacao, created_at: r.created_at })),
                ...manuaisU.map(m => ({ id: m.id, numero_constatacao: m.numero_constatacao, created_at: m.created_at }))
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
                mapeamento.constatacoes[c.id] = contadores.constatacoes;
            });

            const ncsOrd = [...ncsU].sort((a, b) => {
                const respA = respostasU.find(r => r.id === a.resposta_checklist_id);
                const respB = respostasU.find(r => r.id === b.resposta_checklist_id);
                const manualA = manuaisU.find(cm => !a.resposta_checklist_id && a.descricao && cm.numero_constatacao && a.descricao.includes(cm.numero_constatacao));
                const manualB = manuaisU.find(cm => !b.resposta_checklist_id && b.descricao && cm.numero_constatacao && b.descricao.includes(cm.numero_constatacao));

                const ordConstA = respA
                    ? mapeamento.constatacoes[respA.id]
                    : (manualA ? mapeamento.constatacoes[manualA.id] : 9999);
                const ordConstB = respB
                    ? mapeamento.constatacoes[respB.id]
                    : (manualB ? mapeamento.constatacoes[manualB.id] : 9999);
                return (ordConstA ?? 9999) - (ordConstB ?? 9999);
            });

            ncsOrd.forEach((nc) => {
                contadores.ncs++;
                mapeamento.ncs[nc.id] = contadores.ncs;
            });

            const detsOrd = [...detsU].sort((a, b) => {
                const ordNcA = mapeamento.ncs[a.nao_conformidade_id] ?? 9999;
                const ordNcB = mapeamento.ncs[b.nao_conformidade_id] ?? 9999;
                if (ordNcA !== ordNcB) return ordNcA - ordNcB;
                const numA = parseInt(String(a.numero_determinacao || '').replace(/[^\d]/g, '') || '999', 10);
                const numB = parseInt(String(b.numero_determinacao || '').replace(/[^\d]/g, '') || '999', 10);
                return numA - numB;
            });

            detsOrd.forEach((det) => {
                const numNcRelacionado = mapeamento.ncs[det.nao_conformidade_id];
                const fallbackDet = parseInt(String(det.numero_determinacao || '').replace(/[^\d]/g, '') || '999', 10);
                mapeamento.determinacoes[det.id] = numNcRelacionado ?? fallbackDet;
            });

            out[u.id] = mapeamento;
        }

        return out;
    }, [unidadesOrdenadas, respostasChecklist, constatacoesManuais, ncs, determinacoes]);

    const determinacoesOrdenadas = useMemo(() => {
        const out = [];
        for (const u of unidadesOrdenadas) {
            const mapeamento = numeracaoByUnidadeId[u.id] || null;
            const ncsU = (ncs || []).filter(n => n?.unidade_fiscalizada_id === u.id);
            const ncsSorted = [...ncsU].sort((a, b) => (mapeamento?.ncs?.[a.id] ?? 9999) - (mapeamento?.ncs?.[b.id] ?? 9999));
            const posPorNc = {};
            ncsSorted.forEach((nc, idx) => { posPorNc[nc.id] = idx; });

            const detsU = (determinacoes || []).filter(d => d?.unidade_fiscalizada_id === u.id);
            const detsSorted = [...detsU].sort((a, b) => {
                const posA = posPorNc[a.nao_conformidade_id] ?? 9999;
                const posB = posPorNc[b.nao_conformidade_id] ?? 9999;
                if (posA !== posB) return posA - posB;
                const numA = parseInt(String(a.numero_determinacao || '').replace(/[^\d]/g, '') || '999', 10);
                const numB = parseInt(String(b.numero_determinacao || '').replace(/[^\d]/g, '') || '999', 10);
                return numA - numB;
            });
            out.push(...detsSorted);
        }
        return out;
    }, [unidadesOrdenadas, numeracaoByUnidadeId, ncs, determinacoes]);

    const getNumeroDeterminacaoExibicao = (det) => {
        if (!det) return 'N/A';
        const unidadeId = det?.unidade_fiscalizada_id;
        const mapeamento = unidadeId ? numeracaoByUnidadeId[unidadeId] : null;
        const mapped = det?.id ? mapeamento?.determinacoes?.[det.id] : null;
        if (mapped) return `D${mapped}`;
        return det?.numero_determinacao || 'N/A';
    };

    const detIndexById = useMemo(() => {
        const m = new Map();
        determinacoesOrdenadas.forEach((d, idx) => m.set(d.id, idx));
        return m;
    }, [determinacoesOrdenadas]);

    const determinacoesPorUnidade = useMemo(() => {
        const by = new Map();
        for (const u of unidadesOrdenadas) by.set(u.id, []);
        for (const det of determinacoesOrdenadas) {
            const uid = det?.unidade_fiscalizada_id;
            if (!uid) continue;
            if (!by.has(uid)) by.set(uid, []);
            by.get(uid).push(det);
        }
        return by;
    }, [unidadesOrdenadas, determinacoesOrdenadas]);

    const evidenciaKey = (ev, idx) => {
        if (!ev) return `idx:${idx}`;
        if (ev.bucket && ev.path) return `${ev.bucket}:${ev.path}`;
        const url = ev.url || ev;
        const parsed = Repository.parseStorageUrl(url);
        if (parsed) return `${parsed.bucket}:${parsed.path}`;
        return String(url || `idx:${idx}`);
    };

    const isImageEvidence = (ev) => {
        const tipo = String(ev?.tipo || '');
        if (tipo.startsWith('image/')) return true;
        const nome = String(ev?.nome || ev?.path || ev?.url || ev || '');
        return /\.(png|jpe?g|webp|gif|bmp)$/i.test(nome);
    };

    const evidenciasAtuais = useMemo(() => {
        if (!detalheDeterminacao) return [];
        const respDet = respostas.find(r => r.determinacao_id === detalheDeterminacao.id);
        const evidenciasResp = Array.isArray(respDet?.evidencias) ? respDet.evidencias : [];
        const arquivosResposta = Array.isArray(termo?.arquivos_resposta) ? termo.arquivos_resposta : [];
        const detId = detalheDeterminacao.id;
        const evidenciasFallback = arquivosResposta.filter((a) => {
            if (a?.categoria !== 'evidencia_determinacao') return false;
            if (a?.determinacao_id === detId) return true;
            const p = typeof a?.path === 'string' ? String(a.path) : '';
            return !!p && p.startsWith(`${detId}/`);
        });
        const merged = [...evidenciasResp, ...evidenciasFallback].filter(Boolean);
        const seen = new Set();
        const out = [];
        for (let i = 0; i < merged.length; i++) {
            const ev = merged[i];
            const k = evidenciaKey(ev, i);
            if (seen.has(k)) continue;
            seen.add(k);
            out.push(ev);
        }
        return out;
    }, [detalheDeterminacao, respostas, termo]);

    useEffect(() => {
        let alive = true;
        const load = async () => {
            if (!detalheDeterminacao) {
                setSignedEvidencias({});
                return;
            }
            const next = {};
            await Promise.all(
                (evidenciasAtuais || []).map(async (ev, idx) => {
                    if (!isImageEvidence(ev)) return;
                    try {
                        const signed = await Repository.getSignedUrlFromAny(ev);
                        if (signed) next[evidenciaKey(ev, idx)] = signed;
                    } catch {}
                })
            );
            if (alive) setSignedEvidencias(next);
        };
        load();
        return () => {
            alive = false;
        };
    }, [detalheDeterminacao, evidenciasAtuais]);

    const autosExistentesPorDetId = useMemo(
        () => new Set((autosExistentes || []).map(a => a.determinacao_id).filter(Boolean)),
        [autosExistentes]
    );

    const naoAtendidasSemAI = useMemo(() => {
        if (!determinacoesOrdenadas.length) return [];
        const allAnalyzed = determinacoesOrdenadas.every(d => {
            const s = getStatusResposta(d.id);
            return s === 'atendida' || s === 'nao_atendida';
        });
        if (!allAnalyzed) return [];
        return determinacoesOrdenadas.filter(
            d => getStatusResposta(d.id) === 'nao_atendida' && !autosExistentesPorDetId.has(d.id)
        );
    }, [determinacoesOrdenadas, respostas, autosExistentesPorDetId]);

    const podeAnalisar = (index) => {
        if (index === 0) return true;
        const determinacaoAnterior = determinacoesOrdenadas[index - 1];
        const statusAnterior = getStatusResposta(determinacaoAnterior.id);
        return statusAnterior === 'atendida' || statusAnterior === 'nao_atendida';
    };

    const handleAbrirAnalise = (det, index) => {
         if (!podeAnalisar(index)) {
             alert('Você deve analisar as determinações na ordem sequencial. Analise a determinação anterior primeiro.');
             return;
         }
         setDetalheDeterminacao(det);
         const resp = respostas.find(r => r.determinacao_id === det.id);
         if (resp) {
             setAnaliseForm({
                 status: resp.status,
                 manifestacao_prestador: resp.manifestacao_prestador || '',
                 descricao_atendimento: resp.descricao_atendimento || '',
                 dentro_prazo: resp.dentro_prazo
             });
         } else {
             // Resetar formulário para nova análise
             setAnaliseForm({
                 status: '',
                 manifestacao_prestador: '',
                 descricao_atendimento: '',
                 dentro_prazo: true
             });
         }
     };

    const handleSalvarAnalise = () => {
        if (!analiseForm.status || !analiseForm.manifestacao_prestador || !analiseForm.descricao_atendimento) {
            alert('Preencha todos os campos obrigatórios');
            return;
        }
        setConfirmDialog({ open: true, determinacao: detalheDeterminacao });
    };

    const confirmarAnalise = () => {
        const det = confirmDialog.determinacao || detalheDeterminacao;
        if (!det?.id) {
            setConfirmDialog({ open: false, determinacao: null });
            return;
        }
        salvarAnaliseMutation.mutate({
            determinacaoId: det.id,
            status: analiseForm.status,
            manifestacao: analiseForm.manifestacao_prestador,
            descricao: analiseForm.descricao_atendimento
        });
        setConfirmDialog({ open: false, determinacao: null });
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

    return (
        <CatesaLayout>
                <div className="max-w-6xl mx-auto px-4">

                {/* Info do TN */}
                <Card className="border border-gray-200 rounded-2xl shadow-sm bg-white mb-6">
                    <CardHeader>
                        <CardTitle>{termo.numero_termo_notificacao || termo.numero_termo}</CardTitle>
                        {termo.numero_rfp && (
                            <p className="text-sm text-blue-600 font-medium mt-1">
                                {formatRelatorioTN(termo)}
                            </p>
                        )}
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="font-medium">Município:</span> {getMunicipioNome(termo.municipio_id)}
                            </div>
                            <div>
                                <span className="font-medium">Prestador:</span> {getPrestadorNome(termo.prestador_servico_id)}
                            </div>
                            <div>
                                <span className="font-medium">Data de resposta:</span> {formatDateBr(termo.data_recebimento_resposta)}
                            </div>
                            <div>
                                <span className="font-medium">Processo:</span> {termo.numero_processo || 'N/A'}
                            </div>
                            <div>
                                <span className="font-medium">Câmara:</span> {termo.camara_tecnica}
                            </div>
                            <div className="col-span-2">
                                <span className="font-medium">Serviços:</span> {fiscalizacao?.servicos?.join(', ') || 'N/A'}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Lista de Determinações */}
                <div className="space-y-4">
                    {unidadesOrdenadas.map((unidade) => {
                        const dets = determinacoesPorUnidade.get(unidade.id) || [];
                        if (dets.length === 0) return null;
                        return (
                            <Card key={unidade.id} className="border border-gray-200 rounded-2xl bg-white shadow-sm mb-6">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base">
                                        Unidade: {unidade.codigo_unidade || unidade.codigo || unidade.id}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {dets.map((det) => {
                                        const index = detIndexById.get(det.id) ?? 0;
                                        const status = getStatusResposta(det.id);
                                        const bloqueado = !podeAnalisar(index);
                                        const mapeamento = numeracaoByUnidadeId[det.unidade_fiscalizada_id] || null;
                                        const nc = ncs.find((n) => n.id === det.nao_conformidade_id);
                                        const respostaRelacionada = nc?.resposta_checklist_id ? respostasChecklist.find((r) => r.id === nc.resposta_checklist_id) : null;
                                        const manualRelacionada = !nc?.resposta_checklist_id
                                            ? (constatacoesManuais || []).find((cm) => cm?.numero_constatacao && nc?.descricao && String(nc.descricao).includes(cm.numero_constatacao))
                                            : null;
                                        const novoNumNC = nc?.id && mapeamento?.ncs?.[nc.id] ? `NC${mapeamento.ncs[nc.id]}` : (nc?.numero_nc || 'N/A');
                                        const novoNumDet = det?.id && mapeamento?.determinacoes?.[det.id] ? `D${mapeamento.determinacoes[det.id]}` : (det.numero_determinacao || 'N/A');

                                        let numConstatacaoNovo = '';
                                        if (respostaRelacionada?.id && mapeamento?.constatacoes?.[respostaRelacionada.id]) {
                                            numConstatacaoNovo = `C${mapeamento.constatacoes[respostaRelacionada.id]}`;
                                        } else if (manualRelacionada?.id && mapeamento?.constatacoes?.[manualRelacionada.id]) {
                                            numConstatacaoNovo = `C${mapeamento.constatacoes[manualRelacionada.id]}`;
                                        } else if (respostaRelacionada?.numero_constatacao) {
                                            numConstatacaoNovo = String(respostaRelacionada.numero_constatacao);
                                        } else if (manualRelacionada?.numero_constatacao) {
                                            numConstatacaoNovo = String(manualRelacionada.numero_constatacao);
                                        }

                                        const descricaoNC = numConstatacaoNovo
                                            ? `Constatação ${numConstatacaoNovo}: não cumprimento do ${nc?.artigo_portaria || 'artigo'};`
                                            : (nc?.descricao || '');

                                        let textoDet = det?.descricao || '';
                                        if (novoNumNC && typeof textoDet === 'string') {
                                            textoDet = textoDet.replace(/NC\d+/g, novoNumNC);
                                        }
                                        if (textoDet && !textoDet.trim().endsWith('.')) textoDet = `${textoDet.trim()}.`;
                                        if (textoDet && !textoDet.includes('Prazo:') && det?.prazo_dias) textoDet = `${textoDet} Prazo: ${det.prazo_dias} dias.`;

                                        const statusIcon = status === 'atendida' ? <CheckCircle className="h-5 w-5 text-green-600" /> :
                                                        status === 'nao_atendida' ? <XCircle className="h-5 w-5 text-red-600" /> :
                                                        status === 'aguardando_analise' ? <AlertCircle className="h-5 w-5 text-yellow-600" /> :
                                                        <AlertCircle className="h-5 w-5 text-gray-400" />;

                                        return (
                                            <Card key={det.id} className={`${bloqueado ? 'opacity-50' : 'hover:shadow-md transition-shadow'} border border-slate-200 rounded-2xl overflow-hidden bg-white mb-4`}>
                                                <CardContent className="p-4">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                {statusIcon}
                                                                <h3 className="font-semibold text-lg">
                                                                    {novoNumDet}
                                                                    {textoDet ? ` - ${textoDet}` : ''}
                                                                </h3>
                                                                {bloqueado && <Lock className="h-4 w-4 text-gray-400" />}
                                                            </div>
                                                            <div className="text-xs text-gray-600 space-y-1 mb-2">
                                                                {nc && (
                                                                    <div>
                                                                        <span className="font-medium">NC:</span> {novoNumNC} {descricaoNC ? `- ${descricaoNC}` : ''}
                                                                    </div>
                                                                )}
                                                                {(respostaRelacionada || manualRelacionada) && (
                                                                    <div>
                                                                        <span className="font-medium">Constatação:</span>{' '}
                                                                        {numConstatacaoNovo || 'N/A'} {(respostaRelacionada?.pergunta || manualRelacionada?.descricao) ? `- ${respostaRelacionada?.pergunta || manualRelacionada?.descricao}` : ''}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex gap-2">
                                                                {status === 'atendida' && <Badge className="bg-green-600">Acatada</Badge>}
                                                                {status === 'nao_atendida' && <Badge className="bg-red-600">Não acatada</Badge>}
                                                                {status === 'aguardando_analise' && <Badge className="bg-yellow-600">Aguardando Análise</Badge>}
                                                                {status === 'pendente' && <Badge className="bg-gray-500">Pendente</Badge>}
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-2">
                                                            {(status === 'atendida' || status === 'nao_atendida') && (
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    onClick={() => handleAbrirAnalise(det, index)}
                                                                >
                                                                    <Eye className="h-4 w-4 mr-1" />
                                                                    Visualizar
                                                                </Button>
                                                            )}
                                                            {status !== 'atendida' && status !== 'nao_atendida' && (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => handleAbrirAnalise(det, index)}
                                                                    disabled={bloqueado}
                                                                    className="bg-blue-600 hover:bg-blue-700"
                                                                >
                                                                    Analisar
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        );
                                    })}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Dialog de Análise */}
                <Dialog open={detalheDeterminacao !== null} onOpenChange={(open) => !open && setDetalheDeterminacao(null)}>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl">
                        <DialogHeader>
                            {(() => {
                                const det = detalheDeterminacao;
                                const mapeamento = det?.unidade_fiscalizada_id ? numeracaoByUnidadeId[det.unidade_fiscalizada_id] : null;
                                const novoNumDet = det?.id && mapeamento?.determinacoes?.[det.id] ? `D${mapeamento.determinacoes[det.id]}` : det?.numero_determinacao;
                                return <DialogTitle>Análise da Determinação {novoNumDet}</DialogTitle>;
                            })()}
                        </DialogHeader>
                        {detalheDeterminacao && (
                            <div className="space-y-4">
                                {(() => {
                                    const det = detalheDeterminacao;
                                    const unidade = unidadesFiscalizadas.find((u) => u.id === det?.unidade_fiscalizada_id);
                                    const mapeamento = det?.unidade_fiscalizada_id ? numeracaoByUnidadeId[det.unidade_fiscalizada_id] : null;
                                    const nc = ncs.find((n) => n.id === det?.nao_conformidade_id);
                                    const respostaRelacionada = nc?.resposta_checklist_id ? respostasChecklist.find((r) => r.id === nc.resposta_checklist_id) : null;
                                    const manualRelacionada = !nc?.resposta_checklist_id
                                        ? (constatacoesManuais || []).find((cm) => cm?.numero_constatacao && nc?.descricao && String(nc.descricao).includes(cm.numero_constatacao))
                                        : null;
                                    const novoNumNC = nc?.id && mapeamento?.ncs?.[nc.id] ? `NC${mapeamento.ncs[nc.id]}` : (nc?.numero_nc || 'N/A');

                                    let numConstatacaoNovo = '';
                                    if (respostaRelacionada?.id && mapeamento?.constatacoes?.[respostaRelacionada.id]) {
                                        numConstatacaoNovo = `C${mapeamento.constatacoes[respostaRelacionada.id]}`;
                                    } else if (manualRelacionada?.id && mapeamento?.constatacoes?.[manualRelacionada.id]) {
                                        numConstatacaoNovo = `C${mapeamento.constatacoes[manualRelacionada.id]}`;
                                    } else if (respostaRelacionada?.numero_constatacao) {
                                        numConstatacaoNovo = String(respostaRelacionada.numero_constatacao);
                                    } else if (manualRelacionada?.numero_constatacao) {
                                        numConstatacaoNovo = String(manualRelacionada.numero_constatacao);
                                    }

                                    const descricaoNC = numConstatacaoNovo
                                        ? `Constatação ${numConstatacaoNovo}: não cumprimento do ${nc?.artigo_portaria || 'artigo'};`
                                        : (nc?.descricao || '');

                                    return (
                                        <div className="text-xs text-gray-600 space-y-1">
                                            <div>
                                                <span className="font-medium">Unidade:</span> {unidade?.codigo_unidade || unidade?.codigo || unidade?.id || 'N/A'}
                                            </div>
                                            <div>
                                                <span className="font-medium">NC:</span> {novoNumNC} {descricaoNC ? `- ${descricaoNC}` : ''}
                                            </div>
                                            <div>
                                                <span className="font-medium">Constatação:</span>{' '}
                                                {numConstatacaoNovo || 'N/A'} {(respostaRelacionada?.pergunta || manualRelacionada?.descricao) ? `- ${respostaRelacionada?.pergunta || manualRelacionada?.descricao}` : ''}
                                            </div>
                                        </div>
                                    );
                                })()}
                                <div>
                                    <p className="font-medium mb-2">Texto Completo da Determinação:</p>
                                    {(() => {
                                        const det = detalheDeterminacao;
                                        const mapeamento = det?.unidade_fiscalizada_id ? numeracaoByUnidadeId[det.unidade_fiscalizada_id] : null;
                                        const nc = ncs.find((n) => n.id === det?.nao_conformidade_id);
                                        const novoNumNC = nc?.id && mapeamento?.ncs?.[nc.id] ? `NC${mapeamento.ncs[nc.id]}` : (nc?.numero_nc || '');
                                        let textoDet = det?.descricao || '';
                                        if (novoNumNC && typeof textoDet === 'string') {
                                            textoDet = textoDet.replace(/NC\d+/g, novoNumNC);
                                        }
                                        if (textoDet && !textoDet.trim().endsWith('.')) textoDet = `${textoDet.trim()}.`;
                                        if (textoDet && !textoDet.includes('Prazo:') && det?.prazo_dias) textoDet = `${textoDet} Prazo: ${det.prazo_dias} dias.`;
                                        return <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded border">{textoDet}</p>;
                                    })()}
                                </div>

                                <div className="border-t pt-4">
                                    <p className="font-medium mb-2">Evidências anexadas pelo prestador:</p>
                                    {evidenciasAtuais.length === 0 ? (
                                        <p className="text-sm text-gray-500">Nenhuma evidência anexada</p>
                                    ) : (
                                        <>
                                            {evidenciasAtuais.some(isImageEvidence) ? (
                                                <div className="grid grid-cols-3 gap-2 mb-3">
                                                    {evidenciasAtuais
                                                        .map((ev, idx) => ({ ev, idx }))
                                                        .filter(({ ev }) => isImageEvidence(ev))
                                                        .map(({ ev, idx }) => {
                                                            const key = evidenciaKey(ev, idx);
                                                            const src = signedEvidencias[key] || '';
                                                            return (
                                                                <button
                                                                    key={key}
                                                                    type="button"
                                                                    onClick={() => void openArquivo(ev)}
                                                                    className="aspect-square rounded border overflow-hidden bg-gray-50"
                                                                    title={ev?.nome || 'Evidência'}
                                                                >
                                                                    {src ? (
                                                                        <img
                                                                            src={src}
                                                                            alt={ev?.nome || 'Evidência'}
                                                                            className="w-full h-full object-cover"
                                                                        />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                                                                            Carregando...
                                                                        </div>
                                                                    )}
                                                                </button>
                                                            );
                                                        })}
                                                </div>
                                            ) : null}
                                            <div className="flex flex-wrap gap-2">
                                                {evidenciasAtuais.map((ev, idx) => (
                                                    <Button
                                                        key={evidenciaKey(ev, idx)}
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => void openArquivo(ev)}
                                                    >
                                                        {ev?.nome || 'Arquivo'}
                                                    </Button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="border-t pt-4">
                                    <p className="font-medium mb-2">Manifestação do Prestador:</p>
                                    <Textarea
                                        value={analiseForm.manifestacao_prestador || ''}
                                        className="min-h-24"
                                        readOnly
                                    />
                                </div>

                                <div className="border-t pt-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="font-medium">Sua Análise:</p>
                                    </div>
                                    <Textarea
                                        placeholder="Descreva sua análise técnica sobre a resposta do prestador..."
                                        value={analiseForm.descricao_atendimento}
                                        onChange={(e) => setAnaliseForm({ ...analiseForm, descricao_atendimento: e.target.value })}
                                        className="min-h-24 mb-4"
                                    />

                                    <p className="font-medium mb-3">Resultado da Análise:</p>
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <Button
                                            variant={analiseForm.status === 'atendida' ? 'default' : 'outline'}
                                            onClick={() => setAnaliseForm({ ...analiseForm, status: 'atendida' })}
                                            className={analiseForm.status === 'atendida' ? 'bg-green-600 hover:bg-green-700' : ''}
                                        >
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            Acatada
                                        </Button>
                                        <Button
                                            variant={analiseForm.status === 'nao_atendida' ? 'default' : 'outline'}
                                            onClick={() => setAnaliseForm({ ...analiseForm, status: 'nao_atendida' })}
                                            className={analiseForm.status === 'nao_atendida' ? 'bg-red-600 hover:bg-red-700' : ''}
                                        >
                                            <XCircle className="h-4 w-4 mr-2" />
                                            Não Acatada
                                        </Button>
                                    </div>

                                    {analiseForm.status === 'nao_atendida' && (
                                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                                            <p className="text-sm text-yellow-800">
                                                ⚠️ Ao marcar como "Não Acatada", o Auto de Infração será gerado ao concluir a AM.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2 pt-4 border-t">
                                    <Button
                                        variant="outline"
                                        onClick={() => setDetalheDeterminacao(null)}
                                        className="flex-1"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        onClick={handleSalvarAnalise}
                                        disabled={!analiseForm.status || !analiseForm.manifestacao_prestador || !analiseForm.descricao_atendimento}
                                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                                    >
                                        Salvar Análise
                                    </Button>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ open, determinacao: null })}>
                    <AlertDialogContent className="bg-white border border-slate-200 text-slate-900 rounded-2xl shadow-xl">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-xl font-bold text-slate-900">Confirmar Análise</AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-500">
                                Você está prestes a marcar a determinação <strong>{getNumeroDeterminacaoExibicao(confirmDialog.determinacao)}</strong> como{' '}
                                <strong className="text-slate-800">{analiseForm.status === 'atendida' ? 'Acatada' : 'Não Acatada'}</strong>.
                                {analiseForm.status === 'nao_atendida' && (
                                    <span className="block mt-2 text-rose-600 font-medium">
                                        O Auto de Infração será gerado ao concluir a AM.
                                    </span>
                                )}
                                <span className="block mt-2">Deseja continuar?</span>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel className="bg-slate-105 hover:bg-slate-200 border-none text-slate-700 rounded-xl">Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmarAnalise} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl">Confirmar</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>

                {naoAtendidasSemAI.length > 0 && (
                    <div className="mt-8 p-6 rounded-2xl border border-orange-200 bg-orange-50">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                                <p className="font-semibold text-orange-800">
                                    {naoAtendidasSemAI.length} determinaç{naoAtendidasSemAI.length > 1 ? 'ões' : 'ão'} não atendida{naoAtendidasSemAI.length > 1 ? 's' : ''} sem Auto de Infração
                                </p>
                                <p className="text-sm text-orange-700 mt-1">Gere os autos pendentes para continuar o fluxo de fiscalização.</p>
                            </div>
                            <Button
                                onClick={() => gerarAutosMutation.mutate(naoAtendidasSemAI)}
                                disabled={gerarAutosMutation.isPending}
                                className="bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-semibold shrink-0"
                            >
                                {gerarAutosMutation.isPending ? 'Gerando...' : 'Gerar Autos de Infração'}
                            </Button>
                        </div>
                    </div>
                )}

            </div>
        </CatesaLayout>
    );
}
