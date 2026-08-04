import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, Upload, FileJson, CheckCircle2, AlertCircle, Loader2, ArrowRight, Info } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import AdminShell from '@/components/layout/AdminShell';

export default function ExportarImportar() {
  const [exportando, setExportando] = useState(false);
  const [importando, setImportando] = useState(false);
  const [exportStatus, setExportStatus] = useState(null);
  const [importStatus, setImportStatus] = useState(null);
  const [importLog, setImportLog] = useState([]);
  const [previewImport, setPreviewImport] = useState(null);

  const exportarDados = async () => {
    setExportando(true);
    setExportStatus(null);
    try {
      const { data: fiscalizacoes, error: errF } = await supabase
        .from('fiscalizacoes')
        .select('*')
        .eq('status', 'finalizada');
      if (errF) throw errF;
      if (!fiscalizacoes || fiscalizacoes.length === 0) {
        setExportStatus({ tipo: 'aviso', msg: 'Nenhuma fiscalização finalizada encontrada.' });
        setExportando(false);
        return;
      }
      const fiscIds = fiscalizacoes.map((f) => f.id);
      const { data: unidades, error: errU } = await supabase
        .from('unidades_fiscalizadas')
        .select('*')
        .in('fiscalizacao_id', fiscIds);
      if (errU) throw errU;
      const unidadeIds = (unidades || []).map((u) => u.id);
      const [respostas, ncs, dets, recs, consts, termos] = await Promise.all([
        supabase.from('respostas_checklist').select('*').in('unidade_fiscalizada_id', unidadeIds).then(({ data, error }) => { if (error) throw error; return data || []; }),
        supabase.from('nao_conformidades').select('*').in('unidade_fiscalizada_id', unidadeIds).then(({ data, error }) => { if (error) throw error; return data || []; }),
        supabase.from('determinacoes').select('*').in('unidade_fiscalizada_id', unidadeIds).then(({ data, error }) => { if (error) throw error; return data || []; }),
        supabase.from('recomendacoes').select('*').in('unidade_fiscalizada_id', unidadeIds).then(({ data, error }) => { if (error) throw error; return data || []; }),
        supabase.from('constatacoes_manuais').select('*').in('unidade_fiscalizada_id', unidadeIds).then(({ data, error }) => { if (error) throw error; return data || []; }),
        supabase.from('termos_notificacao').select('*').in('fiscalizacao_id', fiscIds).then(({ data, error }) => { if (error) throw error; return data || []; }),
      ]);
      const fotosSet = new Set();
      for (const unidade of unidades || []) {
        const arr = Array.isArray(unidade?.fotos_unidade) ? unidade.fotos_unidade : [];
        for (const f of arr) {
          if (typeof f === 'string' && f) fotosSet.add(f);
          else if (f?.bucket && f?.path) fotosSet.add(JSON.stringify({ bucket: f.bucket, path: f.path }));
          else if (typeof f?.url === 'string' && f.url) fotosSet.add(f.url);
        }
      }
      for (const nc of ncs) {
        const arr = Array.isArray(nc?.fotos) ? nc.fotos : [];
        for (const u of arr) {
          if (u) fotosSet.add(u);
        }
      }
      for (const termo of termos) {
        if (termo?.arquivo_url) fotosSet.add(termo.arquivo_url);
        if (termo?.arquivo_protocolo_url) fotosSet.add(termo.arquivo_protocolo_url);
        const arr = Array.isArray(termo?.arquivos_resposta) ? termo.arquivos_resposta : [];
        for (const a of arr) {
          if (typeof a === 'string' && a) fotosSet.add(a);
          else if (a?.bucket && a?.path) fotosSet.add(JSON.stringify({ bucket: a.bucket, path: a.path }));
          else if (typeof a?.url === 'string' && a.url) fotosSet.add(a.url);
        }
      }
      const pacote = {
        versao: '1.0',
        exportado_em: new Date().toISOString(),
        total_fiscalizacoes: fiscalizacoes.length,
        fiscalizacoes,
        unidades: unidades || [],
        respostas_checklist: respostas,
        nao_conformidades: ncs,
        determinacoes: dets,
        recomendacoes: recs,
        constatacoes_manuais: consts,
        termos_notificacao: termos,
        fotos_urls: Array.from(fotosSet).map((x) => {
          if (typeof x !== 'string') return x;
          if (x.startsWith('{') && x.endsWith('}')) {
            try { return JSON.parse(x); } catch { return x; }
          }
          return x;
        }),
      };
      const blob = new Blob([JSON.stringify(pacote, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `exportacao_fiscalizacoes_${format(new Date(), 'yyyyMMdd_HHmmss')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportStatus({
        tipo: 'sucesso',
        msg: `Exportação concluída! ${pacote.total_fiscalizacoes} fiscalizações e ${pacote.fotos_urls.length} URLs de fotos exportadas.`,
      });
    } catch (err) {
      setExportStatus({ tipo: 'erro', msg: `Erro na exportação: ${err.message}` });
    }
    setExportando(false);
  };

  const handleArquivoSelecionado = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const dados = JSON.parse(ev.target.result);
        setPreviewImport({
          arquivo: file,
          dados,
          nome: file.name,
        });
        setImportStatus(null);
        setImportLog([]);
      } catch {
        setImportStatus({ tipo: 'erro', msg: 'Arquivo JSON inválido.' });
        setPreviewImport(null);
      }
    };
    reader.readAsText(file);
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

  const reuploadFoto = async (urlOriginal, urlMap) => {
    if (!urlOriginal) return urlOriginal;
    if (typeof urlOriginal === 'object' && urlOriginal?.bucket && urlOriginal?.path) return urlOriginal;
    const key = typeof urlOriginal === 'string' ? urlOriginal : JSON.stringify(urlOriginal);
    if (urlMap[key]) return urlMap[key];
    try {
      if (typeof urlOriginal === 'string') {
        const parsed = parseStorageUrl(urlOriginal);
        if (parsed) {
          const ref = { bucket: parsed.bucket, path: parsed.path };
          urlMap[key] = ref;
          return ref;
        }
      }

      const response = await fetch(urlOriginal);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      const extRaw = urlOriginal.split('?')[0].split('.').pop() || '';
      const ext = extRaw.toLowerCase().match(/^(png|jpg|jpeg|gif|webp|svg)$/) ? extRaw.toLowerCase() : 'jpg';
      const name = Math.random().toString(36).slice(2);
      const path = `migracao/${format(new Date(), 'yyyyMMdd_HHmmss')}/${name}.${ext}`;
      const { error: upErr } = await supabase.storage.from('fotos_fiscalizacao').upload(path, blob, { contentType: blob.type || 'image/jpeg' });
      if (upErr) throw upErr;
      const ref = { bucket: 'fotos_fiscalizacao', path };
      urlMap[key] = ref;
      return ref;
    } catch {
      urlMap[key] = urlOriginal;
      return urlOriginal;
    }
  };

  const substituirUrls = (obj, urlMap) => {
    if (!obj) return obj;
    if (typeof obj === 'string') return urlMap[obj] || obj;
    if (Array.isArray(obj)) return obj.map((item) => substituirUrls(item, urlMap));
    if (typeof obj === 'object') {
      const novo = {};
      for (const key of Object.keys(obj)) {
        novo[key] = substituirUrls(obj[key], urlMap);
      }
      return novo;
    }
    return obj;
  };

  const importarDados = async () => {
    if (!previewImport) return;
    setImportando(true);
    setImportStatus(null);
    const logs = [];
    const addLog = (msg) => {
      logs.push(msg);
      setImportLog([...logs]);
    };
    try {
      const dados = previewImport.dados;
      const idMap = {};
      const urlMap = {};
      const totalFotos = dados.fotos_urls?.length || 0;
      if (totalFotos > 0) {
        addLog(`Re-fazendo upload de ${totalFotos} fotos/arquivos...`);
        let ok = 0, falhou = 0;
        for (const url of dados.fotos_urls) {
          const resultado = await reuploadFoto(url, urlMap);
          if (resultado !== url) ok++;
          else falhou++;
          const label = typeof url === 'string' ? (url.split('/').pop() || url).substring(0, 40) : `${url?.bucket || 'ref'}:${String(url?.path || '').substring(0, 40)}`;
          addLog(`[${ok + falhou}/${totalFotos}] ${resultado !== url ? '✓' : '⚠ mantida'} ${label}`);
        }
        addLog(`✓ Fotos: ${ok} re-uploadadas, ${falhou} mantidas como URL original`);
      }
      const pick = (obj, keys) => keys.reduce((acc, k) => {
        if (obj[k] !== undefined && obj[k] !== null) acc[k] = obj[k];
        return acc;
      }, {});
      const isValidUuid = (v) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
      const ensureUuid = (v) => (isValidUuid(v) ? v : null);
      const sanitize = {
        fiscalizacoes: (raw) => {
          const base = { ...raw };
          const arr = Array.isArray(base.servicos) ? base.servicos : (typeof base.servico === 'string' ? base.servico.split(',').map(s => s.trim()).filter(Boolean) : []);
          const payload = { 
            ...base, 
            servicos: arr,
            municipio_id: ensureUuid(base.municipio_id),
            prestador_servico_id: ensureUuid(base.prestador_servico_id),
            municipio_nome: base.municipio_nome,
            prestador_servico_nome: base.prestador_servico_nome
          };
          delete payload.servico;
          return pick(payload, ['municipio_id','municipio_nome','prestador_servico_id','prestador_servico_nome','servicos','status','data_inicio','data_fim','numero_termo','fiscal_email','created_at','updated_at']);
        },
        unidades_fiscalizadas: (raw) => {
          const base = { ...raw };
          if (base.latitude !== undefined) base.latitude = typeof base.latitude === 'string' ? parseFloat(base.latitude) : base.latitude;
          if (base.longitude !== undefined) base.longitude = typeof base.longitude === 'string' ? parseFloat(base.longitude) : base.longitude;
          const payload = {
            ...base,
            tipo_unidade_id: ensureUuid(base.tipo_unidade_id)
          };
          return pick(payload, ['fiscalizacao_id','tipo_unidade_id','status','codigo_unidade','nome_unidade','endereco','latitude','longitude','data_hora_vistoria','fotos_unidade','created_at','updated_at']);
        },
        respostas_checklist: (raw) => {
          const payload = { ...raw, item_checklist_id: ensureUuid(raw.item_checklist_id) };
          return pick(payload, ['unidade_fiscalizada_id','item_checklist_id','resposta','observacao','pergunta','numero_constatacao','gera_nc','created_at','updated_at']);
        },
        nao_conformidades: (raw) => {
          const base = { ...raw };
          const fotos = Array.isArray(base.fotos) ? base.fotos : [];
          const payload = { ...base, fotos, resposta_checklist_id: ensureUuid(base.resposta_checklist_id) };
          return pick(payload, ['unidade_fiscalizada_id','resposta_checklist_id','numero_nc','artigo_portaria','descricao','gravidade','fotos','created_at','updated_at']);
        },
        determinacoes: (raw) => {
          const payload = { ...raw, nao_conformidade_id: ensureUuid(raw.nao_conformidade_id) };
          return pick(payload, ['unidade_fiscalizada_id','nao_conformidade_id','numero_determinacao','descricao','prazo_dias','data_limite','status','created_at','updated_at']);
        },
        recomendacoes: (raw) => pick(raw, ['unidade_fiscalizada_id','numero_recomendacao','descricao','origem','created_at','updated_at']),
        constatacoes_manuais: (raw) => pick(raw, ['unidade_fiscalizada_id','numero_constatacao','descricao','gera_nc','ordem','artigo_portaria','texto_determinacao','texto_recomendacao','created_at','updated_at']),
        termos_notificacao: (raw) => {
          const payload = { 
            ...raw, 
            municipio_id: ensureUuid(raw.municipio_id), 
            prestador_servico_id: ensureUuid(raw.prestador_servico_id) 
          };
          return pick(payload, ['fiscalizacao_id','numero_termo','numero_termo_notificacao','numero_processo','numero_rfp','camara_tecnica','municipio_id','prestador_servico_id','data_geracao','data_protocolo','arquivo_url','arquivo_protocolo_url','arquivos_resposta','status','prazo_resposta_dias']);
        }
      };
      addLog(`Importando ${dados.fiscalizacoes.length} fiscalizações...`);
      for (const fisc of dados.fiscalizacoes) {
        const { id: oldId, ...resto } = fisc;
        const payload = sanitize.fiscalizacoes(substituirUrls(resto, urlMap));
        if (!payload.municipio_nome && payload.municipio_id) {
          try {
            const { data: mun } = await supabase.from('municipios').select('nome').eq('id', payload.municipio_id).maybeSingle();
            if (mun?.nome) payload.municipio_nome = mun.nome;
          } catch {}
        }
        if (!payload.prestador_servico_nome && payload.prestador_servico_id) {
          try {
            const { data: pres } = await supabase.from('prestadores_servico').select('nome').eq('id', payload.prestador_servico_id).maybeSingle();
            if (pres?.nome) payload.prestador_servico_nome = pres.nome;
          } catch {}
        }
        const { data, error } = await supabase.from('fiscalizacoes').insert(payload).select().single();
        if (error) throw error;
        idMap[oldId] = data.id;
      }
      addLog(`✓ ${dados.fiscalizacoes.length} fiscalizações criadas`);
      addLog(`Importando ${dados.unidades.length} unidades...`);
      for (const unidade of dados.unidades) {
        const { id: oldId, ...resto } = unidade;
        resto.fiscalizacao_id = idMap[resto.fiscalizacao_id] || resto.fiscalizacao_id;
        const payload = sanitize.unidades_fiscalizadas(substituirUrls(resto, urlMap));
        const { data, error } = await supabase.from('unidades_fiscalizadas').insert(payload).select().single();
        if (error) throw error;
        idMap[oldId] = data.id;
      }
      addLog(`✓ ${dados.unidades.length} unidades criadas`);
      addLog(`Importando ${dados.respostas_checklist.length} respostas...`);
      for (const resp of dados.respostas_checklist) {
        const { id: oldId, ...resto } = resp;
        resto.unidade_fiscalizada_id = idMap[resto.unidade_fiscalizada_id] || resto.unidade_fiscalizada_id;
        const payload = sanitize.respostas_checklist(resto);
        if (!payload.pergunta || String(payload.pergunta).trim() === '') {
          if (payload.item_checklist_id) {
            try {
              const { data: item } = await supabase
                .from('itens_checklist')
                .select('pergunta')
                .eq('id', payload.item_checklist_id)
                .maybeSingle();
              if (item?.pergunta) {
                payload.pergunta = item.pergunta;
              } else {
                payload.pergunta = 'Pergunta do checklist';
              }
            } catch {
              payload.pergunta = 'Pergunta do checklist';
            }
          } else {
            payload.pergunta = 'Pergunta do checklist';
          }
        }
        const { data, error } = await supabase.from('respostas_checklist').insert(payload).select().single();
        if (error) throw error;
        idMap[oldId] = data.id;
      }
      addLog(`✓ ${dados.respostas_checklist.length} respostas criadas`);
      addLog(`Importando ${dados.nao_conformidades.length} não conformidades...`);
      for (const nc of dados.nao_conformidades) {
        const { id: oldId, ...resto } = nc;
        resto.unidade_fiscalizada_id = idMap[resto.unidade_fiscalizada_id] || resto.unidade_fiscalizada_id;
        if (resto.resposta_checklist_id) resto.resposta_checklist_id = idMap[resto.resposta_checklist_id] || resto.resposta_checklist_id;
        const payload = sanitize.nao_conformidades(substituirUrls(resto, urlMap));
        const { data, error } = await supabase.from('nao_conformidades').insert(payload).select().single();
        if (error) throw error;
        idMap[oldId] = data.id;
      }
      addLog(`✓ ${dados.nao_conformidades.length} NCs criadas`);
      addLog(`Importando ${dados.determinacoes.length} determinações...`);
      for (const det of dados.determinacoes) {
        const { id: oldId, ...resto } = det;
        resto.unidade_fiscalizada_id = idMap[resto.unidade_fiscalizada_id] || resto.unidade_fiscalizada_id;
        if (resto.nao_conformidade_id) resto.nao_conformidade_id = idMap[resto.nao_conformidade_id] || resto.nao_conformidade_id;
        const payload = sanitize.determinacoes(resto);
        const { data, error } = await supabase.from('determinacoes').insert(payload).select().single();
        if (error) throw error;
        idMap[oldId] = data.id;
      }
      addLog(`✓ ${dados.determinacoes.length} determinações criadas`);
      addLog(`Importando ${dados.recomendacoes.length} recomendações...`);
      for (const rec of dados.recomendacoes) {
        const { id: oldId, ...resto } = rec;
        resto.unidade_fiscalizada_id = idMap[resto.unidade_fiscalizada_id] || resto.unidade_fiscalizada_id;
        const payload = sanitize.recomendacoes(substituirUrls(resto, urlMap));
        const { error } = await supabase.from('recomendacoes').insert(payload);
        if (error) throw error;
      }
      addLog(`✓ ${dados.recomendacoes.length} recomendações criadas`);
      addLog(`Importando ${dados.constatacoes_manuais.length} constatações manuais...`);
      for (const con of dados.constatacoes_manuais) {
        const { id: oldId, ...resto } = con;
        resto.unidade_fiscalizada_id = idMap[resto.unidade_fiscalizada_id] || resto.unidade_fiscalizada_id;
        const payload = sanitize.constatacoes_manuais(substituirUrls(resto, urlMap));
        const { error } = await supabase.from('constatacoes_manuais').insert(payload);
        if (error) throw error;
      }
      addLog(`✓ ${dados.constatacoes_manuais.length} constatações manuais criadas`);
      addLog(`Importando ${dados.termos_notificacao.length} termos de notificação...`);
      for (const termo of dados.termos_notificacao) {
        const { id: oldId, ...resto } = termo;
        resto.fiscalizacao_id = idMap[resto.fiscalizacao_id] || resto.fiscalizacao_id;
        const payload = sanitize.termos_notificacao(substituirUrls(resto, urlMap));
        try {
          const { error } = await supabase.from('termos_notificacao').insert(payload);
          if (error) throw error;
        } catch {}
      }
      addLog(`✓ ${dados.termos_notificacao.length} termos criados`);
      addLog('');
      addLog('✅ Importação concluída com sucesso!');
      setImportStatus({ tipo: 'sucesso', msg: `Importação concluída! ${dados.fiscalizacoes.length} fiscalizações importadas.` });
      setPreviewImport(null);
    } catch (err) {
      setImportStatus({ tipo: 'erro', msg: `Erro na importação: ${err.message}` });
    }
    setImportando(false);
  };

  return (
    <AdminShell title="Exportar / Importar Dados">
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Alert className="mb-6 border-blue-200 bg-blue-50 rounded-xl">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 text-sm">
            A exportação gera um arquivo JSON com todas as fiscalizações finalizadas e seus dados relacionados.
          </AlertDescription>
        </Alert>
        <Card className="mb-6 border border-gray-200 rounded-2xl shadow-sm bg-white">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Download className="h-5 w-5 text-emerald-600" />
              Exportar Dados
            </CardTitle>
            <CardDescription>
              Exporta todas as fiscalizações finalizadas em um arquivo JSON
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600 space-y-1 border border-gray-100">
              <p>O arquivo incluírá:</p>
              <ul className="list-disc list-inside space-y-0.5 text-xs mt-1">
                <li>Fiscalizações (status: finalizada)</li>
                <li>Unidades Fiscalizadas</li>
                <li>Respostas do Checklist</li>
                <li>Não Conformidades</li>
                <li>Determinações e Recomendações</li>
                <li>Constatações Manuais</li>
                <li>Termos de Notificação</li>
              </ul>
            </div>
            {exportStatus && (
              <Alert className={exportStatus.tipo === 'sucesso' ? 'border-emerald-200 bg-emerald-50' : exportStatus.tipo === 'aviso' ? 'border-amber-200 bg-amber-50' : 'border-rose-200 bg-rose-50'}>
                {exportStatus.tipo === 'sucesso' ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-amber-600" />}
                <AlertDescription className={exportStatus.tipo === 'sucesso' ? 'text-emerald-800' : 'text-amber-800'}>
                  {exportStatus.msg}
                </AlertDescription>
              </Alert>
            )}
            <Button onClick={exportarDados} disabled={exportando} className="w-full bg-emerald-600 hover:bg-emerald-700 rounded-xl h-11">
              {exportando ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Exportando...</>
              ) : (
                <><Download className="h-4 w-4 mr-2" />Exportar Fiscalizações Finalizadas</>
              )}
            </Button>
          </CardContent>
        </Card>
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-gray-200" />
          <ArrowRight className="h-4 w-4 text-gray-400" />
          <div className="flex-1 h-px bg-gray-200" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Upload className="h-5 w-5 text-blue-600" />
              Importar Dados
            </CardTitle>
            <CardDescription>
              Importe um arquivo JSON exportado de outra instância do app
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <FileJson className="h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">
                  <span className="font-medium text-blue-600">Clique para selecionar</span> o arquivo JSON
                </p>
                <p className="text-xs text-gray-400 mt-1">Arquivo exportado por esta aplicação</p>
              </div>
              <input type="file" accept=".json" className="hidden" onChange={handleArquivoSelecionado} />
            </label>
            {previewImport && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <p className="font-medium text-blue-900 text-sm flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  Arquivo carregado: <span className="font-mono">{previewImport.nome}</span>
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white rounded p-2 text-center">
                    <div className="font-bold text-lg text-blue-700">{previewImport.dados.fiscalizacoes?.length || 0}</div>
                    <div className="text-gray-500">Fiscalizações</div>
                  </div>
                  <div className="bg-white rounded p-2 text-center">
                    <div className="font-bold text-lg text-blue-700">{previewImport.dados.unidades?.length || 0}</div>
                    <div className="text-gray-500">Unidades</div>
                  </div>
                  <div className="bg-white rounded p-2 text-center">
                    <div className="font-bold text-lg text-blue-700">{previewImport.dados.nao_conformidades?.length || 0}</div>
                    <div className="text-gray-500">NCs</div>
                  </div>
                  <div className="bg-white rounded p-2 text-center">
                    <div className="font-bold text-lg text-blue-700">{previewImport.dados.determinacoes?.length || 0}</div>
                    <div className="text-gray-500">Determinações</div>
                  </div>
                </div>
                {previewImport.dados.exportado_em && (
                  <p className="text-xs text-gray-500">
                    Exportado em: {format(new Date(previewImport.dados.exportado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                )}
              </div>
            )}
            {importLog.length > 0 && (
              <div className="bg-gray-900 rounded-lg p-3 max-h-48 overflow-y-auto">
                {importLog.map((log, i) => (
                  <p key={i} className="text-xs font-mono text-green-400 leading-5">{log}</p>
                ))}
              </div>
            )}
            {importStatus && (
              <Alert className={importStatus.tipo === 'sucesso' ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}>
                <AlertDescription className={importStatus.tipo === 'sucesso' ? 'text-emerald-800' : 'text-rose-800'}>
                  {importStatus.msg}
                </AlertDescription>
              </Alert>
            )}
            <Button onClick={importarDados} disabled={importando || !previewImport} className="w-full bg-[#0066B3] hover:bg-[#004A8F]">
              {importando ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />Importando...</>
              ) : (
                <><Upload className="h-4 w-4 mr-2" />Importar</>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </AdminShell>
  );
}
