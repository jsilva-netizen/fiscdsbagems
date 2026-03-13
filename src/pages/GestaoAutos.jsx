import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import FluxoUploadDocumentos from '@/components/autos/FluxoUploadDocumentos';
import { ArrowLeft, Loader2, Save } from 'lucide-react';

export default function GestaoAutos() {
     const queryClient = useQueryClient();
     const [uploadingFile, setUploadingFile] = useState(false);
     const [penaBase, setPenaBase] = useState({});

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

    const { data: municipios = [] } = useQuery({
       queryKey: ['municipios'],
       queryFn: async () => {
           const { data, error } = await supabase.from('municipios').select('*');
           if (error) throw error;
           return data;
       }
    });


     const salvarPenaBaseMutation = useMutation({
         mutationFn: async ({ autoId, penaUferms, penaRs }) => {
             const { error } = await supabase.from('autos_infracao').update({
                 pena_base_uferms: parseInt(penaUferms) || 0,
                 pena_base_rs: parseFloat(penaRs.replace('R$', '').replace(',', '.').trim()) || 0
             }).eq('id', autoId);
             if (error) throw error;
         },
         onSuccess: () => {
             queryClient.invalidateQueries({ queryKey: ['autos-infracao'] });
             alert('Pena base salva com sucesso!');
             setPenaBase({});
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

            const { data: { publicUrl } } = supabase.storage
                .from('documentos-autos')
                .getPublicUrl(filePath);

            await supabase.from('autos_infracao').update({
                arquivo_url: publicUrl
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

    const getPrestadorNome = (id) => {
        const p = prestadores.find(pres => pres.id === id);
        return p?.nome || 'N/A';
    };

    const getMunicipioNome = (autoId) => {
         const auto = autos.find(a => a.id === autoId);
         const fisc = fiscalizacoes.find(f => f.id === auto?.fiscalizacao_id);
         const mun = municipios.find(m => m.id === fisc?.municipio_id);
         return mun?.nome || 'N/A';
     };

     const getNumeroProcesso = (autoId) => {
         const auto = autos.find(a => a.id === autoId);
         const fisc = fiscalizacoes.find(f => f.id === auto?.fiscalizacao_id);
         return fisc?.numero_processo || 'N/A';
     };

    const autosPorStatus = {
        gerados: autos.filter(a => a.status === 'gerado'),
        enviados: autos.filter(a => a.status === 'enviado'),
        em_analise: autos.filter(a => a.status === 'em_analise'),
        finalizados: autos.filter(a => a.status === 'finalizado')
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
                    <h1 className="text-3xl font-bold">Gestão de Autos de Infração</h1>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-4 gap-4 mb-8">
                    <Card>
                        <CardContent className="p-4 text-center">
                            <p className="text-sm text-gray-600 mb-1">Gerados</p>
                            <p className="text-2xl font-bold">{autosPorStatus.gerados.length}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 text-center">
                            <p className="text-sm text-gray-600 mb-1">Enviados</p>
                            <p className="text-2xl font-bold">{autosPorStatus.enviados.length}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 text-center">
                            <p className="text-sm text-gray-600 mb-1">Em Análise</p>
                            <p className="text-2xl font-bold">{autosPorStatus.em_analise.length}</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="p-4 text-center">
                            <p className="text-sm text-gray-600 mb-1">Finalizados</p>
                            <p className="text-2xl font-bold">{autosPorStatus.finalizados.length}</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="gerados" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="gerados">Gerados ({autosPorStatus.gerados.length})</TabsTrigger>
                        <TabsTrigger value="enviados">Enviados ({autosPorStatus.enviados.length})</TabsTrigger>
                        <TabsTrigger value="analise">Em Análise ({autosPorStatus.em_analise.length})</TabsTrigger>
                        <TabsTrigger value="finalizados">Finalizados ({autosPorStatus.finalizados.length})</TabsTrigger>
                    </TabsList>

                    <TabsContent value="gerados" className="space-y-4">
                        {autosPorStatus.gerados.map(auto => (
                        <Card key={auto.id}>
                        <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-4">
                         <div className="flex-1">
                             <h3 className="font-semibold">{auto.numero_auto}</h3>
                             <p className="text-xs text-gray-500 mt-1">Prestador: {getPrestadorNome(auto.prestador_servico_id)}</p>
                             <p className="text-xs text-gray-500">Município: {getMunicipioNome(auto.id)}</p>
                             <p className="text-xs text-gray-500">Processo: {getNumeroProcesso(auto.id)}</p>
                             <p className="text-xs text-gray-500 mt-2">{auto.motivo_infracao}</p>
                         </div>
                         <div className="flex gap-2">
                             <FluxoUploadDocumentos auto={auto} onUpdate={() => queryClient.invalidateQueries({ queryKey: ['autos-infracao'] })} />
                         </div>
                        </div>
                        <div className="border-t pt-4 grid grid-cols-2 gap-4 mb-4">
                         <div>
                             <Label>Pena Base (UFERMS)</Label>
                             <Input 
                                 type="number" 
                                 placeholder="0" 
                                 className="mt-1"
                                 defaultValue={auto.pena_base_uferms || ''}
                                 onChange={(e) => setPenaBase({ ...penaBase, [`${auto.id}-uferms`]: e.target.value })}
                             />
                         </div>
                         <div>
                             <Label>Pena Base (R$)</Label>
                             <Input 
                                 type="text" 
                                 placeholder="R$ 0,00" 
                                 className="mt-1"
                                 defaultValue={auto.pena_base_rs ? `R$ ${auto.pena_base_rs.toFixed(2).replace('.', ',')}` : ''}
                                 onChange={(e) => setPenaBase({ ...penaBase, [`${auto.id}-rs`]: e.target.value })}
                             />
                         </div>
                        </div>
                        <Button 
                         size="sm" 
                         className="w-full bg-green-600 hover:bg-green-700"
                         onClick={() => salvarPenaBaseMutation.mutate({
                             autoId: auto.id,
                             penaUferms: penaBase[`${auto.id}-uferms`] || auto.pena_base_uferms || 0,
                             penaRs: penaBase[`${auto.id}-rs`] || `R$ ${(auto.pena_base_rs || 0).toFixed(2).replace('.', ',')}`
                         })}
                         disabled={salvarPenaBaseMutation.isPending}
                        >
                         {salvarPenaBaseMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                         Salvar Alterações
                        </Button>
                        </CardContent>
                        </Card>
                        ))}
                    </TabsContent>

                    <TabsContent value="enviados" className="space-y-4">
                        {autosPorStatus.enviados.map(auto => (
                            <Card key={auto.id} className="border-blue-300">
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex-1">
                                            <h3 className="font-semibold">{auto.numero_auto}</h3>
                                            <p className="text-xs text-gray-500">Enviado: {new Date(auto.data_envio).toLocaleDateString('pt-BR')}</p>
                                            <p className="text-xs text-gray-500">Prazo até: {new Date(auto.data_limite_manifestacao).toLocaleDateString('pt-BR')}</p>
                                        </div>
                                        <Badge className="bg-blue-600">Enviado</Badge>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
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
                </Tabs>
            </div>
        </div>
    );
}
