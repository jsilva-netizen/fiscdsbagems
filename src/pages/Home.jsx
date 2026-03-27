import { useState, useEffect } from 'react';
import { createPageUrl } from '@/utils';
import { useAuth } from '@/lib/AuthContext';
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
  Plus, History, Building2, ClipboardCheck, Users, BarChart3, FileText, AlertTriangle, LogOut, Wifi, WifiOff
} from 'lucide-react';

export default function Home() {
    const { user, logout } = useAuth();
    const [isMobile, setIsMobile] = useState(false);
    const { online, lastSyncAt, refetchSyncStatus } = useSyncStatus?.() || { online: true, lastSyncAt: undefined, refetchSyncStatus: () => {} };
    const [syncing, setSyncing] = useState(false);
    const [syncProgress, setSyncProgress] = useState('');
    const { toast } = useToast();
    const queryClient = useQueryClient();
    
    // O role vem do profile (tabela public.profiles), que é mergeado no user pelo AuthContext
    const isAdmin = user?.role === 'admin';
    const isPrestador = user?.role === 'prestador';

    const handleLogout = async () => {
        try {
            await logout();
            // Redirecionamento é automático pelo AuthContext/AppRoutes
        } catch (error) {
            console.error('Erro ao sair:', error);
        }
    };

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);
    
    

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900">
            {/* Header */}
            <div className="bg-white/10 backdrop-blur-sm border-b border-white/20">
                <div className="max-w-6xl mx-auto px-4 py-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center p-2">
                            <svg viewBox="0 0 128 128" className="w-full h-full" aria-label="Logo AGEMS">
                                <circle cx="64" cy="64" r="56" fill="none" stroke="#101010" strokeWidth="6" />
                                <polygon points="24,32 44,32 64,64 44,96 24,96 44,64" fill="#1FA463" />
                                <polygon points="44,32 64,32 84,64 64,96 44,96 64,64" fill="#1894F2" />
                                <polygon points="64,32 84,32 104,64 84,96 64,96 84,64" fill="#F6C713" />
                            </svg>
                        </div>
                        <div className="text-white">
                            <h1 className="text-2xl font-bold">Fiscalização AGEMS</h1>
                            <p className="text-blue-200 text-sm">Sistema de Fiscalização de Saneamento</p>
                        </div>
                    </div>
                    <Button 
                        variant="ghost" 
                        className="text-white hover:bg-white/20 ml-auto"
                        onClick={handleLogout}
                    >
                        <LogOut className="h-5 w-5 mr-2" />
                        Sair
                    </Button>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-6xl mx-auto px-4 py-8">
                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                    <Link to={createPageUrl('NovaFiscalizacao')}>
                        <Card className="bg-green-500 hover:bg-green-600 transition-all cursor-pointer border-none h-full">
                            <CardContent className="p-6 flex items-center gap-4">
                                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                                    <Plus className="h-8 w-8 text-white" />
                                </div>
                                <div className="text-white">
                                    <h3 className="text-xl font-bold">Nova Fiscalização</h3>
                                    <p className="text-green-100 text-sm">Iniciar vistoria em campo</p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link to={createPageUrl('Fiscalizacoes')}>
                        <Card className="bg-white/10 hover:bg-white/20 transition-all cursor-pointer border-white/20 h-full">
                            <CardContent className="p-6 flex items-center gap-4">
                                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                                    <History className="h-8 w-8 text-white" />
                                </div>
                                <div className="text-white">
                                    <h3 className="text-xl font-bold">Fiscalizações</h3>
                                    <p className="text-blue-200 text-sm">Ver histórico e continuar</p>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                </div>

                {/* Menu Grid */}
                {!isMobile && (
                <>
                <h2 className="text-white text-lg font-semibold mb-4">Menu Principal</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                    <Link to={createPageUrl('TiposUnidade')}>
                        <Card className="bg-white/10 hover:bg-white/20 transition-all cursor-pointer border-white/20 h-full">
                            <CardContent className="p-4 text-center">
                                <Building2 className="h-8 w-8 text-blue-300 mx-auto mb-2" />
                                <h3 className="text-white font-medium text-sm">Tipos de Unidade</h3>
                                <p className="text-blue-300 text-xs">ETA, ETE, etc</p>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link to={createPageUrl('Checklists')}>
                        <Card className="bg-white/10 hover:bg-white/20 transition-all cursor-pointer border-white/20 h-full">
                            <CardContent className="p-4 text-center">
                                <ClipboardCheck className="h-8 w-8 text-blue-300 mx-auto mb-2" />
                                <h3 className="text-white font-medium text-sm">Checklists</h3>
                                <p className="text-blue-300 text-xs">Configurar perguntas</p>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link to={createPageUrl('PrestadoresServico')}>
                        <Card className="bg-white/10 hover:bg-white/20 transition-all cursor-pointer border-white/20 h-full">
                            <CardContent className="p-4 text-center">
                                <Users className="h-8 w-8 text-blue-300 mx-auto mb-2" />
                                <h3 className="text-white font-medium text-sm">Prestadores</h3>
                                <p className="text-blue-300 text-xs">Titulares e Empresas</p>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link to={createPageUrl('Relatorios')}>
                        <Card className="bg-white/10 hover:bg-white/20 transition-all cursor-pointer border-white/20 h-full">
                            <CardContent className="p-4 text-center">
                                <BarChart3 className="h-8 w-8 text-blue-300 mx-auto mb-2" />
                                <h3 className="text-white font-medium text-sm">Relatórios</h3>
                                <p className="text-blue-300 text-xs">Indicadores e BI</p>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link to={createPageUrl('GerenciarTermos')}>
                        <Card className="bg-white/10 hover:bg-white/20 transition-all cursor-pointer border-white/20 h-full">
                            <CardContent className="p-4 text-center">
                                <FileText className="h-8 w-8 text-blue-300 mx-auto mb-2" />
                                <h3 className="text-white font-medium text-sm">Termos</h3>
                                <p className="text-blue-300 text-xs">Notificação</p>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link to={createPageUrl('AnaliseManifestacao')}>
                        <Card className="bg-white/10 hover:bg-white/20 transition-all cursor-pointer border-white/20 h-full">
                            <CardContent className="p-4 text-center">
                                <FileText className="h-8 w-8 text-blue-300 mx-auto mb-2" />
                                <h3 className="text-white font-medium text-sm">Análise Manifestação</h3>
                                <p className="text-blue-300 text-xs">Processos</p>
                            </CardContent>
                        </Card>
                    </Link>

                    <Link to={createPageUrl('GestaoAutos')}>
                        <Card className="bg-white/10 hover:bg-white/20 transition-all cursor-pointer border-white/20 h-full">
                            <CardContent className="p-4 text-center">
                                <AlertTriangle className="h-8 w-8 text-red-300 mx-auto mb-2" />
                                <h3 className="text-white font-medium text-sm">Autos</h3>
                                <p className="text-blue-300 text-xs">Infrações</p>
                            </CardContent>
                        </Card>
                    </Link>

                    {!isPrestador && (
                        <Link to={createPageUrl('CamaraJulgamento')}>
                            <Card className="bg-white/10 hover:bg-white/20 transition-all cursor-pointer border-white/20 h-full">
                                <CardContent className="p-4 text-center">
                                    <FileText className="h-8 w-8 text-blue-300 mx-auto mb-2" />
                                    <h3 className="text-white font-medium text-sm">Câmara de Julgamento</h3>
                                    <p className="text-blue-300 text-xs">Pareceres assinados</p>
                                </CardContent>
                            </Card>
                        </Link>
                    )}

                    {isPrestador && (
                        <Link to={createPageUrl('PortalPrestadorHome')}>
                            <Card className="bg-white/10 hover:bg-white/20 transition-all cursor-pointer border-white/20 h-full">
                                <CardContent className="p-4 text-center">
                                    <FileText className="h-8 w-8 text-blue-300 mx-auto mb-2" />
                                    <h3 className="text-white font-medium text-sm">Portal do Prestador</h3>
                                    <p className="text-blue-300 text-xs">Responder TNs</p>
                                </CardContent>
                            </Card>
                        </Link>
                    )}

                    {isAdmin && (
                        <Link to={createPageUrl('GerenciarUsuarios')}>
                            <Card className="bg-white/10 hover:bg-white/20 transition-all cursor-pointer border-white/20 h-full">
                                <CardContent className="p-4 text-center">
                                    <Users className="h-8 w-8 text-blue-300 mx-auto mb-2" />
                                    <h3 className="text-white font-medium text-sm">Usuários</h3>
                                    <p className="text-blue-300 text-xs">Gestão e Permissões</p>
                                </CardContent>
                            </Card>
                        </Link>
                    )}
                </div>
                </>
                )}
            </div>

            {/* Footer + Sync Bar integrada */}
            <div className="mt-auto py-6">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="text-center text-blue-300 text-sm">
                        <p>AGEMS - Agência Estadual de Regulação de Serviços Públicos</p>
                        <p className="text-xs text-blue-400 mt-1">Mato Grosso do Sul</p>
                    </div>
                    
                    {/* Mensagem de Progresso (Movida para cima da barra) */}
                    {syncing && syncProgress && (
                        <div className="mt-4 text-center">
                            <span className="text-sm font-medium text-blue-200 bg-blue-900/50 px-3 py-1 rounded-full">
                                {syncProgress}
                            </span>
                        </div>
                    )}

                    <div className="mt-4 flex items-center gap-2 rounded-lg border border-blue-800 bg-blue-900 text-white px-3 py-2 shadow">
                        <Badge variant="outline" className="border-white text-white flex items-center gap-1">
                            {online ? <Wifi className="h-4 w-4 text-green-400" /> : <WifiOff className="h-4 w-4 text-red-400" />}
                            {online ? 'Online' : 'Offline'}
                        </Badge>
                        <Badge variant="outline" className="border-white text-white hidden sm:flex items-center gap-1">
                            <History className="h-4 w-4 text-blue-200" />
                            Última sync: {lastSyncAt ? format(new Date(lastSyncAt), 'dd/MM HH:mm', { locale: ptBR }) : '—'}
                        </Badge>
                        <div className="ml-auto flex items-center gap-2">
                            <Button
                                size="sm"
                                variant="outline"
                                disabled={syncing || !online}
                                className="border-white text-white bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={async () => {
                                    setSyncing(true)
                                    setSyncProgress('Iniciando...')
                                    try {
                                        try {
                                            const persisted = await navigator.storage?.persisted?.()
                                            if (!persisted && navigator.storage?.persist) {
                                                await navigator.storage.persist()
                                            }
                                        } catch {}
                                        const res = await runFullSync((msg, isError) => {
                                            setSyncProgress(msg)
                                            if (isError) {
                                                console.error('[Sync Error]', msg)
                                            }
                                        })
                                        // Atualiza imediatamente todos os dados em cache relevantes
                                        await queryClient.invalidateQueries()
                                        await queryClient.refetchQueries()
                                        setSyncProgress('')
                                        toast({
                                            title: 'Sincronização concluída',
                                            description: res.lastSyncAt ? `Atualizado em ${format(new Date(res.lastSyncAt), 'dd/MM HH:mm', { locale: ptBR })}` : 'Dados atualizados'
                                        })
                                    } catch (err) {
                                        setSyncProgress('Erro na sincronização')
                                        toast({
                                            title: 'Falha na sincronização',
                                            description: err?.message || 'Verifique sua conexão e tente novamente',
                                            variant: 'destructive'
                                        })
                                    } finally {
                                        setSyncing(false)
                                        refetchSyncStatus?.()
                                    }
                                }}
                            >
                                {syncing ? 'Sincronizando...' : 'Sincronizar'}
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="text-blue-200 hover:text-white hover:bg-white/10 ml-2"
                                title="Baixar backup local de emergência"
                                onClick={async () => {
                                    try {
                                        toast({ title: 'Preparando backup', description: 'Coletando dados e fotos, isso pode levar alguns segundos...' })
                                        const { db } = await import('@/lib/offline/db')
                                        const JSZip = (await import('jszip')).default
                                        const zip = new JSZip()

                                        const tabelas = [
                                            'fiscalizacoes',
                                            'unidades',
                                            'respostas',
                                            'constatacoes_manuais',
                                            'recomendacoes',
                                            'fila_mutacoes',
                                            'fotos_local'
                                        ]
                                        const backup = {}
                                        for (const t of tabelas) {
                                            if (db[t]) {
                                                backup[t] = await db[t].toArray()
                                            }
                                        }

                                        zip.file('dados.json', JSON.stringify(backup, null, 2))

                                        const unidadesList = backup.unidades || []
                                        const fotosLocal = backup.fotos_local || []
                                        const fotosFolder = zip.folder('fotos')

                                        for (const foto of fotosLocal) {
                                            let folderName = foto.unidadeLocalId || 'desconhecida'
                                            const unidade = unidadesList.find((u) => u.id === foto.unidadeLocalId)

                                            if (unidade && unidade.nome_unidade) {
                                                const nomeLimpo = unidade.nome_unidade.replace(/[^a-zA-Z0-9 -]/g, '_')
                                                folderName = `${nomeLimpo} - ${foto.unidadeLocalId.substring(0, 4)}`
                                            }

                                            const unidadeFolder = fotosFolder.folder(folderName)

                                            let content = foto.blob
                                            if (!content && foto.base64) {
                                                const res = await fetch(foto.base64)
                                                content = await res.blob()
                                            }

                                            if (content) {
                                                const fileName = `${foto.localId}.jpg`
                                                unidadeFolder.file(fileName, content)
                                            }
                                        }

                                        const zipContent = await zip.generateAsync({ type: 'blob' })
                                        const url = URL.createObjectURL(zipContent)
                                        const a = document.createElement('a')
                                        a.href = url
                                        a.download = `backup_emergencia_android_${new Date().getTime()}.zip`
                                        a.click()
                                        URL.revokeObjectURL(url)

                                        toast({ title: 'Backup concluído', description: 'Arquivo ZIP baixado com sucesso.' })
                                    } catch (err) {
                                        toast({ title: 'Erro no backup', description: err.message, variant: 'destructive' })
                                    }
                                }}
                            >
                                <AlertTriangle className="h-4 w-4" />
                            </Button>
                        </div>
                        
                    </div>
                </div>
            </div>
        </div>
    );
}
