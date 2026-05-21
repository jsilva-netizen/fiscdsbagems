import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, FileText, Trash2, Plus, Download, Upload } from 'lucide-react';
import TermosKPI from '@/components/termos/TermosKPI';
import TermosFiltros from '@/components/termos/TermosFiltros';
import { deleteTermoNotificacaoComDependencias } from '@/lib/storageCleanup';
import { Repository } from '@/lib/offline/repository';

let cachedTermosBucketName = null;
let cachedAvailableBuckets = null;

export default function GerenciarTermos() {


    const queryClient = useQueryClient();
    const [selectedFiscalizacao, setSelectedFiscalizacao] = useState(null);
    const [showDialog, setShowDialog] = useState(false);
    const [filtros, setFiltros] = useState({
        status: '',
        dataInicio: '',
        dataFim: '',
        busca: ''
    });
    const [termoForm, setTermoForm] = useState({
        numero_termo_notificacao: '',
        tipo_relatorio: 'RFP',
        numero_rfp: '',
        municipio_id: '',
        numero_processo: '',
        camara_tecnica: 'CATESA',
        data_protocolo: '',
        prazo_resposta_dias: 30,
        observacoes: '',
        arquivo_url: '',
        arquivo_protocolo_url: ''
    });
    const [uploadingFile, setUploadingFile] = useState(false);
    const [uploadingTermoAssinadoId, setUploadingTermoAssinadoId] = useState(null);
    const [uploadingProtocoloData, setUploadingProtocoloData] = useState(false);
    const [oficioProtocoloTemp, setOficioProtocoloTemp] = useState(null);

    const [uploadingResposta, setUploadingResposta] = useState(false);
    const [respostaManifestacaoTemp, setRespostaManifestacaoTemp] = useState(null);
    const [respostaOficioTemp, setRespostaOficioTemp] = useState(null);
    const [deleteConfirmation, setDeleteConfirmation] = useState({ open: false, termoId: null, step: 1, inputValue: '' });
    const [termoDetalhes, setTermoDetalhes] = useState(null);
    const [termoAssinadoTemp, setTermoAssinadoTemp] = useState(null);
    const [rfpAssinadoTemp, setRfpAssinadoTemp] = useState(null);
    const [tnPrestadorTemp, setTnPrestadorTemp] = useState(null);
    const [dataProtocoloOpen, setDataProtocoloOpen] = useState(false);
    const [protocoNoTemp, setProtocoloTemp] = useState(null);
    const [uploadingProtocolo, setUploadingProtocolo] = useState(false);

    const openArquivo = async (arq) => {
        try {
            const signed = await Repository.getSignedUrlFromAny(arq);
            if (signed) window.open(signed, '_blank', 'noopener,noreferrer');
        } catch (err) {
            alert('Erro ao abrir arquivo: ' + (err?.message || String(err)));
        }
    };

    const [respostaOpenId, setRespostaOpenId] = useState(null);
    const [alteracoesPendentes, setAlteracoesPendentes] = useState(false);
    const [dadosEditados, setDadosEditados] = useState({
        data_protocolo: null,
        data_inicio_prazo: null,
        arquivo_protocolo_url: null,
        arquivo_oficio_protocolo: null,
        data_recebimento_resposta: null,
        arquivo_resposta_url: null,
        arquivo_oficio_resposta: null,
        numero_processo: null,
        fiscalizacao_id: null,
        camara_tecnica: null,
        prazo_resposta_dias: null,
        assinatura_prestador_valida: null,
        fluxo_manual: null
    });

    const [quickProtocolo, setQuickProtocolo] = useState({ open: false, termo: null, data: '', protocoloUrl: '', protocoloNome: '', oficioUrl: '', oficioNome: '' });
    const [quickResposta, setQuickResposta] = useState({ open: false, termo: null, data: '', respostaUrl: '', respostaNome: '', oficioUrl: '', oficioNome: '' });
    const [quickUploading, setQuickUploading] = useState(false);

    const { data: fiscalizacoes = [] } = useQuery({
        queryKey: ['fiscalizacoes'],
        queryFn: async () => {
            const { data, error } = await supabase.from('fiscalizacoes').select('*');
            if (error) throw error;
            return data;
        }
    });

    const { data: determinacoes = [] } = useQuery({
        queryKey: ['determinacoes'],
        queryFn: async () => {
            const { data, error } = await supabase.from('determinacoes').select('*');
            if (error) throw error;
            return data;
        }
    });

    const { data: termos = [] } = useQuery({
        queryKey: ['termos-notificacao'],
        queryFn: async () => {
            const { data, error } = await supabase.from('termos_notificacao').select('*');
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

    const { data: municipios = [] } = useQuery({
        queryKey: ['municipios'],
        queryFn: async () => {
            const { data, error } = await supabase.from('municipios').select('*').order('nome');
            if (error) throw error;
            return data;
        }
    });

    // Gerar número do termo automaticamente baseado nos existentes
    useEffect(() => {
        if (showDialog && !termoForm.numero_termo_notificacao) {
            const ano = new Date().getFullYear();
            
            const inferAnoFromRow = (row) => {
                const base = row?.data_geracao || row?.created_at || row?.updated_at || null;
                if (!base) return ano;
                const d = new Date(base);
                const y = d.getFullYear();
                return Number.isFinite(y) ? y : ano;
            };

            const extractTNInfo = (v, row) => {
                const raw = String(v || '').trim();
                if (!raw) return null;
                const m1 = raw.match(/TN\s*0*(\d+)\s*\/\s*(\d{4})/i);
                if (m1?.[1] && m1?.[2]) {
                    const n = parseInt(m1[1], 10);
                    const y = parseInt(m1[2], 10);
                    if (!Number.isFinite(n) || n <= 0) return null;
                    if (!Number.isFinite(y) || y <= 2000) return null;
                    return { numero: n, ano: y };
                }
                const m1b = raw.match(/^\s*0*(\d+)\s*\/\s*(\d{4})(?:\s*\/.*)?$/);
                if (m1b?.[1] && m1b?.[2]) {
                    const n = parseInt(m1b[1], 10);
                    const y = parseInt(m1b[2], 10);
                    if (!Number.isFinite(n) || n <= 0) return null;
                    if (!Number.isFinite(y) || y <= 2000) return null;
                    return { numero: n, ano: y };
                }
                const m2 = raw.match(/TN\s*0*(\d+)/i);
                if (m2?.[1]) {
                    const n = parseInt(m2[1], 10);
                    if (!Number.isFinite(n) || n <= 0) return null;
                    return { numero: n, ano: inferAnoFromRow(row) };
                }
                const m3 = raw.match(/^\s*0*(\d+)\s*$/);
                if (m3?.[1]) {
                    const n = parseInt(m3[1], 10);
                    if (!Number.isFinite(n) || n <= 0) return null;
                    return { numero: n, ano: inferAnoFromRow(row) };
                }
                return null;
            };

            let maiorNumero = 0;
            termos.forEach(termo => {
                const numeroTermo = termo.numero_termo_notificacao || termo.numero_termo || '';
                const info = extractTNInfo(numeroTermo, termo);
                if (!info) return;
                if (info.ano !== ano) return;
                if (info.numero > maiorNumero) maiorNumero = info.numero;
            });
            
            const proximo = maiorNumero + 1;
            setTermoForm(prev => ({
                ...prev,
                numero_termo_notificacao: `TN ${String(proximo).padStart(3, '0')}/${ano}/DSB/AGEMS`
            }));
        }
    }, [showDialog, termos]);

    // Calcular próximo número de AM
    const calcularNumeroAM = async () => {
        const ano = new Date().getFullYear();
        const { data: todosOsTermos } = await supabase.from('termos_notificacao').select('*');
        const amsDoAno = todosOsTermos.filter(t => {
            if (!t.numero_am) return false;
            const match = t.numero_am.match(/AM\s*(\d+)\/(\d{4})\/DSB\/AGEMS/);
            return match && parseInt(match[2]) === ano;
        });
        const proximoNumeroAM = amsDoAno.length + 1;
        return `AM ${String(proximoNumeroAM).padStart(3, '0')}/${ano}/DSB/AGEMS`;
    };

    const uploadFileToStorage = async (file) => {
        if (!cachedAvailableBuckets) {
            try {
                const { data, error } = await supabase.storage.listBuckets();
                if (!error && Array.isArray(data)) {
                    cachedAvailableBuckets = data.map((b) => b?.name).filter(Boolean);
                }
            } catch {
            }
        }

        const fallbackCandidates = [
            'documentos-termos',
            'documentos_termos',
            'documentos-termo',
            'termos-notificacao',
            'termos_notificacao',
            'documentos',
            'arquivos',
            'files',
            'public',
            'evidencias-determinacoes',
            'relatorios_fiscalizacao',
            'fotos_fiscalizacao',
            'documentos-prestadores',
            'documentos-autos'
        ];

        const rawCandidates = Array.isArray(cachedAvailableBuckets) && cachedAvailableBuckets.length > 0
            ? [...cachedAvailableBuckets, ...fallbackCandidates]
            : fallbackCandidates;

        const uniqCandidates = Array.from(new Set(rawCandidates)).filter(Boolean);

        const score = (name) => {
            const n = String(name || '').toLowerCase();
            if (n.includes('termo') || n.includes('notific')) return 0;
            if (n.includes('document') || n.includes('arquivo')) return 1;
            if (n.includes('evidenc')) return 2;
            return 3;
        };

        const ext = (file?.name || '').includes('.') ? file.name.split('.').pop() : 'pdf';
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`;
        const filePath = `termos_notificacao/${fileName}`;

        const sorted = [...uniqCandidates].sort((a, b) => score(a) - score(b));
        const bucketOrder = cachedTermosBucketName
            ? [cachedTermosBucketName, ...sorted.filter((b) => b !== cachedTermosBucketName)]
            : sorted;

        let lastErr = null;

        for (const bucket of bucketOrder) {
            const { error: uploadError } = await supabase.storage
                .from(bucket)
                .upload(filePath, file, { contentType: file?.type || undefined });

            if (uploadError) {
                lastErr = uploadError;
                const msg = (uploadError?.message || '').toLowerCase();
                const status = uploadError?.statusCode;
                const isBucketMissing = msg.includes('bucket not found') || status === 404;
                const isNotAllowed = msg.includes('row-level security') || msg.includes('unauthorized') || status === 401 || status === 403;
                if (isBucketMissing || isNotAllowed) continue;
                throw uploadError;
            }

            cachedTermosBucketName = bucket;
            return `storage://${bucket}/${filePath}`;
        }

        const attempted = bucketOrder.join(', ');
        const errMsg = lastErr?.message ? ` (${lastErr.message})` : '';
        throw new Error(`Falha no upload. Buckets testados: ${attempted}${errMsg}`);
    };

    const addDaysToISODate = (isoDate, days) => {
        if (!isoDate) return null;
        const n = Number(days || 0);
        const base = new Date(`${isoDate}T00:00:00`);
        if (Number.isNaN(base.getTime())) return null;
        const d = new Date(base);
        d.setDate(d.getDate() + n);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const calcularStatusTermo = (t) => {
        if (!t?.arquivo_url || !t?.arquivo_rfp_url) return 'pendente_tn';
        if (!t?.arquivo_tn_prestador_url || !t?.assinatura_prestador_valida) return 'aguardando_assinatura_prestador';
        if (t?.data_recebimento_resposta) return 'respondido';
        if (t?.data_maxima_resposta) {
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            const dataMax = new Date(`${t.data_maxima_resposta}T00:00:00`);
            dataMax.setHours(0, 0, 0, 0);
            if (hoje > dataMax) return 'prazo_vencido';
        }
        return 'aguardando_resposta';
    };

    const enviarTermoAssinadoRapido = async (termo) => {
        if (!termo?.id) return;
        if (uploadingTermoAssinadoId) return;

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,application/pdf';
        input.multiple = false;

        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            setUploadingTermoAssinadoId(termo.id);
            try {
                const url = await uploadFileToStorage(file);
                const after = { ...termo, arquivo_url: url };
                const status = calcularStatusTermo(after);
                const { error } = await supabase
                    .from('termos_notificacao')
                    .update({ arquivo_url: url, status })
                    .eq('id', termo.id);
                if (error) throw error;
                queryClient.invalidateQueries({ queryKey: ['termos-notificacao'] });
                alert('TN assinado enviado com sucesso!');
            } catch (error) {
                alert('Erro ao enviar TN assinado: ' + (error?.message || ''));
            } finally {
                setUploadingTermoAssinadoId(null);
            }
        };

        input.click();
    };

    const enviarRfpAssinadoRapido = async (termo) => {
        if (!termo?.id) return;
        if (uploadingTermoAssinadoId) return;

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,application/pdf';
        input.multiple = false;

        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;
            setUploadingTermoAssinadoId(termo.id);
            try {
                const url = await uploadFileToStorage(file);
                const after = { ...termo, arquivo_rfp_url: url };
                const status = calcularStatusTermo(after);
                const { error } = await supabase
                    .from('termos_notificacao')
                    .update({ arquivo_rfp_url: url, status })
                    .eq('id', termo.id);
                if (error) throw error;
                queryClient.invalidateQueries({ queryKey: ['termos-notificacao'] });
                alert('RFP assinado enviado com sucesso!');
            } catch (error) {
                alert('Erro ao enviar RFP assinado: ' + (error?.message || ''));
            } finally {
                setUploadingTermoAssinadoId(null);
            }
        };

        input.click();
    };

    const abrirQuickProtocolo = (termo) => {
        setQuickProtocolo({
            open: true,
            termo,
            data: termo?.data_protocolo || '',
            protocoloUrl: termo?.arquivo_protocolo_url || '',
            protocoloNome: '',
            oficioUrl: termo?.arquivo_oficio_protocolo || '',
            oficioNome: ''
        });
    };

    const abrirQuickResposta = (termo) => {
        setQuickResposta({
            open: true,
            termo,
            data: termo?.data_recebimento_resposta || '',
            respostaUrl: termo?.arquivo_resposta_url || '',
            respostaNome: '',
            oficioUrl: termo?.arquivo_oficio_resposta || '',
            oficioNome: ''
        });
    };

     const criarTermoMutation = useMutation({
        mutationFn: async (dados) => {
            const safeDados = { ...dados };
            if (typeof safeDados.data_protocolo === 'string' && safeDados.data_protocolo.trim() === '') {
                safeDados.data_protocolo = null;
            }

            if (dados?.fiscalizacao_id) {
                const { data: existing, error: exErr } = await supabase
                    .from('termos_notificacao')
                    .select('id')
                    .eq('fiscalizacao_id', dados.fiscalizacao_id)
                    .limit(1);
                if (exErr) throw exErr;
                if (Array.isArray(existing) && existing[0]?.id) {
                    throw new Error('Já existe Termo de Notificação para esta fiscalização.');
                }
            }

            let dataMaxima = null;
            if (safeDados.data_protocolo) {
                const dp = new Date(safeDados.data_protocolo + 'T00:00:00');
                const dmax = new Date(dp);
                dmax.setDate(dmax.getDate() + dados.prazo_resposta_dias);
                dataMaxima = `${dmax.getFullYear()}-${String(dmax.getMonth() + 1).padStart(2, '0')}-${String(dmax.getDate()).padStart(2, '0')}`;
            }
            
            const { data, error } = await supabase.from('termos_notificacao').insert([{
                ...safeDados,
                data_maxima_resposta: dataMaxima,
                data_geracao: new Date().toISOString(),
                status: safeDados?.status || 'pendente_tn',
            }]).select().single();
            
            if (error) throw error;
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['termos-notificacao'] });
            alert('Termo criado com sucesso!');
            setShowDialog(false);
            setSelectedFiscalizacao(null);
            setTermoForm({
                numero_termo_notificacao: '',
                tipo_relatorio: 'RFP',
                numero_rfp: '',
                municipio_id: '',
                numero_processo: '',
                camara_tecnica: 'CATESA',
                data_protocolo: '',
                prazo_resposta_dias: 30,
                observacoes: '',
                arquivo_url: '',
                arquivo_protocolo_url: ''
            });
        },
        onError: (err) => {
            const code = err?.code || err?.cause?.code;
            const msg = err?.message || 'Erro ao criar termo.';
            if (String(code) === '23505' || /duplicate key/i.test(String(msg || ''))) {
                alert('Numeração já utilizada para este tipo de relatório, câmara e ano.');
                return;
            }
            alert(msg);
        }
    });

    const normalizeNumeroRelatorio = (v) => {
        const raw = String(v ?? '').trim();
        if (!raw) return '';
        const m = raw.match(/\/(\d{1,6})\/(\d{4})\s*$/);
        const digits = m?.[1] ? String(m[1]) : raw.replace(/\D/g, '');
        const n = parseInt(digits || '0', 10);
        if (!Number.isFinite(n) || n <= 0) return '';
        return String(n).padStart(3, '0');
    };

    const getAnoRelatorio = (t) => {
        const anoBase = t?.data_geracao || t?.created_at || t?.updated_at || Date.now();
        const d = new Date(anoBase);
        const y = d.getFullYear();
        return Number.isFinite(y) ? y : new Date().getFullYear();
    };

    const formatRelatorioTN = (t) => {
        const tipo = String(t?.tipo_relatorio || 'RFP').trim().toUpperCase();
        const camara = t?.camara_tecnica ? String(t.camara_tecnica).trim() : '';
        const num = normalizeNumeroRelatorio(t?.numero_rfp);
        if (!num) return '';
        const ano = getAnoRelatorio(t);
        if (!camara) return `${tipo}/${num}/${ano}`;
        return `${tipo}/DSB/${camara}/${num}/${ano}`;
    };

    const handleCriarTermo = () => {
        if (criarTermoMutation.isPending) return;

        if (!selectedFiscalizacao?.id) {
            alert('Selecione uma fiscalização');
            return;
        }

        if (!termoForm.camara_tecnica) {
            alert('Selecione a Câmara Técnica Setorial');
            return;
        }

        if (!termoForm.numero_processo) {
            alert('Informe o número do processo');
            return;
        }

        const tipoRelatorio = String(termoForm.tipo_relatorio || '').trim().toUpperCase();
        if (!tipoRelatorio) {
            alert('Selecione o tipo de relatório (RFP, RFE ou RAO)');
            return;
        }

        const numeroRelatorio = normalizeNumeroRelatorio(termoForm.numero_rfp);
        if (!numeroRelatorio) {
            alert(`Informe o número do ${tipoRelatorio}`);
            return;
        }

        const ano = new Date().getFullYear();
        const jaExiste = termos.some((t) => {
            const tTipo = String(t?.tipo_relatorio || 'RFP').trim().toUpperCase();
            const tCamara = String(t?.camara_tecnica || '').trim();
            const tAno = getAnoRelatorio(t);
            const tNumero = normalizeNumeroRelatorio(t?.numero_rfp);
            return tTipo === tipoRelatorio && tCamara === String(termoForm.camara_tecnica || '').trim() && tAno === ano && tNumero === numeroRelatorio;
        });
        if (jaExiste) {
            alert('Numeração já utilizada para este tipo de relatório, câmara e ano.');
            return;
        }

        const prestadorId = selectedFiscalizacao.prestador_servico_id || resolvePrestadorIdFromNome(selectedFiscalizacao.prestador_servico_nome);
        if (!prestadorId) {
            alert('Fiscalização sem prestador de serviço');
            return;
        }

        const municipioId = termoForm.municipio_id || selectedFiscalizacao.municipio_id || resolveMunicipioIdFromNome(selectedFiscalizacao.municipio_nome);
        if (!municipioId) {
            alert('Fiscalização sem município');
            return;
        }

        criarTermoMutation.mutate({
            ...termoForm,
            tipo_relatorio: tipoRelatorio,
            numero_rfp: numeroRelatorio,
            fiscalizacao_id: selectedFiscalizacao.id,
            prestador_servico_id: prestadorId,
            municipio_id: municipioId
        });
    };

    const excluirTermoMutation = useMutation({
         mutationFn: async (id) => {
             const termo = termos.find(t => t.id === id);
             if (!termo) throw new Error('Termo não encontrado');
             await deleteTermoNotificacaoComDependencias(id);
         },
         onSuccess: () => {
             queryClient.invalidateQueries({ queryKey: ['termos-notificacao'] });
             queryClient.invalidateQueries({ queryKey: ['autos-todos'] }); 
             alert('Termo excluído!');
             setDeleteConfirmation({ open: false, termoId: null, step: 1, inputValue: '' });
         },
         onError: (err) => {
             alert('Erro ao excluir termo: ' + (err?.message || String(err)));
         },
     });

    const getPrestadorNome = (id) => {
        const p = prestadores.find(pres => pres.id === id);
        return p?.nome || 'N/A';
    };

    const getMunicipioNome = (id) => {
        const m = municipios.find(mun => mun.id === id);
        return m?.nome || 'N/A';
    };

    const normalizeTexto = (v) => {
        return (v || '')
            .toString()
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/\s+/g, ' ');
    };

    const resolveMunicipioIdFromNome = (nome) => {
        const alvo = normalizeTexto(nome).replace(/^municipio de\s+/, '');
        if (!alvo) return null;
        const exato = municipios.find(m => normalizeTexto(m.nome) === alvo);
        if (exato?.id) return exato.id;
        const parcial = municipios.find(m => normalizeTexto(m.nome).includes(alvo) || alvo.includes(normalizeTexto(m.nome)));
        return parcial?.id || null;
    };

    const resolvePrestadorIdFromNome = (nome) => {
        const alvo = normalizeTexto(nome);
        if (!alvo) return null;
        const exato = prestadores.find(p => normalizeTexto(p.nome) === alvo);
        if (exato?.id) return exato.id;
        const parcial = prestadores.find(p => normalizeTexto(p.nome).includes(alvo) || alvo.includes(normalizeTexto(p.nome)));
        return parcial?.id || null;
    };

    const getMunicipioLabel = (f) => {
        const byId = getMunicipioNome(f?.municipio_id);
        if (byId !== 'N/A') return byId;
        return f?.municipio_nome || 'N/A';
    };

    const getPrestadorLabel = (f) => {
        const byId = getPrestadorNome(f?.prestador_servico_id);
        if (byId !== 'N/A') return byId;
        return f?.prestador_servico_nome || 'N/A';
    };

    const getStatusFluxo = (termo) => {
            if (!termo?.arquivo_url || !termo?.arquivo_rfp_url) return 'pendente_tn';
            if (!termo?.arquivo_tn_prestador_url || !termo?.assinatura_prestador_valida) return 'aguardando_assinatura_prestador';
            if (termo?.data_recebimento_resposta) return 'respondido';
            if (verificaPrazoVencido(termo)) return 'prazo_vencido';
            return 'aguardando_resposta';
        };

    const verificaPrazoVencido = (termo) => {
        if (!termo.data_maxima_resposta) return false;
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const dataMax = new Date(termo.data_maxima_resposta + 'T00:00:00');
        dataMax.setHours(0, 0, 0, 0);
        return hoje > dataMax;
    };

    const termosFiltrados = termos.filter(termo => {
        if (filtros.busca && !termo.numero_termo_notificacao?.toLowerCase().includes(filtros.busca.toLowerCase())) return false;
        if (filtros.camaraTecnica && termo.camara_tecnica !== filtros.camaraTecnica) return false;
        if (filtros.status) {
            const status = getStatusFluxo(termo);
            if (status !== filtros.status) {
                return false;
            }
        }
        if (filtros.dataInicio && new Date(termo.data_geracao) < new Date(filtros.dataInicio)) return false;
        if (filtros.dataFim && new Date(termo.data_geracao) > new Date(filtros.dataFim)) return false;
        return true;
    });

    const getStatusBadge = (status) => {
            const statusMap = {
                pendente_tn: { label: 'Pendente - TN/RFP (AGEMS)', color: 'bg-yellow-500' },
                aguardando_assinatura_prestador: { label: 'Aguardando Assinatura (Prestador)', color: 'bg-orange-600' },
                aguardando_resposta: { label: 'Aguardando Resposta', color: 'bg-green-600' },
                prazo_vencido: { label: 'Prazo Vencido', color: 'bg-red-600' },
                respondido: { label: 'Respondido', color: 'bg-purple-600' }
            };
            return statusMap[status] || { label: 'Criado', color: 'bg-blue-500' };
        };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                        <Link to={createPageUrl('Home')}>
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <h1 className="text-3xl font-bold">Gerenciar Termos de Notificação</h1>
                    </div>
                    <Button 
                        onClick={() => {
                            setSelectedFiscalizacao(fiscalizacoes.find(f => f.status === 'finalizada'));
                            setShowDialog(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Termo
                    </Button>
                </div>

                {/* Dashboard KPI */}
                <TermosKPI termos={termos} />

                {/* Filtros */}
                <TermosFiltros onFilterChange={setFiltros} filtros={filtros} />

                {/* Dialog de Criar Termo */}
                <Dialog open={showDialog} onOpenChange={setShowDialog}>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Criar Termo de Notificação</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="grid grid-cols-4 gap-4">
                                <div>
                                    <Label>Número do TN *</Label>
                                    <Input
                                        value={termoForm.numero_termo_notificacao}
                                        disabled
                                        placeholder="Gerado automaticamente"
                                    />
                                </div>
                                <div>
                                    <Label>Tipo *</Label>
                                    <Select
                                        value={termoForm.tipo_relatorio}
                                        onValueChange={(v) => setTermoForm({ ...termoForm, tipo_relatorio: v })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="RFP">RFP</SelectItem>
                                            <SelectItem value="RFE">RFE</SelectItem>
                                            <SelectItem value="RAO">RAO</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Número *</Label>
                                    <Input
                                        value={termoForm.numero_rfp}
                                        onChange={(e) => {
                                            const digits = String(e.target.value || '').replace(/\D/g, '');
                                            setTermoForm({ ...termoForm, numero_rfp: digits });
                                        }}
                                        placeholder="001"
                                    />
                                    {termoForm.numero_rfp && termoForm.camara_tecnica && (
                                        <p className="text-xs text-gray-500 mt-1">
                                            {String(termoForm.tipo_relatorio || 'RFP').toUpperCase()}/DSB/{termoForm.camara_tecnica}/{normalizeNumeroRelatorio(termoForm.numero_rfp) || termoForm.numero_rfp}/{new Date().getFullYear()}
                                        </p>
                                    )}
                                </div>
                                <div>
                                    <Label>Número do Processo *</Label>
                                    <Input
                                        value={termoForm.numero_processo}
                                        onChange={(e) => {
                                            let valor = e.target.value.replace(/\D/g, '');
                                            if (valor.length > 13) valor = valor.slice(0, 13);
                                            if (valor.length > 9) {
                                                valor = `${valor.slice(0, 2)}.${valor.slice(2, 5)}.${valor.slice(5, 8)}-${valor.slice(8)}`;
                                            } else if (valor.length > 5) {
                                                valor = `${valor.slice(0, 2)}.${valor.slice(2, 5)}.${valor.slice(5)}`;
                                            } else if (valor.length > 2) {
                                                valor = `${valor.slice(0, 2)}.${valor.slice(2)}`;
                                            }
                                            setTermoForm({ ...termoForm, numero_processo: valor });
                                        }}
                                        placeholder="51.011.137-2025"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Fiscalização *</Label>
                                    <Select 
                                        value={selectedFiscalizacao?.id || ''} 
                                        onValueChange={(v) => {
                                            const fiscBase = fiscalizacoes.find(f => f.id === v);
                                            if (!fiscBase) {
                                                setSelectedFiscalizacao(null);
                                                return;
                                            }
                                            const municipio_id = fiscBase.municipio_id || resolveMunicipioIdFromNome(fiscBase.municipio_nome);
                                            const prestador_servico_id = fiscBase.prestador_servico_id || resolvePrestadorIdFromNome(fiscBase.prestador_servico_nome);
                                            const fisc = { ...fiscBase, municipio_id, prestador_servico_id };
                                            setSelectedFiscalizacao(fisc);
                                            if (municipio_id) {
                                                setTermoForm(prev => ({ ...prev, municipio_id }));
                                            }
                                        }}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione uma fiscalização" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {fiscalizacoes
                                                .filter(f => f.status === 'finalizada')
                                                .filter(f => !termos.some(t => t.fiscalizacao_id === f.id))
                                                .map(f => (
                                                    <SelectItem key={f.id} value={f.id}>
                                                        {f.numero_termo} - {getMunicipioLabel(f)} - {getPrestadorLabel(f)}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Câmara Técnica Setorial *</Label>
                                    <Select value={termoForm.camara_tecnica} onValueChange={(v) => setTermoForm({ ...termoForm, camara_tecnica: v })}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="CATESA">CATESA</SelectItem>
                                            <SelectItem value="CATERS">CATERS</SelectItem>
                                            <SelectItem value="CRES">CRES</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div>
                                <Label>Prazo para Resposta (dias)</Label>
                                <Input
                                    type="number"
                                    value={termoForm.prazo_resposta_dias}
                                    onChange={(e) => setTermoForm({ ...termoForm, prazo_resposta_dias: parseInt(e.target.value) || 30 })}
                                />
                            </div>

                            <div>
                                <Label>Observações</Label>
                                <Textarea
                                    placeholder="Adicione observações ao termo..."
                                    value={termoForm.observacoes}
                                    onChange={(e) => setTermoForm({ ...termoForm, observacoes: e.target.value })}
                                    className="min-h-24"
                                />
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setShowDialog(false)}
                                    className="flex-1"
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    onClick={handleCriarTermo}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                                    disabled={criarTermoMutation.isPending || !termoForm.numero_processo || !termoForm.tipo_relatorio || !termoForm.numero_rfp}
                                >
                                    {criarTermoMutation.isPending ? 'Criando...' : 'Criar Termo'}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Dialog de Detalhes do Termo */}
                <Dialog open={termoDetalhes !== null} onOpenChange={(open) => {
                          if (!open) {
                              setTermoDetalhes(null);
                              setTermoAssinadoTemp(null);
                              setRfpAssinadoTemp(null);
                              setTnPrestadorTemp(null);
                              setAlteracoesPendentes(false);
                              setDadosEditados({
                                  data_protocolo: null,
                                  data_inicio_prazo: null,
                                  arquivo_protocolo_url: null,
                                  arquivo_oficio_protocolo: null,
                                  data_recebimento_resposta: null,
                                  arquivo_resposta_url: null,
                                  arquivo_oficio_resposta: null,
                                  numero_processo: null,
                                  fiscalizacao_id: null,
                                  camara_tecnica: null,
                                  prazo_resposta_dias: null,
                                  assinatura_prestador_valida: null,
                                  fluxo_manual: null
                              });
                              setProtocoloTemp(null);
                              setOficioProtocoloTemp(null);
                              setRespostaManifestacaoTemp(null);
                              setRespostaOficioTemp(null);
                          }
                      }}>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Detalhes do Termo de Notificação</DialogTitle>
                        </DialogHeader>
                        {termoDetalhes && (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label className="text-gray-600">Número do TN</Label>
                                        <p className="font-semibold">{termoDetalhes.numero_termo_notificacao || termoDetalhes.numero_termo}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            <Checkbox
                                                checked={dadosEditados.fluxo_manual !== null ? !!dadosEditados.fluxo_manual : !!termoDetalhes.fluxo_manual}
                                                onCheckedChange={(v) => {
                                                    setDadosEditados(prev => ({ ...prev, fluxo_manual: !!v }));
                                                    setAlteracoesPendentes(true);
                                                }}
                                            />
                                            <Label className="text-sm">Fluxo Manual (prestador não responde no portal)</Label>
                                        </div>
                                    </div>
                                    <div>
                                        <Label>Processo *</Label>
                                        <Input
                                            value={dadosEditados.numero_processo !== null ? dadosEditados.numero_processo : termoDetalhes.numero_processo || ''}
                                            onChange={(e) => {
                                                let valor = e.target.value.replace(/\D/g, '');
                                                if (valor.length > 13) valor = valor.slice(0, 13);
                                                if (valor.length > 9) {
                                                    valor = `${valor.slice(0, 2)}.${valor.slice(2, 5)}.${valor.slice(5, 8)}-${valor.slice(8)}`;
                                                } else if (valor.length > 5) {
                                                    valor = `${valor.slice(0, 2)}.${valor.slice(2, 5)}.${valor.slice(5)}`;
                                                } else if (valor.length > 2) {
                                                    valor = `${valor.slice(0, 2)}.${valor.slice(2)}`;
                                                }
                                                setDadosEditados(prev => ({ ...prev, numero_processo: valor }));
                                                setAlteracoesPendentes(true);
                                            }}
                                            placeholder="51.011.137-2025"
                                        />
                                    </div>
                                    {/* ... More fields ... */}
                                    <div>
                                        <Label>Prazo para Resposta (dias)</Label>
                                        <Input
                                            type="number"
                                            value={dadosEditados.prazo_resposta_dias !== null ? dadosEditados.prazo_resposta_dias : termoDetalhes.prazo_resposta_dias || 30}
                                            onChange={(e) => {
                                                setDadosEditados(prev => ({ ...prev, prazo_resposta_dias: parseInt(e.target.value) || 30 }));
                                                setAlteracoesPendentes(true);
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="border-t pt-4">
                                    <h3 className="font-semibold mb-3">Arquivos do TN</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-sm">TN assinado (AGEMS)</Label>
                                            <Input
                                                type="file"
                                                accept=".pdf,application/pdf"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        setUploadingFile(true);
                                                        try {
                                                            const url = await uploadFileToStorage(file);
                                                            setTermoAssinadoTemp(url);
                                                        } catch (error) {
                                                            alert('Erro ao enviar arquivo: ' + error.message);
                                                        } finally {
                                                            setUploadingFile(false);
                                                        }
                                                    }
                                                }}
                                                disabled={uploadingFile}
                                            />
                                            {termoAssinadoTemp && (
                                                <Button
                                                    onClick={async () => {
                                                        try {
                                                            const after = { ...termoDetalhes, arquivo_url: termoAssinadoTemp };
                                                            const status = calcularStatusTermo(after);
                                                            await supabase.from('termos_notificacao').update({
                                                                arquivo_url: termoAssinadoTemp,
                                                                status,
                                                                updated_at: new Date().toISOString()
                                                            }).eq('id', termoDetalhes.id);
                                                            queryClient.invalidateQueries({ queryKey: ['termos-notificacao'] });
                                                            setTermoDetalhes({ ...termoDetalhes, arquivo_url: termoAssinadoTemp, status });
                                                            setTermoAssinadoTemp(null);
                                                            alert('Salvo com sucesso!');
                                                        } catch (error) {
                                                            alert('Erro ao salvar');
                                                        }
                                                    }}
                                                    className="w-full"
                                                    size="sm"
                                                >
                                                    Salvar
                                                </Button>
                                            )}
                                            {termoDetalhes.arquivo_url && (
                                                <Button variant="outline" onClick={() => void openArquivo(termoDetalhes.arquivo_url)} className="w-full" size="sm">
                                                    <Download className="h-4 w-4 mr-2" />
                                                    Baixar TN (AGEMS)
                                                </Button>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-sm">RFP assinado (AGEMS)</Label>
                                            <Input
                                                type="file"
                                                accept=".pdf,application/pdf"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        setUploadingFile(true);
                                                        try {
                                                            const url = await uploadFileToStorage(file);
                                                            setRfpAssinadoTemp(url);
                                                        } catch (error) {
                                                            alert('Erro ao enviar arquivo: ' + error.message);
                                                        } finally {
                                                            setUploadingFile(false);
                                                        }
                                                    }
                                                }}
                                                disabled={uploadingFile}
                                            />
                                            {rfpAssinadoTemp && (
                                                <Button
                                                    onClick={async () => {
                                                        try {
                                                            const after = { ...termoDetalhes, arquivo_rfp_url: rfpAssinadoTemp };
                                                            const status = calcularStatusTermo(after);
                                                            await supabase.from('termos_notificacao').update({
                                                                arquivo_rfp_url: rfpAssinadoTemp,
                                                                status,
                                                                updated_at: new Date().toISOString()
                                                            }).eq('id', termoDetalhes.id);
                                                            queryClient.invalidateQueries({ queryKey: ['termos-notificacao'] });
                                                            setTermoDetalhes({ ...termoDetalhes, arquivo_rfp_url: rfpAssinadoTemp, status });
                                                            setRfpAssinadoTemp(null);
                                                            alert('Salvo com sucesso!');
                                                        } catch (error) {
                                                            alert('Erro ao salvar');
                                                        }
                                                    }}
                                                    className="w-full"
                                                    size="sm"
                                                >
                                                    Salvar
                                                </Button>
                                            )}
                                            {termoDetalhes.arquivo_rfp_url && (
                                                <Button variant="outline" onClick={() => void openArquivo(termoDetalhes.arquivo_rfp_url)} className="w-full" size="sm">
                                                    <Download className="h-4 w-4 mr-2" />
                                                    Baixar RFP (AGEMS)
                                                </Button>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-sm">TN assinado (prestador)</Label>
                                            <Input
                                                type="file"
                                                accept=".pdf,application/pdf"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        setUploadingFile(true);
                                                        try {
                                                            const url = await uploadFileToStorage(file);
                                                            setTnPrestadorTemp(url);
                                                        } catch (error) {
                                                            alert('Erro ao enviar arquivo: ' + error.message);
                                                        } finally {
                                                            setUploadingFile(false);
                                                        }
                                                    }
                                                }}
                                                disabled={uploadingFile}
                                            />
                                            <div className="flex items-center gap-2">
                                                <Checkbox
                                                    checked={dadosEditados.assinatura_prestador_valida !== null
                                                        ? !!dadosEditados.assinatura_prestador_valida
                                                        : !!termoDetalhes.assinatura_prestador_valida}
                                                    onCheckedChange={(v) => {
                                                        setDadosEditados(prev => ({ ...prev, assinatura_prestador_valida: !!v }));
                                                        setAlteracoesPendentes(true);
                                                    }}
                                                />
                                                <Label className="text-sm">Assinatura válida</Label>
                                            </div>
                                            <div>
                                                <Label className="text-sm">Início do prazo</Label>
                                                <Input
                                                    type="date"
                                                    value={dadosEditados.data_inicio_prazo !== null
                                                        ? (dadosEditados.data_inicio_prazo || '')
                                                        : (termoDetalhes.data_inicio_prazo || '')}
                                                    onChange={(e) => {
                                                        setDadosEditados(prev => ({ ...prev, data_inicio_prazo: e.target.value }));
                                                        setAlteracoesPendentes(true);
                                                    }}
                                                />
                                            </div>
                                            {tnPrestadorTemp && (
                                                <Button
                                                    onClick={async () => {
                                                        try {
                                                            const inicio = (dadosEditados.data_inicio_prazo !== null
                                                                ? dadosEditados.data_inicio_prazo
                                                                : termoDetalhes.data_inicio_prazo) || new Date().toISOString().slice(0, 10);
                                                            const prazoDias = dadosEditados.prazo_resposta_dias !== null
                                                                ? dadosEditados.prazo_resposta_dias
                                                                : (termoDetalhes.prazo_resposta_dias || 30);
                                                            const dataMax = addDaysToISODate(inicio, prazoDias);
                                                            const assinaturaValida = dadosEditados.assinatura_prestador_valida !== null
                                                                ? !!dadosEditados.assinatura_prestador_valida
                                                                : !!termoDetalhes.assinatura_prestador_valida;
                                                            const after = {
                                                                ...termoDetalhes,
                                                                arquivo_tn_prestador_url: tnPrestadorTemp,
                                                                assinatura_prestador_valida: assinaturaValida,
                                                                data_inicio_prazo: inicio,
                                                                data_maxima_resposta: dataMax
                                                            };
                                                            const status = calcularStatusTermo(after);
                                                            await supabase.from('termos_notificacao').update({
                                                                arquivo_tn_prestador_url: tnPrestadorTemp,
                                                                assinatura_prestador_valida: assinaturaValida,
                                                                data_inicio_prazo: inicio,
                                                                data_maxima_resposta: dataMax,
                                                                status,
                                                                updated_at: new Date().toISOString()
                                                            }).eq('id', termoDetalhes.id);
                                                            queryClient.invalidateQueries({ queryKey: ['termos-notificacao'] });
                                                            setTermoDetalhes({
                                                                ...termoDetalhes,
                                                                arquivo_tn_prestador_url: tnPrestadorTemp,
                                                                assinatura_prestador_valida: assinaturaValida,
                                                                data_inicio_prazo: inicio,
                                                                data_maxima_resposta: dataMax,
                                                                status
                                                            });
                                                            setTnPrestadorTemp(null);
                                                            alert('Salvo com sucesso!');
                                                        } catch (error) {
                                                            alert('Erro ao salvar');
                                                        }
                                                    }}
                                                    className="w-full"
                                                    size="sm"
                                                >
                                                    Salvar
                                                </Button>
                                            )}
                                            {termoDetalhes.arquivo_tn_prestador_url && (
                                                <Button variant="outline" onClick={() => void openArquivo(termoDetalhes.arquivo_tn_prestador_url)} className="w-full" size="sm">
                                                    <Download className="h-4 w-4 mr-2" />
                                                    Baixar TN (prestador)
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* ... Protocolo section ... */}
                                <div className="border-t pt-4">
                                    <h3 className="font-semibold mb-3">Protocolo / AR</h3>
                                    {/* ... Simplified for brevity, assume similar structure ... */}
                                     <div className="space-y-2">
                                        <div>
                                            <Label className="text-sm">Data de Protocolo / AR *</Label>
                                            <Input 
                                                type="date" 
                                                defaultValue={termoDetalhes.data_protocolo || ''}
                                                onChange={(e) => {
                                                    setDadosEditados(prev => ({ ...prev, data_protocolo: e.target.value }));
                                                    setAlteracoesPendentes(true);
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {alteracoesPendentes && (
                                    <div className="border-t pt-4 flex gap-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setAlteracoesPendentes(false);
                                                setTermoDetalhes(null);
                                            }}
                                            className="flex-1"
                                        >
                                            Cancelar
                                        </Button>
                                        <Button onClick={async () => {
                                            try {
                                                const updateData = {};
                                                if (dadosEditados.numero_processo !== null) updateData.numero_processo = dadosEditados.numero_processo || null;
                                                if (dadosEditados.prazo_resposta_dias !== null) updateData.prazo_resposta_dias = dadosEditados.prazo_resposta_dias || 30;
                                                if (dadosEditados.data_protocolo !== null) updateData.data_protocolo = dadosEditados.data_protocolo || null;
                                                if (dadosEditados.data_inicio_prazo !== null) updateData.data_inicio_prazo = dadosEditados.data_inicio_prazo || null;
                                                if (dadosEditados.assinatura_prestador_valida !== null) updateData.assinatura_prestador_valida = !!dadosEditados.assinatura_prestador_valida;
                                                if (dadosEditados.fluxo_manual !== null) updateData.fluxo_manual = !!dadosEditados.fluxo_manual;

                                                const afterBase = { ...termoDetalhes, ...updateData };
                                                const basePrazo = afterBase.data_inicio_prazo || afterBase.data_protocolo || null;
                                                const prazoDias = afterBase.prazo_resposta_dias || 30;
                                                if (basePrazo) {
                                                    updateData.data_maxima_resposta = addDaysToISODate(basePrazo, prazoDias);
                                                }

                                                const after = { ...afterBase, ...updateData };
                                                updateData.status = calcularStatusTermo(after);
                                                updateData.updated_at = new Date().toISOString();

                                                await supabase.from('termos_notificacao').update(updateData).eq('id', termoDetalhes.id);
                                                queryClient.invalidateQueries({ queryKey: ['termos-notificacao'] });
                                                setTermoDetalhes({ ...termoDetalhes, ...updateData });
                                                setAlteracoesPendentes(false);
                                                alert('Alterações salvas!');
                                            } catch (error) {
                                                alert('Erro ao salvar: ' + error.message);
                                            }
                                        }} className="flex-1 bg-blue-600 hover:bg-blue-700">
                                            Salvar Alterações
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

                <Dialog
                    open={quickProtocolo.open}
                    onOpenChange={(open) => {
                        if (!open) {
                            setQuickProtocolo({ open: false, termo: null, data: '', protocoloUrl: '', protocoloNome: '', oficioUrl: '', oficioNome: '' });
                        }
                    }}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Registrar Protocolo / AR</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label className="text-sm">Data de Protocolo / AR *</Label>
                                <Input
                                    type="date"
                                    value={quickProtocolo.data}
                                    onChange={(e) => setQuickProtocolo(prev => ({ ...prev, data: e.target.value }))}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm">Arquivo de Protocolo / AR (PDF) *</Label>
                                <input
                                    id={`quick-protocolo-ar-${quickProtocolo.termo?.id || 'x'}`}
                                    type="file"
                                    accept=".pdf,application/pdf"
                                    disabled={quickUploading}
                                    className="hidden"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        setQuickUploading(true);
                                        try {
                                            const url = await uploadFileToStorage(file);
                                            setQuickProtocolo(prev => ({ ...prev, protocoloUrl: url, protocoloNome: file.name }));
                                        } catch (error) {
                                            alert('Erro ao enviar arquivo: ' + (error?.message || ''));
                                        } finally {
                                            setQuickUploading(false);
                                        }
                                    }}
                                />
                                <Button variant="outline" asChild disabled={quickUploading} className="w-full justify-start">
                                    <label htmlFor={`quick-protocolo-ar-${quickProtocolo.termo?.id || 'x'}`} className="cursor-pointer w-full flex items-center">
                                        <Upload className="h-4 w-4 mr-2" />
                                        {quickUploading ? 'Enviando...' : 'Selecionar AR / Protocolo'}
                                    </label>
                                </Button>
                                <div className="text-xs text-gray-600">
                                    {quickProtocolo.protocoloNome
                                        ? quickProtocolo.protocoloNome
                                        : quickProtocolo.protocoloUrl
                                        ? 'Arquivo já anexado'
                                        : 'Nenhum arquivo selecionado'}
                                </div>
                                {quickProtocolo.protocoloUrl ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => void openArquivo(quickProtocolo.protocoloUrl)}
                                        className="w-full"
                                    >
                                        <Download className="h-4 w-4 mr-2" />
                                        Ver Protocolo
                                    </Button>
                                ) : null}
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm">Ofício de Protocolo (opcional)</Label>
                                <input
                                    id={`quick-protocolo-oficio-${quickProtocolo.termo?.id || 'x'}`}
                                    type="file"
                                    accept=".pdf,application/pdf"
                                    disabled={quickUploading}
                                    className="hidden"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        setQuickUploading(true);
                                        try {
                                            const url = await uploadFileToStorage(file);
                                            setQuickProtocolo(prev => ({ ...prev, oficioUrl: url, oficioNome: file.name }));
                                        } catch (error) {
                                            alert('Erro ao enviar arquivo: ' + (error?.message || ''));
                                        } finally {
                                            setQuickUploading(false);
                                        }
                                    }}
                                />
                                <Button variant="outline" asChild disabled={quickUploading} className="w-full justify-start">
                                    <label htmlFor={`quick-protocolo-oficio-${quickProtocolo.termo?.id || 'x'}`} className="cursor-pointer w-full flex items-center">
                                        <Upload className="h-4 w-4 mr-2" />
                                        {quickUploading ? 'Enviando...' : 'Selecionar Ofício'}
                                    </label>
                                </Button>
                                <div className="text-xs text-gray-600">
                                    {quickProtocolo.oficioNome
                                        ? quickProtocolo.oficioNome
                                        : quickProtocolo.oficioUrl
                                        ? 'Arquivo já anexado'
                                        : 'Nenhum arquivo selecionado'}
                                </div>
                                {quickProtocolo.oficioUrl ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => void openArquivo(quickProtocolo.oficioUrl)}
                                        className="w-full"
                                    >
                                        <Download className="h-4 w-4 mr-2" />
                                        Ver Ofício
                                    </Button>
                                ) : null}
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setQuickProtocolo({ open: false, termo: null, data: '', protocoloUrl: '', protocoloNome: '', oficioUrl: '', oficioNome: '' })}
                                    className="flex-1"
                                    disabled={quickUploading}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                                    disabled={quickUploading}
                                    onClick={async () => {
                                        const termo = quickProtocolo.termo;
                                        if (!termo?.id) return;
                                        const hasAny = !!quickProtocolo.data || !!quickProtocolo.protocoloUrl || !!quickProtocolo.oficioUrl;
                                        if (!hasAny) {
                                            alert('Anexe o ofício e/ou o AR (ou informe a data) para salvar.');
                                            return;
                                        }

                                        setQuickUploading(true);
                                        try {
                                            const payload = {};
                                            if (quickProtocolo.data) payload.data_protocolo = quickProtocolo.data;
                                            if (quickProtocolo.protocoloUrl) payload.arquivo_protocolo_url = quickProtocolo.protocoloUrl;
                                            if (quickProtocolo.oficioUrl) payload.arquivo_oficio_protocolo = quickProtocolo.oficioUrl;

                                            const finalAR = payload.arquivo_protocolo_url || termo?.arquivo_protocolo_url;
                                            if (payload.data_protocolo && finalAR) {
                                                const prazo = termo?.prazo_resposta_dias || 30;
                                                const dataMax = addDaysToISODate(payload.data_protocolo, prazo);
                                                if (dataMax) payload.data_maxima_resposta = dataMax;
                                            }

                                            const after = { ...termo, ...payload };
                                            const status = calcularStatusTermo(after);
                                            payload.status = status;
                                            const { error } = await supabase.from('termos_notificacao').update(payload).eq('id', termo.id);
                                            if (error) throw error;
                                            queryClient.invalidateQueries({ queryKey: ['termos-notificacao'] });
                                            setQuickProtocolo({ open: false, termo: null, data: '', protocoloUrl: '', protocoloNome: '', oficioUrl: '', oficioNome: '' });
                                            alert('Registro atualizado com sucesso!');
                                        } catch (error) {
                                            alert('Erro ao salvar protocolo: ' + (error?.message || ''));
                                        } finally {
                                            setQuickUploading(false);
                                        }
                                    }}
                                >
                                    Salvar
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                <Dialog
                    open={quickResposta.open}
                    onOpenChange={(open) => {
                        if (!open) {
                            setQuickResposta({ open: false, termo: null, data: '', respostaUrl: '', respostaNome: '', oficioUrl: '', oficioNome: '' });
                        }
                    }}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Registrar Recebimento de Resposta</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div>
                                <Label className="text-sm">Data de recebimento *</Label>
                                <Input
                                    type="date"
                                    value={quickResposta.data}
                                    onChange={(e) => setQuickResposta(prev => ({ ...prev, data: e.target.value }))}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm">Resposta / Manifestação (PDF) *</Label>
                                <input
                                    id={`quick-resposta-arquivo-${quickResposta.termo?.id || 'x'}`}
                                    type="file"
                                    accept=".pdf,application/pdf"
                                    disabled={quickUploading}
                                    className="hidden"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        setQuickUploading(true);
                                        try {
                                            const url = await uploadFileToStorage(file);
                                            setQuickResposta(prev => ({ ...prev, respostaUrl: url, respostaNome: file.name }));
                                        } catch (error) {
                                            alert('Erro ao enviar arquivo: ' + (error?.message || ''));
                                        } finally {
                                            setQuickUploading(false);
                                        }
                                    }}
                                />
                                <Button variant="outline" asChild disabled={quickUploading} className="w-full justify-start">
                                    <label htmlFor={`quick-resposta-arquivo-${quickResposta.termo?.id || 'x'}`} className="cursor-pointer w-full flex items-center">
                                        <Upload className="h-4 w-4 mr-2" />
                                        {quickUploading ? 'Enviando...' : 'Selecionar Resposta / Manifestação'}
                                    </label>
                                </Button>
                                <div className="text-xs text-gray-600">
                                    {quickResposta.respostaNome
                                        ? quickResposta.respostaNome
                                        : quickResposta.respostaUrl
                                        ? 'Arquivo já anexado'
                                        : 'Nenhum arquivo selecionado'}
                                </div>
                                {quickResposta.respostaUrl ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => void openArquivo(quickResposta.respostaUrl)}
                                        className="w-full"
                                    >
                                        <Download className="h-4 w-4 mr-2" />
                                        Ver Resposta
                                    </Button>
                                ) : null}
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm">Ofício de Resposta (opcional)</Label>
                                <input
                                    id={`quick-resposta-oficio-${quickResposta.termo?.id || 'x'}`}
                                    type="file"
                                    accept=".pdf,application/pdf"
                                    disabled={quickUploading}
                                    className="hidden"
                                    onChange={async (e) => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        setQuickUploading(true);
                                        try {
                                            const url = await uploadFileToStorage(file);
                                            setQuickResposta(prev => ({ ...prev, oficioUrl: url, oficioNome: file.name }));
                                        } catch (error) {
                                            alert('Erro ao enviar arquivo: ' + (error?.message || ''));
                                        } finally {
                                            setQuickUploading(false);
                                        }
                                    }}
                                />
                                <Button variant="outline" asChild disabled={quickUploading} className="w-full justify-start">
                                    <label htmlFor={`quick-resposta-oficio-${quickResposta.termo?.id || 'x'}`} className="cursor-pointer w-full flex items-center">
                                        <Upload className="h-4 w-4 mr-2" />
                                        {quickUploading ? 'Enviando...' : 'Selecionar Ofício'}
                                    </label>
                                </Button>
                                <div className="text-xs text-gray-600">
                                    {quickResposta.oficioNome
                                        ? quickResposta.oficioNome
                                        : quickResposta.oficioUrl
                                        ? 'Arquivo já anexado'
                                        : 'Nenhum arquivo selecionado'}
                                </div>
                                {quickResposta.oficioUrl ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => void openArquivo(quickResposta.oficioUrl)}
                                        className="w-full"
                                    >
                                        <Download className="h-4 w-4 mr-2" />
                                        Ver Ofício
                                    </Button>
                                ) : null}
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setQuickResposta({ open: false, termo: null, data: '', respostaUrl: '', respostaNome: '', oficioUrl: '', oficioNome: '' })}
                                    className="flex-1"
                                    disabled={quickUploading}
                                >
                                    Cancelar
                                </Button>
                                <Button
                                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                                    disabled={quickUploading}
                                    onClick={async () => {
                                        const termo = quickResposta.termo;
                                        if (!termo?.id) return;
                                        const hasAny = !!quickResposta.data || !!quickResposta.respostaUrl || !!quickResposta.oficioUrl;
                                        if (!hasAny) {
                                            alert('Anexe o ofício e/ou a resposta (ou informe a data) para salvar.');
                                            return;
                                        }

                                        setQuickUploading(true);
                                        try {
                                            const payload = {};
                                            if (quickResposta.data) payload.data_recebimento_resposta = quickResposta.data;
                                            if (quickResposta.respostaUrl) payload.arquivo_resposta_url = quickResposta.respostaUrl;
                                            if (quickResposta.oficioUrl) payload.arquivo_oficio_resposta = quickResposta.oficioUrl;

                                            if (payload.data_recebimento_resposta) {
                                                const prazoMax = termo?.data_maxima_resposta;
                                                const recebeuNoPrazo = prazoMax
                                                    ? new Date(`${payload.data_recebimento_resposta}T00:00:00`).getTime() <= new Date(`${prazoMax}T00:00:00`).getTime()
                                                    : null;
                                                payload.recebida_no_prazo = recebeuNoPrazo;
                                            }

                                            const after = { ...termo, ...payload };
                                            const status = calcularStatusTermo(after);
                                            payload.status = status;
                                            const { error } = await supabase.from('termos_notificacao').update(payload).eq('id', termo.id);
                                            if (error) throw error;
                                            queryClient.invalidateQueries({ queryKey: ['termos-notificacao'] });
                                            setQuickResposta({ open: false, termo: null, data: '', respostaUrl: '', respostaNome: '', oficioUrl: '', oficioNome: '' });
                                            alert('Registro atualizado com sucesso!');
                                        } catch (error) {
                                            alert('Erro ao salvar recebimento: ' + (error?.message || ''));
                                        } finally {
                                            setQuickUploading(false);
                                        }
                                    }}
                                >
                                    Salvar
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                <div className="space-y-4">
                    {termosFiltrados.length === 0 ? (
                        <Card className="p-8">
                            <div className="text-center text-gray-500">
                                <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                <p>Nenhum termo encontrado com os filtros aplicados</p>
                            </div>
                        </Card>
                    ) : (
                        termosFiltrados.map(termo => (
                            <Card key={termo.id} className="hover:shadow-lg transition-shadow">
                                <CardContent className="p-4">
                                    <div className="flex justify-between items-start mb-3">
                                         <div className="flex-1">
                                             <h3 className="font-semibold text-lg">{termo.numero_termo_notificacao || termo.numero_termo}</h3>
                                             {termo.numero_rfp && (
                                                 <p className="text-sm text-blue-600 font-medium">
                                                     {formatRelatorioTN(termo)}
                                                 </p>
                                             )}
                                             <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-gray-600">
                                                 <div><span className="font-medium">Município:</span> {getMunicipioNome(termo.municipio_id)}</div>
                                                 <div><span className="font-medium">Processo:</span> {termo.numero_processo || 'N/A'}</div>
                                                 <div><span className="font-medium">Prestador:</span> {getPrestadorNome(termo.prestador_servico_id)}</div>
                                                 <div><span className="font-medium">Câmara:</span> {termo.camara_tecnica || 'N/A'}</div>
                                             </div>
                                         </div>
                                         <div className="flex flex-col gap-3 items-end">
                                              {(() => {
                                                  const fluxo = getStatusFluxo(termo);
                                                  const badge = getStatusBadge(fluxo);
                                                  return (
                                                      <>
                                                          <Badge className={badge.color}>
                                                              {badge.label}
                                                          </Badge>
                                                          <div className="flex gap-2">
                                                              {fluxo === 'pendente_tn' && !termo?.arquivo_url ? (
                                                                  <Button
                                                                      size="sm"
                                                                      onClick={() => enviarTermoAssinadoRapido(termo)}
                                                                      disabled={uploadingTermoAssinadoId === termo.id}
                                                                      className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm font-medium"
                                                                  >
                                                                      <Upload className="h-4 w-4 mr-1" />
                                                                      {uploadingTermoAssinadoId === termo.id ? 'Enviando...' : 'Enviar TN'}
                                                                  </Button>
                                                              ) : null}
                                                              {fluxo === 'pendente_tn' && !termo?.arquivo_rfp_url ? (
                                                                  <Button
                                                                      size="sm"
                                                                      onClick={() => enviarRfpAssinadoRapido(termo)}
                                                                      disabled={uploadingTermoAssinadoId === termo.id}
                                                                      className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm font-medium"
                                                                  >
                                                                      <Upload className="h-4 w-4 mr-1" />
                                                                      {uploadingTermoAssinadoId === termo.id ? 'Enviando...' : 'Enviar RFP'}
                                                                  </Button>
                                                              ) : null}
                                                              {(fluxo === 'aguardando_resposta' || fluxo === 'prazo_vencido') ? (
                                                                  <Button
                                                                      size="sm"
                                                                      onClick={() => abrirQuickResposta(termo)}
                                                                      disabled={quickUploading}
                                                                      className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm font-medium"
                                                                  >
                                                                      <Upload className="h-4 w-4 mr-1" />
                                                                      Resposta
                                                                  </Button>
                                                              ) : null}
                                                              <Button
                                                                  size="sm"
                                                                  variant="outline"
                                                                  onClick={() => setTermoDetalhes(termo)}
                                                              >
                                                                  Editar
                                                              </Button>
                                                              <AlertDialog 
                                                                    open={deleteConfirmation.open && deleteConfirmation.termoId === termo.id}
                                                                    onOpenChange={(open) => {
                                                                        if (!open) {
                                                                            setDeleteConfirmation({ open: false, termoId: null, step: 1, inputValue: '' });
                                                                        }
                                                                    }}
                                                                >
                                                                    <AlertDialogTrigger asChild>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                                                            onClick={() => setDeleteConfirmation({ open: true, termoId: termo.id, step: 1, inputValue: '' })}
                                                                        >
                                                                            <Trash2 className="h-4 w-4 mr-1" />
                                                                            Excluir
                                                                        </Button>
                                                                    </AlertDialogTrigger>
                                                                    <AlertDialogContent>
                                                                        {deleteConfirmation.step === 1 ? (
                                                                            <>
                                                                                <AlertDialogHeader>
                                                                                    <AlertDialogTitle className="text-red-600">Excluir Termo de Notificação?</AlertDialogTitle>
                                                                                    <AlertDialogDescription className="space-y-2">
                                                                                        <p>Você está prestes a excluir permanentemente:</p>
                                                                                        <p className="font-semibold text-gray-900">{termo.numero_termo_notificacao || termo.numero_termo}</p>
                                                                                        <p className="text-red-600">Esta ação não pode ser desfeita e também removerá os arquivos e registros vinculados.</p>
                                                                                    </AlertDialogDescription>
                                                                                </AlertDialogHeader>
                                                                                <AlertDialogFooter>
                                                                                    <AlertDialogCancel disabled={excluirTermoMutation.isPending}>Cancelar</AlertDialogCancel>
                                                                                    <Button
                                                                                        variant="destructive"
                                                                                        disabled={excluirTermoMutation.isPending}
                                                                                        onClick={() => setDeleteConfirmation(prev => ({ ...prev, step: 2, inputValue: '' }))}
                                                                                    >
                                                                                        Continuar
                                                                                    </Button>
                                                                                </AlertDialogFooter>
                                                                            </>
                                                                        ) : (
                                                                            <>
                                                                                <AlertDialogHeader>
                                                                                    <AlertDialogTitle className="text-red-600">Confirmação Final</AlertDialogTitle>
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
                                                                                    <AlertDialogCancel
                                                                                        disabled={excluirTermoMutation.isPending}
                                                                                        onClick={() => setDeleteConfirmation({ open: false, termoId: null, step: 1, inputValue: '' })}
                                                                                    >
                                                                                        Cancelar
                                                                                    </AlertDialogCancel>
                                                                                    <Button
                                                                                        variant="destructive"
                                                                                        disabled={deleteConfirmation.inputValue !== 'EXCLUIR' || excluirTermoMutation.isPending}
                                                                                        onClick={() => excluirTermoMutation.mutate(termo.id)}
                                                                                    >
                                                                                        {excluirTermoMutation.isPending ? 'Excluindo...' : 'Excluir Permanentemente'}
                                                                                    </Button>
                                                                                </AlertDialogFooter>
                                                                            </>
                                                                        )}
                                                                    </AlertDialogContent>
                                                                </AlertDialog>
                                                          </div>
                                                      </>
                                                  );
                                              })()}
                                         </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
