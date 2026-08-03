import { useState, useRef, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useModulo, DIRETORIA_NOMES, CAMARA_TO_TIPO_MODULO, MODULOS_POR_DIRETORIA } from '@/hooks/useModulo';
import AdminShell from '@/components/layout/AdminShell';
import { CAMARA_TO_DIRETORIA } from '@/lib/camaras';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Download, FileJson, FileText, CheckCircle2, AlertTriangle, ChevronDown, Check, Search, Route, MapPin, Filter, Building2, Camera } from 'lucide-react';
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

// ─── DTR ─────────────────────────────────────────────────────────────────────

const DTR_MODULOS = ['rodovias_dtr', 'transportes_dtr', 'fiscal_dtr'];

const frente_short = (f) => {
    if (!f) return 'Outros';
    if (f.includes('RECUPERAÇÃO')) return 'Recuperação';
    if (f.includes('CONSERVAÇÃO')) return 'Conservação';
    if (f.includes('MELHORIAS')) return 'Melhorias';
    if (f.includes('SERVIÇOS')) return 'Serv. Operacionais';
    return f;
};

const FRENTE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899'];

function RelatoriosDTR({ diretoriaNome }) {
    const [filtrosAbertos, setFiltrosAbertos] = useState(false);
    const [anoFiltro, setAnoFiltro] = useState([new Date().getFullYear().toString()]);
    const [rodoviaFiltro, setRodoviaFiltro] = useState([]);
    const [concessionariaFiltro, setConcessionariaFiltro] = useState([]);
    const refContent = useRef(null);

    const { data: fiscalizacoes = [], isLoading: loadFisc } = useQuery({
        queryKey: ['relatorio-dtr-fisc'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('fiscalizacoes')
                .select('id, rodovia, status, data_inicio, prestador_servico_nome, tipo_modulo')
                .in('tipo_modulo', DTR_MODULOS);
            if (error) throw error;
            return data || [];
        },
        staleTime: 120_000,
    });

    const fiscIdsAll = useMemo(() => fiscalizacoes.map(f => f.id), [fiscalizacoes]);

    const { data: ocorrencias = [], isLoading: loadOcorr } = useQuery({
        queryKey: ['relatorio-dtr-ocorr', fiscIdsAll.length],
        queryFn: async () => {
            if (!fiscIdsAll.length) return [];
            const { data, error } = await supabase
                .from('unidades')
                .select('id, fiscalizacao_id, rodovia, tipo_ocorrencia, frente, gravidade, total_ncs, km')
                .in('fiscalizacao_id', fiscIdsAll);
            if (error) throw error;
            return data || [];
        },
        enabled: fiscIdsAll.length > 0,
        staleTime: 120_000,
    });

    const loading = loadFisc || loadOcorr;

    const fiscFiltradas = useMemo(() => fiscalizacoes.filter(f => {
        if (!f.data_inicio) return false;
        const ano = String(new Date(f.data_inicio).getFullYear());
        if (anoFiltro.length && !anoFiltro.includes(ano)) return false;
        if (rodoviaFiltro.length && !rodoviaFiltro.includes(f.rodovia)) return false;
        if (concessionariaFiltro.length && !concessionariaFiltro.includes(f.prestador_servico_nome)) return false;
        return true;
    }), [fiscalizacoes, anoFiltro, rodoviaFiltro, concessionariaFiltro]);

    const fiscIdSet = useMemo(() => new Set(fiscFiltradas.map(f => f.id)), [fiscFiltradas]);
    const ocorrenciasFiltradas = useMemo(() => ocorrencias.filter(o => fiscIdSet.has(o.fiscalizacao_id)), [ocorrencias, fiscIdSet]);

    const totalVistorias = fiscFiltradas.length;
    const finalizadas = fiscFiltradas.filter(f => f.status === 'finalizada').length;
    const totalOcorrencias = ocorrenciasFiltradas.length;
    const totalNCs = useMemo(() => ocorrenciasFiltradas.reduce((acc, o) => acc + (o.total_ncs || 0), 0), [ocorrenciasFiltradas]);
    const rodoviaCount = useMemo(() => new Set(fiscFiltradas.map(f => f.rodovia).filter(Boolean)).size, [fiscFiltradas]);

    const dadosRodovia = useMemo(() => {
        const map = {};
        fiscFiltradas.forEach(f => { if (f.rodovia) { map[f.rodovia] = map[f.rodovia] || { rodovia: f.rodovia, vistorias: 0, ncs: 0 }; map[f.rodovia].vistorias++; } });
        ocorrenciasFiltradas.forEach(o => { if (o.rodovia) { map[o.rodovia] = map[o.rodovia] || { rodovia: o.rodovia, vistorias: 0, ncs: 0 }; map[o.rodovia].ncs += (o.total_ncs || 0); } });
        return Object.values(map).sort((a, b) => b.ncs - a.ncs).slice(0, 10);
    }, [fiscFiltradas, ocorrenciasFiltradas]);

    const dadosFrente = useMemo(() => {
        const map = {};
        ocorrenciasFiltradas.forEach(o => {
            const label = frente_short(o.frente);
            map[label] = map[label] || { frente: label, ocorrencias: 0, ncs: 0 };
            map[label].ocorrencias++;
            map[label].ncs += (o.total_ncs || 0);
        });
        return Object.values(map).sort((a, b) => b.ocorrencias - a.ocorrencias);
    }, [ocorrenciasFiltradas]);

    const dadosTipo = useMemo(() => {
        const map = {};
        ocorrenciasFiltradas.forEach(o => {
            const t = o.tipo_ocorrencia || 'Outros';
            map[t] = map[t] || { tipo: t, count: 0 };
            map[t].count++;
        });
        return Object.values(map).sort((a, b) => b.count - a.count).slice(0, 8);
    }, [ocorrenciasFiltradas]);

    const dadosMes = useMemo(() => {
        const map = {};
        fiscFiltradas.forEach(f => {
            if (!f.data_inicio) return;
            const d = new Date(f.data_inicio);
            const k = `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
            map[k] = map[k] || { mes: k, vistorias: 0 };
            map[k].vistorias++;
        });
        return Object.values(map).sort((a, b) => a.mes.localeCompare(b.mes));
    }, [fiscFiltradas]);

    const rodoviaOptions = useMemo(() => [...new Set(fiscalizacoes.map(f => f.rodovia).filter(Boolean))].sort().map(r => ({ value: r, label: r })), [fiscalizacoes]);
    const concessionariaOptions = useMemo(() => [...new Set(fiscalizacoes.map(f => f.prestador_servico_nome).filter(Boolean))].sort().map(n => ({ value: n, label: n })), [fiscalizacoes]);
    const anoOptions = ['2024', '2025', '2026'].map(a => ({ value: a, label: a }));

    const exportarPDF = async () => {
        if (!refContent.current) return;
        const canvas = await html2canvas(refContent.current, { scale: 2 });
        const pdf = new jsPDF('p', 'mm', 'a4');
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 210;
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, (canvas.height * imgWidth) / canvas.width);
        pdf.save(`Relatorio-DTR-${anoFiltro.join('-') || 'Todos'}.pdf`);
    };

    const exportarJSON = () => {
        const dados = {
            ano: anoFiltro.join(', ') || 'Todos',
            data_geracao: new Date().toLocaleString('pt-BR'),
            resumo: { totalVistorias, finalizadas, totalOcorrencias, totalNCs, rodovias: rodoviaCount },
            por_rodovia: dadosRodovia,
            por_frente: dadosFrente,
            top_tipos: dadosTipo,
        };
        const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `Relatorio-DTR-${anoFiltro.join('-') || 'Todos'}.json`; a.click();
        URL.revokeObjectURL(url);
    };

    const v = (n) => loading ? '—' : n;

    return (
        <AdminShell title="Relatórios e Indicadores">
            {/* Header */}
            <div className="max-w-6xl mx-auto px-4 pt-8">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-xs font-bold uppercase tracking-widest text-slate-400">Relatórios e Indicadores</h1>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={exportarPDF} variant="outline" size="sm" className="gap-1.5 text-xs"><Download className="h-3.5 w-3.5" /> PDF</Button>
                        <Button onClick={exportarJSON} variant="outline" size="sm" className="gap-1.5 text-xs"><FileJson className="h-3.5 w-3.5" /> JSON</Button>
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div className="max-w-6xl mx-auto px-4 mt-6 print:hidden">
                <Card className="bg-white border border-gray-200 shadow-sm">
                    <CardContent className="p-4">
                        <button
                            type="button"
                            onClick={() => setFiltrosAbertos(!filtrosAbertos)}
                            className="flex items-center gap-2 w-full text-left"
                        >
                            <Filter className="h-4 w-4 text-gray-600" />
                            <span className="font-semibold text-sm">Filtros</span>
                            <span className="text-xs text-gray-400 font-medium ml-2">{totalVistorias} vistorias correspondentes</span>
                            <ChevronDown className={`h-4 w-4 text-gray-400 ml-auto transition-transform ${filtrosAbertos ? 'rotate-180' : ''}`} />
                        </button>
                        {filtrosAbertos && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                            <div className="space-y-1"><label className="text-xs font-semibold text-gray-500 block">Ano</label><MultiSelect placeholder="Todos os Anos" options={anoOptions} selectedValues={anoFiltro} onChange={setAnoFiltro} /></div>
                            <div className="space-y-1"><label className="text-xs font-semibold text-gray-500 block">Rodovia</label><MultiSelect placeholder="Todas as Rodovias" options={rodoviaOptions} selectedValues={rodoviaFiltro} onChange={setRodoviaFiltro} /></div>
                            <div className="space-y-1"><label className="text-xs font-semibold text-gray-500 block">Concessionária</label><MultiSelect placeholder="Todas" options={concessionariaOptions} selectedValues={concessionariaFiltro} onChange={setConcessionariaFiltro} /></div>
                        </div>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Conteúdo */}
            <div ref={refContent} className="max-w-6xl mx-auto px-4 py-6 space-y-6 bg-white mt-6">

                {/* KPI Cards */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {[
                        { label: 'Vistorias Realizadas',     value: v(totalVistorias),  icon: FileText,       bg: 'bg-blue-100',   iconCls: 'text-blue-600' },
                        { label: 'Finalizadas',              value: v(finalizadas),     icon: CheckCircle2,   bg: 'bg-green-100',  iconCls: 'text-green-600' },
                        { label: 'Ocorrências Registradas',  value: v(totalOcorrencias),icon: MapPin,         bg: 'bg-orange-100', iconCls: 'text-orange-600' },
                        { label: 'Não Conformidades',        value: v(totalNCs),        icon: AlertTriangle,  bg: 'bg-red-100',    iconCls: 'text-red-600' },
                        { label: 'Rodovias Inspecionadas',   value: v(rodoviaCount),    icon: Route,          bg: 'bg-indigo-100', iconCls: 'text-indigo-600' },
                    ].map(({ label, value, icon: Icon, bg, iconCls }) => (
                        <Card key={label}>
                            <CardContent className="p-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center flex-shrink-0`}><Icon className={`h-5 w-5 ${iconCls}`} /></div>
                                    <div><p className="text-2xl font-bold">{value}</p><p className="text-xs text-gray-500 leading-tight mt-0.5">{label}</p></div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Gráficos — linha 1 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* NCs por Rodovia */}
                    <Card>
                        <CardHeader><CardTitle className="text-base">Não Conformidades por Rodovia</CardTitle></CardHeader>
                        <CardContent>
                            {dadosRodovia.length > 0 ? (
                                <ResponsiveContainer width="100%" height={260}>
                                    <BarChart data={dadosRodovia} layout="vertical" margin={{ left: 10, right: 20 }}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                                        <YAxis type="category" dataKey="rodovia" tick={{ fontSize: 11 }} width={65} />
                                        <Tooltip formatter={(v, n) => [v, n === 'ncs' ? 'NCs' : 'Vistorias']} />
                                        <Bar dataKey="ncs" name="ncs" radius={[0, 4, 4, 0]}>
                                            {dadosRodovia.map((_, i) => <Cell key={i} fill={`hsl(${200 + i * 20}, 70%, 50%)`} />)}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <p className="text-center text-gray-400 py-10 text-sm">Sem dados para exibir</p>}
                        </CardContent>
                    </Card>

                    {/* Vistorias por Mês */}
                    <Card>
                        <CardHeader><CardTitle className="text-base">Vistorias por Mês</CardTitle></CardHeader>
                        <CardContent>
                            {dadosMes.length > 0 ? (
                                <ResponsiveContainer width="100%" height={260}>
                                    <BarChart data={dadosMes}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                        <Tooltip />
                                        <Bar dataKey="vistorias" name="Vistorias" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <p className="text-center text-gray-400 py-10 text-sm">Sem dados para exibir</p>}
                        </CardContent>
                    </Card>
                </div>

                {/* Gráficos — linha 2 */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Ocorrências por Frente de Trabalho */}
                    <Card>
                        <CardHeader><CardTitle className="text-base">Ocorrências por Frente de Trabalho</CardTitle></CardHeader>
                        <CardContent>
                            {dadosFrente.length > 0 ? (
                                <ResponsiveContainer width="100%" height={260}>
                                    <BarChart data={dadosFrente}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="frente" tick={{ fontSize: 10 }} />
                                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                                        <Tooltip />
                                        <Bar dataKey="ocorrencias" name="Ocorrências" radius={[4, 4, 0, 0]}>
                                            {dadosFrente.map((_, i) => <Cell key={i} fill={FRENTE_COLORS[i % FRENTE_COLORS.length]} />)}
                                        </Bar>
                                        <Bar dataKey="ncs" name="NCs" fill="#ef4444" radius={[4, 4, 0, 0]} opacity={0.75} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <p className="text-center text-gray-400 py-10 text-sm">Sem dados para exibir</p>}
                        </CardContent>
                    </Card>

                    {/* Ranking de Tipos de Ocorrência */}
                    <Card>
                        <CardHeader><CardTitle className="text-base">Principais Tipos de Ocorrência</CardTitle></CardHeader>
                        <CardContent>
                            {dadosTipo.length > 0 ? (
                                <div className="space-y-3 mt-1">
                                    {dadosTipo.map((item, i) => (
                                        <div key={item.tipo} className="flex items-center gap-3">
                                            <span className="w-5 h-5 bg-blue-50 rounded-full flex items-center justify-center text-[10px] font-bold text-blue-600 flex-shrink-0">{i + 1}</span>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-sm font-medium truncate pr-2">{item.tipo}</span>
                                                    <Badge variant="outline" className="flex-shrink-0 text-xs bg-slate-50">{item.count}</Badge>
                                                </div>
                                                <div className="h-1.5 bg-gray-100 rounded-full">
                                                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${(item.count / dadosTipo[0].count) * 100}%` }} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="text-center text-gray-400 py-10 text-sm">Sem dados para exibir</p>}
                        </CardContent>
                    </Card>
                </div>

                {/* Tabela de Rodovias */}
                {dadosRodovia.length > 0 && (
                    <Card>
                        <CardHeader><CardTitle className="text-base">Ranking de Rodovias — Vistorias e NCs</CardTitle></CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100 text-left">
                                            <th className="pb-2 font-semibold text-gray-500 text-xs">#</th>
                                            <th className="pb-2 font-semibold text-gray-500 text-xs">Rodovia</th>
                                            <th className="pb-2 font-semibold text-gray-500 text-xs text-right">Vistorias</th>
                                            <th className="pb-2 font-semibold text-gray-500 text-xs text-right">NCs</th>
                                            <th className="pb-2 font-semibold text-gray-500 text-xs text-right">NCs / Vistoria</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dadosRodovia.map((r, i) => (
                                            <tr key={r.rodovia} className="border-b border-gray-50 hover:bg-gray-50">
                                                <td className="py-2 text-gray-400 text-xs">{i + 1}</td>
                                                <td className="py-2 font-medium">{r.rodovia}</td>
                                                <td className="py-2 text-right">{r.vistorias}</td>
                                                <td className="py-2 text-right"><span className={r.ncs > 0 ? 'text-red-600 font-semibold' : ''}>{r.ncs}</span></td>
                                                <td className="py-2 text-right text-gray-500">{r.vistorias > 0 ? (r.ncs / r.vistorias).toFixed(1) : '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </AdminShell>
    );
}

// ─── DSB ─────────────────────────────────────────────────────────────────────

export default function Relatorios() {
    const { tipoModulo, modulosFiltro, isDSB, diretoria, diretoriaNome, isAdmin } = useModulo();
    const [searchParams] = useSearchParams();
    const camaraParam = searchParams.get('camara');
    const diretoriaParam = searchParams.get('diretoria');

    // Admin navega livremente entre câmaras pelo seletor no cabeçalho — a diretoria/módulo
    // "efetivos" dessa página vêm da câmara clicada na URL (?camara=xxx), não do perfil do
    // usuário (que pra admin é vazio/irrelevante e sempre marcaria isDTR=true). `?diretoria=`
    // força a visão agregada de uma diretoria inteira (usado pelos itens "Indicadores (DSB)"/
    // "Indicadores (DTR)" da sidebar do admin), sem restringir a uma câmara específica.
    const efetivaDiretoria = diretoriaParam || (camaraParam ? (CAMARA_TO_DIRETORIA[camaraParam] ?? diretoria) : diretoria);
    const efetivaDiretoriaNome = DIRETORIA_NOMES[efetivaDiretoria] ?? diretoriaNome;
    const efetivoModulosFiltro = camaraParam && CAMARA_TO_TIPO_MODULO[camaraParam]
        ? [CAMARA_TO_TIPO_MODULO[camaraParam]]
        : (diretoriaParam ? (MODULOS_POR_DIRETORIA[diretoriaParam] ?? modulosFiltro) : modulosFiltro);

    if (efetivaDiretoria === 'dtr') return <RelatoriosDTR diretoriaNome={efetivaDiretoriaNome} />;


    // modulosFiltro: lista de tipo_modulo visíveis para este usuário (do hook)
    // Admin recebe [] = sem filtro; demais recebem todos os módulos da sua diretoria

    const [filtrosAbertos, setFiltrosAbertos] = useState(false);
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
        total_unidades: 0,
        total_fotos: 0,
        por_servico: [],
        ranking_determinacoes: []
    } } = useQuery({
        queryKey: ['resumo-indicadores', anoFiltro, servicoFiltro, municipioFiltro, prestadorFiltro, efetivoModulosFiltro],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('obter_resumo_indicadores', {
                p_anos: anoFiltro,
                p_servicos: servicoFiltro,
                p_municipio_ids: municipioFiltro,
                p_prestador_ids: prestadorFiltro,
                p_tipo_modulo: efetivoModulosFiltro,   // câmara específica quando admin navega via seletor; senão módulos da diretoria do usuário
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
    const totalUnidades = resumo.total_unidades;
    const totalFotos = resumo.total_fotos;

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
                totalUnidades,
                totalFotos,
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
        <AdminShell title="Relatórios e Indicadores">
            {/* Header */}
            <div className="max-w-6xl mx-auto px-4 pt-8">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <h1 className="text-xs font-bold uppercase tracking-widest text-slate-400">Relatórios e Indicadores</h1>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={exportarPDF} variant="outline" size="sm" className="gap-1.5 text-xs">
                            <Download className="h-3.5 w-3.5" />
                            PDF
                        </Button>
                        <Button onClick={exportarJSON} variant="outline" size="sm" className="gap-1.5 text-xs">
                            <FileJson className="h-3.5 w-3.5" />
                            JSON
                        </Button>
                    </div>
                </div>
            </div>

            {/* Barra de Filtros */}
            <div className="max-w-6xl mx-auto px-4 mt-6 print:hidden">
                <Card className="bg-white border border-gray-200 shadow-sm">
                    <CardContent className="p-4">
                        <button
                            type="button"
                            onClick={() => setFiltrosAbertos(!filtrosAbertos)}
                            className="flex items-center gap-2 w-full text-left"
                        >
                            <Filter className="h-4 w-4 text-gray-600" />
                            <span className="font-semibold text-sm">Filtros</span>
                            <span className="text-xs text-gray-400 font-medium ml-2">{totalFiscalizacoes} fiscalizações correspondentes</span>
                            <ChevronDown className={`h-4 w-4 text-gray-400 ml-auto transition-transform ${filtrosAbertos ? 'rotate-180' : ''}`} />
                        </button>
                        {filtrosAbertos && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-4">
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
                        )}
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

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                                    <Building2 className="h-5 w-5 text-indigo-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{totalUnidades}</p>
                                    <p className="text-xs text-gray-500">Unidades Fiscalizadas</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                    <Camera className="h-5 w-5 text-purple-600" />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold">{totalFotos}</p>
                                    <p className="text-xs text-gray-500">Fotos Registradas</p>
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
        </AdminShell>
    );
}
