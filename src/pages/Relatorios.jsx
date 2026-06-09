import { useState, useRef, useEffect } from 'react';
import { createPageUrl } from '@/utils';
import { supabase } from '@/lib/supabase';
import { useModulo } from '@/hooks/useModulo';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, ArrowLeft, Download, FileJson, FileText, CheckCircle2, AlertTriangle, ChevronDown, Check, Search } from 'lucide-react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, PieChart, Pie, Legend, Cell } from 'recharts';
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

function MultiSelect({ placeholder, options, selectedValues, onChange }) {
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSelect = (val) => {
        let newSelection;
        if (selectedValues.includes(val)) {
            newSelection = selectedValues.filter(v => v !== val);
        } else {
            newSelection = [...selectedValues, val];
        }
        onChange(newSelection);
    };

    const handleSelectAll = () => {
        onChange(options.map(opt => opt.value));
    };

    const handleClear = () => {
        onChange([]);
    };

    const getDisplayText = () => {
        if (selectedValues.length === 0) return placeholder;
        if (selectedValues.length === options.length) return "Todos";
        
        const selectedLabels = options
            .filter(opt => selectedValues.includes(opt.value))
            .map(opt => opt.label);

        if (selectedLabels.length <= 2) {
            return selectedLabels.join(', ');
        }
        return `${selectedValues.length} selecionados`;
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="flex h-10 w-full items-center justify-between rounded-md border border-gray-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 text-left"
            >
                <span className="truncate block pr-2 text-gray-700">
                    {getDisplayText()}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-gray-500 opacity-50" />
            </button>

            {open && (
                <div className="absolute z-50 mt-1 max-h-60 w-full overflow-hidden rounded-md border border-gray-200 bg-white shadow-md animate-in fade-in-0 zoom-in-95 duration-100 flex flex-col">
                    {options.length > 5 && (
                        <div className="flex items-center border-b border-gray-100 px-3 py-2">
                            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                            <input
                                type="text"
                                placeholder="Buscar..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="flex h-6 w-full rounded-md bg-transparent text-sm outline-none placeholder:text-gray-400 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                        </div>
                    )}
                    
                    <div className="flex items-center justify-between border-b border-gray-100 px-3 py-1.5 bg-gray-50 text-[11px] font-medium text-gray-500">
                        <button 
                            type="button" 
                            onClick={handleSelectAll}
                            className="hover:text-blue-600 transition-colors cursor-pointer"
                        >
                            Selecionar Todos
                        </button>
                        <button 
                            type="button" 
                            onClick={handleClear}
                            className="hover:text-red-600 transition-colors cursor-pointer"
                        >
                            Limpar
                        </button>
                    </div>

                    <div className="overflow-y-auto flex-1 py-1 max-h-40">
                        {filteredOptions.length === 0 ? (
                            <div className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm text-gray-500 justify-center">
                                Nenhum resultado encontrado.
                            </div>
                        ) : (
                            filteredOptions.map((opt) => {
                                const isSelected = selectedValues.includes(opt.value);
                                return (
                                    <div
                                        key={opt.value}
                                        onClick={() => handleSelect(opt.value)}
                                        className="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-3 pr-2 text-sm outline-none hover:bg-gray-100 text-gray-700 transition-colors"
                                    >
                                        <div className="mr-2 flex h-4 w-4 items-center justify-center rounded border border-gray-300 bg-white">
                                            {isSelected && <Check className="h-3 w-3 text-blue-600 font-bold" />}
                                        </div>
                                        <span className="flex-1 truncate">{opt.label}</span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default function Relatorios() {
    const { tipoModulo, modulosFiltro, isDSB, isAdmin, diretoriaNome } = useModulo();

    // modulosFiltro: lista de tipo_modulo visíveis para este usuário (do hook)
    // Admin recebe [] = sem filtro; demais recebem todos os módulos da sua diretoria

    const [anoFiltro, setAnoFiltro] = useState([new Date().getFullYear().toString()]);
    const [servicoFiltro, setServicoFiltro] = useState([]);
    const [municipioFiltro, setMunicipioFiltro] = useState([]);
    const [prestadorFiltro, setPrestadorFiltro] = useState([]);

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

    const { data: resumo = {
        total_fiscalizacoes: 0,
        finalizadas: 0,
        total_ncs: 0,
        total_constatacoes: 0,
        total_determinacoes: 0,
        total_recomendacoes: 0,
        total_conformidades: 0,
        por_servico: [],
        ranking_determinacoes: []
    } } = useQuery({
        queryKey: ['resumo-indicadores', anoFiltro, servicoFiltro, municipioFiltro, prestadorFiltro, modulosFiltro],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('obter_resumo_indicadores', {
                p_anos: anoFiltro,
                p_servicos: servicoFiltro,
                p_municipio_ids: municipioFiltro,
                p_prestador_ids: prestadorFiltro,
                p_tipo_modulo: modulosFiltro,   // NOVO: filtro por módulo
            });
            if (error) throw error;
            return data;
        }
    });

    // Filtrar por ano e outros critérios em cascata (mantido para exportação JSON e metadados rápidos)
    const fiscalizacoesAno = fiscalizacoes.filter(f => {
        const matchAno = anoFiltro.length === 0 || 
            anoFiltro.includes(new Date(f.created_at).getFullYear().toString());
        
        const matchServico = servicoFiltro.length === 0 || 
            (Array.isArray(f.servicos) 
                ? f.servicos.some(s => servicoFiltro.includes(s)) 
                : servicoFiltro.includes(f.servico));
            
        const matchMunicipio = municipioFiltro.length === 0 || 
            municipioFiltro.includes(f.municipio_id);
        
        const matchPrestador = prestadorFiltro.length === 0 || 
            prestadorFiltro.includes(f.prestador_servico_id);
        
        return matchAno && matchServico && matchMunicipio && matchPrestador;
    });

    // Estatísticas gerais extraídas diretamente da RPC
    const totalFiscalizacoes = resumo.total_fiscalizacoes;
    const finalizadas = resumo.finalizadas;
    const totalNCs = resumo.total_ncs;
    const totalConstatacoes = resumo.total_constatacoes;
    const totalDeterminacoes = resumo.total_determinacoes;
    const totalRecomendacoes = resumo.total_recomendacoes;
    const totalConformidades = resumo.total_conformidades;

    // Dados por serviço consolidados da RPC
    const dadosServico = resumo.por_servico || [];

    // Ranking de determinações por município consolidados da RPC
    const rankingDeterminacoes = resumo.ranking_determinacoes || [];
    const topMunicipios = rankingDeterminacoes.map(m => m.municipio);

    // Dados para gráfico de pizza
    const dadosPizza = [
        { name: 'Conformidades', value: totalConformidades },
        { name: 'Não Conformidades', value: totalNCs }
    ];

    // Municípios sem fiscalização (calculados a partir do filtro local)
    const municipiosFiscalizados = new Set(fiscalizacoesAno.map(f => 
        f.municipio_nome || todosMunicipios.find(m => m.id === f.municipio_id)?.nome || 'Sem Nome'
    ));

    const anos = ['2024', '2025', '2026'];
    const anosOptions = anos.map(ano => ({ value: ano, label: ano }));
    const servicosOptions = TODOS_SERVICOS.map(s => ({ value: s, label: s }));
    const municipiosOptions = todosMunicipios.map(m => ({ value: m.id, label: m.nome }));
    const prestadoresOptions = todosPrestadores.map(p => ({ value: p.id, label: p.nome }));

    const exportarPDF = async () => {
        const element = document.getElementById('relatorio-completo');
        const canvas = await html2canvas(element, { scale: 2 });
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
        const anoStr = anoFiltro.length > 0 ? anoFiltro.join('-') : 'Todos';
        pdf.save(`Relatorio-Fiscalizacoes-${anoStr}.pdf`);
    };

    const exportarJSON = () => {
        const dados = {
            ano: anoFiltro.length > 0 ? anoFiltro.join(', ') : 'Todos',
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
                municipio: f.municipio_nome || todosMunicipios.find(m => m.id === f.municipio_id)?.nome || 'Sem Nome',
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
        const anoStr = anoFiltro.length > 0 ? anoFiltro.join('-') : 'Todos';
        link.download = `Relatorio-Fiscalizacoes-${anoStr}.json`;
        link.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-950 text-white shadow-md">
                <div className="max-w-6xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Link to={createPageUrl('Home')}>
                                <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full">
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                            </Link>
                            <div>
                                <h1 className="text-xl font-bold">Relatórios e Indicadores</h1>
                                <p className="text-blue-200 text-sm">{diretoriaNome}</p>
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
                    <CardContent className="p-4 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            {/* Ano — comum a todos os módulos */}
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500 block">Ano</label>
                                <MultiSelect
                                    placeholder="Todos os Anos"
                                    options={anosOptions}
                                    selectedValues={anoFiltro}
                                    onChange={setAnoFiltro}
                                />
                            </div>

                            {/* Município — comum a todos os módulos */}
                            <div className="space-y-1">
                                <label className="text-xs font-semibold text-gray-500 block">Município</label>
                                <MultiSelect
                                    placeholder="Todos os Municípios"
                                    options={municipiosOptions}
                                    selectedValues={municipioFiltro}
                                    onChange={setMunicipioFiltro}
                                />
                            </div>

                            {/* Serviço — apenas DSB */}
                            {isDSB && (
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-500 block">Serviço</label>
                                    <MultiSelect
                                        placeholder="Todos os Serviços"
                                        options={servicosOptions}
                                        selectedValues={servicoFiltro}
                                        onChange={setServicoFiltro}
                                    />
                                </div>
                            )}

                            {/* Prestador — apenas DSB */}
                            {isDSB && (
                                <div className="space-y-1">
                                    <label className="text-xs font-semibold text-gray-500 block">Prestador</label>
                                    <MultiSelect
                                        placeholder="Todos os Prestadores"
                                        options={prestadoresOptions}
                                        selectedValues={prestadorFiltro}
                                        onChange={setPrestadorFiltro}
                                    />
                                </div>
                            )}
                        </div>
                        <div className="flex justify-end border-t border-gray-100 pt-3">
                            <div className="text-xs text-gray-400 font-medium">
                                {totalFiscalizacoes} fiscalizações correspondentes
                            </div>
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
