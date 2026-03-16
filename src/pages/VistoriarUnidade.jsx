import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Repository } from '@/lib/offline/repository';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import ChecklistItem from '@/components/fiscalizacao/ChecklistItem';
import PhotoGrid from '@/components/fiscalizacao/PhotoGrid';
import ConstatacaoManualForm from '@/components/fiscalizacao/ConstatacaoManualForm';
import EditarNCModal from '@/components/fiscalizacao/EditarNCModal';
import { ArrowLeft, Loader2, AlertTriangle, Save, Trash2, Camera, ClipboardCheck, FileText, Plus, Pencil, AlertCircle } from 'lucide-react';


export default function VistoriarUnidade() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const urlParams = new URLSearchParams(window.location.search);
    const unidadeId = urlParams.get('id');
    const modoEdicao = urlParams.get('modo') === 'edicao';

    const [activeTab, setActiveTab] = useState('checklist');
    const [respostas, setRespostas] = useState({});
    const [fotos, setFotos] = useState([]);
    const [showAddRecomendacao, setShowAddRecomendacao] = useState(false);
    const [novaRecomendacao, setNovaRecomendacao] = useState('');
    const [showConfirmaSemFotos, setShowConfirmaSemFotos] = useState(false);
    const [contadoresCarregados, setContadoresCarregados] = useState(false);
    const [showAddConstatacao, setShowAddConstatacao] = useState(false);
    const [showEditarNC, setShowEditarNC] = useState(false);
    const [constatacaoParaNC, setConstatacaoParaNC] = useState(null);
    const [numerosParaNC, setNumerosParaNC] = useState(null);
    const [constatacaoParaEditar, setConstatacaoParaEditar] = useState(null);
    const [showConfirmaExclusao, setShowConfirmaExclusao] = useState(false);
    const [constatacaoParaExcluir, setConstatacaoParaExcluir] = useState(null);
    const [filaRespostas, setFilaRespostas] = useState([]);

    // Queries
    const { data: unidade, isLoading: loadingUnidade } = useQuery({
        queryKey: ['unidade', unidadeId],
        queryFn: async () => Repository.getUnidadeById(unidadeId),
        enabled: !!unidadeId,
        staleTime: 30000,
        gcTime: 300000
    });

    const { data: fiscalizacao } = useQuery({
        queryKey: ['fiscalizacao', unidade?.fiscalizacao_id],
        queryFn: async () => unidade?.fiscalizacao_id ? Repository.getFiscalizacaoById(unidade.fiscalizacao_id) : null,
        enabled: !!unidade?.fiscalizacao_id,
        staleTime: 60000,
        gcTime: 300000
    });

    const { data: itensChecklist = [] } = useQuery({
        queryKey: ['itensChecklist', unidade?.tipo_unidade_id],
        queryFn: async () => unidade?.tipo_unidade_id ? Repository.getItensChecklist(unidade.tipo_unidade_id) : [],
        enabled: !!unidade?.tipo_unidade_id,
        staleTime: 60000,
        gcTime: 300000
    });

    const { data: respostasExistentes = [] } = useQuery({
        queryKey: ['respostas', unidadeId],
        queryFn: async () => Repository.listRespostasByUnidade(unidadeId),
        enabled: !!unidadeId,
        staleTime: Infinity,
        gcTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false
    });


    const { data: determinacoesExistentes = [] } = useQuery({
        queryKey: ['determinacoes', unidadeId],
        queryFn: async () => {
            const list = await Repository.listConstatacoesManuais(unidadeId);
            return list.filter(c => !!c.texto_determinacao && c.texto_determinacao.trim() !== '');
        },
        enabled: !!unidadeId,
        staleTime: Infinity,
        gcTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false
    });

    const { data: recomendacoesExistentes = [] } = useQuery({
        queryKey: ['recomendacoes', unidadeId],
        queryFn: async () => Repository.listRecomendacoesByUnidade(unidadeId),
        enabled: !!unidadeId,
        staleTime: Infinity,
        gcTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false
    });

    const { data: constatacoesManuais = [] } = useQuery({
        queryKey: ['constatacoes-manuais', unidadeId],
        queryFn: async () => Repository.listConstatacoesManuais(unidadeId),
        enabled: !!unidadeId,
        staleTime: Infinity,
        gcTime: Infinity,
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false
    });

    useEffect(() => {
        const carregar = async () => {
            const remotas = (unidade?.fotos_unidade || []).map(foto => 
                typeof foto === 'string' ? { url: foto } : foto
            );
            const locais = await Repository.listLocalFotos(unidadeId).then(list => 
                list.map(f => ({ localId: f.localId, url: f.url || '', legenda: f.legenda || '', mimeType: f.mimeType, width: f.width, height: f.height }))
            );
            setFotos([...(locais || []), ...remotas]);
        };
        carregar();
    }, [unidade?.fotos_unidade]);

    // Marcador para evitar recalcular numeração após finalização
    useEffect(() => {
        if (unidade?.status === 'finalizada') {
            setContadoresCarregados(true);
        }
    }, [unidade?.status]);

    // Carregar respostas apenas uma vez
    useEffect(() => {
        if (respostasExistentes.length > 0) {
            const respostasMap = {};
            respostasExistentes.forEach(r => {
                respostasMap[r.item_checklist_id] = r;
            });
            setRespostas(respostasMap);
        }
    }, [respostasExistentes.length]);

    // Debouncing inteligente: aguarda 3s após última resposta para salvar tudo de uma vez
    useEffect(() => {
        if (filaRespostas.length === 0) return;

        const processarBatch = async () => {
            try {
                const batch = [...filaRespostas];
                setFilaRespostas([]);

                // Buscar dados atuais uma única vez
                const [respostasAtuais] = await Promise.all([
                    Repository.listRespostasByUnidade(unidadeId)
                ]);

                console.log('🔍 processarBatch: Itens Checklist:', itensChecklist);
                console.log('🔍 processarBatch: Batch:', batch);
                console.log('🔍 processarBatch: Respostas Atuais:', respostasAtuais);

                // --- NOVA LÓGICA DE RENUMERAÇÃO ---
                // 1. Mesclar respostas atuais com o batch (para ter o estado final desejado)
                const mapaRespostas = new Map();
                
                // Adiciona respostas atuais ao mapa
                respostasAtuais.forEach(r => mapaRespostas.set(r.item_checklist_id, { ...r, origem: 'db' }));
                
                // Atualiza com os dados do batch (sobrescreve se existir)
                batch.forEach(item => {
                    const respostaExistente = mapaRespostas.get(item.itemId);
                    mapaRespostas.set(item.itemId, {
                        ...respostaExistente,
                        item_checklist_id: item.itemId,
                        resposta: item.data.resposta,
                        observacao: item.data.observacao,
                        origem: 'batch' // Marca que veio do batch
                    });
                });

                // 2. Iterar sobre TODOS os itens do checklist na ordem correta
                let contadorC = 1;
                const operacoes = [];

                // Se houver constatações manuais antes, precisamos ajustar o contador?
                // Assumindo que manuais vêm DEPOIS ou têm numeração separada.
                // Vamos assumir que Checklist começa do 1.
                
                for (const item of itensChecklist) {
                    const resposta = mapaRespostas.get(item.id);
                    
                    // Se não tem resposta ou não é SIM/NAO, pula (não gera constatação)
                    if (!resposta || (resposta.resposta !== 'SIM' && resposta.resposta !== 'NAO')) {
                        // Se existia no banco com constatação, precisamos limpar?
                        // O update abaixo vai cuidar disso se tiver ID.
                        continue;
                    }

                    // Calcular texto da constatação
                    let textoConstatacao = resposta.resposta === 'SIM' 
                        ? item.texto_constatacao_sim 
                        : resposta.resposta === 'NAO' 
                            ? item.texto_constatacao_nao 
                            : null;
                    
                    const temTexto = textoConstatacao && textoConstatacao.trim();
                    
                    // Se tem texto, formata e numera
                    if (temTexto) {
                        if (!textoConstatacao.trim().endsWith(';')) {
                            textoConstatacao = textoConstatacao.trim() + ';';
                        }
                        
                        // ATRIBUI NOVO NÚMERO SEQUENCIAL
                        const novoNumero = `C${contadorC++}`;
                        
                        // Preparar dados para salvar
                        const dadosParaSalvar = {
                            resposta: resposta.resposta,
                            observacao: resposta.observacao || '',
                            pergunta: textoConstatacao,
                            numero_constatacao: novoNumero,
                            gera_nc: resposta.resposta === 'NAO' && item.gera_nc
                        };

                        // Verificar se precisa atualizar (se mudou algo ou se veio do batch)
                        const mudouNumero = resposta.numero_constatacao !== novoNumero;
                        const veioDoBatch = resposta.origem === 'batch';
                        
                        // Sempre atualiza se veio do batch OU se o número mudou (renumeração em cascata)
                        if (veioDoBatch || mudouNumero) {
                            if (resposta.id) {
                                operacoes.push(Repository.saveResposta(unidadeId, item.id, dadosParaSalvar));
                            } else {
                                operacoes.push(Repository.saveResposta(unidadeId, item.id, dadosParaSalvar));
                            }
                        }
                    } else {
                        // Resposta SIM/NAO mas sem texto configurado -> Salva sem número C
                        const dadosParaSalvar = {
                            resposta: resposta.resposta,
                            observacao: resposta.observacao || '',
                            pergunta: null,
                            numero_constatacao: null,
                            gera_nc: false
                        };

                        if (resposta.origem === 'batch') {
                             operacoes.push(Repository.saveResposta(unidadeId, item.id, dadosParaSalvar));
                        }
                    }
                }

                console.log(`🔍 processarBatch: Gerando ${operacoes.length} operações de atualização.`);

                await Promise.all(operacoes);
                await queryClient.invalidateQueries({ queryKey: ['respostas', unidadeId] });

            } catch (err) {
                console.error('Erro ao processar batch:', err);
                alert(err.message);
            }
        };

        // Debounce de 3s - só salva após usuário parar de responder
        const timer = setTimeout(processarBatch, 3000);
        return () => clearTimeout(timer);
    }, [filaRespostas, unidadeId, itensChecklist]);

    const salvarRespostaMutation = useMutation({
        mutationFn: async ({ itemId, data }) => {
            if (fiscalizacao?.status === 'finalizada' && !modoEdicao) {
                throw new Error('Não é possível modificar uma fiscalização finalizada');
            }
            return { itemId, data };
        },
        onSuccess: ({ itemId, data }) => {
            const respostaAtual = respostasExistentes.find(r => r.item_checklist_id === itemId);
            
            // Atualizar estado local INSTANTANEAMENTE para feedback visual imediato
            if (respostaAtual) {
                setRespostas(prev => ({
                    ...prev,
                    [itemId]: { 
                        ...respostaAtual, 
                        resposta: data.resposta, 
                        observacao: data.observacao
                    }
                }));
            } else {
                setRespostas(prev => ({
                    ...prev,
                    [itemId]: { 
                        item_checklist_id: itemId,
                        resposta: data.resposta, 
                        observacao: data.observacao
                    }
                }));
            }
            
            // Adicionar à fila - debounce de 3s vai processar tudo de uma vez
            setFilaRespostas(prev => [...prev, { itemId, data }]);
        },
        onError: (err) => {
            alert(err.message);
        }
    });


    const adicionarRecomendacaoMutation = useMutation({
        mutationFn: async (texto) => {
            if (fiscalizacao?.status === 'finalizada' && !modoEdicao) {
                throw new Error('Não é possível modificar uma fiscalização finalizada');
            }
            const recCount = await Repository.countRecomendacoesByUnidade(unidadeId);
            const numeroRecomendacao = `R${(recCount || 0) + 1}`;
            await Repository.addRecomendacao(unidadeId, texto, numeroRecomendacao, 'manual');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recomendacoes', unidadeId] });
            setNovaRecomendacao('');
            setShowAddRecomendacao(false);
        }
    });

    const adicionarConstatacaoManualMutation = useMutation({
        mutationFn: async (data) => {
            if (fiscalizacao?.status === 'finalizada' && !modoEdicao) {
                throw new Error('Não é possível modificar uma fiscalização finalizada');
            }

            // Se for edição, atualizar
            if (constatacaoParaEditar) {
                let descricaoFinal = data.descricao;
                if (descricaoFinal && !descricaoFinal.trim().endsWith(';')) {
                    descricaoFinal = descricaoFinal.trim() + ';';
                }

                await Repository.updateConstatacaoManual(constatacaoParaEditar.id, {
                    descricao: descricaoFinal,
                    gera_nc: data.gera_nc
                });
                return { constatacao: { ...constatacaoParaEditar, descricao: descricaoFinal, gera_nc: data.gera_nc } };
            }

            // Se for nova constatação, criar (NC/D geradas apenas ao finalizar)
            const totalRespostas = await Repository.countRespostasComPergunta(unidadeId);
            const totalManuais = await Repository.countConstatacoesManuais(unidadeId);

            const totalConstatacoes = (totalRespostas || 0) + (totalManuais || 0);
            const numeroConstatacao = `C${totalConstatacoes + 1}`;

            let descricaoFinal = data.descricao;
            if (descricaoFinal && !descricaoFinal.trim().endsWith(';')) {
                descricaoFinal = descricaoFinal.trim() + ';';
            }

            const constatacao = await Repository.addConstatacaoManual(unidadeId, {
                numero_constatacao: numeroConstatacao,
                descricao: descricaoFinal,
                gera_nc: data.gera_nc,
                ordem: Date.now()
            });
            return { constatacao };
        },
        onSuccess: async ({ constatacao }) => {
            queryClient.invalidateQueries({ queryKey: ['constatacoes-manuais', unidadeId] });
            setShowAddConstatacao(false);
            setConstatacaoParaEditar(null);

            // Se gera NC e é nova constatação, abrir modal para definir NC/D/R
            if (constatacao.gera_nc && !constatacaoParaEditar) {
                const totalDets = await Repository.countDeterminacoesByUnidade(unidadeId);
                const totalRecs = await Repository.countRecomendacoesByUnidade(unidadeId);
                const totalNCs = (await Repository.countConstatacoesManuais(unidadeId) || 0); // aproximação local
                const numeroNC = `NC${(totalNCs || 0) + 1}`;
                const numeroDeterminacao = `D${(totalDets || 0) + 1}`;
                const numeroRecomendacao = `R${(totalRecs || 0) + 1}`;
                setConstatacaoParaNC(constatacao);
                setNumerosParaNC({
                    numeroNC,
                    numeroDeterminacao,
                    numeroRecomendacao,
                    numeroConstatacao: constatacao.numero_constatacao
                });
                setShowEditarNC(true);
            }
        },
        onError: (err) => {
            alert(err.message);
        }
    });

    const excluirConstatacaoManualMutation = useMutation({
        mutationFn: async (constatacaoId) => {
            if (fiscalizacao?.status === 'finalizada' && !modoEdicao) {
                throw new Error('Não é possível modificar uma fiscalização finalizada');
            }

            // Nota: O banco de dados já deve ter ON DELETE CASCADE configurado
            await Repository.removeConstatacaoManual(constatacaoId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['constatacoes-manuais', unidadeId] });
            queryClient.invalidateQueries({ queryKey: ['respostas', unidadeId] });
            queryClient.invalidateQueries({ queryKey: ['ncs', unidadeId] });
            queryClient.invalidateQueries({ queryKey: ['determinacoes', unidadeId] });
            queryClient.invalidateQueries({ queryKey: ['recomendacoes', unidadeId] });
            setShowConfirmaExclusao(false);
            setConstatacaoParaExcluir(null);
        },
        onError: (err) => {
            alert(err.message);
        }
    });

    const salvarNCMutation = useMutation({
        mutationFn: async (data) => {
            if (!constatacaoParaNC || !numerosParaNC) return;
            let textoConstatacaoFinal = data.texto_constatacao;
            if (textoConstatacaoFinal && !textoConstatacaoFinal.trim().endsWith(';')) {
                textoConstatacaoFinal = textoConstatacaoFinal.trim() + ';';
            }
            await Repository.updateConstatacaoManual(constatacaoParaNC.id, {
                descricao: textoConstatacaoFinal,
                artigo_portaria: data.artigo_portaria,
                texto_determinacao: data.gera_determinacao ? data.texto_determinacao : null,
                texto_recomendacao: data.gera_recomendacao ? data.texto_recomendacao : null
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['constatacoes-manuais', unidadeId] });
            setShowEditarNC(false);
            setConstatacaoParaNC(null);
            setNumerosParaNC(null);
        },
        onError: (err) => {
            alert(err.message);
        }
    });

    const finalizarUnidadeMutation = useMutation({
        mutationFn: async () => {
            console.log('🔵 Iniciando finalização da unidade:', unidadeId);
            const fotosCompletas = fotos.map(f => {
                if (typeof f === 'string') {
                    return { url: f, legenda: '', mimeType: undefined, width: undefined, height: undefined };
                }
                return { url: f.url, legenda: f.legenda || '', mimeType: f.mimeType, width: f.width, height: f.height };
            });
            await Repository.updateUnidadeFotos(unidadeId, fotosCompletas);
            await Repository.updateUnidadeStatus(unidadeId, 'finalizada');
            console.log('🟢 Finalização concluída com sucesso');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['unidades-fiscalizacao'] });
            queryClient.invalidateQueries({ queryKey: ['ncs', unidadeId] });
            queryClient.invalidateQueries({ queryKey: ['determinacoes', unidadeId] });
            queryClient.invalidateQueries({ queryKey: ['recomendacoes', unidadeId] });
            navigate(createPageUrl('ExecutarFiscalizacao') + `?id=${unidade.fiscalizacao_id}`);
        },
        onError: (err) => {
            console.error('🔴 Erro ao finalizar unidade:', err);
            alert(err.message);
        }
    });

    const salvarAlteracoesMutation = useMutation({
        mutationFn: async () => {
            console.log('🔵 Iniciando salvamento de alterações da unidade:', unidadeId);
            console.log('🔵 Regenerando NC/D/R...');
            const fotosCompletas = fotos.map(f => {
                if (typeof f === 'string') {
                    return { url: f, legenda: '', mimeType: undefined, width: undefined, height: undefined };
                }
                return { url: f.url, legenda: f.legenda || '', mimeType: f.mimeType, width: f.width, height: f.height };
            });
            await Repository.updateUnidadeFotos(unidadeId, fotosCompletas);

            console.log('🟢 Salvamento concluído com sucesso');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['unidades-fiscalizacao'] });
            queryClient.invalidateQueries({ queryKey: ['unidade', unidadeId] });
            queryClient.invalidateQueries({ queryKey: ['ncs', unidadeId] });
            queryClient.invalidateQueries({ queryKey: ['determinacoes', unidadeId] });
            queryClient.invalidateQueries({ queryKey: ['recomendacoes', unidadeId] });
            navigate(createPageUrl('ExecutarFiscalizacao') + `?id=${unidade.fiscalizacao_id}`);
        },
        onError: (err) => {
            console.error('🔴 Erro ao salvar alterações:', err);
            alert(err.message);
        }
    });

    const handleFinalizarClick = () => {
        if (fotos.length === 0) {
            setShowConfirmaSemFotos(true);
        } else {
            finalizarUnidadeMutation.mutate();
        }
    };

    const handleResponder = (itemId, data) => {
        salvarRespostaMutation.mutate({ itemId, data });
    };

    const handleAddFoto = async (fotoData) => {
        setFotos(prev => [...prev, fotoData]);
    };

    const handleRemoveFoto = (index) => {
        const alvo = fotos[index];
        if (alvo?.localId) {
            Repository.deleteLocalFoto(alvo.localId).catch(() => {});
        }
        const novasFotos = fotos.filter((_, i) => i !== index);
        setFotos(novasFotos);
    };

    const handleUpdateLegenda = (index, legenda) => {
        const novasFotos = [...fotos];
        const alvo = novasFotos[index];
        novasFotos[index] = { ...alvo, legenda };
        if (alvo?.localId) {
            Repository.updateLocalFotoLegenda(alvo.localId, legenda).catch(() => {});
        }
        setFotos(novasFotos);
    };

    if (loadingUnidade) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    const totalRespondidas = Object.keys(respostas).length;
    const totalItens = Array.isArray(itensChecklist) ? itensChecklist.length : 0;
    const progresso = totalItens > 0 ? Math.round((totalRespondidas / totalItens) * 100) : 0;

    return (
        <div className="min-h-screen bg-gray-100 pb-24">
            
            {/* Header */}
            <div className="bg-blue-900 text-white sticky top-0 z-40">
                <div className="max-w-4xl mx-auto px-4 py-3">
                    <div className="flex items-center gap-3">
                        <Link to={createPageUrl('ExecutarFiscalizacao') + `?id=${unidade?.fiscalizacao_id}`}>
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div className="flex-1">
                            <h1 className="font-bold">{unidade?.tipo_unidade_nome}</h1>
                            {unidade?.nome_unidade && (
                                <p className="text-blue-200 text-sm">{unidade.nome_unidade}</p>
                            )}
                        </div>
                    </div>
                    
                    {/* Progress */}
                    <div className="mt-3">
                        <div className="flex justify-between text-xs text-blue-200 mb-1">
                            <span>Checklist: {totalRespondidas}/{totalItens}</span>
                            <span>{progresso}%</span>
                        </div>
                        <div className="h-2 bg-blue-800 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-green-400 transition-all"
                                style={{ width: `${progresso}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="max-w-4xl mx-auto px-4 py-4">
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="w-full grid grid-cols-4">
                        <TabsTrigger value="checklist" className="text-xs">
                            <ClipboardCheck className="h-4 w-4 mr-1" />
                            Checklist
                        </TabsTrigger>
                        <TabsTrigger value="constatacoes" className="text-xs">
                            <FileText className="h-4 w-4 mr-1" />
                            Const
                        </TabsTrigger>
                        <TabsTrigger value="fotos" className="text-xs">
                            <Camera className="h-4 w-4 mr-1" />
                            Fotos
                            {fotos.length === 0 && <span className="ml-1 text-red-500">!</span>}
                        </TabsTrigger>
                        <TabsTrigger value="recomendacoes" className="text-xs">
                            <FileText className="h-4 w-4 mr-1" />
                            Rec ({recomendacoesExistentes.length})
                        </TabsTrigger>
                    </TabsList>

                    {/* Constatações Tab */}
                    <TabsContent value="constatacoes" className="mt-4 space-y-4">
                        {(fiscalizacao?.status !== 'finalizada' || modoEdicao) && (
                            <Button 
                                onClick={() => {
                                    setConstatacaoParaEditar(null);
                                    setShowAddConstatacao(true);
                                }}
                                className="w-full"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Adicionar Constatação Manual
                            </Button>
                        )}

                        {/* Constatações Manuais (primeiro) */}
                        {constatacoesManuais.map(constatacao => (
                            <Card key={constatacao.id} className="border-blue-200 bg-blue-50">
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-3">
                                        <Badge className="bg-blue-600">{constatacao.numero_constatacao}</Badge>
                                        <div className="flex-1">
                                            <p className="text-sm">{constatacao.descricao}</p>
                                            {constatacao.gera_nc && (
                                                <Badge variant="outline" className="mt-2 text-xs">
                                                    Gera NC
                                                </Badge>
                                            )}
                                        </div>
                                        {(fiscalizacao?.status !== 'finalizada' || modoEdicao) && (
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={async () => {
                                                        setConstatacaoParaEditar(constatacao);
                                                        
                                                        // Se gera NC, buscar dados relacionados para permitir edição completa
            if (constatacao.gera_nc) {
                const totalDets = await Repository.countDeterminacoesByUnidade(unidadeId);
                const totalRecs = await Repository.countRecomendacoesByUnidade(unidadeId);
                setConstatacaoParaNC(constatacao);
                setNumerosParaNC({
                    numeroNC: `NC?`,
                    numeroDeterminacao: `D${(totalDets || 0) + 1}`,
                    numeroRecomendacao: `R${(totalRecs || 0) + 1}`,
                    numeroConstatacao: constatacao.numero_constatacao
                });
                setShowEditarNC(true);
            } else {
                setShowAddConstatacao(true);
            }
                                                    }}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => {
                                                        setConstatacaoParaExcluir(constatacao);
                                                        setShowConfirmaExclusao(true);
                                                    }}
                                                    className="text-red-600 hover:text-red-700"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        {/* Constatações do Checklist (depois) */}
                        {respostasExistentes
                            .filter(r => (r.resposta === 'SIM' || r.resposta === 'NAO') && r.pergunta && r.pergunta.trim())
                            .sort((a, b) => {
                                // Ordenar pela ordem do checklist
                                const indexA = itensChecklist.findIndex(i => i.id === a.item_checklist_id);
                                const indexB = itensChecklist.findIndex(i => i.id === b.item_checklist_id);
                                return indexA - indexB;
                            })
                            .map(resp => (
                                <Card key={resp.id}>
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            <Badge variant="secondary">{resp.numero_constatacao}</Badge>
                                            <div className="flex-1">
                                                <p className="text-sm">{resp.pergunta}</p>
                                                {resp.gera_nc && resp.resposta === 'NAO' && (
                                                    <Badge variant="outline" className="mt-2 text-xs text-red-600 border-red-300">
                                                        Gera NC
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}

                        {constatacoesManuais.length === 0 && respostasExistentes.filter(r => r.resposta === 'SIM' || r.resposta === 'NAO').length === 0 && (
                            <p className="text-center text-gray-500 text-sm py-4">
                                Nenhuma constatação registrada ainda.
                            </p>
                        )}
                    </TabsContent>

                    {/* Checklist Tab */}
                    <TabsContent value="checklist" className="mt-4 space-y-3">
                        {!Array.isArray(itensChecklist) || itensChecklist.length === 0 ? (
                            <Card>
                                <CardContent className="p-6 text-center text-gray-500">
                                    <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                    <p>Nenhum item de checklist configurado para este tipo de unidade.</p>
                                    <Link to={createPageUrl('Checklists') + `?tipo=${unidade?.tipo_unidade_id}`}>
                                        <Button variant="link">Configurar checklist</Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        ) : (
                            itensChecklist.map((item, index) => (
                                <ChecklistItem
                                    key={item.id}
                                    item={item}
                                    resposta={respostas[item.id]}
                                    onResponder={(data) => handleResponder(item.id, data)}
                                    numero={index + 1}
                                    desabilitado={unidade?.status === 'finalizada' && !modoEdicao}
                                />
                            ))
                        )}
                    </TabsContent>

                    {/* Fotos Tab */}
                    <TabsContent value="fotos" className="mt-4">
                    <PhotoGrid
                        fotos={fotos}
                        minFotos={2}
                        onAddFoto={handleAddFoto}
                        onRemoveFoto={handleRemoveFoto}
                        onUpdateLegenda={handleUpdateLegenda}
                        titulo="Fotos da Unidade"
                        fiscalizacaoId={unidade?.fiscalizacao_id}
                        unidadeId={unidadeId}
                        isEditable={unidade?.status !== 'finalizada' || modoEdicao}
                    />
                    </TabsContent>



                    {/* Recomendações Tab */}
                    <TabsContent value="recomendacoes" className="mt-4 space-y-4">
                        {(fiscalizacao?.status !== 'finalizada' || modoEdicao) && (
                            <Button onClick={() => setShowAddRecomendacao(true)} className="w-full">
                                <Plus className="h-4 w-4 mr-2" />
                                Adicionar Recomendação
                            </Button>
                        )}

                        {recomendacoesExistentes.map(rec => (
                            <Card key={rec.id}>
                                <CardContent className="p-4">
                                    <div className="flex items-start gap-3">
                                        <Badge variant="secondary">{rec.numero_recomendacao}</Badge>
                                        <p className="text-sm flex-1">{rec.descricao}</p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        {recomendacoesExistentes.length === 0 && (
                            <p className="text-center text-gray-500 text-sm py-4">
                                Nenhuma recomendação adicionada.
                            </p>
                        )}
                    </TabsContent>
                </Tabs>
            </div>

            {/* Bottom Bar */}
            {unidade?.status !== 'finalizada' && (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-50">
                    <div className="max-w-4xl mx-auto">
                        <Button 
                            className="w-full h-12 bg-green-600 hover:bg-green-700"
                            onClick={handleFinalizarClick}
                            disabled={finalizarUnidadeMutation.isPending}
                        >
                            {finalizarUnidadeMutation.isPending ? (
                                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                            ) : (
                                <Save className="h-5 w-5 mr-2" />
                            )}
                            Finalizar Vistoria
                        </Button>
                    </div>
                </div>
            )}

            {/* Bottom Bar - Modo Edição */}
            {unidade?.status === 'finalizada' && modoEdicao && (
                <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-50">
                    <div className="max-w-4xl mx-auto">
                        <Button 
                            className="w-full h-12 bg-blue-600 hover:bg-blue-700"
                            onClick={() => salvarAlteracoesMutation.mutate()}
                            disabled={salvarAlteracoesMutation.isPending}
                        >
                            {salvarAlteracoesMutation.isPending ? (
                                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                            ) : (
                                <Save className="h-5 w-5 mr-2" />
                            )}
                            Salvar Alterações
                        </Button>
                    </div>
                </div>
            )}

            {/* Dialog Recomendação */}
            <Dialog open={showAddRecomendacao} onOpenChange={setShowAddRecomendacao}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nova Recomendação</DialogTitle>
                        <DialogDescription>
                            Descreva a recomendação a ser registrada para esta unidade.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <Textarea
                            placeholder="Descreva a recomendação..."
                            value={novaRecomendacao}
                            onChange={(e) => setNovaRecomendacao(e.target.value)}
                            rows={4}
                        />
                        <div className="flex gap-2">
                            <Button 
                                className="flex-1"
                                onClick={() => adicionarRecomendacaoMutation.mutate(novaRecomendacao)}
                                disabled={!novaRecomendacao.trim() || adicionarRecomendacaoMutation.isPending}
                            >
                                Salvar
                            </Button>
                            <Button variant="outline" onClick={() => setShowAddRecomendacao(false)}>
                                Cancelar
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog Constatação Manual */}
            <ConstatacaoManualForm
                open={showAddConstatacao}
                onOpenChange={(open) => {
                    setShowAddConstatacao(open);
                    if (!open) setConstatacaoParaEditar(null);
                }}
                onSave={(data) => adicionarConstatacaoManualMutation.mutate(data)}
                isSaving={adicionarConstatacaoManualMutation.isPending}
                constatacaoParaEditar={constatacaoParaEditar}
            />

            {/* Dialog Editar NC */}
            <EditarNCModal
                open={showEditarNC}
                onOpenChange={setShowEditarNC}
                onSave={(data) => salvarNCMutation.mutate(data)}
                isSaving={salvarNCMutation.isPending}
                numeroNC={numerosParaNC?.numeroNC}
                numeroDeterminacao={numerosParaNC?.numeroDeterminacao}
                numeroRecomendacao={numerosParaNC?.numeroRecomendacao}
                numeroConstatacao={numerosParaNC?.numeroConstatacao}
                constatacaoTexto={constatacaoParaNC?.descricao}
                ncExistente={numerosParaNC?.ncExistente}
                determinacaoExistente={numerosParaNC?.determinacaoExistente}
                recomendacaoExistente={numerosParaNC?.recomendacaoExistente}
            />

            {/* Dialog Confirmação Exclusão Constatação */}
            <Dialog open={showConfirmaExclusao} onOpenChange={setShowConfirmaExclusao}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-700">
                            <AlertCircle className="h-5 w-5" />
                            Excluir Constatação
                        </DialogTitle>
                        <DialogDescription>
                            Tem certeza que deseja excluir a constatação <strong>{constatacaoParaExcluir?.numero_constatacao}</strong>?
                            {constatacaoParaExcluir?.gera_nc && (
                                <span className="block mt-2 text-yellow-700 font-medium">
                                    Esta ação também excluirá as Não Conformidades, Determinações e Recomendações associadas.
                                </span>
                            )}
                            <span className="block mt-2">
                                Todas as constatações seguintes serão renumeradas automaticamente.
                            </span>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-2">
                        <Button 
                            className="flex-1 bg-red-600 hover:bg-red-700"
                            onClick={() => excluirConstatacaoManualMutation.mutate(constatacaoParaExcluir?.id)}
                            disabled={excluirConstatacaoManualMutation.isPending}
                        >
                            {excluirConstatacaoManualMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            Sim, Excluir
                        </Button>
                        <Button variant="outline" onClick={() => setShowConfirmaExclusao(false)}>
                            Cancelar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Dialog Confirmação Sem Fotos */}
            <Dialog open={showConfirmaSemFotos} onOpenChange={setShowConfirmaSemFotos}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-yellow-700">
                            <AlertCircle className="h-5 w-5" />
                            Nenhuma Foto Registrada
                        </DialogTitle>
                        <DialogDescription>
                            Esta unidade será finalizada sem nenhuma foto. Tem certeza que deseja continuar?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-2">
                        <Button 
                            className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                            onClick={() => {
                                setShowConfirmaSemFotos(false);
                                finalizarUnidadeMutation.mutate();
                            }}
                            disabled={finalizarUnidadeMutation.isPending}
                        >
                            Sim, Finalizar
                        </Button>
                        <Button variant="outline" onClick={() => setShowConfirmaSemFotos(false)}>
                            Cancelar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
            </div>
            );
            }
