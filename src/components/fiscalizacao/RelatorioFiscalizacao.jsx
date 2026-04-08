import React from 'react';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { useSyncStatus } from '@/lib/SyncStatusContext.jsx';
import { getSyncPendingForFiscalizacao } from '@/lib/offline/syncEngine';
import { Button } from '@/components/ui/button';
import { Loader2, FileText } from 'lucide-react';
import { db } from '@/lib/offline/db';

export default function RelatorioFiscalizacao({ fiscalizacao }) {
    const [isGenerating, setIsGenerating] = React.useState(false);
    const [isRequesting, setIsRequesting] = React.useState(false);
    const [jobId, setJobId] = React.useState(null);
    const [job, setJob] = React.useState(null);
    const [error, setError] = React.useState(null);
    const [pendingLocal, setPendingLocal] = React.useState({ outboxCount: 0, fotosCount: 0 });
    const syncStatus = useSyncStatus?.() || { online: true, sessionValid: true, outboxCount: 0, lastSyncAt: undefined };
    const __keepImports = Button && Loader2 && FileText ? null : null;

    const ensureAuth = async () => {
        const readSession = async () => {
            const { data, error } = await supabase.auth.getSession();
            if (error) throw error;
            const session = data?.session;
            if (!session?.access_token) throw new Error('Sessão expirada. Faça login novamente.');
            return session;
        };

        let session = await readSession();
        const expMs = session?.expires_at ? session.expires_at * 1000 : 0;

        if (!expMs || expMs < Date.now() + 60_000) {
            const { data, error } = await supabase.auth.refreshSession();
            if (error) throw error;
            session = data?.session || (await readSession());
        }

        const userRes = await supabase.auth.getUser();
        if (userRes.error || !userRes.data?.user) {
            const { data, error } = await supabase.auth.refreshSession();
            if (error) throw new Error('Sessão inválida. Faça login novamente.');
            session = data?.session || (await readSession());
        }

        return session.access_token;
    };

    const getFunctionHeaders = async () => {
        const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (!anonKey) throw new Error('VITE_SUPABASE_ANON_KEY não configurada no .env(.local).');
        return { apikey: anonKey, Authorization: `Bearer ${anonKey}` };
    };

    const invokeEdgeFunction = async (functionName, body) => {
        const baseUrl = import.meta.env.VITE_SUPABASE_URL;
        if (!baseUrl) throw new Error('VITE_SUPABASE_URL não configurada no .env(.local).');
        const headers = await getFunctionHeaders();
        const jwt = await ensureAuth();
        const url = `${String(baseUrl).replace(/\/$/, '')}/functions/v1/${functionName}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...(body || {}), jwt })
        });
        const text = await res.text();
        let json = null;
        try {
            json = text ? JSON.parse(text) : null;
        } catch {
            json = null;
        }
        if (!res.ok) {
            const msg = json?.error ? String(json.error) : (text || `HTTP ${res.status}`);
            const err = new Error(msg);
            err.status = res.status;
            err.payload = json;
            throw err;
        }
        return json;
    };

    const parseStorageUrl = (url) => {
        if (typeof url !== 'string' || !url) return null;
        if (url.startsWith('storage://')) {
            const remainder = url.slice('storage://'.length);
            const slash = remainder.indexOf('/');
            if (slash === -1) return null;
            const bucket = remainder.slice(0, slash);
            let path = remainder.slice(slash + 1);
            const q = path.indexOf('?');
            if (q !== -1) path = path.slice(0, q);
            if (!bucket || !path) return null;
            return { bucket, path };
        }
        const publicMarker = '/storage/v1/object/public/';
        const signMarker = '/storage/v1/object/sign/';
        let marker = '';
        let idx = url.indexOf(publicMarker);
        if (idx !== -1) marker = publicMarker;
        else {
            idx = url.indexOf(signMarker);
            if (idx !== -1) marker = signMarker;
        }
        if (!marker) return null;
        const remainder = url.slice(idx + marker.length);
        const slash = remainder.indexOf('/');
        if (slash === -1) return null;
        const bucket = remainder.slice(0, slash);
        let path = remainder.slice(slash + 1);
        const q = path.indexOf('?');
        if (q !== -1) path = path.slice(0, q);
        if (!bucket || !path) return null;
        return { bucket, path };
    };

    const resolveToSignedUrl = async (input, expiresInSeconds = 60 * 30) => {
        if (!input) return '';
        if (typeof input === 'object') {
            if (input.bucket && input.path) {
                const { data, error } = await supabase.storage.from(input.bucket).createSignedUrl(input.path, expiresInSeconds);
                if (error) throw error;
                return data?.signedUrl || '';
            }
            if (typeof input.url === 'string') return resolveToSignedUrl(input.url, expiresInSeconds);
        }
        if (typeof input === 'string') {
            if (input.startsWith('data:')) return input;
            const parsed = parseStorageUrl(input);
            if (!parsed) return input;
            const { data, error } = await supabase.storage.from(parsed.bucket).createSignedUrl(parsed.path, expiresInSeconds);
            if (error) throw error;
            return data?.signedUrl || '';
        }
        return '';
    };

    const loadImageAsBase64 = async (input) => {
        const url = await resolveToSignedUrl(input);
        if (!url) throw new Error('URL de imagem indisponível');
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/jpeg', 0.92));
            };
            img.onerror = reject;
            img.src = url;
        });
    };

    const gerarRelatorio = async () => {
        setIsGenerating(true);
        try {
            const localFiscId = typeof fiscalizacao.id === 'string' ? fiscalizacao.id : undefined;
            const localPrestId = typeof fiscalizacao.prestador_servico_id === 'string' ? fiscalizacao.prestador_servico_id : undefined;
            const map = localFiscId ? await db.id_map.where('local_id').equals(localFiscId).and(m => m.entity === 'fiscalizacoes').first() : null;
            const serverFiscalizacaoId = map?.server_id || (localFiscId || fiscalizacao.id);
            const mapPrest = localPrestId ? await db.id_map.where('local_id').equals(localPrestId).and(m => m.entity === 'prestadores').first() : null;
            const serverPrestadorId = mapPrest?.server_id || (localPrestId || fiscalizacao.prestador_servico_id);
            let fiscalizacaoOnline = null;
            try {
                const { data: fOnline, error: fErr } = await supabase
                    .from('fiscalizacoes')
                    .select('numero_termo, municipio_nome, municipio_id, prestador_servico_id, prestador_servico_nome, servicos, servico, data_inicio, data_fim, fiscal_nome')
                    .eq('id', serverFiscalizacaoId)
                    .maybeSingle();
                if (!fErr && fOnline) fiscalizacaoOnline = fOnline;
            } catch {}
            const fiscalizacaoForReport = { ...fiscalizacao, ...(fiscalizacaoOnline || {}) };
            // 1. Buscar todas as unidades da fiscalização
            const { data: unidades, error: uError } = await supabase
                .from('unidades_fiscalizadas')
                .select('*')
                .eq('fiscalizacao_id', serverFiscalizacaoId)
                .order('created_at');
            
            if (uError) throw uError;

            if (!unidades || unidades.length === 0) {
                alert('Nenhuma unidade encontrada para esta fiscalização.');
                setIsGenerating(false);
                return;
            }

            const unidadeIds = unidades.map(u => u.id);

            // 2. Buscar todos os dados relacionados em paralelo
            const [
                { data: todasRespostas },
                { data: todasConstatacoesManuais },
                { data: todasNcs },
                { data: todasDeterminacoes }
            ] = await Promise.all([
                supabase.from('respostas_checklist').select('*').in('unidade_fiscalizada_id', unidadeIds),
                supabase.from('constatacoes_manuais').select('*').in('unidade_fiscalizada_id', unidadeIds),
                supabase.from('nao_conformidades').select('*').in('unidade_fiscalizada_id', unidadeIds),
                supabase.from('determinacoes').select('*').in('unidade_fiscalizada_id', unidadeIds)
            ]);
            let todasRecomendacoes = [];
            try {
              const { data: recs, error: rErr } = await supabase
                .from('recomendacoes')
                .select('*')
                .in('unidade_fiscalizada_id', unidadeIds);
              if (!rErr && Array.isArray(recs)) todasRecomendacoes = recs;
            } catch {}

            const todasFotos = unidades.map(u => u.fotos_unidade || []);

            const pdf = new jsPDF('p', 'mm', 'a4');
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 10;
            const topMargin = 35;
            const bottomMargin = 25;
            let yPos = topMargin;

            pdf.setFillColor(25, 75, 145);
            pdf.rect(0, 0, pageWidth, 40, 'F');
            
            pdf.setTextColor(255, 255, 255);
            pdf.setFontSize(20);
            pdf.setFont('helvetica', 'bold');
            const titulo = fiscalizacaoForReport.numero_termo 
                ? `TERMO DE VISTORIA AGEMS/DSB Nº ${fiscalizacaoForReport.numero_termo}` 
                : 'RELATÓRIO DE FISCALIZAÇÃO';
            pdf.text(titulo, pageWidth / 2, 15, { align: 'center' });
            
            pdf.setFontSize(11);
            pdf.setFont('helvetica', 'normal');
            let municipioNome = fiscalizacaoForReport.municipio_nome || '';
            if (!municipioNome && fiscalizacaoForReport.municipio_id) {
                try {
                    const { data: mun } = await supabase.from('municipios').select('nome').eq('id', fiscalizacaoForReport.municipio_id).maybeSingle();
                    municipioNome = mun?.nome || '';
                } catch {}
            }
            pdf.text(municipioNome, pageWidth / 2, 25, { align: 'center' });
            const servicosList = Array.isArray(fiscalizacaoForReport.servicos)
                ? fiscalizacaoForReport.servicos
                : typeof fiscalizacaoForReport.servico === 'string'
                ? fiscalizacaoForReport.servico.split(',').map(s => s.trim()).filter(Boolean)
                : [];
            if (servicosList.length > 0) {
                pdf.text(servicosList.join(', '), pageWidth / 2, 33, { align: 'center' });
            }

            pdf.setTextColor(0, 0, 0);
            yPos = 45;

            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'bold');
            pdf.text('INFORMAÇÕES DA FISCALIZAÇÃO', margin, yPos);
            yPos += 7;

            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`Município: ${municipioNome}`, margin + 2, yPos);
            yPos += 6;
            let prestadorNome = fiscalizacao.prestador_servico_nome || '';
            if (!prestadorNome && serverPrestadorId) {
                const { data: pres } = await supabase.from('prestadores_servico').select('nome').eq('id', serverPrestadorId).maybeSingle();
                prestadorNome = pres?.nome || '';
            }
            pdf.text(`Prestador de Serviços: ${prestadorNome || '-'}`, margin + 2, yPos);
            yPos += 6;
            const servicoLabel = servicosList.length > 1 ? 'Serviços' : 'Serviço';
            pdf.text(`${servicoLabel}: ${servicosList.join(', ') || '-'}`, margin + 2, yPos);
            yPos += 6;
            if (fiscalizacaoForReport.data_inicio) {
                pdf.text(`Data Início: ${format(new Date(fiscalizacaoForReport.data_inicio), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, margin + 2, yPos);
                yPos += 6;
            }
            if (fiscalizacaoForReport.data_fim) {
                pdf.text(`Data Fim: ${format(new Date(fiscalizacaoForReport.data_fim), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, margin + 2, yPos);
                yPos += 6;
            }
            if (fiscalizacaoForReport.fiscal_nome) {
                pdf.text(`Fiscal: ${fiscalizacaoForReport.fiscal_nome}`, margin + 2, yPos);
                yPos += 6;
            }
            yPos += 8;

            yPos += 6;
            pdf.setFillColor(25, 75, 145);
            pdf.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
            pdf.setDrawColor(0);
            pdf.rect(margin, yPos, pageWidth - 2 * margin, 8, 'S');
            pdf.setFontSize(12);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(255, 255, 255);
            pdf.text('RESUMO EXECUTIVO', margin + 2, yPos + 5.5);
            pdf.setTextColor(0, 0, 0);
            yPos += 14;

            const totalConstatacoes = (todasRespostas?.filter(r => r.resposta === 'SIM' || r.resposta === 'NAO').length || 0) + (todasConstatacoesManuais?.length || 0);
            const totalNCs = todasNcs?.length || 0;
            const totalDeterminacoes = todasDeterminacoes?.length || 0;
            const totalRecomendacoes = todasRecomendacoes?.length || 0;

            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`• Unidades Vistoriadas: ${unidades.length}`, margin + 2, yPos);
            yPos += 6;
            pdf.text(`• Total de Constatações: ${totalConstatacoes}`, margin + 2, yPos);
            yPos += 6;
            pdf.text(`• Total de Não Conformidades: ${totalNCs}`, margin + 2, yPos);
            yPos += 6;
            pdf.text(`• Total de Recomendações: ${totalRecomendacoes}`, margin + 2, yPos);
            yPos += 6;
            pdf.text(`• Total de Determinações: ${totalDeterminacoes}`, margin + 2, yPos);
            yPos += 12;

            const tableWidth = pageWidth - 2 * margin;
            const rowHeight = 7;
            
            const drawCell = (text, x, y, width, height, bold = false, center = false, fillColor = null) => {
                if (fillColor) {
                    pdf.setFillColor(fillColor[0], fillColor[1], fillColor[2]);
                    pdf.rect(x, y, width, height, 'F');
                }
                pdf.setDrawColor(0);
                pdf.rect(x, y, width, height, 'S');
                
                pdf.setFont('helvetica', bold ? 'bold' : 'normal');
                const textY = y + height / 2 + 1.5;
                if (center) {
                    pdf.text(text, x + width / 2, textY, { align: 'center' });
                } else {
                    pdf.text(text, x + 2, textY);
                }
            };

            // Calcular numeração sequencial GLOBAL
            let contadores = {
                constatacoes: 0,
                ncs: 0,
                determinacoes: 0,
                recomendacoes: 0
            };

            const mapeamentosNumeracao = [];

            for (let idx = 0; idx < unidades.length; idx++) {
                const u = unidades[idx];
                const respostas = todasRespostas?.filter(r => r.unidade_fiscalizada_id === u.id) || [];
                const ncs = todasNcs?.filter(n => n.unidade_fiscalizada_id === u.id) || [];
                const determinacoes = todasDeterminacoes?.filter(d => d.unidade_fiscalizada_id === u.id) || [];
                const recomendacoes = todasRecomendacoes?.filter(r => r.unidade_fiscalizada_id === u.id) || [];
                const manuais = todasConstatacoesManuais?.filter(m => m.unidade_fiscalizada_id === u.id) || [];

                const mapeamentoUnidade = {
                    constatacoes: {},
                    ncs: {},
                    determinacoes: {},
                    recomendacoes: {}
                };

                const parseNumeroConstatacao = (valor) => {
                    const n = parseInt(String(valor || '').replace(/[^\d]/g, ''), 10);
                    return Number.isFinite(n) ? n : 9999;
                };

                const constItensOrdenados = [
                    ...respostas
                        .filter(r => r.resposta === 'SIM' || r.resposta === 'NAO')
                        .map(r => ({ id: r.id, numero_constatacao: r.numero_constatacao, created_at: r.created_at })),
                    ...manuais.map(m => ({ id: m.id, numero_constatacao: m.numero_constatacao, created_at: m.created_at }))
                ].sort((a, b) => {
                    const numA = parseNumeroConstatacao(a.numero_constatacao);
                    const numB = parseNumeroConstatacao(b.numero_constatacao);
                    if (numA !== numB) return numA - numB;
                    const createdA = a.created_at || '';
                    const createdB = b.created_at || '';
                    if (createdA !== createdB) return createdA.localeCompare(createdB);
                    return String(a.id).localeCompare(String(b.id));
                });
                constItensOrdenados.forEach((c) => {
                    contadores.constatacoes++;
                    mapeamentoUnidade.constatacoes[c.id] = contadores.constatacoes;
                });

                const ncsOrd = [...ncs].sort((a, b) => {
                    const respA = respostas.find(r => r.id === a.resposta_checklist_id);
                    const respB = respostas.find(r => r.id === b.resposta_checklist_id);
                    const manualA = manuais.find(cm => !a.resposta_checklist_id && a.descricao && a.descricao.includes(cm.numero_constatacao));
                    const manualB = manuais.find(cm => !b.resposta_checklist_id && b.descricao && b.descricao.includes(cm.numero_constatacao));
                    const ordConstA = respA
                        ? mapeamentoUnidade.constatacoes[respA.id]
                        : (manualA ? mapeamentoUnidade.constatacoes[manualA.id] : 9999);
                    const ordConstB = respB
                        ? mapeamentoUnidade.constatacoes[respB.id]
                        : (manualB ? mapeamentoUnidade.constatacoes[manualB.id] : 9999);
                    return (ordConstA ?? 9999) - (ordConstB ?? 9999);
                });
                ncsOrd.forEach(nc => {
                    contadores.ncs++;
                    mapeamentoUnidade.ncs[nc.id] = contadores.ncs;
                });

                const detsOrd = [...determinacoes].sort((a, b) => {
                    const ordNcA = mapeamentoUnidade.ncs[a.nao_conformidade_id] ?? 9999;
                    const ordNcB = mapeamentoUnidade.ncs[b.nao_conformidade_id] ?? 9999;
                    if (ordNcA !== ordNcB) return ordNcA - ordNcB;
                    const numA = parseInt(a.numero_determinacao?.replace('D', '') || '999');
                    const numB = parseInt(b.numero_determinacao?.replace('D', '') || '999');
                    return numA - numB;
                });
                detsOrd.forEach((det) => {
                    const numNcRelacionado = mapeamentoUnidade.ncs[det.nao_conformidade_id];
                    mapeamentoUnidade.determinacoes[det.id] = numNcRelacionado ?? parseInt(det.numero_determinacao?.replace('D', '') || '999');
                });

                const ncsSemDetOrd = ncsOrd.filter(nc => !determinacoes.some(d => d.nao_conformidade_id === nc.id));
                const recsBase = [...recomendacoes].sort((a, b) => {
                    const numA = parseInt(a.numero_recomendacao?.replace('R', '') || '999');
                    const numB = parseInt(b.numero_recomendacao?.replace('R', '') || '999');
                    return numA - numB;
                });
                let recIdx = 0;
                ncsSemDetOrd.forEach(() => {
                    const rec = recsBase[recIdx];
                    if (!rec) return;
                    contadores.recomendacoes++;
                    mapeamentoUnidade.recomendacoes[rec.id] = contadores.recomendacoes;
                    recIdx++;
                });
                for (; recIdx < recsBase.length; recIdx++) {
                    const rec = recsBase[recIdx];
                    contadores.recomendacoes++;
                    mapeamentoUnidade.recomendacoes[rec.id] = contadores.recomendacoes;
                }

                mapeamentosNumeracao.push(mapeamentoUnidade);
            }

            let offsetGlobalFiguras = 0;

            for (let idx = 0; idx < unidades.length; idx++) {
                const unidade = unidades[idx];
                const respostas = todasRespostas?.filter(r => r.unidade_fiscalizada_id === unidade.id) || [];
                const ncs = todasNcs?.filter(n => n.unidade_fiscalizada_id === unidade.id) || [];
                const determinacoes = todasDeterminacoes?.filter(d => d.unidade_fiscalizada_id === unidade.id) || [];
                const recomendacoes = todasRecomendacoes?.filter(r => r.unidade_fiscalizada_id === unidade.id) || [];
                const constatacoesManuais = todasConstatacoesManuais?.filter(m => m.unidade_fiscalizada_id === unidade.id) || [];
                const fotos = todasFotos[idx] || [];
                const mapeamento = mapeamentosNumeracao[idx];
                // Extras locais (endereço/coords) da unidade, quando disponíveis

                pdf.addPage();
                yPos = topMargin;

                pdf.setFontSize(9);

                pdf.setFillColor(189, 214, 238);
                pdf.rect(margin, yPos, tableWidth, rowHeight, 'F');
                pdf.setDrawColor(0);
                pdf.rect(margin, yPos, tableWidth, rowHeight, 'S');
                pdf.setFontSize(11);
                pdf.setFont('helvetica', 'bold');
                const tituloUnidade = (unidade.nome_unidade || unidade.tipo_unidade_nome || 'UNIDADE').toUpperCase();
                pdf.text(tituloUnidade, pageWidth / 2, yPos + 4.5, { align: 'center' });
                yPos += rowHeight;

                pdf.setFontSize(9);
                drawCell(`ID Unidade: ${unidade.codigo_unidade || unidade.nome_unidade || '-'}`, margin, yPos, tableWidth, rowHeight, true);
                yPos += rowHeight;

                drawCell(`Localidade: ${fiscalizacao.municipio_nome}`, margin, yPos, tableWidth, rowHeight, true);
                yPos += rowHeight;

                drawCell(`Endereço: ${unidade.endereco || '-'}`, margin, yPos, tableWidth, rowHeight, true);
                yPos += rowHeight;
                
                const coordsDms = (() => {
                    const latNum = Number(unidade.latitude);
                    const lonNum = Number(unidade.longitude);
                    if (!isFinite(latNum) || !isFinite(lonNum)) return '-';
                    const latAbs = Math.abs(latNum);
                    const lonAbs = Math.abs(lonNum);
                    const latDeg = Math.floor(latAbs);
                    const lonDeg = Math.floor(lonAbs);
                    const latMinFloat = (latAbs - latDeg) * 60;
                    const lonMinFloat = (lonAbs - lonDeg) * 60;
                    const latMin = Math.floor(latMinFloat);
                    const lonMin = Math.floor(lonMinFloat);
                    const latSec = (latMinFloat - latMin) * 60;
                    const lonSec = (lonMinFloat - lonMin) * 60;
                    const latHem = latNum >= 0 ? 'N' : 'S';
                    const lonHem = lonNum >= 0 ? 'E' : 'W';
                    return `${latDeg}° ${latMin}' ${latSec.toFixed(2)}" ${latHem}, ${lonDeg}° ${lonMin}' ${lonSec.toFixed(2)}" ${lonHem}`;
                })();
                drawCell(`Coordenadas: ${coordsDms}`, margin, yPos, tableWidth, rowHeight, true);
                yPos += rowHeight;
                
                const vistoriaAt = unidade.data_hora_vistoria ? format(new Date(unidade.data_hora_vistoria), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-';
                drawCell(`Data/Hora da Vistoria: ${vistoriaAt}`, margin, yPos, tableWidth, rowHeight, true);
                yPos += rowHeight;

                drawCell('Constatações', margin, yPos, tableWidth, rowHeight, true, true, [189, 214, 238]);
                yPos += rowHeight;

                const itensConstatacoes = [
                    ...respostas
                        .filter(r => r.resposta === 'SIM' || r.resposta === 'NAO')
                        .map(r => ({ kind: 'checklist', id: r.id, resp: r })),
                    ...constatacoesManuais.map(m => ({ kind: 'manual', id: m.id, manual: m }))
                ].sort((a, b) => {
                    const ordA = mapeamento.constatacoes[a.id] ?? 9999;
                    const ordB = mapeamento.constatacoes[b.id] ?? 9999;
                    return ordA - ordB;
                });

                itensConstatacoes.forEach((item) => {
                    const novoNum = mapeamento.constatacoes[item.id];
                    if (!novoNum) return;
                    const numConst = `C${novoNum}`;
                    const texto = item.kind === 'manual'
                        ? (item.manual?.descricao || '')
                        : `${item.resp?.pergunta || ''}${item.resp?.observacao ? ` Observação: ${item.resp.observacao}` : ''}`;
                    const restLines = pdf.splitTextToSize(texto, tableWidth - 15);
                    const cellHeight = Math.max(rowHeight, restLines.length * 5 + 4);

                    if (yPos + cellHeight > pageHeight - bottomMargin) {
                        pdf.addPage();
                        yPos = topMargin;
                    }

                    pdf.rect(margin, yPos, tableWidth, cellHeight, 'S');
                    pdf.setFont('helvetica', 'bold');
                    pdf.text(numConst + '.', margin + 2, yPos + 5);
                    pdf.setFont('helvetica', 'normal');
                    pdf.text(restLines, margin + 12, yPos + 5);

                    yPos += cellHeight;
                });

                if (yPos + rowHeight > pageHeight - bottomMargin) {
                    pdf.addPage();
                    yPos = topMargin;
                }
                drawCell('Não Conformidades', margin, yPos, tableWidth, rowHeight, true, true, [189, 214, 238]);
                yPos += rowHeight;

                if (ncs.length > 0) {
                    const ncsSorted = [...ncs].sort((a, b) => {
                        const ordA = mapeamento.ncs[a.id] ?? 9999;
                        const ordB = mapeamento.ncs[b.id] ?? 9999;
                        return ordA - ordB;
                    });

                    ncsSorted.forEach((nc) => {
                        const respostaRelacionada = respostas.find(r => r.id === nc.resposta_checklist_id);
                        const constatacaoManualRelacionada = constatacoesManuais.find(cm => 
                            !nc.resposta_checklist_id && 
                            nc.descricao && 
                            nc.descricao.includes(cm.numero_constatacao)
                        );
                        
                        let numConstatacaoNovo = '';
                        if (respostaRelacionada) {
                            numConstatacaoNovo = `C${mapeamento.constatacoes[respostaRelacionada.id]}`;
                        } else if (constatacaoManualRelacionada) {
                            numConstatacaoNovo = `C${mapeamento.constatacoes[constatacaoManualRelacionada.id]}`;
                        }
                        
                        const novoNumNC = `NC${mapeamento.ncs[nc.id]}`;
                        
                        const descricaoCompleta = numConstatacaoNovo 
                            ? `A Constatação ${numConstatacaoNovo} não cumpre o disposto no ${nc.artigo_portaria || 'artigo'};`
                            : nc.descricao;
                        
                        const restLines = pdf.splitTextToSize(descricaoCompleta, tableWidth - 15);
                        const cellHeight = Math.max(rowHeight, restLines.length * 5 + 4);

                        if (yPos + cellHeight > pageHeight - bottomMargin) {
                            pdf.addPage();
                            yPos = topMargin;
                        }

                        pdf.rect(margin, yPos, tableWidth, cellHeight, 'S');
                        pdf.setFont('helvetica', 'bold');
                        pdf.text(novoNumNC + '.', margin + 2, yPos + 5);
                        pdf.setFont('helvetica', 'normal');
                        pdf.text(restLines, margin + 12, yPos + 5);

                        yPos += cellHeight;
                    });
                } else {
                    const cellHeight = rowHeight;
                    pdf.rect(margin, yPos, tableWidth, cellHeight, 'S');
                    pdf.setFont('helvetica', 'normal');
                    pdf.text('Não se aplica.', margin + 12, yPos + 4.5);
                    yPos += cellHeight;
                }

                if (recomendacoes.length > 0) {
                    const recsSorted = [...recomendacoes].sort((a, b) => {
                        const ordA = mapeamento.recomendacoes[a.id] ?? 9999;
                        const ordB = mapeamento.recomendacoes[b.id] ?? 9999;
                        return ordA - ordB;
                    });
                    
                    if (yPos + rowHeight > pageHeight - bottomMargin) {
                        pdf.addPage();
                        yPos = topMargin;
                    }
                    drawCell('Recomendações', margin, yPos, tableWidth, rowHeight, true, true, [189, 214, 238]);
                    yPos += rowHeight;

                    recsSorted.forEach((rec) => {
                        const novoNumRec = `R${mapeamento.recomendacoes[rec.id]}`;
                        const descricaoComPonto = rec.descricao.endsWith('.') ? rec.descricao : rec.descricao + '.';
                        const restLines = pdf.splitTextToSize(descricaoComPonto, tableWidth - 15);
                        const cellHeight = Math.max(rowHeight, restLines.length * 5 + 4);

                        if (yPos + cellHeight > pageHeight - bottomMargin) {
                            pdf.addPage();
                            yPos = topMargin;
                        }

                        pdf.rect(margin, yPos, tableWidth, cellHeight, 'S');
                        pdf.setFont('helvetica', 'bold');
                        pdf.text(novoNumRec + '.', margin + 2, yPos + 5);
                        pdf.setFont('helvetica', 'normal');
                        pdf.text(restLines, margin + 12, yPos + 5);

                        yPos += cellHeight;
                    });
                }

                if (yPos + rowHeight > pageHeight - bottomMargin) {
                    pdf.addPage();
                    yPos = topMargin;
                }
                drawCell('Determinações', margin, yPos, tableWidth, rowHeight, true, true, [189, 214, 238]);
                yPos += rowHeight;

                if (determinacoes.length > 0) {
                    const ncsSortedForDet = [...ncs].sort((a, b) => {
                        const ordA = mapeamento.ncs[a.id] ?? 9999;
                        const ordB = mapeamento.ncs[b.id] ?? 9999;
                        return ordA - ordB;
                    });
                    const posPorNc = {};
                    ncsSortedForDet.forEach((nc, idx) => { posPorNc[nc.id] = idx; });
                    const detsSorted = [...determinacoes].sort((a, b) => {
                        const posA = posPorNc[a.nao_conformidade_id] ?? 9999;
                        const posB = posPorNc[b.nao_conformidade_id] ?? 9999;
                        if (posA !== posB) return posA - posB;
                        const numA = parseInt(a.numero_determinacao?.replace('D', '') || '999');
                        const numB = parseInt(b.numero_determinacao?.replace('D', '') || '999');
                        return numA - numB;
                    });

                    detsSorted.forEach((det) => {
                        const novoNumDet = `D${mapeamento.determinacoes[det.id]}`;
                        let texto = det.descricao;
                        
                        // Encontrar NC relacionada e substituir referência no texto
                        const ncRelacionada = ncs.find(nc => nc.id === det.nao_conformidade_id);
                        if (ncRelacionada) {
                            const novoNumNC = `NC${mapeamento.ncs[ncRelacionada.id]}`;
                            // Substituir qualquer referência a NC no texto (NC1, NC2, etc.)
                            texto = texto.replace(/NC\d+/g, novoNumNC);
                        }
                        
                        // Adicionar ponto final se não tiver
                        if (!texto.trim().endsWith('.')) {
                            texto = texto.trim() + '.';
                        }
                        
                        // Se não tiver prazo no final, adicionar
                        if (!texto.includes('Prazo:')) {
                            texto = `${texto} Prazo: ${det.prazo_dias} dias.`;
                        }
                        
                        const restLines = pdf.splitTextToSize(texto, tableWidth - 15);
                        const cellHeight = Math.max(rowHeight, restLines.length * 5 + 4);

                        if (yPos + cellHeight > pageHeight - bottomMargin) {
                            pdf.addPage();
                            yPos = topMargin;
                        }

                        pdf.rect(margin, yPos, tableWidth, cellHeight, 'S');
                        pdf.setFont('helvetica', 'bold');
                        pdf.text(novoNumDet + '.', margin + 2, yPos + 5);
                        pdf.setFont('helvetica', 'normal');
                        pdf.text(restLines, margin + 12, yPos + 5);

                        yPos += cellHeight;
                    });
                } else {
                    const cellHeight = rowHeight;
                    pdf.rect(margin, yPos, tableWidth, cellHeight, 'S');
                    pdf.setFont('helvetica', 'normal');
                    pdf.text('Não se aplica.', margin + 12, yPos + 4.5);
                    yPos += cellHeight;
                }

                if (fotos.length > 0) {
                    if (yPos + rowHeight > pageHeight - bottomMargin) {
                        pdf.addPage();
                        yPos = topMargin;
                    }
                    drawCell('Registros Fotográficos', margin, yPos, tableWidth, rowHeight, true, true, [189, 214, 238]);
                    yPos += rowHeight;

                    const formatLegendaFigura = (numFigura, legendaPrincipal) => {
                        const base = (legendaPrincipal || '').trim();
                        const terminaComExclamOuInterrog = /[!?]$/.test(base);
                        const semPontosFinais = base.replace(/\.+$/, '').trim();
                        const texto = semPontosFinais || 'Unidade';
                        return terminaComExclamOuInterrog
                            ? `Figura ${numFigura} – ${texto}`
                            : `Figura ${numFigura} – ${texto}.`;
                    };

                    const fotosBase64 = [];
                    for (const foto of fotos) {
                        try {
                            const base64 = await loadImageAsBase64(foto);
                            fotosBase64.push({ 
                                ref: foto,
                                legenda: typeof foto === 'object' ? foto.legenda : null,
                                base64 
                            });
                        } catch (err) {
                            console.error('Erro ao carregar imagem:', err, foto);
                        }
                    }

                    const cellPadding = 2;
                    const imgCellWidth = (tableWidth - cellPadding) / 2;
                    const imgWidth = imgCellWidth - 4;
                    const imgHeight = 70;
                    const captionHeight = 8;
                    const totalCellHeight = imgHeight + captionHeight;

                    for (let i = 0; i < fotosBase64.length; i += 2) {
                        if (yPos + totalCellHeight + 10 > pageHeight - bottomMargin) {
                            pdf.addPage();
                            yPos = topMargin;
                        }

                        const leftX = margin;
                        const rightX = margin + imgCellWidth;

                        pdf.rect(leftX, yPos, imgCellWidth, totalCellHeight, 'S');
                        if (fotosBase64[i]?.base64) {
                            try {
                                pdf.addImage(fotosBase64[i].base64, 'JPEG', leftX + 2, yPos + 2, imgWidth, imgHeight);
                                pdf.setFontSize(7);
                                pdf.setFont('helvetica', 'normal');
                                const numFigura = offsetGlobalFiguras + i + 1;
                                const fallbackNome = unidade.nome_unidade || unidade.tipo_unidade_nome || 'Unidade';
                                const legendaPrincipal = (fotosBase64[i].legenda && fotosBase64[i].legenda.trim()) ? fotosBase64[i].legenda.trim() : fallbackNome;
                                const legenda = formatLegendaFigura(numFigura, legendaPrincipal);
                                const lines = pdf.splitTextToSize(legenda, imgCellWidth - 4);
                                pdf.text(lines, leftX + imgCellWidth / 2, yPos + imgHeight + 5, { align: 'center' });
                            } catch (err) {
                                console.error('Erro ao adicionar foto:', err);
                            }
                        }

                        pdf.rect(rightX, yPos, imgCellWidth, totalCellHeight, 'S');
                        if (fotosBase64[i + 1]?.base64) {
                            try {
                                pdf.addImage(fotosBase64[i + 1].base64, 'JPEG', rightX + 2, yPos + 2, imgWidth, imgHeight);
                                pdf.setFontSize(7);
                                pdf.setFont('helvetica', 'normal');
                                const numFigura = offsetGlobalFiguras + i + 2;
                                const fallbackNome = unidade.nome_unidade || unidade.tipo_unidade_nome || 'Unidade';
                                const legendaPrincipal = (fotosBase64[i + 1].legenda && fotosBase64[i + 1].legenda.trim()) ? fotosBase64[i + 1].legenda.trim() : fallbackNome;
                                const legenda = formatLegendaFigura(numFigura, legendaPrincipal);
                                const lines = pdf.splitTextToSize(legenda, imgCellWidth - 4);
                                pdf.text(lines, rightX + imgCellWidth / 2, yPos + imgHeight + 5, { align: 'center' });
                            } catch (err) {
                                console.error('Erro ao adicionar foto:', err);
                            }
                        }

                        yPos += totalCellHeight;
                    }

                    offsetGlobalFiguras += fotosBase64.length;
                }
            }

            const nomeArquivo = `Relatorio_Fiscalizacao_${fiscalizacao.municipio_nome}_${format(new Date(), 'yyyyMMdd-HHmmss')}.pdf`;
            pdf.save(nomeArquivo);

        } catch (err) {
            console.error('Erro ao gerar relatório:', err);
            alert('Erro ao gerar relatório. Tente novamente.');
        } finally {
            setIsGenerating(false);
        }
    };

    const resolveServerFiscalizacaoId = async () => {
        const localFiscId = typeof fiscalizacao.id === 'string' ? fiscalizacao.id : undefined;
        const map = localFiscId
            ? await db.id_map.where('local_id').equals(localFiscId).and(m => m.entity === 'fiscalizacoes').first()
            : null;
        return map?.server_id || (localFiscId || fiscalizacao.id);
    };

    const carregarUltimoJob = async () => {
        try {
            await ensureAuth();
            const fiscalizacao_id = await resolveServerFiscalizacaoId();
            const { data, error: qErr } = await supabase
                .from('relatorios_jobs')
                .select('id, status, progress_unidades, progress_fotos, error_message, storage_path, created_at, updated_at')
                .eq('fiscalizacao_id', fiscalizacao_id)
                .order('created_at', { ascending: false })
                .limit(1);
            if (qErr) throw qErr;
            const row = Array.isArray(data) ? data[0] : null;
            if (!row) {
                setJob(null);
                setJobId(null);
                return;
            }

            if (row.status === 'done') {
                try {
                    const st = await invokeEdgeFunction('relatorios_status', { job_id: row.id });
                    if (!st?.signed_url) {
                        setError(null);
                        setJob(null);
                        setJobId(null);
                        return;
                    }
                    setJob({ ...row, signed_url: st.signed_url });
                    setJobId(null);
                    return;
                } catch {
                    setError(null);
                    setJob(null);
                    setJobId(null);
                    return;
                }
            }

            setJob(row);
            const active = row.status === 'queued' || row.status === 'processing';
            setJobId(active ? row.id : null);
        } catch (err) {
            console.error('Erro ao carregar histórico de relatórios:', err);
            setError(err?.message || 'Erro ao carregar histórico de relatórios.');
        }
    };

    const solicitarGeracao = async () => {
        if (isRequesting) return;
        setError(null);
        setIsRequesting(true);
        try {
            const fiscalizacao_id = await resolveServerFiscalizacaoId();
            const data = await invokeEdgeFunction('relatorios_enqueue', { fiscalizacao_id });
            if (!data?.job_id) throw new Error('Falha ao criar job');
            setJobId(data.job_id);
            setJob({ status: 'queued', progress_unidades: 0, progress_fotos: 0 });
        } catch (err) {
            console.error('Erro ao solicitar relatório:', err);
            setError(err?.message || 'Erro ao solicitar relatório.');
        } finally {
            setIsRequesting(false);
        }
    };

    React.useEffect(() => {
        if (!jobId) return;
        let stopped = false;
        let intervalId;
        const poll = async () => {
            try {
                const data = await invokeEdgeFunction('relatorios_status', { job_id: jobId });
                if (stopped) return;
                if (data?.status === 'done' && !data?.signed_url) {
                    stopped = true;
                    clearInterval(intervalId);
                    setJobId(null);
                    setJob(null);
                    setError(null);
                    return;
                }
                setJob(data);
                if (data?.status === 'done' && data?.signed_url) {
                    stopped = true;
                    clearInterval(intervalId);
                    setJobId(null);
                }
                if (data?.status === 'error') {
                    stopped = true;
                    clearInterval(intervalId);
                    setJobId(null);
                    setError(data?.error_message || 'Falha ao gerar relatório.');
                }
            } catch (err) {
                if (stopped) return;
                setError(err?.message || 'Erro ao consultar status.');
            }
        };
        poll();
        intervalId = window.setInterval(poll, 3000);
        return () => {
            stopped = true;
            clearInterval(intervalId);
        };
    }, [jobId]);

    const isOnlineAndReady = syncStatus.online && syncStatus.sessionValid;
    React.useEffect(() => {
        if (!isOnlineAndReady) return;
        carregarUltimoJob();
    }, [isOnlineAndReady, fiscalizacao?.id]);

    React.useEffect(() => {
        let stopped = false;
        const refresh = async () => {
            try {
                if (!fiscalizacao?.id) return;
                const data = await getSyncPendingForFiscalizacao(String(fiscalizacao.id));
                if (stopped) return;
                setPendingLocal(data);
            } catch {}
        };
        refresh();
        const t = window.setInterval(refresh, 4000);
        return () => {
            stopped = true;
            clearInterval(t);
        };
    }, [fiscalizacao?.id]);

    const baixarJob = async (selectedJobId) => {
        try {
            const data = await invokeEdgeFunction('relatorios_status', { job_id: selectedJobId });
            if (data?.signed_url) {
                window.open(data.signed_url, '_blank', 'noopener,noreferrer');
            } else {
                setError('Relatório ainda não está pronto para download.');
            }
        } catch (err) {
            console.error('Erro ao obter URL de download:', err);
            setError(err?.message || 'Erro ao obter URL de download.');
        }
    };

    const isRunning = job?.status && job.status !== 'done' && job.status !== 'error';
    const isDone = job?.status === 'done' && !!job?.signed_url && fiscalizacao?.status === 'finalizada';
    const localOutbox = pendingLocal?.outboxCount || 0;
    const localFotos = pendingLocal?.fotosCount || 0;
    const canRequest = isOnlineAndReady && fiscalizacao?.status === 'finalizada' && localOutbox === 0 && localFotos === 0;
    const msg = !syncStatus.online || !syncStatus.sessionValid
        ? 'Conecte-se ao servidor para gerar/baixar relatório.'
        : fiscalizacao?.status !== 'finalizada'
        ? 'Finalize a fiscalização para gerar relatório no servidor.'
        : (localOutbox > 0 || localFotos > 0)
        ? 'Sincronize esta fiscalização antes para gerar um novo relatório no servidor.'
        : null;

    return (
        <div className="space-y-2">
            {error ? (
                <div className="text-sm text-red-700 bg-red-100 border border-red-200 rounded px-3 py-2">
                    {error}
                </div>
            ) : null}
            {msg ? (
                <div className="text-sm text-yellow-700 bg-yellow-100 border border-yellow-200 rounded px-3 py-2">
                    {msg}
                    {syncStatus.online && syncStatus.sessionValid && fiscalizacao?.status === 'finalizada' && (localOutbox > 0 || localFotos > 0)
                        ? ` (${localOutbox} itens, ${localFotos} fotos)`
                        : ''}
                </div>
            ) : null}
            {job?.status ? (
                <div className="text-xs text-gray-600">
                    Status: {job.status}
                    {typeof job.progress_unidades === 'number' ? ` | Unidades: ${job.progress_unidades}` : ''}
                    {typeof job.progress_fotos === 'number' ? ` | Fotos: ${job.progress_fotos}` : ''}
                </div>
            ) : null}
            <Button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (isDone) {
                        baixarJob(job.id);
                        return;
                    }
                    solicitarGeracao();
                }}
                disabled={!isOnlineAndReady || isRequesting || isRunning || (!isDone && !canRequest)}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="sm"
            >
                {isRequesting || isRunning ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Gerando relatório...
                    </>
                ) : (
                    <>
                        <FileText className="h-4 w-4 mr-2" />
                        {isDone ? 'Baixar Relatório' : 'Gerar Relatório'}
                    </>
                )}
            </Button>
        </div>
    );
}
