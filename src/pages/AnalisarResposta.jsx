import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Repository } from '@/lib/offline/repository';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { ArrowLeft, Download, CheckCircle, XCircle, AlertCircle, Eye, Lock } from 'lucide-react';





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
    const [analisandoIA, setAnalisandoIA] = useState(false);

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
        enabled: respostaChecklistIds.length > 0
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
                    manifestacao_prestador: manifestacao,
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
            
            // Se não atendida, gerar auto de infração
             if (variables.status === 'nao_atendida') {
                 const determinacao = determinacoes.find(d => d.id === variables.determinacaoId);
                 
                 const numeroAuto = await Repository.gerarNumeroAutoOnline();
                
                await Repository.createAutoInfracaoOnline({
                    determinacao_id: variables.determinacaoId, // Precisa adicionar essa coluna em autos_infracao
                    // resposta_determinacao_id: data.id, // Precisa adicionar
                    fiscalizacao_id: fiscalizacao.id, // Precisa adicionar? fiscalizacao_id não está em autos_infracao no schema original?
                    // Schema autos_infracao: id, prestador_servico_id, unidade_fiscalizada_id, numero_auto, descricao, valor, status, data_emissao
                    // Preciso adicionar colunas em autos_infracao também!
                    prestador_servico_id: fiscalizacao.prestador_servico_id,
                    numero_auto: numeroAuto,
                    // data_geracao -> data_emissao
                    data_emissao: new Date().toISOString(),
                    status: 'gerado',
                    // prazo_manifestacao: 15,
                    descricao: `Determinação ${determinacao.numero_determinacao} não atendida: ${determinacao.descricao}`
                });
            }
            
            alert('Análise salva com sucesso!');
            setDetalheDeterminacao(null);
            setAnaliseForm({ status: '', manifestacao_prestador: '', descricao_atendimento: '', dentro_prazo: true });
        }
    });

    const getMunicipioNome = (id) => municipios.find(m => m.id === id)?.nome || 'N/A';
    const getPrestadorNome = (id) => prestadores.find(p => p.id === id)?.nome || 'N/A';

    const getStatusResposta = (detId) => {
        const resp = respostas.find(r => r.determinacao_id === detId);
        return resp?.status || 'pendente';
    };

    const detIndexById = useMemo(() => {
        const m = new Map();
        determinacoes.forEach((d, idx) => m.set(d.id, idx));
        return m;
    }, [determinacoes]);

    const unidadesOrdenadas = useMemo(() => {
        return unidadesFiscalizadas.slice().sort((a, b) => (a.created_at || '').localeCompare(b.created_at || ''));
    }, [unidadesFiscalizadas]);

    const determinacoesPorUnidade = useMemo(() => {
        const by = new Map();
        for (const det of determinacoes) {
            const uid = det?.unidade_fiscalizada_id;
            if (!uid) continue;
            if (!by.has(uid)) by.set(uid, []);
            by.get(uid).push(det);
        }
        return by;
    }, [determinacoes]);

    const podeAnalisar = (index) => {
        if (index === 0) return true;
        const determinacaoAnterior = determinacoes[index - 1];
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
        salvarAnaliseMutation.mutate({
            determinacaoId: detalheDeterminacao.id,
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
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-2 mb-6">
                    <Link to={createPageUrl('AnaliseManifestacao')}>
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <h1 className="text-2xl font-bold">Análise da Manifestação</h1>
                </div>

                {/* Info do TN */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>{termo.numero_termo_notificacao || termo.numero_termo}</CardTitle>
                        {termo.numero_rfp && (
                            <p className="text-sm text-blue-600 font-medium mt-1">
                                RFP/DSB/{termo.camara_tecnica}/{String(termo.numero_rfp).padStart(3, '0')}/{new Date(termo.data_geracao || Date.now()).getFullYear()}
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
                                <span className="font-medium">Processo:</span> {termo.numero_processo || 'N/A'}
                            </div>
                            <div>
                                <span className="font-medium">Câmara:</span> {termo.camara_tecnica}
                            </div>
                            <div className="col-span-2">
                                <span className="font-medium">Serviços:</span> {fiscalizacao?.servicos?.join(', ') || 'N/A'}
                            </div>
                        </div>
                        {(() => {
                            const arquivos = Array.isArray(termo.arquivos_resposta) ? termo.arquivos_resposta : [];
                            const assinatura = arquivos.find((a) => a?.categoria === 'assinatura');
                            const anexos = arquivos.filter((a) => a?.categoria !== 'assinatura');
                            if (!assinatura && anexos.length === 0) return null;
                            return (
                            <div className="mt-4 pt-4 border-t">
                                {assinatura && (
                                    <div className="mb-3">
                                        <p className="font-medium mb-2">Assinatura do prestador:</p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => void openArquivo(assinatura)}
                                        >
                                            <Download className="h-4 w-4 mr-2" />
                                            Visualizar assinatura
                                        </Button>
                                    </div>
                                )}
                                {anexos.length > 0 && (
                                    <div>
                                        <p className="font-medium mb-2">Arquivos da resposta ao TN:</p>
                                        {anexos.map((arquivo, idx) => (
                                            <Button
                                                key={idx}
                                                variant="outline"
                                                size="sm"
                                                onClick={() => void openArquivo(arquivo)}
                                                className="mr-2"
                                            >
                                                <Download className="h-4 w-4 mr-2" />
                                                Visualizar PDF
                                            </Button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            );
                        })()}
                    </CardContent>
                </Card>

                {/* Lista de Determinações */}
                <div className="space-y-4">
                    {unidadesOrdenadas.map((unidade) => {
                        const dets = determinacoesPorUnidade.get(unidade.id) || [];
                        if (dets.length === 0) return null;
                        return (
                            <Card key={unidade.id}>
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-base">
                                        Unidade: {unidade.nome_unidade || unidade.tipo_unidade_nome || unidade.codigo_unidade || unidade.id}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {dets.map((det) => {
                                        const index = detIndexById.get(det.id) ?? 0;
                                        const status = getStatusResposta(det.id);
                                        const bloqueado = !podeAnalisar(index);
                                        const nc = ncs.find((n) => n.id === det.nao_conformidade_id);
                                        const constatacao = nc?.resposta_checklist_id ? respostasChecklist.find((r) => r.id === nc.resposta_checklist_id) : null;
                                        const statusIcon = status === 'atendida' ? <CheckCircle className="h-5 w-5 text-green-600" /> :
                                                        status === 'nao_atendida' ? <XCircle className="h-5 w-5 text-red-600" /> :
                                                        status === 'aguardando_analise' ? <AlertCircle className="h-5 w-5 text-yellow-600" /> :
                                                        <AlertCircle className="h-5 w-5 text-gray-400" />;

                                        return (
                                            <Card key={det.id} className={bloqueado ? 'opacity-50' : 'hover:shadow-lg transition-shadow'}>
                                                <CardContent className="p-4">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                {statusIcon}
                                                                <h3 className="font-semibold text-lg">{det.numero_determinacao}</h3>
                                                                {bloqueado && <Lock className="h-4 w-4 text-gray-400" />}
                                                            </div>
                                                            <div className="text-xs text-gray-600 space-y-1 mb-2">
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
                                                            <p className="text-sm text-gray-600 mb-2">{det.descricao}</p>
                                                            <div className="flex gap-2">
                                                                {status === 'atendida' && <Badge className="bg-green-600">Acatada</Badge>}
                                                                {status === 'nao_atendida' && <Badge className="bg-red-600">Não acatada - AI Gerado</Badge>}
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
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Análise da Determinação {detalheDeterminacao?.numero_determinacao}</DialogTitle>
                        </DialogHeader>
                        {detalheDeterminacao && (
                            <div className="space-y-4">
                                <div>
                                    <p className="font-medium mb-2">Texto Completo da Determinação:</p>
                                    <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded border">{detalheDeterminacao.descricao}</p>
                                </div>

                                <div className="border-t pt-4">
                                    <p className="font-medium mb-2">Evidências anexadas pelo prestador:</p>
                                    {(() => {
                                        const respDet = respostas.find(r => r.determinacao_id === detalheDeterminacao.id);
                                        const evidencias = Array.isArray(respDet?.evidencias) ? respDet.evidencias : [];
                                        if (evidencias.length === 0) {
                                            return <p className="text-sm text-gray-500">Nenhuma evidência anexada</p>;
                                        }
                                        return (
                                            <div className="flex flex-wrap gap-2">
                                                {evidencias.map((ev, idx) => (
                                                    <Button
                                                        key={idx}
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => void openArquivo(ev)}
                                                    >
                                                        {ev.nome || 'Arquivo'}
                                                    </Button>
                                                ))}
                                            </div>
                                        )
                                    })()}
                                </div>

                                <div className="border-t pt-4">
                                    <p className="font-medium mb-2">Manifestação do Prestador:</p>
                                    <Textarea
                                        placeholder="Insira aqui o que o prestador manifestou sobre esta determinação..."
                                        value={analiseForm.manifestacao_prestador || ''}
                                        onChange={(e) => setAnaliseForm({ ...analiseForm, manifestacao_prestador: e.target.value })}
                                        className="min-h-24"
                                    />
                                </div>

                                <div className="border-t pt-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <p className="font-medium">Sua Análise:</p>
                                        <Button
                                            type="button"
                                            size="sm"
                                            variant="outline"
                                            onClick={async () => {
                                                alert('A análise com IA está temporariamente desativada nesta versão.');
                                                /*
                                                if (!analiseForm.manifestacao_prestador) {
                                                    alert('Insira a manifestação do prestador primeiro');
                                                    return;
                                                }
                                                
                                                setAnalisandoIA(true);
                                                try {
                                                    // Implementação futura com Supabase Edge Functions ou OpenAI directly
                                                } catch (error) {
                                                    alert('Erro ao gerar análise: ' + error.message);
                                                } finally {
                                                    setAnalisandoIA(false);
                                                }
                                                */
                                            }}
                                            disabled={analisandoIA || !analiseForm.manifestacao_prestador}
                                        >
                                            {analisandoIA ? 'Gerando análise...' : '🤖 Gerar Análise com IA'}
                                        </Button>
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
                                                ⚠️ Ao marcar como "Não Acatada", um Auto de Infração será gerado automaticamente.
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

                {/* Alert Dialog de Confirmação */}
                <AlertDialog open={confirmDialog.open} onOpenChange={(open) => setConfirmDialog({ open, determinacao: null })}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Análise</AlertDialogTitle>
                            <AlertDialogDescription>
                                Você está prestes a marcar a determinação <strong>{confirmDialog.determinacao?.numero_determinacao}</strong> como{' '}
                                <strong>{analiseForm.status === 'atendida' ? 'Acatada' : 'Não Acatada'}</strong>.
                                {analiseForm.status === 'nao_atendida' && (
                                    <span className="block mt-2 text-red-600 font-medium">
                                        Um Auto de Infração será gerado automaticamente.
                                    </span>
                                )}
                                <span className="block mt-2">Deseja continuar?</span>
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={confirmarAnalise}>Confirmar</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>


            </div>
        </div>
    );
}
