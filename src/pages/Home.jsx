import { useState, useEffect } from 'react';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
import { useModulo } from '@/hooks/useModulo';
import { CAMARA_DASHBOARD_PAGE, CAMARA_FISCALIZACAO_PATH, DEFAULT_CAMARA_POR_DIRETORIA } from '@/lib/camaras';
import { Link, Navigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import SyncBar from '@/components/camaras/SyncBar';
import {
  Plus, History, ClipboardCheck, Users, FileText,
  LogOut, ChevronRight, Route, Zap,
  Droplets, TrendingUp,
} from 'lucide-react';

const MODULOS = [
  { id: 'dsb', sigla: 'DSB', nome: 'Saneamento Básico e Resíduos Sólidos', icon: Droplets, color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { id: 'dtr', sigla: 'DTR', nome: 'Transportes, Rodovias, Ferrovias, Portos e Aeroportos', icon: Route, color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 'dge', sigla: 'DGE', nome: 'Gás Canalizado, Energia e Mineração', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50' },
];

export default function Home() {
    const { user, logout } = useAuth();
    const { isDSB, isDTR, isDGE, isAdmin, diretoriaNome, camaraTecnica } = useModulo();
    const [isMobile, setIsMobile] = useState(false);

    const isPrestador = user?.role === 'prestador';
    // "user" é o valor legado salvo no banco pro cargo "Fiscal" (ver GerenciarUsuarios.jsx).
    const isFiscal = (user?.role === 'user' ? 'fiscal' : user?.role) === 'fiscal';

    const handleLogout = async () => {
        try { await logout(); } catch (error) { console.error('Erro ao sair:', error); }
    };

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Quem já tem câmara técnica atribuída cai direto no dashboard dela — exceto admin,
    // que sempre vê o seletor de módulo/câmara abaixo (pode navegar livremente). Fiscais
    // pulam o dashboard e caem direto na aba de Fiscalização, que é o que eles usam no dia a dia.
    if (!isAdmin && camaraTecnica) {
        if (isFiscal && CAMARA_FISCALIZACAO_PATH[camaraTecnica]) {
            return <Navigate to={CAMARA_FISCALIZACAO_PATH[camaraTecnica]} replace />;
        }
        if (CAMARA_DASHBOARD_PAGE[camaraTecnica]) {
            return <Navigate to={createPageUrl(CAMARA_DASHBOARD_PAGE[camaraTecnica])} replace />;
        }
    }

    // Menu card definitions (caso remanescente: usuário sem câmara atribuída, não-admin)
    const dsbMenuItems = [
        ...(isPrestador ? [{ page: 'PortalPrestadorHome', icon: <FileText className="h-6 w-6" />, label: 'Portal do Prestador', desc: 'Responder TNs', color: 'text-indigo-500', bg: 'bg-indigo-50' }] : []),
    ];

    const dtrMenuItems = [
        { page: 'FiscalizacoesDTR', icon: <ClipboardCheck className="h-6 w-6" />, label: 'Inspeções', desc: 'Vistorias de rodovias', color: 'text-indigo-500', bg: 'bg-indigo-50' },
        { page: 'PrestadoresServico', icon: <Users className="h-6 w-6" />, label: 'Concessionárias', desc: 'Empresas Cadastradas', color: 'text-sky-500', bg: 'bg-sky-50' },
        { page: 'Contratos', icon: <FileText className="h-6 w-6" />, label: 'Contratos', desc: 'Rodovias e Concessões', color: 'text-violet-500', bg: 'bg-violet-50' },
    ];

    const menuItems = isDSB ? dsbMenuItems : isDTR ? dtrMenuItems : [];

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-950 text-white shadow-lg">
                <div className="max-w-6xl mx-auto px-4 py-5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-2 shadow-md flex-shrink-0">
                            <svg viewBox="0 0 128 128" className="w-full h-full" aria-label="Logo AGEMS">
                                <circle cx="64" cy="64" r="56" fill="none" stroke="#101010" strokeWidth="6" />
                                <polygon points="24,32 44,32 64,64 44,96 24,96 44,64" fill="#1FA463" />
                                <polygon points="44,32 64,32 84,64 64,96 44,96 64,64" fill="#1894F2" />
                                <polygon points="64,32 84,32 104,64 84,96 64,96 84,64" fill="#F6C713" />
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-xl font-bold">SGO - Sistema de Gestão Operacional - AGEMS</h1>
                            <p className="text-blue-200 text-sm truncate">{isAdmin ? 'Administração' : diretoriaNome}</p>
                        </div>
                        <SyncBar />
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-white hover:bg-white/10 rounded-xl gap-1.5"
                            onClick={handleLogout}
                        >
                            <LogOut className="h-4 w-4" />
                            <span className="hidden sm:inline">Sair</span>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-4 py-6 w-full flex-1 space-y-6">

                {isAdmin ? (
                    <>
                        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Selecione o módulo</h2>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            {MODULOS.map((m) => (
                                <Link
                                    key={m.id}
                                    to={createPageUrl(CAMARA_DASHBOARD_PAGE[DEFAULT_CAMARA_POR_DIRETORIA[m.id]])}
                                    className="group bg-white border border-gray-200 rounded-2xl p-5 flex flex-col items-start gap-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-left"
                                >
                                    <div className={`w-12 h-12 ${m.bg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                        <m.icon className={`h-6 w-6 ${m.color}`} />
                                    </div>
                                    <div className="min-w-0">
                                        <h3 className="text-base font-bold text-gray-900">{m.sigla}</h3>
                                        <p className="text-gray-500 text-sm">{m.nome}</p>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </>
                ) : (
                    <>
                        {/* Primary Action Cards — DSB */}
                        {isDSB && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Link to={createPageUrl('NovaFiscalizacao')}>
                                    <div className="group bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 flex items-center gap-4 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all cursor-pointer">
                                        <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-white/30 transition-all">
                                            <Plus className="h-7 w-7 text-white" />
                                        </div>
                                        <div className="text-white min-w-0">
                                            <h3 className="text-lg font-bold">Nova Fiscalização</h3>
                                            <p className="text-emerald-100 text-sm">Iniciar vistoria em campo</p>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-white/60 ml-auto flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </Link>
                                <Link to={createPageUrl('Fiscalizacoes')}>
                                    <div className="group bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
                                        <div className="w-14 h-14 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-100 transition-all">
                                            <History className="h-7 w-7 text-indigo-500" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-lg font-bold text-gray-800">Fiscalizações</h3>
                                            <p className="text-gray-500 text-sm">Ver histórico e continuar</p>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-gray-300 ml-auto flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </Link>
                            </div>
                        )}

                        {/* Primary Action Cards — DTR */}
                        {isDTR && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Link to={createPageUrl('NovaFiscalizacaoDTR')}>
                                    <div className="group bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 flex items-center gap-4 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all cursor-pointer">
                                        <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-white/30 transition-all">
                                            <Plus className="h-7 w-7 text-white" />
                                        </div>
                                        <div className="text-white min-w-0">
                                            <h3 className="text-lg font-bold">Nova Fiscalização Rodoviária</h3>
                                            <p className="text-blue-100 text-sm">Iniciar vistoria na rodovia</p>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-white/60 ml-auto flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </Link>
                                <Link to={createPageUrl('FiscalizacoesDTR')}>
                                    <div className="group bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
                                        <div className="w-14 h-14 bg-indigo-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-100 transition-all">
                                            <History className="h-7 w-7 text-indigo-500" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-lg font-bold text-gray-800">Histórico DTR</h3>
                                            <p className="text-gray-500 text-sm">Ver histórico e pontos registrados</p>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-gray-300 ml-auto flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </Link>
                            </div>
                        )}

                        {/* Relatórios e BI */}
                        {!isPrestador && (
                            <div className="sm:max-w-sm">
                                <Link to={createPageUrl('Relatorios')}>
                                    <div className="group bg-white border border-gray-200 rounded-2xl p-5 flex items-center gap-4 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer">
                                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-all">
                                            <TrendingUp className="h-6 w-6 text-blue-600" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-base font-semibold text-gray-900">Relatórios e BI</h3>
                                            <p className="text-gray-500 text-sm">Indicadores e análises</p>
                                        </div>
                                        <ChevronRight className="h-4 w-4 text-gray-400 ml-auto flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </Link>
                            </div>
                        )}

                        {/* DGE placeholder */}
                        {isDGE && !isDSB && !isDTR && (
                            <Card className="border-dashed border-2 border-gray-300 bg-white">
                                <CardContent className="p-8 text-center text-gray-400">
                                    <FileText className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                    <p className="font-semibold text-gray-500">Módulo de Gás e Energia</p>
                                    <p className="text-sm mt-1">Em implementação — em breve disponível.</p>
                                </CardContent>
                            </Card>
                        )}

                        {/* Menu Grid */}
                        {!isMobile && menuItems.length > 0 && (
                            <div>
                                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Menu Principal</h2>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {menuItems.map(item => (
                                        <Link key={item.page} to={createPageUrl(item.page)}>
                                            <div className="group bg-white border border-gray-200 rounded-2xl p-4 flex flex-col items-center text-center hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer gap-2">
                                                <div className={`w-12 h-12 ${item.bg} ${item.color} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform`}>
                                                    {item.icon}
                                                </div>
                                                <p className="font-semibold text-gray-800 text-sm leading-tight">{item.label}</p>
                                                <p className="text-xs text-gray-400">{item.desc}</p>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Footer */}
            <div className="py-5 text-center text-xs text-gray-400 bg-white border-t border-gray-200 mt-auto">
                AGEMS — Agência Estadual de Regulação de Serviços Públicos de MS
            </div>
        </div>
    );
}
