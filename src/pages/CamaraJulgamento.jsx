import { useState } from 'react';
import { Repository } from '@/lib/offline/repository';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';

export default function CamaraJulgamento() {
    const queryClient = useQueryClient();
    const [selectedAuto, setSelectedAuto] = useState(null);
    const [showParecerModal, setShowParecerModal] = useState(false);
    const [showJulgamentoModal, setShowJulgamentoModal] = useState(false);
    
    // Filtros
    const [filtroStatus, setFiltroStatus] = useState('pendente'); // pendente, parecer_emitido, julgado
    const [filtroPrestador, setFiltroPrestador] = useState('todos');

    // Forms
    const [parecerForm, setParecerForm] = useState({
        recomendacao: 'aplicar_multa',
        valor_multa_sugerido: '',
        analise_tecnica: ''
    });

    const [julgamentoForm, setJulgamentoForm] = useState({
        decisao: 'multa_aplicada',
        valor_multa_final: '',
        justificativa_decisao: ''
    });

    // Queries
    const { data: autos = [] } = useQuery({
        queryKey: ['autos-infracao'],
        queryFn: async () => {
            const data = await Repository.listAutosInfracaoOnlineAll();
            return data;
        }
    });

    const { data: pareceres = [] } = useQuery({
        queryKey: ['pareceres-tecnicos'],
        queryFn: async () => {
            const data = await Repository.listPareceresTecnicosOnlineAll();
            return data;
        }
    });

    const { data: julgamentos = [] } = useQuery({
        queryKey: ['julgamentos'],
        queryFn: async () => {
            const data = await Repository.listJulgamentosOnlineAll();
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

    // Mutations
    const salvarParecerMutation = useMutation({
        mutationFn: async (data) => {
            const novoParecer = await Repository.createParecerTecnicoOnline({
                ...data,
                status: 'finalizado'
            });
            return novoParecer;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['pareceres-tecnicos'] });
            setShowParecerModal(false);
            setParecerForm({ recomendacao: 'aplicar_multa', valor_multa_sugerido: '', analise_tecnica: '' });
        }
    });

    const salvarJulgamentoMutation = useMutation({
        mutationFn: async (data) => {
            const novoJulgamento = await Repository.createJulgamentoOnline({
                ...data,
                status: 'julgado'
            });
            const statusAuto = data.decisao === 'multa_aplicada' ? 'julgado_procedente' : 'julgado_improcedente';
            await Repository.updateAutoInfracaoOnlineStatus(data.auto_id, statusAuto);
            return novoJulgamento;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['julgamentos'] });
            queryClient.invalidateQueries({ queryKey: ['autos-infracao'] });
            setShowJulgamentoModal(false);
            setJulgamentoForm({ decisao: 'multa_aplicada', valor_multa_final: '', justificativa_decisao: '' });
        }
    });

    const parecesParaJulgar = pareceres.filter(p => 
        p.status === 'finalizado' && 
        !julgamentos.some(j => j.parecer_tecnico_id === p.id)
    );

    const getPrestadorNome = (id) => {
        const p = prestadores.find(pres => pres.id === id);
        return p?.nome || 'N/A';
    };

    const getRecomendacaoLabel = (rec) => {
        const labels = {
            aplicar_multa: 'Aplicar Multa',
            rejeitar_multa: 'Rejeitar Multa',
            analise_adicional: 'Análise Adicional'
        };
        return labels[rec] || rec;
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-2 mb-6">
                    <Link to={createPageUrl('Home')}>
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <h1 className="text-3xl font-bold">Câmara de Julgamento</h1>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <Card>
                        <CardContent className="p-4 text-center">
                            <p className="text-sm text-gray-600 mb-1">Para Julgar</p>
                            <p className="text-2xl font-bold text-orange-600">{parecesParaJulgar.length}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 text-center">
                            <p className="text-sm text-gray-600 mb-1">Multas Aplicadas</p>
                            <p className="text-2xl font-bold text-red-600">{julgamentos.filter(j => j.decisao === 'multa_aplicada').length}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 text-center">
                            <p className="text-sm text-gray-600 mb-1">Multas Rejeitadas</p>
                            <p className="text-2xl font-bold text-green-600">{julgamentos.filter(j => j.decisao === 'multa_rejeitada').length}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Casos para Julgar */}
                <h2 className="text-2xl font-semibold mb-4">Pareceres Aguardando Julgamento</h2>
                <div className="space-y-4">
                    {parecesParaJulgar.length === 0 ? (
                        <Card>
                            <CardContent className="p-8 text-center text-gray-500">
                                Nenhum parecer aguardando julgamento
                            </CardContent>
                        </Card>
                    ) : (
                        parecesParaJulgar.map(parecer => {
                            const auto = autos.find(a => a.id === parecer.auto_id);
                            return (
                                <Card key={parecer.id} className="border-orange-300 bg-orange-50">
                                    <CardContent className="p-4">
                                        <div className="flex justify-between items-start">
                                            <div className="flex-1">
                                                <h3 className="font-semibold mb-2">{auto?.numero_auto}</h3>
                                                <div className="grid grid-cols-3 gap-4 mb-2">
                                                    <div>
                                                        <p className="text-xs text-gray-600">Prestador</p>
                                                        <p className="text-sm font-medium">{getPrestadorNome(auto?.prestador_servico_id)}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-600">Recomendação do Técnico</p>
                                                        <Badge className={parecer.recomendacao === 'aplicar_multa' ? 'bg-red-600' : 'bg-green-600'}>
                                                            {getRecomendacaoLabel(parecer.recomendacao)}
                                                        </Badge>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-gray-600">Valor Sugerido</p>
                                                        <p className="text-sm font-medium">
                                                            {parecer.valor_multa_sugerido ? `R$ ${parecer.valor_multa_sugerido.toFixed(2)}` : '-'}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="bg-white rounded p-2 mb-3">
                                                    <p className="text-xs text-gray-600 font-medium mb-1">Análise Técnica:</p>
                                                    <p className="text-xs text-gray-700 line-clamp-3">{parecer.analise_tecnica}</p>
                                                </div>
                                            </div>
                                            <Dialog>
                                                <DialogTrigger asChild>
                                                    <Button className="bg-purple-600 hover:bg-purple-700">
                                                        Julgar
                                                    </Button>
                                                </DialogTrigger>
                                                <DialogContent>
                                                    <DialogHeader>
                                                        <DialogTitle>Julgamento - {auto?.numero_auto}</DialogTitle>
                                                    </DialogHeader>
                                                    <div className="space-y-4">
                                                        <div>
                                                            <Label>Decisão</Label>
                                                            <div className="grid grid-cols-2 gap-2 mt-2">
                                                                <Button
                                                                    variant={julgamentoForm.decisao === 'multa_aplicada' ? 'default' : 'outline'}
                                                                    onClick={() => setJulgamentoForm({ ...julgamentoForm, decisao: 'multa_aplicada' })}
                                                                    className={julgamentoForm.decisao === 'multa_aplicada' ? 'bg-red-600 hover:bg-red-700' : ''}
                                                                >
                                                                    <CheckCircle className="h-4 w-4 mr-1" />
                                                                    Aplicar Multa
                                                                </Button>
                                                                <Button
                                                                    variant={julgamentoForm.decisao === 'multa_rejeitada' ? 'default' : 'outline'}
                                                                    onClick={() => setJulgamentoForm({ ...julgamentoForm, decisao: 'multa_rejeitada' })}
                                                                    className={julgamentoForm.decisao === 'multa_rejeitada' ? 'bg-green-600 hover:bg-green-700' : ''}
                                                                >
                                                                    <XCircle className="h-4 w-4 mr-1" />
                                                                    Rejeitar Multa
                                                                </Button>
                                                            </div>
                                                        </div>

                                                        {julgamentoForm.decisao === 'multa_aplicada' && (
                                                            <div>
                                                                <Label>Valor da Multa (R$)</Label>
                                                                <Input
                                                                    type="number"
                                                                    placeholder="0,00"
                                                                    value={julgamentoForm.valor_multa_final}
                                                                    onChange={(e) => setJulgamentoForm({ ...julgamentoForm, valor_multa_final: e.target.value })}
                                                                />
                                                            </div>
                                                        )}

                                                        <div>
                                                            <Label>Justificativa</Label>
                                                            <Textarea
                                                                placeholder="Justifique a decisão..."
                                                                value={julgamentoForm.justificativa_decisao}
                                                                onChange={(e) => setJulgamentoForm({ ...julgamentoForm, justificativa_decisao: e.target.value })}
                                                                className="min-h-24"
                                                            />
                                                        </div>

                                                        <Button
                                                            onClick={() => salvarJulgamentoMutation.mutate({
                                                                parecer_tecnico_id: parecer.id,
                                                                auto_id: auto.id,
                                                                prestador_servico_id: auto.prestador_servico_id,
                                                                ...julgamentoForm
                                                            })}
                                                            className="w-full bg-purple-600 hover:bg-purple-700"
                                                        >
                                                            Registrar Julgamento
                                                        </Button>
                                                    </div>
                                                </DialogContent>
                                            </Dialog>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })
                    )}
                </div>

                {/* Julgamentos Realizados */}
                {julgamentos.length > 0 && (
                    <>
                        <h2 className="text-2xl font-semibold mb-4 mt-8">Julgamentos Realizados</h2>
                        <div className="space-y-2">
                            {julgamentos.slice(0, 10).map(julgamento => (
                                <Card key={julgamento.id}>
                                    <CardContent className="p-3">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="font-semibold text-sm">{julgamento.id}</p>
                                                <p className="text-xs text-gray-500">{new Date(julgamento.data_julgamento).toLocaleDateString('pt-BR')}</p>
                                            </div>
                                            <div>
                                                <Badge className={julgamento.decisao === 'multa_aplicada' ? 'bg-red-600' : 'bg-green-600'}>
                                                    {julgamento.decisao === 'multa_aplicada' ? 'Multa Aplicada' : 'Multa Rejeitada'}
                                                </Badge>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
