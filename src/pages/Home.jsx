import { useState, useEffect, useRef } from 'react';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
import { useModulo } from '@/hooks/useModulo';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSyncStatus } from '@/lib/SyncStatusContext.jsx';
import { runFullSync } from '@/lib/offline/syncEngine';
import { useToast } from '@/components/ui/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Plus, History, Building2, ClipboardCheck, Users, BarChart3, FileText,
  AlertTriangle, LogOut, Wifi, WifiOff, RefreshCw, Download, ChevronRight, Recycle,
  Droplets, TrendingUp,
} from 'lucide-react';

export default function Home() {
    const { user, logout } = useAuth();
    const { isDSB, isDTR, isDGE, isAdmin, diretoriaNome, camaraTecnica } = useModulo();
    const [isMobile, setIsMobile] = useState(false);
    const { online, lastSyncAt, refetchSyncStatus } = useSyncStatus?.() || { online: true, lastSyncAt: undefined, refetchSyncStatus: () => {} };
    const [syncing, setSyncing] = useState(false);
    const [syncProgress, setSyncProgress] = useState('');
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const syncInFlightRef = useRef(false);
    const lastSyncToastDismissRef = useRef(null);

    const isPrestador = user?.role === 'prestador';

    const handleLogout = async () => {
        try { await logout(); } catch (error) { console.error('Erro ao sair:', error); }
    };

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleSync = async () => {
        if (syncInFlightRef.current) return;
        syncInFlightRef.current = true;
        setSyncing(true);
        setSyncProgress('Iniciando...');
        try {
            try {
                const persisted = await navigator.storage?.persisted?.();
                if (!persisted && navigator.storage?.persist) await navigator.storage.persist();
            } catch {}
            const res = await runFullSync((msg, isError) => {
                setSyncProgress(msg);
                if (isError) console.error('[Sync Error]', msg);
            });
            await queryClient.invalidateQueries();
            await queryClient.refetchQueries();
            setSyncProgress('');
            if (typeof lastSyncToastDismissRef.current === 'function') lastSyncToastDismissRef.current();
            const t = toast({
                title: 'Sincronização concluída',
                description: res.lastSyncAt ? `Atualizado em ${format(new Date(res.lastSyncAt), 'dd/MM HH:mm', { locale: ptBR })}` : 'Dados atualizados'
            });
            lastSyncToastDismissRef.current = t?.dismiss;
        } catch (err) {
            setSyncProgress('Erro na sincronização');
            if (typeof lastSyncToastDismissRef.current === 'function') lastSyncToastDismissRef.current();
            const t = toast({ title: 'Falha na sincronização', description: err?.message || 'Verifique sua conexão e tente novamente', variant: 'destructive' });
            lastSyncToastDismissRef.current = t?.dismiss;
        } finally {
            setSyncing(false);
            syncInFlightRef.current = false;
            refetchSyncStatus?.();
        }
    };

    const handleBackup = async () => {
        try {
            toast({ title: 'Preparando backup', description: 'Coletando dados e fotos, isso pode levar alguns segundos...' });
            const { db } = await import('@/lib/offline/db');
            const JSZip = (await import('jszip')).default;
            const zip = new JSZip();
            const tabelas = ['fiscalizacoes', 'unidades', 'respostas', 'constatacoes_manuais', 'recomendacoes', 'fila_mutacoes', 'fotos_local'];
            const backup = {};
            for (const t of tabelas) { if (db[t]) backup[t] = await db[t].toArray(); }
            zip.file('dados.json', JSON.stringify(backup, null, 2));
            const unidadesList = backup.unidades || [];
            const fotosLocal = backup.fotos_local || [];
            const fotosFolder = zip.folder('fotos');
            for (const foto of fotosLocal) {
                let folderName = foto.unidadeLocalId || 'desconhecida';
                const unidade = unidadesList.find(u => u.id === foto.unidadeLocalId);
                if (unidade?.nome_unidade) {
                    folderName = `${unidade.nome_unidade.replace(/[^a-zA-Z0-9 -]/g, '_')} - ${foto.unidadeLocalId.substring(0, 4)}`;
                }
                const unidadeFolder = fotosFolder.folder(folderName);
                let content = foto.blob;
                if (!content && foto.base64) { const res = await fetch(foto.base64); content = await res.blob(); }
                if (content) unidadeFolder.file(`${foto.localId}.jpg`, content);
            }
            const zipContent = await zip.generateAsync({ type: 'blob' });
            const url = URL.createObjectURL(zipContent);
            const a = document.createElement('a');
            a.href = url; a.download = `backup_emergencia_android_${Date.now()}.zip`; a.click();
            URL.revokeObjectURL(url);
            toast({ title: 'Backup concluído', description: 'Arquivo ZIP baixado com sucesso.' });
        } catch (err) {
            toast({ title: 'Erro no backup', description: err.message, variant: 'destructive' });
        }
    };

    // Menu card definitions
    const dsbMenuItems = [
        { page: 'TiposUnidade', icon: <Building2 className="h-6 w-6" />, label: 'Tipos de Unidade', desc: 'ETA, ETE, etc', color: 'text-indigo-500', bg: 'bg-indigo-50' },
        { page: 'Checklists', icon: <ClipboardCheck className="h-6 w-6" />, label: 'Checklists', desc: 'Configurar perguntas', color: 'text-violet-500', bg: 'bg-violet-50' },
        { page: 'PrestadoresServico', icon: <Users className="h-6 w-6" />, label: 'Prestadores', desc: 'Titulares e Empresas', color: 'text-sky-500', bg: 'bg-sky-50' },
        { page: 'Relatorios', icon: <BarChart3 className="h-6 w-6" />, label: 'Relatórios', desc: 'Indicadores e BI', color: 'text-emerald-500', bg: 'bg-emerald-50' },
        { page: 'GerenciarTermos', icon: <FileText className="h-6 w-6" />, label: 'Termos', desc: 'Notificação', color: 'text-amber-500', bg: 'bg-amber-50' },
        { page: 'AnaliseManifestacao', icon: <FileText className="h-6 w-6" />, label: 'Análise Manifestação', desc: 'Processos', color: 'text-teal-500', bg: 'bg-teal-50' },
        { page: 'GestaoAutos', icon: <AlertTriangle className="h-6 w-6" />, label: 'Autos', desc: 'Infrações', color: 'text-rose-500', bg: 'bg-rose-50' },
        ...(!isPrestador ? [
            { page: 'PareceresTecnicos', icon: <FileText className="h-6 w-6" />, label: 'Pareceres Técnicos', desc: 'Defesas e análises', color: 'text-blue-500', bg: 'bg-blue-50' },
            { page: 'CamaraJulgamento', icon: <FileText className="h-6 w-6" />, label: 'Câmara de Julgamento', desc: 'Pareceres assinados', color: 'text-slate-500', bg: 'bg-slate-50' },
        ] : []),
        ...(isPrestador ? [{ page: 'PortalPrestadorHome', icon: <FileText className="h-6 w-6" />, label: 'Portal do Prestador', desc: 'Responder TNs', color: 'text-indigo-500', bg: 'bg-indigo-50' }] : []),
    ];

    const dtrMenuItems = [
        { page: 'FiscalizacoesDTR', icon: <ClipboardCheck className="h-6 w-6" />, label: 'Inspeções', desc: 'Vistorias de rodovias', color: 'text-indigo-500', bg: 'bg-indigo-50' },
        { page: 'PrestadoresServico', icon: <Users className="h-6 w-6" />, label: 'Concessionárias', desc: 'Empresas Cadastradas', color: 'text-sky-500', bg: 'bg-sky-50' },
        { page: 'Contratos', icon: <FileText className="h-6 w-6" />, label: 'Contratos', desc: 'Rodovias e Concessões', color: 'text-violet-500', bg: 'bg-violet-50' },
        { page: 'Relatorios', icon: <BarChart3 className="h-6 w-6" />, label: 'Relatórios', desc: 'Indicadores DTR', color: 'text-emerald-500', bg: 'bg-emerald-50' },
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
                            <h1 className="text-xl font-bold">Fiscalização AGEMS</h1>
                            <p className="text-blue-200 text-sm truncate">{diretoriaNome}</p>
                        </div>
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

            {/* Sync bar */}
            <div className={`border-b px-4 py-2 flex items-center gap-3 text-sm ${online ? 'bg-white border-gray-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className="max-w-6xl mx-auto w-full flex items-center gap-3">
                    <span className={`flex items-center gap-1.5 text-xs font-semibold ${online ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {online ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
                        {online ? 'Online' : 'Offline'}
                    </span>
                    {lastSyncAt && (
                        <span className="text-xs text-gray-400 hidden sm:block">
                            Última sync: {format(new Date(lastSyncAt), 'dd/MM HH:mm', { locale: ptBR })}
                        </span>
                    )}
                    {syncing && syncProgress && (
                        <span className="text-xs text-indigo-600 animate-pulse">{syncProgress}</span>
                    )}
                    <div className="ml-auto flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="outline"
                            disabled={syncing || !online}
                            className="h-7 text-xs rounded-lg border-gray-200 gap-1.5"
                            onClick={handleSync}
                        >
                            <RefreshCw className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
                            {syncing ? 'Sincronizando...' : 'Sincronizar'}
                        </Button>
                        <Button
                            size="sm"
                            variant="ghost"
                            title="Baixar backup local"
                            className="h-7 text-xs rounded-lg text-gray-400 hover:text-gray-600"
                            onClick={handleBackup}
                        >
                            <Download className="h-3 w-3" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-4 py-6 w-full flex-1 space-y-6">

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

                {/* Painéis por Câmara Técnica — DSB */}
                {isDSB && (camaraTecnica || isAdmin) && (
                    <div className="space-y-3">
                        <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Câmaras Técnicas — DSB</h2>

                        {/* CATESA */}
                        {(camaraTecnica === 'catesa' || isAdmin) && (
                            <Link to={createPageUrl('CatesaDashboard')}>
                                <div className="group bg-gradient-to-br from-cyan-600 to-blue-700 rounded-2xl p-5 flex items-center gap-4 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all cursor-pointer">
                                    <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-white/30 transition-all">
                                        <Droplets className="h-7 w-7 text-white" />
                                    </div>
                                    <div className="text-white min-w-0">
                                        <h3 className="text-lg font-bold">Painel CATESA</h3>
                                        <p className="text-cyan-100 text-sm">Câmara Técnica de Saneamento</p>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-white/60 ml-auto flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </Link>
                        )}

                        {/* CATERS */}
                        {(camaraTecnica === 'caters' || isAdmin) && (
                            <Link to={createPageUrl('CatersDashboard')}>
                                <div className="group bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-5 flex items-center gap-4 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all cursor-pointer">
                                    <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-white/30 transition-all">
                                        <Recycle className="h-7 w-7 text-white" />
                                    </div>
                                    <div className="text-white min-w-0">
                                        <h3 className="text-lg font-bold">Painel CATERS</h3>
                                        <p className="text-emerald-100 text-sm">Câmara Técnica de Resíduos Sólidos</p>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-white/60 ml-auto flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </Link>
                        )}

                        {/* CRES */}
                        {(camaraTecnica === 'cres' || isAdmin) && (
                            <Link to={createPageUrl('CresDashboard')}>
                                <div className="group bg-gradient-to-br from-violet-600 to-indigo-700 rounded-2xl p-5 flex items-center gap-4 shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all cursor-pointer">
                                    <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-white/30 transition-all">
                                        <TrendingUp className="h-7 w-7 text-white" />
                                    </div>
                                    <div className="text-white min-w-0">
                                        <h3 className="text-lg font-bold">Painel CRES</h3>
                                        <p className="text-violet-100 text-sm">Câmara Técnica de Regulação Econômica do Saneamento</p>
                                    </div>
                                    <ChevronRight className="h-5 w-5 text-white/60 ml-auto flex-shrink-0 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </Link>
                        )}
                    </div>
                )}

                {/* DGE placeholder */}
                {isDGE && !isDSB && (
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
                            {isAdmin && (
                                <Link to={createPageUrl('GerenciarUsuarios')}>
                                    <div className="group bg-white border border-gray-200 rounded-2xl p-4 flex flex-col items-center text-center hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer gap-2">
                                        <div className="w-12 h-12 bg-gray-100 text-gray-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Users className="h-6 w-6" />
                                        </div>
                                        <p className="font-semibold text-gray-800 text-sm">Usuários</p>
                                        <p className="text-xs text-gray-400">Gestão e Permissões</p>
                                    </div>
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="py-5 text-center text-xs text-gray-400 bg-white border-t border-gray-200 mt-auto">
                AGEMS — Agência Estadual de Regulação de Serviços Públicos de MS
            </div>
        </div>
    );
}
