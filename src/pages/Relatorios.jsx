import { useState } from 'react';
import { createPageUrl } from '@/utils';
import { supabase } from '@/lib/supabase';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp } from 'lucide-react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, PieChart, Pie, Legend, Cell } from 'recharts';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Download, FileJson, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';

import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const COLORS = ['#22c55e', '#ef4444', '#3b82f6', '#f59e0b'];
const SERVICO_COLORS = {
    'Abastecimento de Água': '#3b82f6',
    'Esgotamento Sanitário': '#8b5cf6',
    'Manejo de Resíduos Sólidos': '#f59e0b',
    'Limpeza Urbana': '#10b981',
    'Drenagem': '#06b6d4'
};

const TODOS_SERVICOS = ['Abastecimento de Água', 'Esgotamento Sanitário', 'Manejo de Resíduos Sólidos', 'Limpeza Urbana', 'Drenagem'];

export default function Relatorios() {
    const [anoFiltro, setAnoFiltro] = useState(new Date().getFullYear().toString());
    const [servicoFiltro, setServicoFiltro] = useState('todos');
    const [municipioFiltro, setMunicipioFiltro] = useState('todos');
    const [prestadorFiltro, setPrestadorFiltro] = useState('todos');

    const { data: fiscalizacoes = [] } = useQuery({
        queryKey: ['fiscalizacoes'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('fiscalizacoes')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        }
    });

    const { data: todosMunicipios = [] } = useQuery({
        queryKey: ['todos-municipios'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('municipios')
                .select('id, nome')
                .order('nome');
            if (error) throw error;
            return data;
        }
    });

    const { data: todosPrestadores = [] } = useQuery({
        queryKey: ['todos-prestadores'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('prestadores_servico')
                .select('id, nome')
                .order('nome');
            if (error) throw error;
            return data;
        }
    });

    const { data: ncs = [] } = useQuery({
        queryKey: ['todas-ncs'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('nao_conformidades')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        }
    });

    const { data: unidades = [] } = useQuery({
        queryKey: ['todas-unidades'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('unidades_fiscalizadas')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        }
    });

    const { data: respostas = [] } = useQuery({
        queryKey: ['todas-respostas'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('respostas_checklist')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        }
    });

    const { data: determinacoes = [] } = useQuery({
        queryKey: ['todas-determinacoes'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('determinacoes')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        }
    });

    const { data: recomendacoes = [] } = useQuery({
        queryKey: ['todas-recomendacoes'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('recomendacoes')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        }
    });

    // Filtrar por ano e outros critérios em cascata
    const fiscalizacoesAno = fiscalizacoes.filter(f => {
        const matchAno = new Date(f.created_at).getFullYear().toString() === anoFiltro;
        
        const matchServico = servicoFiltro === 'todos' || 
            (Array.isArray(f.servicos) ? f.servicos.includes(servicoFiltro) : f.servico === servicoFiltro);
            
        const matchMunicipio = municipioFiltro === 'todos' || f.municipio_id === municipioFiltro;
        
        const matchPrestador = prestadorFiltro === 'todos' || f.prestador_servico_id === prestadorFiltro;
        
        return matchAno && matchServico && matchMunicipio && matchPrestador;
    });

    // Estatísticas gerais
    const totalFiscalizacoes = fiscalizacoesAno.length;
    const finalizadas = fiscalizacoesAno.filter(f => f.status === 'finalizada').length;
    
    // Contar NCs corretas filtrando por unidades das fiscalizações do ano
    const unidadesFiscalizacoesAno = unidades.filter(u => 
        fiscalizacoesAno.some(f => f.id === u.fiscalizacao_id)
    );
    const totalNCs = ncs.filter(nc => 
        unidadesFiscalizacoesAno.some(u => u.id === nc.unidade_fiscalizada_id)
    ).length;

    // Constatações (respostas com SIM ou NAO)
    const totalConstatacoes = respostas.filter(r => 
        unidadesFiscalizacoesAno.some(u => u.id === r.unidade_fiscalizada_id) &&
        (r.resposta === 'SIM' || r.resposta === 'NAO')
    ).length;

    // Determinações
    const totalDeterminacoes = determinacoes.filter(d => 
        unidadesFiscalizacoesAno.some(u => u.id === d.unidade_fiscalizada_id)
    ).length;

    // Recomendações
    const totalRecomendacoes = recomendacoes.filter(r => 
        unidadesFiscalizacoesAno.some(u => u.id === r.unidade_fiscalizada_id)
    ).length;

    // Contar conformidades (respostas SIM ao checklist)
    const totalConformidades = respostas.filter(r => 
        unidadesFiscalizacoesAno.some(u => u.id === r.unidade_fiscalizada_id) &&
        r.resposta === 'SIM'
    ).length;

    // Dados por serviço - cada fiscalização pode ter múltiplos serviços
    const porServico = {};
    fiscalizacoesAno.forEach(f => {
        const servicos = Array.isArray(f.servicos) ? f.servicos : (f.servico ? [f.servico] : []);
        
        servicos.forEach(servico => {
            if (!porServico[servico]) {
                porServico[servico] = { 
                    servico: servico, 
                    quantidade: 0
                };
            }
            porServico[servico].quantidade++;
        });
    });
    const dadosServico = Object.values(porServico);

    // Ranking de determinações por município
    const porMunicipioDeterm = {};
    determinacoes.filter(d => 
        unidadesFiscalizacoesAno.some(u => u.id === d.unidade_fiscalizada_id)
    ).forEach(d => {
        const unidade = unidadesFiscalizacoesAno.find(u => u.id === d.unidade_fiscalizada_id);
        const fisc = fiscalizacoesAno.find(f => f.id === unidade?.fiscalizacao_id);
        if (fisc) {
            if (!porMunicipioDeterm[fisc.municipio_nome]) {
                porMunicipioDeterm[fisc.municipio_nome] = { municipio: fisc.municipio_nome, determinacoes: 0 };
            }
            porMunicipioDeterm[fisc.municipio_nome].determinacoes++;
        }
    });
    const rankingDeterminacoes = Object.values(porMunicipioDeterm)
        .sort((a, b) => b.determinacoes - a.determinacoes)
        .slice(0, 10);

    const topMunicipios = rankingDeterminacoes.map(m => m.municipio);

    // Dados para gráfico de pizza
    const dadosPizza = [
        { name: 'Conformidades', value: totalConformidades },
        { name: 'Não Conformidades', value: totalNCs }
    ];

    // Municípios sem fiscalização
    const municipiosFiscalizados = new Set(fiscalizacoesAno.map(f => f.municipio_nome));

    const anos = ['2024', '2025', '2026'];

    const exportarPDF = async () => {
        const element = document.getElementById('relatorio-completo');
        const canvas = await html2canvas(element, { scale: 2 });
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save(`Relatorio-Fiscalizacoes-${anoFiltro}.pdf`);
    };

    const exportarJSON = () => {
        const dados = {
            ano: anoFiltro,
            data_geracao: new Date().toLocaleString('pt-BR'),
            resumo: {
                totalFiscalizacoes,
                finalizadas,
                totalNCs,
                totalConformidades,
                municipiosFiscalizados: municipiosFiscalizados.size
            },
            por_servico: dadosServico,
            top_municipios: topMunicipios,
            fiscalizacoes_detalhes: fiscalizacoesAno.map(f => ({
                id: f.id,
                municipio: f.municipio_nome,
                prestador: f.prestador_servico_nome,
                servico: f.servico,
                status: f.status,
                total_ncs: f.total_nao_conformidades,
                total_conformidades: f.total_conformidades
            }))
        };
        
        const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Relatorio-Fiscalizacoes-${anoFiltro}.json`;
        link.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-blue-900 text-white">
                <div className="max-w-6xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Link to={createPageUrl('Home')}>
                                <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold">Relatórios e Indicadores</h1>
                                <p className="text-blue-200 text-sm">Visão geral das fiscalizações</p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={exportarPDF} size="sm" className="bg-white/20 hover:bg-white/30 text-white gap-1">
                                <Download className="h-4 w-4" />
                                PDF
                            </Button>
                            <Button onClick={exportarJSON} size="sm" className="bg-white/20 hover:bg-white/30 text-white gap-1">
                                <FileJson className="h-4 w-4" />
                                JSON
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Barra de Filtros */}
            <div className="max-w-6xl mx-auto px-4 mt-6 print:hidden">
                <Card className="bg-white border border-gray-200 shadow-sm">
                    <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 block">Ano</label>
                            <Select value={anoFiltro} onValueChange={setAnoFiltro}>
                                <SelectTrigger className="w-full bg-white border-gray-200">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {anos.map(ano => (
                                        <SelectItem key={ano} value={ano}>{ano}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 block">Serviço</label>
                            <Select value={servicoFiltro} onValueChange={setServicoFiltro}>
                                <SelectTrigger className="w-full bg-white border-gray-200">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todos os Serviços</SelectItem>
                                    {TODOS_SERVICOS.map(s => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 block">Município</label>
                            <Select value={municipioFiltro} onValueChange={setMunicipioFiltro}>
                                <SelectTrigger className="w-full bg-white border-gray-200">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todos os Municípios</SelectItem>
                                    {todosMunicipios.map(m => (
                                        <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-semibold text-gray-500 block">Prestador</label>
                            <Select value={prestadorFiltro} onValueChange={setPrestadorFiltro}>
                                <SelectTrigger className="w-full bg-white border-gray-200">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todos">Todos os Prestadores</SelectItem>
                                    {todosPrestadores.map(p => (
                                        <SelectItem key={p.id} value={p.id}>{p.nome}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Content */}
            <div id="relatorio-completo" className="max-w-6xl mx-auto px-4 py-6 bg-white mt-6">
            {/* Stats Cards */}
            <div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <FileText className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{totalFiscalizacoes}</p>
                                    <p className="text-xs text-gray-500">Fiscalizações</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{finalizadas}</p>
                                    <p className="text-xs text-gray-500">Finalizadas</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                    <CheckCircle2 className="h-5 w-5 text-orange-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{totalConstatacoes}</p>
                                    <p className="text-xs text-gray-500">Constatações</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                                    <AlertTriangle className="h-5 w-5 text-red-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{totalNCs}</p>
                                    <p className="text-xs text-gray-500">Não Conformidades</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                                    <FileText className="h-5 w-5 text-yellow-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{totalDeterminacoes}</p>
                                    <p className="text-xs text-gray-500">Determinações</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <TrendingUp className="h-5 w-5 text-blue-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{totalRecomendacoes}</p>
                                    <p className="text-xs text-gray-500">Recomendações</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Por Serviço */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Fiscalizações por Serviço</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {dadosServico.length > 0 ? (
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={dadosServico}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="servico" tick={{ fontSize: 9 }} angle={-15} textAnchor="end" height={80} />
                                        <YAxis allowDecimals={false} />
                                        <Tooltip />
                                        <Bar dataKey="quantidade" name="Fiscalizações">
                                            {dadosServico.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={SERVICO_COLORS[entry.servico] || '#3b82f6'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <p className="text-center text-gray-500 py-8">Sem dados para exibir</p>
                            )}
                        </CardContent>
                    </Card>

                    {/* Conformidade vs NC */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Conformidade Geral</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {(totalConformidades > 0 || totalNCs > 0) ? (
                                <div>
                                    <ResponsiveContainer width="100%" height={220}>
                                        <PieChart>
                                            <Pie
                                                data={dadosPizza}
                                                cx="50%"
                                                cy="45%"
                                                innerRadius={50}
                                                outerRadius={75}
                                                paddingAngle={3}
                                                dataKey="value"
                                                label={false}
                                            >
                                                {dadosPizza.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip 
                                                formatter={(value) => {
                                                    const total = dadosPizza.reduce((acc, item) => acc + item.value, 0);
                                                    const percent = total > 0 ? ((value / total) * 100).toFixed(0) : 0;
                                                    return `${value} (${percent}%)`;
                                                }}
                                            />
                                            <Legend 
                                                verticalAlign="bottom" 
                                                height={20}
                                                formatter={(value, entry) => {
                                                    const total = dadosPizza.reduce((acc, item) => acc + item.value, 0);
                                                    const percent = total > 0 ? ((entry.payload.value / total) * 100).toFixed(0) : 0;
                                                    return `${value}: ${entry.payload.value} (${percent}%)`;
                                                }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <p className="text-center text-gray-500 py-8">Sem dados para exibir</p>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Ranking de Determinações */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle className="text-lg">Top 10 Municípios por Determinações</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {rankingDeterminacoes.length > 0 ? (
                            <div className="space-y-3">
                                {rankingDeterminacoes.map((m, index) => (
                                    <div key={m.municipio} className="flex items-center gap-3">
                                        <span className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center text-xs font-medium text-yellow-600">
                                            {index + 1}
                                        </span>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-center">
                                                <span className="font-medium">{m.municipio}</span>
                                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                                    {m.determinacoes} determinações
                                                </Badge>
                                            </div>
                                            <div className="h-2 bg-gray-100 rounded-full mt-1">
                                                <div 
                                                    className="h-full bg-yellow-500 rounded-full"
                                                    style={{ width: `${(m.determinacoes / rankingDeterminacoes[0].determinacoes) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 py-8">Sem dados para exibir</p>
                        )}
                    </CardContent>
                </Card>


            </div>
            </div>
        </div>
    );
}
