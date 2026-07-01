import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Repository } from '@/lib/offline/repository';
import { parseKMLKmPoints } from '@/utils/rodoviasGeoJSON';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft, Upload, Download, FileSpreadsheet, Map, CheckCircle2,
    AlertCircle, Loader2, RefreshCw, FileText, Trash2, Route
} from 'lucide-react';

// Colunas da planilha de ocorrências DTR:
// Rodovia → opcional; deixar vazio = aplica-se a todas as rodovias
// Frente → categoria principal da concessão
// PER → item do Programa de Exploração da Rodovia (ex: 3.1.1 Pavimento)
// Descrição → nome do item exibido no app e nas constatações
// Não atendimento → cláusula do PER violada (preenchida se houver NC)
// Prazo → prazo padrão em dias quando for NC
// Etapas Obra → etapas separadas por \n; preencher só em itens de obra
const TEMPLATE_COLUNAS = [
    'Rodovia',
    'Frente',
    'PER',
    'Descrição',
    'Não atendimento (NC)',
    'Prazo (dias)',
    'Etapas Obra'
];

function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
        TEMPLATE_COLUNAS,
        [
            '',
            'RECUPERAÇÃO E MANUTENÇÃO',
            '3.1.1 Pavimento',
            'Exsudação',
            '',
            '',
            ''
        ],
        [
            '',
            'RECUPERAÇÃO E MANUTENÇÃO',
            '3.1.1 Pavimento',
            'Elementos indesejáveis',
            '',
            '',
            ''
        ],
        [
            '40',
            'RECUPERAÇÃO E MANUTENÇÃO',
            '3.1.1 Pavimento',
            'Buraco / Panela na pista',
            '3.1.1 Ausência de defeitos no revestimento do pavimento do tipo panela, afundamento de trilha de roda, escorregamento, conforme parâmetros do PER.',
            '3',
            ''
        ],
        [
            '',
            'RECUPERAÇÃO E MANUTENÇÃO',
            '3.1.1 Pavimento',
            'Outros',
            '',
            '',
            ''
        ],
        [
            '',
            'RECUPERAÇÃO E MANUTENÇÃO',
            '3.1.2 Sinalização e Elementos de Proteção e Segurança',
            'Sinalização vertical danificada ou ausente',
            '',
            '3',
            ''
        ],
        [
            '',
            'RECUPERAÇÃO E MANUTENÇÃO',
            '3.1.6 Canteiro Central e Faixa de Domínio',
            'Vegetação alta no acostamento / faixa de domínio',
            '3.1.6 Ausência total de vegetação rasteira com comprimento superior a 40,0 (quarenta) cm, em toda a extensão da faixa de domínio, numa largura mínima de 4,0 (quatro) metros a partir do bordo da drenagem e/ou do acostamento, de cada lado das rodovias.',
            '15',
            ''
        ],
        [
            '',
            'SERVIÇOS OPERACIONAIS',
            '3.4.5.1 Atendimento Médico de Emergência',
            'Ausência de ambulância / serviço médico',
            '3.4.5.1. Disponibilização de serviço de atendimento médico de emergência 24:00 horas por dia, inclusive sábados, domingos e feriados, conforme Anexo B.',
            '1',
            ''
        ],
        [
            '112/306',
            'OBRAS',
            '4.1.1 Recuperação de Pavimento',
            'Obra de recuperação asfáltica',
            '4.1.1 Execução de recuperação do revestimento asfáltico conforme projeto.',
            '30',
            '1ª Etapa - Fresagem\n2ª Etapa - Imprimação\n3ª Etapa - CBUQ'
        ]
    ]);
    ws['!cols'] = [{ wch: 12 }, { wch: 50 }, { wch: 50 }, { wch: 45 }, { wch: 90 }, { wch: 14 }, { wch: 40 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Tipos de Ocorrência DTR');
    XLSX.writeFile(wb, 'template_tipos_ocorrencia_dtr.xlsx');
}

function parseSpreadsheet(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const wb = XLSX.read(e.target.result, { type: 'binary' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
                const header = (rows[0] || []).map(h => String(h || '').trim().toLowerCase());
                const hasRodoviaCol = header[0] === 'rodovia';
                const off = hasRodoviaCol ? 1 : 0;

                // Fill-down: células mescladas no Excel chegam vazias nas linhas continuação.
                // Mantemos o último valor não-vazio de cada coluna estrutural.
                let lastRodovia = null;
                let lastFrente = '';
                let lastPer = null;
                let lastDescricao = null;

                // Passo 1 — parse com fill-down
                const flat = [];
                for (const r of rows.slice(1)) {
                    const rodovia = hasRodoviaCol ? (String(r[0] || '').trim() || lastRodovia) : null;
                    const frente = String(r[off] || '').trim() || lastFrente;
                    const per = String(r[off + 1] || '').trim() || lastPer;
                    const descricao = String(r[off + 2] || '').trim() || lastDescricao;

                    if (!frente) continue; // linha totalmente vazia

                    lastRodovia = rodovia;
                    lastFrente = frente;
                    lastPer = per;
                    lastDescricao = descricao;

                    const rawNaoAten = String(r[off + 3] || '').trim();
                    const nao_atendimento = rawNaoAten && rawNaoAten !== '-' ? rawNaoAten : null;
                    const prazo_dias_padrao = r[off + 4] ? parseInt(String(r[off + 4]).trim(), 10) || null : null;
                    const rawEtapa = r[off + 5] ? String(r[off + 5]).trim() : '';
                    const etapaLinha = rawEtapa && rawEtapa !== '-' ? rawEtapa : null;

                    flat.push({ rodovia, frente, item_contrato: per, descricao, nao_atendimento, prazo_dias_padrao, etapaLinha });
                }

                // Passo 2 — agrupa linhas com mesma chave, juntando etapas com \n
                const mergeMap = new Map();
                for (const row of flat) {
                    const key = [row.rodovia, row.frente, row.item_contrato, row.descricao].join('||');
                    if (!mergeMap.has(key)) {
                        mergeMap.set(key, { ...row, etapas: row.etapaLinha ? [row.etapaLinha] : [] });
                    } else {
                        const ex = mergeMap.get(key);
                        if (row.etapaLinha) ex.etapas.push(row.etapaLinha);
                        if (row.nao_atendimento && !ex.nao_atendimento) ex.nao_atendimento = row.nao_atendimento;
                        if (row.prazo_dias_padrao && !ex.prazo_dias_padrao) ex.prazo_dias_padrao = row.prazo_dias_padrao;
                    }
                }

                const tipos = [...mergeMap.values()].map(({ etapas, etapaLinha, ...rest }) => ({
                    ...rest,
                    nome: rest.descricao,
                    etapas_obra: etapas.length > 0 ? etapas.join('\n') : null,
                    gera_nc: !!rest.nao_atendimento,
                }));

                resolve(tipos);
            } catch (err) {
                reject(new Error('Erro ao ler planilha: ' + err.message));
            }
        };
        reader.onerror = () => reject(new Error('Falha ao ler arquivo.'));
        reader.readAsBinaryString(file);
    });
}

// --- Aba: Tipos de Ocorrência ---
function TabTipos() {
    const queryClient = useQueryClient();
    const fileInputRef = useRef(null);
    const [uploadStatus, setUploadStatus] = useState(null); // {type:'success'|'error', message}
    const [preview, setPreview] = useState(null); // rows antes de confirmar
    const [parsedFile, setParsedFile] = useState(null);
    const [confirmingClear, setConfirmingClear] = useState(false);

    const { data: tipos = [], isLoading, refetch } = useQuery({
        queryKey: ['tipos_ocorrencia_dtr'],
        queryFn: () => Repository.listTiposOcorrenciaDTR()
    });

    const syncMutation = useMutation({
        mutationFn: () => Repository.syncTiposOcorrenciaDTR(),
        onSuccess: (n) => {
            queryClient.invalidateQueries({ queryKey: ['tipos_ocorrencia_dtr'] });
            setUploadStatus({ type: 'success', message: `${n} tipos sincronizados do servidor.` });
        },
        onError: (err) => setUploadStatus({ type: 'error', message: err.message })
    });

    const clearMutation = useMutation({
        mutationFn: () => Repository.clearTiposOcorrenciaDTR(),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tipos_ocorrencia_dtr'] });
            setUploadStatus({ type: 'success', message: 'Base limpa. Importe a planilha para recarregar.' });
            setConfirmingClear(false);
        },
        onError: (err) => {
            setUploadStatus({ type: 'error', message: err.message });
            setConfirmingClear(false);
        }
    });

    const uploadMutation = useMutation({
        mutationFn: (tipos) => Repository.upsertTiposOcorrenciaDTR(tipos),
        onSuccess: ({ inserted, updated, unchanged }) => {
            queryClient.invalidateQueries({ queryKey: ['tipos_ocorrencia_dtr'] });
            const parts = [];
            if (inserted > 0) parts.push(`${inserted} adicionado${inserted !== 1 ? 's' : ''}`);
            if (updated > 0) parts.push(`${updated} atualizado${updated !== 1 ? 's' : ''}`);
            if (unchanged > 0) parts.push(`${unchanged} sem alterações`);
            setUploadStatus({ type: 'success', message: parts.join(', ') + '.' });
            setPreview(null);
            setParsedFile(null);
        },
        onError: (err) => setUploadStatus({ type: 'error', message: err.message })
    });

    const handleFileSelect = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setUploadStatus(null);
        try {
            const parsed = await parseSpreadsheet(file);
            if (parsed.length === 0) {
                setUploadStatus({ type: 'error', message: 'Nenhum tipo encontrado na planilha. Verifique o formato.' });
                return;
            }
            setPreview(parsed);
            setParsedFile(parsed);
        } catch (err) {
            setUploadStatus({ type: 'error', message: err.message });
        }
        e.target.value = '';
    };

    return (
        <div className="space-y-5">
            {/* Ações */}
            <div className="flex flex-wrap gap-2">
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                    onClick={downloadTemplate}
                >
                    <Download className="h-3.5 w-3.5" /> Baixar Template XLSX
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5 text-xs border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <Upload className="h-3.5 w-3.5" /> Importar Planilha
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-xs text-gray-500"
                    onClick={() => syncMutation.mutate()}
                    disabled={syncMutation.isPending}
                >
                    {syncMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                    Sincronizar
                </Button>
                {!confirmingClear ? (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-xs text-rose-500 hover:text-rose-700 hover:bg-rose-50 ml-auto"
                        onClick={() => setConfirmingClear(true)}
                        disabled={tipos.length === 0}
                    >
                        <Trash2 className="h-3.5 w-3.5" /> Limpar base
                    </Button>
                ) : (
                    <div className="flex items-center gap-1.5 ml-auto">
                        <span className="text-xs text-rose-600 font-medium">Apagar todos os {tipos.length} tipos?</span>
                        <Button
                            size="sm"
                            className="h-7 text-xs bg-rose-600 hover:bg-rose-700 text-white"
                            onClick={() => clearMutation.mutate()}
                            disabled={clearMutation.isPending}
                        >
                            {clearMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirmar'}
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-gray-500"
                            onClick={() => setConfirmingClear(false)}
                            disabled={clearMutation.isPending}
                        >
                            Cancelar
                        </Button>
                    </div>
                )}
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileSelect} />
            </div>

            {/* Status de upload */}
            {uploadStatus && (
                <div className={`flex items-start gap-2 p-3 rounded-xl text-xs ${uploadStatus.type === 'success' ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-rose-50 border border-rose-200 text-rose-700'}`}>
                    {uploadStatus.type === 'success' ? <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />}
                    <span>{uploadStatus.message}</span>
                </div>
            )}

            {/* Preview antes de confirmar */}
            {preview && (
                <Card className="border-amber-200 bg-amber-50">
                    <CardContent className="p-4 space-y-3">
                        <p className="text-sm font-semibold text-amber-800">
                            {preview.length} tipos encontrados na planilha. Confirmar importação?
                        </p>
                        <p className="text-xs text-amber-700">
                            Apenas tipos novos serão adicionados. Tipos já existentes serão atualizados se tiverem mudanças.
                        </p>
                        <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                            {preview.map((t, i) => (
                                <div key={i} className="text-xs bg-white rounded-lg px-3 py-2 border border-amber-100 space-y-0.5">
                                    <div className="flex items-center gap-2">
                                        <span className="flex-1 font-medium text-gray-800">{t.descricao || t.nome}</span>
                                        {t.gera_nc && <Badge className="text-[10px] py-0 h-4 bg-rose-100 text-rose-700 border-rose-200">NC</Badge>}
                                        {t.etapas_obra && <Badge className="text-[10px] py-0 h-4 bg-amber-100 text-amber-700 border-amber-200">Obra</Badge>}
                                        {t.prazo_dias_padrao && <span className="text-gray-400 whitespace-nowrap">{t.prazo_dias_padrao}d</span>}
                                    </div>
                                    {t.frente && <p className="text-gray-400 text-[10px] truncate">{t.frente}</p>}
                                    {t.item_contrato && <p className="text-indigo-500 text-[10px]">{t.item_contrato}</p>}
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2 pt-1">
                            <Button
                                size="sm"
                                className="bg-amber-600 hover:bg-amber-700 text-white text-xs h-8"
                                onClick={() => uploadMutation.mutate(parsedFile)}
                                disabled={uploadMutation.isPending}
                            >
                                {uploadMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Upload className="h-3.5 w-3.5 mr-1" />}
                                Confirmar Importação
                            </Button>
                            <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs h-8 text-gray-500"
                                onClick={() => { setPreview(null); setParsedFile(null); }}
                            >
                                Cancelar
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Lista atual de tipos */}
            <div className="space-y-1">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5" /> Tipos Cadastrados ({tipos.length})
                </p>
                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
                    </div>
                ) : tipos.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <FileSpreadsheet className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-400">Nenhum tipo cadastrado.</p>
                        <p className="text-xs text-gray-400 mt-0.5">Baixe o template, preencha e faça o upload.</p>
                    </div>
                ) : (
                    <div className="space-y-1.5">
                        {tipos.map((t, i) => (
                            <div key={t.id ?? i} className="bg-white rounded-xl border border-gray-200 px-3 py-2.5 shadow-sm space-y-1">
                                <div className="flex items-center gap-3">
                                    <p className="text-sm font-medium text-gray-800 flex-1 truncate">{t.descricao || t.nome}</p>
                                    {t.gera_nc && (
                                        <Badge className="text-[10px] py-0 h-5 bg-rose-50 text-rose-600 border border-rose-200 flex-shrink-0">
                                            NC
                                        </Badge>
                                    )}
                                    {t.etapas_obra && (
                                        <Badge className="text-[10px] py-0 h-5 bg-amber-50 text-amber-600 border border-amber-200 flex-shrink-0">
                                            Obra
                                        </Badge>
                                    )}
                                    {t.prazo_dias_padrao && (
                                        <span className="text-[10px] text-gray-400 flex-shrink-0">{t.prazo_dias_padrao}d</span>
                                    )}
                                </div>
                                {t.frente && (
                                    <p className="text-[10px] text-gray-400 truncate">{t.frente}</p>
                                )}
                                {t.item_contrato && (
                                    <p className="text-[11px] text-indigo-500 truncate">{t.item_contrato}</p>
                                )}
                                {t.nao_atendimento && (
                                    <p className="text-[10px] text-amber-600 line-clamp-2 leading-relaxed">{t.nao_atendimento}</p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

// --- Aba: KML por Rodovia ---
function TabKML() {
    const queryClient = useQueryClient();
    const [kmlStatus, setKmlStatus] = useState({}); // { [contratoId]: {type, message} }
    const fileInputRefs = useRef({});

    const { data: contratos = [], isLoading } = useQuery({
        queryKey: ['contratos'],
        queryFn: () => Repository.listContratos()
    });

    const uploadKMLMutation = useMutation({
        mutationFn: async ({ contratoId, kmlText, rodovia }) => {
            const kmPoints = parseKMLKmPoints(kmlText);
            if (!kmPoints || kmPoints.length === 0) {
                throw new Error('KML inválido ou sem pontos de KM. O arquivo deve conter Placemarks do tipo Point com campo "km".');
            }
            await Repository.uploadKMLForContrato(contratoId, kmlText, rodovia, kmPoints);
            return kmPoints.length;
        },
        onSuccess: (numPoints, vars) => {
            queryClient.invalidateQueries({ queryKey: ['contratos'] });
            setKmlStatus(prev => ({
                ...prev,
                [vars.contratoId]: { type: 'success', message: `KML válido — ${numPoints} marcadores KM carregados.` }
            }));
        },
        onError: (err, vars) => {
            setKmlStatus(prev => ({
                ...prev,
                [vars.contratoId]: { type: 'error', message: err.message }
            }));
        }
    });

    const handleKMLSelect = async (e, contrato) => {
        const file = e.target.files[0];
        if (!file) return;
        setKmlStatus(prev => ({ ...prev, [contrato.id]: null }));
        try {
            const kmlText = await file.text();
            uploadKMLMutation.mutate({ contratoId: contrato.id, kmlText, rodovia: contrato.rodovia });
        } catch {
            setKmlStatus(prev => ({ ...prev, [contrato.id]: { type: 'error', message: 'Falha ao ler o arquivo KML.' } }));
        }
        e.target.value = '';
    };

    return (
        <div className="space-y-4">
            {isLoading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 text-indigo-500 animate-spin" />
                </div>
            ) : contratos.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <Route className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Nenhum contrato/rodovia cadastrado.</p>
                    <Link to={createPageUrl('Contratos')} className="text-xs text-indigo-500 hover:underline mt-1 block">
                        Ir para Contratos →
                    </Link>
                </div>
            ) : (
                <div className="space-y-3">
                    {contratos.map(c => {
                        const status = kmlStatus[c.id];
                        const isUploading = uploadKMLMutation.isPending && uploadKMLMutation.variables?.contratoId === c.id;
                        const hasKML = !!c.kml_url;

                        return (
                            <Card key={c.id} className="border border-gray-200 shadow-sm">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <Route className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                                                <p className="font-semibold text-gray-800 text-sm">{c.rodovia}</p>
                                                {hasKML ? (
                                                    <Badge className="text-[10px] py-0 h-4 bg-emerald-50 text-emerald-600 border border-emerald-200">KML ✓</Badge>
                                                ) : (
                                                    <Badge className="text-[10px] py-0 h-4 bg-amber-50 text-amber-600 border border-amber-200">Sem KML</Badge>
                                                )}
                                            </div>
                                            <p className="text-xs text-gray-400 mt-0.5 ml-6">Contrato nº {c.numero_contrato}</p>
                                            {hasKML && (
                                                <p className="text-[10px] text-gray-400 mt-1 ml-6 font-mono truncate">{c.kml_url}</p>
                                            )}
                                        </div>

                                        <div className="flex-shrink-0">
                                            <Button
                                                size="sm"
                                                variant={hasKML ? 'outline' : 'default'}
                                                className={`text-xs h-8 gap-1.5 ${hasKML ? 'border-indigo-200 text-indigo-700 hover:bg-indigo-50' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                                                onClick={() => fileInputRefs.current[c.id]?.click()}
                                                disabled={isUploading}
                                            >
                                                {isUploading ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <Upload className="h-3.5 w-3.5" />
                                                )}
                                                {hasKML ? 'Substituir KML' : 'Enviar KML'}
                                            </Button>
                                            <input
                                                type="file"
                                                accept=".kml,.xml"
                                                className="hidden"
                                                ref={el => fileInputRefs.current[c.id] = el}
                                                onChange={(e) => handleKMLSelect(e, c)}
                                            />
                                        </div>
                                    </div>

                                    {status && (
                                        <div className={`mt-2.5 flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-lg ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                                            {status.type === 'success' ? <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />}
                                            {status.message}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// --- Página Principal ---
export default function ConfiguracoesDTR() {
    const [tab, setTab] = useState('tipos');

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-between">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-950 text-white shadow-md">
                <div className="max-w-2xl mx-auto px-4 py-5 flex items-center gap-3">
                    <Link to={createPageUrl('Contratos')}>
                        <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full">
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-lg font-bold">Configurações DTR</h1>
                        <p className="text-blue-200 text-xs">Tipos de ocorrência e traçado KML por rodovia</p>
                    </div>
                </div>
            </div>

            {/* Tab bar */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-2xl mx-auto px-4 flex gap-0">
                    <button
                        onClick={() => setTab('tipos')}
                        className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${tab === 'tipos' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <FileSpreadsheet className="h-4 w-4" /> Tipos de Ocorrência
                    </button>
                    <button
                        onClick={() => setTab('kml')}
                        className={`flex items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-colors ${tab === 'kml' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                    >
                        <Map className="h-4 w-4" /> Rodovias & KML
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 max-w-2xl w-full mx-auto px-4 py-5">
                {tab === 'tipos' ? <TabTipos /> : <TabKML />}
            </div>

            {/* Footer */}
            <div className="py-4 text-center text-xs text-gray-400 border-t border-gray-200 bg-white">
                AGEMS — Configurações do Módulo DTR
            </div>
        </div>
    );
}
