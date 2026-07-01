import { useState } from 'react';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useOnlineStatus } from '@/lib/OnlineStatusContext.jsx';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '@/components/ui/alert-dialog';
import { ArrowLeft, Plus, Edit, Trash2, Upload, Loader2, GripVertical, AlertTriangle, ClipboardCheck } from 'lucide-react';
import ItemChecklistForm from '@/components/admin/ItemChecklistForm';








export default function Checklists({ embedded = false }) {
    const queryClient = useQueryClient();
    const { online } = useOnlineStatus();
    const urlParams = new URLSearchParams(window.location.search);
    const tipoIdFromUrl = urlParams.get('tipo');
    
    const [selectedTipo, setSelectedTipo] = useState(tipoIdFromUrl || '');
    const [showForm, setShowForm] = useState(false);
    const [editing, setEditing] = useState(null);
    const [importing, setImporting] = useState(false);
    const [deleteConfirmation, setDeleteConfirmation] = useState({ open: false, itemId: null, step: 1, inputValue: '' });

    const { data: tipos = [] } = useQuery({
        queryKey: ['tipos-unidade'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('tipos_unidade')
                .select('id, nome, codigo, servicos_aplicaveis, ativo, created_at')
                .order('nome', { ascending: true });
            if (error) throw error;
            return data || [];
        }
    });

    const { data: itens = [], isLoading } = useQuery({
        queryKey: ['itens-checklist', selectedTipo],
        queryFn: async () => {
            if (!selectedTipo) return [];
            const { data, error } = await supabase
                .from('itens_checklist')
                .select('id, tipo_unidade_id, ordem, pergunta, texto_constatacao_sim, texto_constatacao_nao, gera_nc, artigo_portaria, texto_determinacao, texto_recomendacao, texto_nc, prazo_dias, ativo, created_at')
                .eq('tipo_unidade_id', selectedTipo)
                .order('ordem', { ascending: true })
                .order('created_at', { ascending: true });
            if (error) throw error;
            const norm = (s) => String(s || '').trim().toLowerCase();
            const keyOf = (it) => {
                const ord = Number(it?.ordem) || 0;
                if (ord > 0) return `o:${ord}`;
                const p = norm(it?.pergunta);
                return p ? `p:${p}` : `id:${String(it?.id || '')}`;
            };
            const list = Array.isArray(data) ? data : [];
            const byKey = new Map();
            for (const it of list) {
                const k = keyOf(it);
                const prev = byKey.get(k);
                if (!prev) {
                    byKey.set(k, it);
                    continue;
                }
                if (String(it?.created_at || '') >= String(prev?.created_at || '')) byKey.set(k, it);
            }
            return Array.from(byKey.values())
                .filter((it) => it?.ativo !== false)
                .sort((a, b) => (Number(a?.ordem) || 0) - (Number(b?.ordem) || 0));
        },
        enabled: !!selectedTipo
    });

    const createMutation = useMutation({
        mutationFn: async (data) => {
            const id = crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
            const payload = { ...data, id, ativo: true };
            const { error } = await supabase.from('itens_checklist').insert(payload);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['itens-checklist'] });
            setShowForm(false);
            setEditing(null);
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ prevItem, data }) => {
            const norm = (s) => String(s || '').trim().toLowerCase();
            const keyOf = (it) => {
                const ord = Number(it?.ordem) || 0;
                if (ord > 0) return `o:${ord}`;
                const p = norm(it?.pergunta);
                return p ? `p:${p}` : `id:${String(it?.id || '')}`;
            };

            const id = crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
            const payload = { ...data, id, ativo: true };
            const rows = [payload];
            if (prevItem) {
                const prevKey = keyOf(prevItem);
                const nextKey = keyOf(data);
                if (prevKey !== nextKey) {
                    const tombstoneId = crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
                    rows.push({
                        id: tombstoneId,
                        tipo_unidade_id: prevItem?.tipo_unidade_id,
                        ordem: prevItem?.ordem,
                        pergunta: prevItem?.pergunta,
                        texto_constatacao_sim: prevItem?.texto_constatacao_sim,
                        texto_constatacao_nao: prevItem?.texto_constatacao_nao,
                        gera_nc: prevItem?.gera_nc,
                        artigo_portaria: prevItem?.artigo_portaria,
                        texto_determinacao: prevItem?.texto_determinacao,
                        texto_recomendacao: prevItem?.texto_recomendacao,
                        texto_nc: prevItem?.texto_nc,
                        prazo_dias: prevItem?.prazo_dias,
                        ativo: false
                    });
                }
            }

            const { error } = await supabase.from('itens_checklist').insert(rows);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['itens-checklist'] });
            setShowForm(false);
            setEditing(null);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (item) => {
            const id = crypto?.randomUUID?.() || Math.random().toString(36).slice(2);
            const payload = {
                id,
                tipo_unidade_id: item?.tipo_unidade_id,
                ordem: item?.ordem,
                pergunta: item?.pergunta,
                texto_constatacao_sim: item?.texto_constatacao_sim,
                texto_constatacao_nao: item?.texto_constatacao_nao,
                gera_nc: item?.gera_nc,
                artigo_portaria: item?.artigo_portaria,
                texto_determinacao: item?.texto_determinacao,
                texto_recomendacao: item?.texto_recomendacao,
                texto_nc: item?.texto_nc,
                prazo_dias: item?.prazo_dias,
                ativo: false
            };
            const { error } = await supabase.from('itens_checklist').insert(payload);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['itens-checklist'] });
            setDeleteConfirmation({ open: false, itemId: null, step: 1, inputValue: '' });
        }
    });

    const handleSave = (data) => {
        const payload = { ...data, tipo_unidade_id: selectedTipo };
        // Remove id from payload if creating
        const { id, created_at, ...rest } = payload;
        
        if (editing?.id) {
            updateMutation.mutate({ prevItem: editing, data: rest });
        } else {
            createMutation.mutate(rest);
        }
    };

    const handleEdit = (item) => {
        setEditing(item);
        setShowForm(true);
    };

    const handleImport = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!online) {
            alert('Importação disponível somente online.');
            e.target.value = '';
            return;
        }

        setImporting(true);
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (jsonData.length < 2) {
                alert('Arquivo vazio ou sem dados');
                return;
            }

            const dataLines = jsonData.slice(1).filter(linha => {
                return Array.isArray(linha) && linha.some(celula => celula && String(celula).trim() !== '');
            });

            let itensImportados = 0;
            const erros = [];

            const { data: tiposExistentes, error: tiposExistentesError } = await supabase
                .from('tipos_unidade')
                .select('id, nome, codigo');
            if (tiposExistentesError) throw tiposExistentesError;
            const tiposMap = new Map();
            (tiposExistentes || []).forEach(t => {
                if (t?.nome) tiposMap.set(String(t.nome).toLowerCase(), t.id);
                if (t?.codigo) tiposMap.set(String(t.codigo).toLowerCase(), t.id);
            });

            const tiposParaCriar = new Map();
            const itensParaCriar = [];

            for (let i = 0; i < dataLines.length; i++) {
                try {
                    const linha = dataLines[i];
                    if (!Array.isArray(linha) || linha.length < 5) { // Relaxed constraint
                         // Tentar pegar colunas principais
                    }

                    const [
                        servico,
                        tipo_unidade_codigo,
                        tipo_unidade_nome,
                        ordem,
                        pergunta,
                        texto_constatacao_sim,
                        texto_constatacao_nao,
                        artigo_portaria,
                        texto_determinacao,
                        texto_recomendacao,
                        texto_nc,
                        prazo_dias
                    ] = linha.map(c => c ? String(c).trim() : '');

                    if (!pergunta || !tipo_unidade_nome) {
                        continue;
                    }

                    // Buscar Tipo ID
                    const nomeKey = tipo_unidade_nome.toLowerCase();
                    const codigoKey = tipo_unidade_codigo ? tipo_unidade_codigo.toLowerCase() : '';
                    let tipoId = tiposMap.get(nomeKey) || (codigoKey ? tiposMap.get(codigoKey) : undefined);

                    if (!tipoId) {
                        const tipoKey = codigoKey || nomeKey;
                        const existing = tiposParaCriar.get(tipoKey);
                        if (!existing) {
                            tiposParaCriar.set(tipoKey, {
                                nome: tipo_unidade_nome,
                                codigo: tipo_unidade_codigo || '',
                                servicos_aplicaveis: servico ? [servico] : [],
                                ativo: true
                            });
                        } else {
                            const next = new Set([...(existing.servicos_aplicaveis || []), ...(servico ? [servico] : [])]);
                            tiposParaCriar.set(tipoKey, { ...existing, servicos_aplicaveis: Array.from(next) });
                        }
                    }

                    itensParaCriar.push({
                        __linha: i,
                        __tipo_nome_key: nomeKey,
                        __tipo_codigo_key: codigoKey,
                        ordem: parseInt(ordem) || 0,
                        pergunta: pergunta || '',
                        texto_constatacao_sim: texto_constatacao_sim || '',
                        texto_constatacao_nao: texto_constatacao_nao || '',
                        gera_nc: true,
                        artigo_portaria: artigo_portaria || '',
                        texto_determinacao: texto_determinacao || '',
                        texto_recomendacao: texto_recomendacao || '',
                        texto_nc: texto_nc || '',
                        prazo_dias: parseInt(prazo_dias) || 30,
                        ativo: true
                    });

                } catch (error) {
                    erros.push(`Linha ${i + 2}: ${error.message}`);
                }
            }

            const tiposCriados = [];
            const tiposRows = Array.from(tiposParaCriar.values()).map((t) => ({
                id: crypto?.randomUUID?.() || Math.random().toString(36).slice(2),
                ...t
            }));
            for (let offset = 0; offset < tiposRows.length; offset += 100) {
                const chunk = tiposRows.slice(offset, offset + 100);
                const { data: inserted, error } = await supabase.from('tipos_unidade').insert(chunk).select('id, nome, codigo');
                if (error) throw error;
                (inserted || []).forEach((t) => tiposCriados.push(t));
            }
            tiposCriados.forEach((t) => {
                if (t?.nome) tiposMap.set(String(t.nome).toLowerCase(), t.id);
                if (t?.codigo) tiposMap.set(String(t.codigo).toLowerCase(), t.id);
            });

            const itensRows = [];
            for (const item of itensParaCriar) {
                const tipoId = tiposMap.get(item.__tipo_nome_key) || (item.__tipo_codigo_key ? tiposMap.get(item.__tipo_codigo_key) : undefined);
                if (!tipoId) {
                    erros.push(`Linha ${item.__linha + 2}: tipo_unidade não encontrado para item`);
                    continue;
                }
                itensRows.push({
                    id: crypto?.randomUUID?.() || Math.random().toString(36).slice(2),
                    tipo_unidade_id: tipoId,
                    ordem: item.ordem,
                    pergunta: item.pergunta,
                    texto_constatacao_sim: item.texto_constatacao_sim,
                    texto_constatacao_nao: item.texto_constatacao_nao,
                    gera_nc: item.gera_nc,
                    artigo_portaria: item.artigo_portaria,
                    texto_determinacao: item.texto_determinacao,
                    texto_recomendacao: item.texto_recomendacao,
                    texto_nc: item.texto_nc,
                    prazo_dias: item.prazo_dias,
                    ativo: item.ativo
                });
            }

            const norm = (s) => String(s || '').trim().toLowerCase();
            const keyOf = (it) => {
                const ord = Number(it?.ordem) || 0;
                if (ord > 0) return `o:${ord}`;
                const p = norm(it?.pergunta);
                return p ? `p:${p}` : `id:${String(it?.id || '')}`;
            };
            const tipoIdsImportados = Array.from(new Set(itensRows.map((x) => x.tipo_unidade_id).filter(Boolean)));

            for (const tipoId of tipoIdsImportados) {
                const incoming = itensRows.filter((x) => x.tipo_unidade_id === tipoId);
                const incomingByKey = new Map();
                for (const it of incoming) {
                    const k = keyOf(it);
                    if (!incomingByKey.has(k)) incomingByKey.set(k, it);
                }

                const { data: existingAll, error: exErr } = await supabase
                    .from('itens_checklist')
                    .select('tipo_unidade_id, ordem, pergunta, texto_constatacao_sim, texto_constatacao_nao, gera_nc, artigo_portaria, texto_determinacao, texto_recomendacao, texto_nc, prazo_dias, ativo, created_at')
                    .eq('tipo_unidade_id', tipoId)
                    .order('created_at', { ascending: true });
                if (exErr) throw exErr;
                const existingList = Array.isArray(existingAll) ? existingAll : [];
                const latestByKey = new Map();
                for (const it of existingList) {
                    const k = keyOf(it);
                    latestByKey.set(k, it);
                }

                const inserts = [];
                for (const it of incomingByKey.values()) {
                    inserts.push({
                        id: crypto?.randomUUID?.() || Math.random().toString(36).slice(2),
                        tipo_unidade_id: tipoId,
                        ordem: it.ordem,
                        pergunta: it.pergunta,
                        texto_constatacao_sim: it.texto_constatacao_sim,
                        texto_constatacao_nao: it.texto_constatacao_nao,
                        gera_nc: it.gera_nc,
                        artigo_portaria: it.artigo_portaria,
                        texto_determinacao: it.texto_determinacao,
                        texto_recomendacao: it.texto_recomendacao,
                        texto_nc: it.texto_nc,
                        prazo_dias: it.prazo_dias,
                        ativo: true
                    });
                }

                for (const [k, it] of latestByKey.entries()) {
                    if (incomingByKey.has(k)) continue;
                    if (it?.ativo === false) continue;
                    inserts.push({
                        id: crypto?.randomUUID?.() || Math.random().toString(36).slice(2),
                        tipo_unidade_id: tipoId,
                        ordem: it.ordem,
                        pergunta: it.pergunta,
                        texto_constatacao_sim: it.texto_constatacao_sim,
                        texto_constatacao_nao: it.texto_constatacao_nao,
                        gera_nc: it.gera_nc,
                        artigo_portaria: it.artigo_portaria,
                        texto_determinacao: it.texto_determinacao,
                        texto_recomendacao: it.texto_recomendacao,
                        texto_nc: it.texto_nc,
                        prazo_dias: it.prazo_dias,
                        ativo: false
                    });
                }

                for (let offset = 0; offset < inserts.length; offset += 200) {
                    const chunk = inserts.slice(offset, offset + 200);
                    const { error } = await supabase.from('itens_checklist').insert(chunk);
                    if (error) throw error;
                    itensImportados += chunk.filter((x) => x.ativo !== false).length;
                }
            }
            
            alert(`✅ Importação concluída!\n${itensImportados} itens importados`);
            queryClient.invalidateQueries({ queryKey: ['itens-checklist'] });
            queryClient.invalidateQueries({ queryKey: ['tipos-unidade'] });
            
            if (erros.length > 0) {
                console.warn('Erros na importação:', erros);
                alert(`⚠️ Alguns erros ocorreram:\n${erros.slice(0, 5).join('\n')}`);
            }

        } catch (error) {
            console.error(error);
            alert(`❌ Erro ao importar: ${error.message}`);
        } finally {
            setImporting(false);
            e.target.value = '';
        }
    };

    const tipoSelecionado = tipos.find(t => t.id === selectedTipo);

    return (
        <div className={embedded ? '' : 'min-h-screen bg-gray-50'}>
            {!embedded && (
            <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-950 text-white shadow-md">
                <div className="max-w-4xl mx-auto px-4 py-5">
                    <div className="flex items-center gap-3">
                        <Link to={createPageUrl('Home')}>
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xl font-bold">Checklists Normativos</h1>
                            <p className="text-blue-200 text-xs mt-0.5">Configure perguntas por tipo de unidade</p>
                        </div>
                    </div>
                </div>
            </div>
            )}

            {/* Seletor de Tipo */}
            <div className="max-w-4xl mx-auto px-4 py-4">
                <Card className="border border-gray-200 rounded-2xl shadow-sm bg-white">
                    <CardContent className="p-4">
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 block">Tipo de Unidade</label>
                                <Select value={selectedTipo} onValueChange={setSelectedTipo}>
                                    <SelectTrigger className="h-11 rounded-xl bg-white border-gray-200">
                                        <SelectValue placeholder="Escolha um tipo de unidade..." />
                                    </SelectTrigger>
                                    <SelectContent className="bg-white border-gray-200">
                                        {tipos.map(tipo => (
                                            <SelectItem key={tipo.id} value={tipo.id}>
                                                {tipo.nome}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="pt-6">
                                <input
                                    type="file"
                                    accept=".xlsx,.xls"
                                    onChange={handleImport}
                                    disabled={importing}
                                    id="importar-xlsx"
                                    className="hidden"
                                />
                                <label htmlFor="importar-xlsx">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="border-gray-200 rounded-xl"
                                        disabled={importing}
                                        asChild
                                    >
                                        <span className="cursor-pointer">
                                            {importing ? (
                                                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importando...</>
                                            ) : (
                                                <><Upload className="h-4 w-4 mr-2" /> Importar Excel</>
                                            )}
                                        </span>
                                    </Button>
                                </label>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Lista de Itens */}
            {selectedTipo && (
                <div className="max-w-4xl mx-auto px-4 pb-8">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h2 className="font-bold text-gray-800">{tipoSelecionado?.nome}</h2>
                            <p className="text-xs text-gray-500">{itens.length} itens no checklist</p>
                        </div>
                        <Button onClick={() => { setEditing(null); setShowForm(true); }} className="bg-indigo-600 hover:bg-indigo-700 rounded-xl">
                            <Plus className="h-4 w-4 mr-1.5" />
                            Novo Item
                        </Button>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin text-indigo-500" /></div>
                    ) : (
                        <div className="space-y-2">
                            {itens.map((item, index) => (
                                <Card key={item.id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-4">
                                        <div className="flex items-start gap-3">
                                            <div className="flex items-center gap-2 text-gray-400">
                                                <GripVertical className="h-4 w-4" />
                                                <span className="font-mono text-sm">{item.ordem || index + 1}.</span>
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-medium">{item.pergunta}</p>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {item.gera_nc && (
                                                        <Badge variant="destructive" className="text-xs">
                                                            <AlertTriangle className="h-3 w-3 mr-1" />
                                                            Gera NC
                                                        </Badge>
                                                    )}
                                                    {item.artigo_portaria && (
                                                        <Badge variant="outline" className="text-xs">
                                                            {item.artigo_portaria}
                                                        </Badge>
                                                    )}
                                                </div>
                                                {item.texto_nc && (
                                                    <p className="text-xs text-gray-500 mt-2 line-clamp-1">
                                                        NC: {item.texto_nc}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <AlertDialog 
                                                    open={deleteConfirmation.open && deleteConfirmation.itemId === item.id}
                                                    onOpenChange={(open) => {
                                                        if (!open) {
                                                            setDeleteConfirmation({ open: false, itemId: null, step: 1, inputValue: '' });
                                                        }
                                                    }}
                                                >
                                                    <AlertDialogTrigger asChild>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon"
                                                            onClick={() => setDeleteConfirmation({ open: true, itemId: item.id, step: 1, inputValue: '' })}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-red-500" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        {deleteConfirmation.step === 1 ? (
                                                            <>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                                                                        <AlertTriangle className="h-5 w-5" />
                                                                        Excluir Item do Checklist?
                                                                    </AlertDialogTitle>
                                                                    <AlertDialogDescription className="space-y-2">
                                                                        <p>Você está prestes a excluir permanentemente:</p>
                                                                        <p className="font-semibold text-gray-900">{item.pergunta}</p>
                                                                        <p className="text-red-600">Esta ação não pode ser desfeita.</p>
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                                    <Button
                                                                        variant="destructive"
                                                                        onClick={() => setDeleteConfirmation(prev => ({ ...prev, step: 2 }))}
                                                                    >
                                                                        Continuar
                                                                    </Button>
                                                                </AlertDialogFooter>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <AlertDialogHeader>
                                                                    <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                                                                        <AlertTriangle className="h-5 w-5" />
                                                                        Confirmação Final
                                                                    </AlertDialogTitle>
                                                                    <AlertDialogDescription className="space-y-3">
                                                                        <p>Para confirmar a exclusão, digite <span className="font-bold">EXCLUIR</span> no campo abaixo:</p>
                                                                        <Input
                                                                            placeholder="Digite EXCLUIR"
                                                                            value={deleteConfirmation.inputValue}
                                                                            onChange={(e) => setDeleteConfirmation(prev => ({ ...prev, inputValue: e.target.value }))}
                                                                            className="mt-2"
                                                                        />
                                                                    </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                    <AlertDialogCancel onClick={() => setDeleteConfirmation({ open: false, itemId: null, step: 1, inputValue: '' })}>
                                                                        Cancelar
                                                                    </AlertDialogCancel>
                                                                    <Button
                                                                        variant="destructive"
                                                                        disabled={deleteConfirmation.inputValue !== 'EXCLUIR' || deleteMutation.isPending}
                                                                        onClick={() => deleteMutation.mutate(item)}
                                                                    >
                                                                        {deleteMutation.isPending ? 'Excluindo...' : 'Excluir Permanentemente'}
                                                                    </Button>
                                                                </AlertDialogFooter>
                                                            </>
                                                        )}
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}

                    {!isLoading && itens.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                            <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-30" />
                            <p>Nenhum item no checklist</p>
                            <Button onClick={() => setShowForm(true)} className="mt-4">
                                <Plus className="h-4 w-4 mr-2" />
                                Adicionar primeiro item
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Form Dialog */}
            <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditing(null); } }}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Editar' : 'Novo'} Item do Checklist</DialogTitle>
                    </DialogHeader>
                    <ItemChecklistForm
                        item={editing}
                        onSave={handleSave}
                        onCancel={() => { setShowForm(false); setEditing(null); }}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}
