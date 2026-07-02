import { useState } from 'react';
import { Repository } from '@/lib/offline/repository';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, Scale } from 'lucide-react';
import CatesaLayout from '@/components/camaras/CatesaLayout';

export default function CamaraJulgamento() {
    const [remessaAbertaId, setRemessaAbertaId] = useState(null);
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

    const { data: prestadores = [] } = useQuery({
        queryKey: ['prestadores'],
        queryFn: async () => {
            const data = await Repository.listPrestadoresFull();
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

    const pareceresFinalizados = pareceres.filter(p => String(p?.status || '') === 'finalizado');
    const pareceresAssinados = pareceresFinalizados.filter(p => !!p?.arquivo_parecer_assinado_url);
    const pareceresSemAssinatura = pareceresFinalizados.filter(p => !p?.arquivo_parecer_assinado_url);
    const remessasEncaminhadas = (remessas || []).filter(r => String(r?.status || '') === 'parecer_enviado');

    return (
        <CatesaLayout>
                <div className="max-w-6xl mx-auto px-4 pt-8 pb-6">

                {/* Header */}
                <div className="flex items-center gap-3 mb-6">
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-violet-50">
                        <Scale className="h-5 w-5 text-violet-700" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Câmara de Julgamento</h1>
                        <p className="text-sm text-slate-500">Remessas encaminhadas para julgamento</p>
                    </div>
                </div>

                {/* KPIs */}
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <Card className="border border-gray-200 rounded-2xl shadow-sm bg-white hover:shadow-md transition-shadow">
                        <CardContent className="p-4 text-center">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Remessas Encaminhadas</p>
                            <p className="text-3xl font-bold text-blue-600">{remessasEncaminhadas.length}</p>
                        </CardContent>
                    </Card>
                    <Card className="border border-gray-200 rounded-2xl shadow-sm bg-white hover:shadow-md transition-shadow">
                        <CardContent className="p-4 text-center">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Sem Assinatura</p>
                            <p className="text-3xl font-bold text-yellow-600">{pareceresSemAssinatura.length}</p>
                        </CardContent>
                    </Card>
                    <Card className="border border-gray-200 rounded-2xl shadow-sm bg-white hover:shadow-md transition-shadow">
                        <CardContent className="p-4 text-center">
                            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Finalizados</p>
                            <p className="text-3xl font-bold text-slate-800">{pareceresFinalizados.length}</p>
                        </CardContent>
                    </Card>
                </div>

                <h2 className="text-2xl font-semibold mb-4">Remessas Encaminhadas</h2>
                <div className="space-y-4">
                    {remessasEncaminhadas.length === 0 ? (
                        <Card>
                            <CardContent className="p-8 text-center text-gray-500">
                                Nenhuma remessa encaminhada disponível
                            </CardContent>
                        </Card>
                    ) : (
                        remessasEncaminhadas.map((r) => (
                            <Card key={r.id} className={`${remessaAbertaId === r.id ? 'border-indigo-300 ring-1 ring-indigo-300' : 'border-slate-200'} hover:shadow-md transition-shadow border rounded-2xl overflow-hidden bg-white mb-4`}>
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                            <div className="font-medium">{r.numero_rfp || 'RFP'}</div>
                                            {r.numero_tn ? <div className="text-xs text-gray-600">TN: {r.numero_tn}</div> : null}
                                            <div className="text-xs text-gray-600">Prestador: {getPrestadorNome(r.prestador_servico_id)}</div>
                                            <div className="mt-1">
                                                <Badge className="bg-gray-700">{r.status || 'parecer_enviado'}</Badge>
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
                                        <div className="space-y-2">
                                            {(remessaItens || []).length === 0 ? (
                                                <div className="text-sm text-gray-600">Nenhum item.</div>
                                            ) : (
                                                (remessaItens || []).map((it) => {
                                                    const a = it?.autos_infracao;
                                                    if (!a?.id) return null;
                                                    const parecer = (pareceresAssinados || []).find(p => p.auto_id === a.id) || null;
                                                    const defesaArquivos = Array.isArray(a?.defesa_arquivos) ? a.defesa_arquivos : [];
                                                    return (
                                                        <Card key={it.id} className="border-gray-200 rounded-2xl bg-white shadow-sm overflow-hidden mb-3">
                                                            <CardContent className="p-4 space-y-3">
                                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                                    <div className="font-semibold">{a.numero_auto || a.id}</div>
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {a.arquivo_url ? (
                                                                            <Button variant="outline" size="sm" onClick={() => void openArquivo(a.arquivo_url)}>
                                                                                <Download className="h-4 w-4 mr-2" />
                                                                                AI
                                                                            </Button>
                                                                        ) : null}
                                                                        {parecer?.arquivo_parecer_assinado_url ? (
                                                                            <Button variant="outline" size="sm" onClick={() => void openArquivo(parecer.arquivo_parecer_assinado_url)}>
                                                                                <Download className="h-4 w-4 mr-2" />
                                                                                Parecer
                                                                            </Button>
                                                                        ) : (
                                                                            <Badge className="bg-yellow-600">Sem parecer</Badge>
                                                                        )}
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
                                                                                <Button key={idx} size="sm" variant="outline" onClick={() => void openArquivo(arq?.url || arq)}>
                                                                                    <Download className="h-4 w-4 mr-2" />
                                                                                    {arq?.nome || `Anexo ${idx + 1}`}
                                                                                </Button>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                ) : null}
                                                            </CardContent>
                                                        </Card>
                                                    );
                                                })
                                            )}
                                        </div>
                                    ) : null}
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </CatesaLayout>
    );
}
