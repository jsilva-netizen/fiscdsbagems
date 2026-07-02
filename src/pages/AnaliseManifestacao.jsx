import { useState } from 'react';
import { Repository } from '@/lib/offline/repository';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import jsPDF from 'jspdf';
import { supabase } from '@/lib/supabase';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { FileText, Clock, CheckCircle, AlertCircle, Download, GitMerge } from 'lucide-react';
import CatesaLayout from '@/components/camaras/CatesaLayout';







export default function AnaliseManifestacao() {
    const [filtros, setFiltros] = useState({
        busca: '',
        camaraTecnica: '',
        status: '',
        dataInicio: '',
        dataFim: ''
    });
    const [termoExcluindo, setTermoExcluindo] = useState(null);
    const [confirmarExclusao, setConfirmarExclusao] = useState(false);
    const [concluindoAmId, setConcluindoAmId] = useState(null);
    const [uploadingAmAssinadaId, setUploadingAmAssinadaId] = useState(null);
    const queryClient = useQueryClient();

    const { data: termos = [], refetch: refetchTermos } = useQuery({
        queryKey: ['termos-notificacao'],
        queryFn: async () => {
            const data = await Repository.listTermosNotificacaoOnline();
            return data;
        }
    });

    const { data: fiscalizacoes = [] } = useQuery({
        queryKey: ['fiscalizacoes-online-am'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('fiscalizacoes')
                .select('id, status, servicos');
            if (error) throw error;
            return data || [];
        }
    });

    const { data: determinacoes = [] } = useQuery({
        queryKey: ['determinacoes'],
        queryFn: async () => {
            const data = await Repository.listDeterminacoesOnlineAll();
            return data;
        }
    });

    const { data: unidadesFiscalizadas = [] } = useQuery({
        queryKey: ['unidades-fiscalizadas'],
        queryFn: async () => {
            const data = await Repository.listUnidadesAll(500);
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

    const { data: municipios = [] } = useQuery({
        queryKey: ['municipios'],
        queryFn: async () => {
            const data = await Repository.listMunicipios();
            return data;
        }
    });

    const { data: respostasDeterminacao = [] } = useQuery({
        queryKey: ['respostas-determinacao'],
        queryFn: async () => {
            const data = await Repository.listRespostasDeterminacaoOnlineAll();
            return data;
        }
    });

    const { data: autos = [] } = useQuery({
         queryKey: ['autos-infracao'],
         queryFn: async () => {
             const data = await Repository.listAutosInfracaoOnlineAll();
             return data;
         }
     });

     const { data: naoConformidades = [] } = useQuery({
         queryKey: ['nao-conformidades'],
         queryFn: async () => {
             const data = await Repository.listNaoConformidadesOnlineAll();
             return data;
         }
     });

     const { data: itemsChecklist = [] } = useQuery({
         queryKey: ['items-checklist'],
         queryFn: async () => {
             const data = await Repository.listItensChecklistAll();
             return data;
         }
     });

    const getPrestadorNome = (id) => {
        const p = prestadores.find(pres => pres.id === id);
        return p?.nome || 'N/A';
    };

    const openArquivo = async (arq) => {
        try {
            const signed = await Repository.getSignedUrlFromAny(arq);
            if (signed) window.open(signed, '_blank', 'noopener,noreferrer');
        } catch (err) {
            alert('Erro ao abrir arquivo: ' + (err?.message || String(err)));
        }
    };

    const getMunicipioNome = (id) => {
        const m = municipios.find(mun => mun.id === id);
        return m?.nome || 'N/A';
    };

    const formatRfp = (termo) => {
        const tipo = String(termo?.tipo_relatorio || 'RFP').trim().toUpperCase();
        const raw = termo?.numero_rfp;
        if (!raw) return 'N/A';
        const str = String(raw).trim();
        if (/^(RFP|RFE|RAO)\//i.test(str) && str.includes('/')) return str;
        const camara = termo?.camara_tecnica ? String(termo.camara_tecnica).trim() : '';
        const anoBase = termo?.data_geracao || termo?.created_at || termo?.updated_at || Date.now();
        const ano = new Date(anoBase).getFullYear();
        const num = String(parseInt(str.replace(/\D/g, '') || '0', 10)).padStart(3, '0');
        if (!camara) return str;
        return `${tipo}/DSB/${camara}/${num}/${ano}`;
    };

    const getDeterminacoesPorTermo = (termo) => {
        if (!termo.fiscalizacao_id) return [];
        // Buscar unidades desta fiscalização
        const unidadesDaFisc = unidadesFiscalizadas.filter(u => u.fiscalizacao_id === termo.fiscalizacao_id);
        const unidadeIds = unidadesDaFisc.map(u => u.id);
        // Buscar determinações das unidades
        return determinacoes.filter(d => unidadeIds.includes(d.unidade_fiscalizada_id));
    };

    const getStatusDeterminacao = (detId) => {
        const resposta = respostasDeterminacao.find(r => r.determinacao_id === detId);
        return resposta?.status || 'pendente';
    };

    const contarStatusDeterminacoes = (termo) => {
        const dets = getDeterminacoesPorTermo(termo);
        const total = dets.length;
        const aguardandoAnalise = dets.filter(d => getStatusDeterminacao(d.id) === 'aguardando_analise').length;
        const atendidas = dets.filter(d => getStatusDeterminacao(d.id) === 'atendida').length;
        const naoAtendidas = dets.filter(d => getStatusDeterminacao(d.id) === 'nao_atendida').length;
        return { total, aguardandoAnalise, atendidas, naoAtendidas };
    };

    // Filtrar termos: apenas aguardando_resposta ou com respostas pendentes de análise
    const termosFiltrados = termos.filter(termo => {
        // Status do termo: deve ter resposta registrada (aguardando análise) ou estar aguardando resposta
        const statusTermo = termo.status;
        if (statusTermo !== 'aguardando_resposta' && statusTermo !== 'respondido') return false;

        // Aplicar filtros
        if (filtros.busca && !termo.numero_termo_notificacao?.toLowerCase().includes(filtros.busca.toLowerCase())) return false;
        if (filtros.camaraTecnica && termo.camara_tecnica !== filtros.camaraTecnica) return false;
        if (filtros.dataInicio && new Date(termo.data_geracao) < new Date(filtros.dataInicio)) return false;
        if (filtros.dataFim && new Date(termo.data_geracao) > new Date(filtros.dataFim)) return false;

        const stats = contarStatusDeterminacoes(termo);
        if (filtros.status === 'aguardando_analise' && stats.aguardandoAnalise === 0) return false;
        if (filtros.status === 'analisado' && (stats.atendidas + stats.naoAtendidas) === 0) return false;

        return true;
    });

    const getStatusBadge = (termo) => {
        const stats = contarStatusDeterminacoes(termo);
        
        if (stats.total === 0) return { label: 'Sem determinações', color: 'bg-gray-500' };
        
        const temRespostasParaAnalise = stats.aguardandoAnalise > 0 || stats.atendidas > 0 || stats.naoAtendidas > 0;
        if (!temRespostasParaAnalise) {
            return { label: 'Aguardando Resposta', color: 'bg-blue-600' };
        }

        if (stats.atendidas + stats.naoAtendidas === stats.total) {
            return { label: 'Análise Concluída', color: 'bg-green-600' };
        } else {
            return { label: 'Aguardando Análise', color: 'bg-yellow-600' };
        }
    };

    const todasDeterminacoesAnalisadas = (termo) => {
        const stats = contarStatusDeterminacoes(termo);
        if (stats.total === 0) return false;
        return stats.atendidas + stats.naoAtendidas === stats.total;
    };

    const excluirAnalise = async (termo) => {
        try {
            // Deletar todos os AIs relacionados a este termo
            const dets = getDeterminacoesPorTermo(termo);
            const detIds = dets.map(d => d.id);
            const todosAIs = await Repository.listAutosInfracaoOnlineAll();
            const aisParaDeletar = todosAIs.filter(ai => detIds.includes(ai.determinacao_id));
            
            for (const ai of aisParaDeletar) {
                await Repository.deleteAutoInfracaoOnline(ai.id);
            }

            // Deletar as RespostaDeterminacao para voltar ao estado "aguardando análise"
            const { data: todasRespostas } = await supabase.from('respostas_determinacao').select('*');
            const respostasParaDeletar = todasRespostas.filter(r => detIds.includes(r.determinacao_id));
            
            for (const resposta of respostasParaDeletar) {
                await supabase.from('respostas_determinacao').delete().eq('id', resposta.id);
            }
            
            // Remover numero_am para permitir nova geração
            await supabase.from('termos_notificacao').update({ numero_am: null, am_concluida_em: null, arquivo_am_assinada_url: null }).eq('id', termo.id);
            
            refetchTermos();
            setTermoExcluindo(null);
            setConfirmarExclusao(false);
        } catch (error) {
            console.error('Erro ao excluir análise:', error);
        }
    };

    const concluirAm = async (termo) => {
        if (concluindoAmId) return;
        setConcluindoAmId(termo.id);
        try {
            const dets = getDeterminacoesPorTermo(termo).sort((a, b) => {
                const numA = parseInt(a.numero_determinacao?.replace(/\D/g, '') || '0', 10);
                const numB = parseInt(b.numero_determinacao?.replace(/\D/g, '') || '0', 10);
                return numA - numB;
            });
            const naoAtendidas = dets.filter(d => getStatusDeterminacao(d.id) === 'nao_atendida');

            const numeroAm = await Repository.gerarNumeroAmOnline();
            await supabase.from('termos_notificacao').update({
                numero_am: numeroAm,
                am_concluida_em: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }).eq('id', termo.id);

            for (const det of naoAtendidas) {
                const jaExiste = (autos || []).some(a => a?.determinacao_id === det.id);
                if (jaExiste) continue;
                const numeroAuto = await Repository.gerarNumeroAutoOnline();
                await Repository.createAutoInfracaoOnline({
                    determinacao_id: det.id,
                    unidade_fiscalizada_id: det.unidade_fiscalizada_id,
                    fiscalizacao_id: termo.fiscalizacao_id,
                    prestador_servico_id: termo.prestador_servico_id,
                    numero_auto: numeroAuto,
                    data_emissao: new Date().toISOString(),
                    status: 'gerado',
                    descricao: `Determinação ${det.numero_determinacao} não atendida: ${det.descricao || ''}`.trim()
                });
            }

            await queryClient.invalidateQueries({ queryKey: ['termos-notificacao'] });
            await queryClient.invalidateQueries({ queryKey: ['autos-infracao'] });
            await queryClient.invalidateQueries({ queryKey: ['autos-todos'] });
            alert('AM concluída e AIs gerados');
        } catch (err) {
            alert('Erro ao concluir AM: ' + (err?.message || String(err)));
        } finally {
            setConcluindoAmId(null);
        }
    };



    const calcularProximoNumeroTN = async () => {
        const ano = new Date().getFullYear();
        const { data: todosOsTermos } = await supabase.from('termos_notificacao').select('*');
        const tnsDoAno = todosOsTermos.filter(t => {
            if (!t.numero_termo_notificacao) return false;
            const match = t.numero_termo_notificacao.match(/TN\s*(\d+)\/(\d{4})\/DSB\/AGEMS/);
            return match && parseInt(match[2]) === ano;
        });
        const proximoNumeroTN = tnsDoAno.length + 1;
        return String(proximoNumeroTN).padStart(3, '0');
    };

    const gerarAnaliseManifestacao = async (termo) => {
        const dets = getDeterminacoesPorTermo(termo).sort((a, b) => {
            const numA = parseInt(a.numero_determinacao?.replace(/\D/g, '') || '0');
            const numB = parseInt(b.numero_determinacao?.replace(/\D/g, '') || '0');
            return numA - numB;
        });
        
        const resp = respostasDeterminacao.filter(r => 
            dets.map(d => d.id).includes(r.determinacao_id)
        );
        
        // Usar numero_am já gerado
        let numeroAM = termo.numero_am;

        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 12;
        let yPos = margin;

        // Título
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text(numeroAM, margin, yPos);
        yPos += 8;

        // Informações do TN
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.text(`TN: ${termo.numero_termo_notificacao}`, margin, yPos);
        yPos += 5;
        doc.text(`Município: ${getMunicipioNome(termo.municipio_id)} | Prestador: ${getPrestadorNome(termo.prestador_servico_id)}`, margin, yPos);
        yPos += 8;

        // Buscar números dos AIs gerados
        const { data: autos } = await supabase.from('autos_infracao').select('*');
        const autosPorDeterminacao = {};
        autos.forEach(auto => {
            if (auto.determinacao_id) {
                autosPorDeterminacao[auto.determinacao_id] = auto.numero_auto;
            }
        });

        // Processar cada determinação
        dets.forEach((det, detIndex) => {
            const resposta = resp.find(r => r.determinacao_id === det.id);
            
            // Verificar espaço para nova linha (aprox 40mm por determinação)
            if (yPos + 40 > pageHeight - 10) {
                doc.addPage();
                yPos = margin;
            }

            const colLeft = margin;
            const colWidth = pageWidth - (2 * margin);
            const cellLineHeight = 5;
            
            // Cabeçalho da determinação
            doc.setFillColor(180, 180, 180);
            doc.rect(colLeft, yPos, colWidth, cellLineHeight, 'F');
            doc.setFont(undefined, 'bold');
            doc.setFontSize(9);
            doc.text(`Determinação: ${det.numero_determinacao}`, colLeft + 1, yPos + 3.5);
            yPos += cellLineHeight;

            // Dados em formato de linhas
            const dadoLinhas = [
                { label: 'Base Legal:', valor: 'Portaria AGEMS nº 233/2022 e suas alterações' },
                { label: 'Manifestação:', valor: resposta?.manifestacao_prestador || 'Sem informação' },
                { label: 'Análise:', valor: resposta?.descricao_atendimento || 'Sem informação' }
            ];

            doc.setFont(undefined, 'normal');
            doc.setFontSize(8);

            dadoLinhas.forEach(linha => {
                const textHeight = doc.getTextDimensions(linha.valor).h;
                const wrappedText = doc.splitTextToSize(linha.valor, colWidth - 40);
                const lineCount = wrappedText.length;
                const cellHeight = Math.max(cellLineHeight, lineCount * cellLineHeight + 2);

                // Label em fundo claro
                doc.setFillColor(240, 240, 240);
                doc.rect(colLeft, yPos, 35, cellHeight, 'F');
                doc.setFont(undefined, 'bold');
                doc.text(linha.label, colLeft + 1, yPos + 3);

                // Valor
                doc.setFont(undefined, 'normal');
                doc.text(wrappedText, colLeft + 37, yPos + 2, { maxWidth: colWidth - 39 });

                yPos += cellHeight;
            });

            // Resultado da Análise
            const resultado = resposta?.status === 'atendida' ? 'ACATADA' : 'NÃO ACATADA';
            const corResultado = resposta?.status === 'atendida' ? [0, 128, 0] : [255, 0, 0];
            
            doc.setFillColor(240, 240, 240);
            doc.rect(colLeft, yPos, 35, cellLineHeight, 'F');
            doc.setFont(undefined, 'bold');
            doc.setFontSize(8);
            doc.text('Resultado:', colLeft + 1, yPos + 3);

            doc.setFont(undefined, 'bold');
            doc.setFontSize(9);
            doc.setTextColor(corResultado[0], corResultado[1], corResultado[2]);
            doc.text(resultado, colLeft + 37, yPos + 3);
            doc.setTextColor(0, 0, 0);

            yPos += cellLineHeight;

            // Nº AI
            const numeroAI = autosPorDeterminacao[det.id];
            const textoAI = numeroAI ? numeroAI : (resposta?.status === 'nao_atendida' ? 'Gerar' : 'NÃO SE APLICA');
            
            doc.setFillColor(240, 240, 240);
            doc.rect(colLeft, yPos, 35, cellLineHeight, 'F');
            doc.setFont(undefined, 'bold');
            doc.setFontSize(8);
            doc.text('Nº AI:', colLeft + 1, yPos + 3);

            doc.setFont(undefined, 'normal');
            doc.setFontSize(8);
            doc.setTextColor(0, 0, 0);
            doc.text(textoAI, colLeft + 37, yPos + 3);

            yPos += cellLineHeight + 5;
        });

        return numeroAM;
    };

    const baixarAnaliseManifestacao = async (termo) => {
        const dets = getDeterminacoesPorTermo(termo).sort((a, b) => {
            const numA = parseInt(a.numero_determinacao?.replace(/\D/g, '') || '0');
            const numB = parseInt(b.numero_determinacao?.replace(/\D/g, '') || '0');
            return numA - numB;
        });
        
        const resp = respostasDeterminacao.filter(r => 
            dets.map(d => d.id).includes(r.determinacao_id)
        );
        
        const numeroAM = termo.numero_am;
        const doc = new jsPDF('p', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 12;
        let yPos = margin;

        // Título
        doc.setFontSize(16);
        doc.setFont(undefined, 'bold');
        doc.text(numeroAM, margin, yPos);
        yPos += 8;

        // Informações do TN
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.text(`TN: ${termo.numero_termo_notificacao}`, margin, yPos);
        yPos += 5;
        doc.text(`Município: ${getMunicipioNome(termo.municipio_id)} | Prestador: ${getPrestadorNome(termo.prestador_servico_id)}`, margin, yPos);
        yPos += 8;

        // Buscar números dos AIs gerados
        const { data: autos } = await supabase.from('autos_infracao').select('*');
        const autosPorDeterminacao = {};
        autos.forEach(auto => {
            if (auto.determinacao_id) {
                autosPorDeterminacao[auto.determinacao_id] = auto.numero_auto;
            }
        });

        // Processar cada determinação
        dets.forEach((det, detIndex) => {
            const resposta = resp.find(r => r.determinacao_id === det.id);
            
            // Verificar espaço para nova linha (aprox 40mm por determinação)
            if (yPos + 40 > pageHeight - 10) {
                doc.addPage();
                yPos = margin;
            }

            const colLeft = margin;
            const colWidth = pageWidth - (2 * margin);
            const cellLineHeight = 5;
            
            // Cabeçalho da determinação
            doc.setFillColor(180, 180, 180);
            doc.rect(colLeft, yPos, colWidth, cellLineHeight, 'F');
            doc.setFont(undefined, 'bold');
            doc.setFontSize(9);
            doc.text(`Determinação: ${det.numero_determinacao}`, colLeft + 1, yPos + 3.5);
            yPos += cellLineHeight;

            // Dados em formato de linhas
            const dadoLinhas = [
                { label: 'Base Legal:', valor: 'Portaria AGEMS nº 233/2022 e suas alterações' },
                { label: 'Manifestação:', valor: resposta?.manifestacao_prestador || 'Sem informação' },
                { label: 'Análise:', valor: resposta?.descricao_atendimento || 'Sem informação' }
            ];

            doc.setFont(undefined, 'normal');
            doc.setFontSize(8);

            dadoLinhas.forEach(linha => {
                const textHeight = doc.getTextDimensions(linha.valor).h;
                const wrappedText = doc.splitTextToSize(linha.valor, colWidth - 40);
                const lineCount = wrappedText.length;
                const cellHeight = Math.max(cellLineHeight, lineCount * cellLineHeight + 2);

                // Label em fundo claro
                doc.setFillColor(240, 240, 240);
                doc.rect(colLeft, yPos, 35, cellHeight, 'F');
                doc.setFont(undefined, 'bold');
                doc.text(linha.label, colLeft + 1, yPos + 3);

                // Valor
                doc.setFont(undefined, 'normal');
                doc.text(wrappedText, colLeft + 37, yPos + 2, { maxWidth: colWidth - 39 });

                yPos += cellHeight;
            });

            // Resultado da Análise
            const resultado = resposta?.status === 'atendida' ? 'ACATADA' : 'NÃO ACATADA';
            const corResultado = resposta?.status === 'atendida' ? [0, 128, 0] : [255, 0, 0];
            
            doc.setFillColor(240, 240, 240);
            doc.rect(colLeft, yPos, 35, cellLineHeight, 'F');
            doc.setFont(undefined, 'bold');
            doc.setFontSize(8);
            doc.text('Resultado:', colLeft + 1, yPos + 3);

            doc.setFont(undefined, 'bold');
            doc.setFontSize(9);
            doc.setTextColor(corResultado[0], corResultado[1], corResultado[2]);
            doc.text(resultado, colLeft + 37, yPos + 3);
            doc.setTextColor(0, 0, 0);

            yPos += cellLineHeight;

            // Nº AI
            const numeroAI = autosPorDeterminacao[det.id];
            const textoAI = numeroAI ? numeroAI : (resposta?.status === 'nao_atendida' ? 'Gerar' : 'NÃO SE APLICA');
            
            doc.setFillColor(240, 240, 240);
            doc.rect(colLeft, yPos, 35, cellLineHeight, 'F');
            doc.setFont(undefined, 'bold');
            doc.setFontSize(8);
            doc.text('Nº AI:', colLeft + 1, yPos + 3);

            doc.setFont(undefined, 'normal');
            doc.setFontSize(8);
            doc.setTextColor(0, 0, 0);
            doc.text(textoAI, colLeft + 37, yPos + 3);

            yPos += cellLineHeight + 5;
        });

        doc.save(`${numeroAM}.pdf`);
    };

    return (
        <CatesaLayout>
                <div className="max-w-6xl mx-auto px-4 pt-8">

                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50">
                        <GitMerge className="h-5 w-5 text-amber-700" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Manifestações</h1>
                        <p className="text-sm text-slate-500">Análise de respostas e manifestações de prestadores</p>
                    </div>
                </div>

                {/* Dashboard KPI */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <Card className="border border-gray-200 rounded-2xl shadow-sm bg-white hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total TNs</p>
                                    <p className="text-3xl font-bold text-blue-600">{termosFiltrados.length}</p>
                                </div>
                                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                                    <FileText className="h-5 w-5 text-blue-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border border-gray-200 rounded-2xl shadow-sm bg-white hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Aguardando Análise</p>
                                    <p className="text-3xl font-bold text-amber-600">
                                        {termosFiltrados.filter(t => {
                                            const stats = contarStatusDeterminacoes(t);
                                            return t.data_recebimento_resposta && stats.total > 0 && (stats.atendidas + stats.naoAtendidas < stats.total);
                                        }).length}
                                    </p>
                                </div>
                                <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                                    <Clock className="h-5 w-5 text-amber-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border border-gray-200 rounded-2xl shadow-sm bg-white hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Análises Concluídas</p>
                                    <p className="text-3xl font-bold text-emerald-600">
                                        {termosFiltrados.filter(t => {
                                            const stats = contarStatusDeterminacoes(t);
                                            return t.data_recebimento_resposta && stats.atendidas + stats.naoAtendidas === stats.total && stats.total > 0;
                                        }).length}
                                    </p>
                                </div>
                                <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center">
                                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border border-gray-200 rounded-2xl shadow-sm bg-white hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Autos Gerados</p>
                                    <p className="text-3xl font-bold text-red-650">{autos.length}</p>
                                </div>
                                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                                    <AlertCircle className="h-5 w-5 text-red-500" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Filtros */}
                <Card className="mb-6">
                    <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <Input
                                placeholder="Buscar TN..."
                                value={filtros.busca}
                                onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
                            />
                            <Select value={filtros.camaraTecnica} onValueChange={(v) => setFiltros({ ...filtros, camaraTecnica: v })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Câmara Técnica" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={null}>Todas</SelectItem>
                                    <SelectItem value="CATESA">CATESA</SelectItem>
                                    <SelectItem value="CATERS">CATERS</SelectItem>
                                    <SelectItem value="CRES">CRES</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={filtros.status} onValueChange={(v) => setFiltros({ ...filtros, status: v })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={null}>Todos</SelectItem>
                                    <SelectItem value="aguardando_analise">Aguardando Análise</SelectItem>
                                    <SelectItem value="analisado">Analisado</SelectItem>
                                </SelectContent>
                            </Select>
                            <Input
                                type="date"
                                placeholder="Data Início"
                                value={filtros.dataInicio}
                                onChange={(e) => setFiltros({ ...filtros, dataInicio: e.target.value })}
                            />
                            <Input
                                type="date"
                                placeholder="Data Fim"
                                value={filtros.dataFim}
                                onChange={(e) => setFiltros({ ...filtros, dataFim: e.target.value })}
                            />
                        </div>
                        {(filtros.busca || filtros.camaraTecnica || filtros.status || filtros.dataInicio || filtros.dataFim) && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="mt-2"
                                onClick={() => setFiltros({ busca: '', camaraTecnica: '', status: '', dataInicio: '', dataFim: '' })}
                            >
                                Limpar Filtros
                            </Button>
                        )}
                    </CardContent>
                </Card>

                {/* Lista de TNs */}
                <div className="space-y-4">
                    {termosFiltrados.length === 0 ? (
                        <Card className="border border-gray-200 rounded-2xl bg-white shadow-sm">
                            <CardContent className="p-8 text-center text-gray-500">
                                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30 text-slate-400" />
                                <p className="font-medium text-slate-655">Nenhum TN encontrado para análise</p>
                            </CardContent>
                        </Card>
                    ) : (
                        termosFiltrados.map(termo => {
                            const fisc = fiscalizacoes.find(f => f.id === termo.fiscalizacao_id);
                            const stats = contarStatusDeterminacoes(termo);
                            const statusInfo = getStatusBadge(termo);
                            const numeroTN = termo.numero_termo_notificacao || termo.numero_termo || 'N/A';

                            return (
                                <Card key={termo.id} className="hover:shadow-md transition-shadow border border-slate-200 rounded-2xl overflow-hidden bg-white mb-4">
                                    <CardContent className="p-5">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <h3 className="font-semibold text-lg mb-2">
                                                    {termo.numero_am || termo.numero_termo_notificacao}
                                                </h3>
                                                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-3">
                                                    {termo.numero_am ? (
                                                        <div>
                                                            <span className="font-medium">TN:</span> {numeroTN}
                                                        </div>
                                                    ) : null}
                                                    <div>
                                                        <span className="font-medium">Município:</span> {getMunicipioNome(termo.municipio_id)}
                                                    </div>
                                                    <div>
                                                        <span className="font-medium">Prestador:</span> {getPrestadorNome(termo.prestador_servico_id)}
                                                    </div>
                                                    <div>
                                                        <span className="font-medium">Câmara:</span> {termo.camara_tecnica}
                                                    </div>
                                                    <div>
                                                       <span className="font-medium">RFP:</span> {formatRfp(termo)}
                                                    </div>
                                                    <div>
                                                       <span className="font-medium">Processo:</span> {termo.numero_processo || 'N/A'}
                                                    </div>
                                                    <div className="col-span-2">
                                                        <span className="font-medium">Serviços:</span> {fisc?.servicos?.join(', ') || 'N/A'}
                                                    </div>
                                                    </div>
                                                <div className="flex gap-2 text-xs">
                                                    <Badge className="bg-blue-600">Total: {stats.total} determinações</Badge>
                                                    {stats.aguardandoAnalise > 0 && (
                                                        <Badge className="bg-yellow-600">{stats.aguardandoAnalise} aguardando análise</Badge>
                                                    )}
                                                    {stats.atendidas > 0 && (
                                                        <Badge className="bg-green-600">{stats.atendidas} acatadas</Badge>
                                                    )}
                                                    {stats.naoAtendidas > 0 && (
                                                        <Badge className="bg-red-600">{stats.naoAtendidas} não acatadas</Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-2 items-end">
                                                <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                                                {stats.total > 0 && (stats.aguardandoAnalise > 0 || stats.atendidas > 0 || stats.naoAtendidas > 0) && (
                                                     <Link to={createPageUrl('AnalisarResposta') + `?termo=${termo.id}`}>
                                                         <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                                                             Analisar Determinações
                                                         </Button>
                                                     </Link>
                                                 )}
                                                 {stats.total > 0 && todasDeterminacoesAnalisadas(termo) && !termo?.am_concluida_em && (
                                                      <Button
                                                          size="sm"
                                                          className="bg-green-600 hover:bg-green-700"
                                                          disabled={concluindoAmId === termo.id}
                                                          onClick={() => concluirAm(termo)}
                                                      >
                                                          {concluindoAmId === termo.id ? 'Concluindo...' : 'Concluir AM'}
                                                      </Button>
                                                  )}
                                                 {stats.total > 0 && termo.numero_am && todasDeterminacoesAnalisadas(termo) && (
                                                      <Button 
                                                          size="sm" 
                                                          className="bg-blue-600 hover:bg-blue-700"
                                                          onClick={() => baixarAnaliseManifestacao(termo)}
                                                      >
                                                          <Download className="h-4 w-4 mr-1" />
                                                          Baixar AM PDF
                                                      </Button>
                                                  )}
                                                  {stats.total > 0 && termo.numero_am && todasDeterminacoesAnalisadas(termo) && (
                                                      <Card className="border-yellow-200 w-full">
                                                          <CardContent className="p-3 space-y-2">
                                                              <div className="text-xs text-gray-700">AM assinada (PDF)</div>
                                                              <div className="flex flex-col gap-2">
                                                                  <Input
                                                                      type="file"
                                                                      accept=".pdf,application/pdf"
                                                                      disabled={uploadingAmAssinadaId === termo.id}
                                                                      onChange={async (e) => {
                                                                          const file = e.target.files?.[0];
                                                                          if (!file) return;
                                                                          setUploadingAmAssinadaId(termo.id);
                                                                          try {
                                                                              const up = await Repository.uploadTermoNotificacaoFile(file, termo.id, 'am_assinada');
                                                                              const storageRef = `storage://${up.bucket}/${up.path}`;
                                                                              await supabase.from('termos_notificacao').update({
                                                                                  arquivo_am_assinada_url: storageRef,
                                                                                  updated_at: new Date().toISOString()
                                                                              }).eq('id', termo.id);
                                                                              await queryClient.invalidateQueries({ queryKey: ['termos-notificacao'] });
                                                                              alert('AM assinada enviada');
                                                                          } catch (err) {
                                                                              alert('Erro ao enviar AM assinada: ' + (err?.message || String(err)));
                                                                          } finally {
                                                                              setUploadingAmAssinadaId(null);
                                                                              e.target.value = '';
                                                                          }
                                                                      }}
                                                                  />
                                                                  {termo?.arquivo_am_assinada_url ? (
                                                                      <Button size="sm" variant="outline" onClick={() => void openArquivo(termo.arquivo_am_assinada_url)}>
                                                                          <Download className="h-4 w-4 mr-1" />
                                                                          Baixar AM assinada
                                                                      </Button>
                                                                  ) : (
                                                                      <Badge className="bg-yellow-600">
                                                                          {uploadingAmAssinadaId === termo.id ? 'Enviando...' : 'Aguardando upload'}
                                                                      </Badge>
                                                                  )}
                                                              </div>
                                                          </CardContent>
                                                      </Card>
                                                  )}
                                                </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })
                    )}
                </div>

                {/* Dialog de Exclusão */}
                <AlertDialog open={termoExcluindo !== null} onOpenChange={(open) => {
                    if (!open) setTermoExcluindo(null);
                }}>
                    <AlertDialogContent className="bg-white border border-slate-200 text-slate-900 rounded-2xl shadow-xl">
                        {!confirmarExclusao ? (
                            <>
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-xl font-bold text-slate-900">Excluir Análise?</AlertDialogTitle>
                                    <AlertDialogDescription className="text-slate-500">
                                        Tem certeza que deseja excluir a análise da manifestação? Esta ação removerá o número AM e permitirá que a análise seja refeita.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="flex gap-2 justify-end mt-4">
                                    <AlertDialogCancel onClick={() => setTermoExcluindo(null)} className="bg-slate-105 hover:bg-slate-200 border-none text-slate-700 rounded-xl">
                                        Cancelar
                                    </AlertDialogCancel>
                                    <Button
                                        variant="destructive"
                                        className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
                                        onClick={() => setConfirmarExclusao(true)}
                                    >
                                        Excluir
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <>
                                <AlertDialogHeader>
                                    <AlertDialogTitle className="text-xl font-bold text-slate-900">Confirmar Exclusão</AlertDialogTitle>
                                    <AlertDialogDescription className="text-slate-500">
                                        Esta é a última confirmação. Ao continuar, a análise será removida permanentemente e o TN voltará ao estado anterior.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div className="flex gap-2 justify-end mt-4">
                                    <Button
                                        variant="outline"
                                        className="rounded-xl"
                                        onClick={() => setConfirmarExclusao(false)}
                                    >
                                        Voltar
                                    </Button>
                                    <AlertDialogAction
                                        className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl"
                                        onClick={() => excluirAnalise(termoExcluindo)}
                                    >
                                        Confirmar Exclusão
                                    </AlertDialogAction>
                                </div>
                            </>
                        )}
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </CatesaLayout>
    );
}
