import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Repository } from '@/lib/offline/repository';
import { snapToHighway, parseKMLSegments, snapToNearestKMLSegment, findNearestKmPoint, parseKMLKmPoints } from '@/utils/rodoviasGeoJSON';
import PhotoGrid from '@/components/fiscalizacao/PhotoGrid';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, ArrowRight, Loader2, Save, RotateCcw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { invokeEdgeFunction } from '@/lib/edgeFunctions';
import { db } from '@/lib/offline/db';

const TIPOS_FALLBACK = [
    { frente: 'RECUPERAÇÃO E MANUTENÇÃO', item_contrato: '3.1.1 Pavimento', descricao: 'Exsudação', nome: 'Exsudação', nao_atendimento: null, prazo_dias_padrao: null },
    { frente: 'RECUPERAÇÃO E MANUTENÇÃO', item_contrato: '3.1.1 Pavimento', descricao: 'Elementos indesejáveis', nome: 'Elementos indesejáveis', nao_atendimento: null, prazo_dias_padrao: null },
    { frente: 'RECUPERAÇÃO E MANUTENÇÃO', item_contrato: '3.1.1 Pavimento', descricao: 'Buraco / Panela na pista', nome: 'Buraco / Panela na pista', nao_atendimento: '3.1.1 Ausência de defeitos no revestimento do pavimento do tipo panela, afundamento de trilha de roda.', prazo_dias_padrao: 3 },
    { frente: 'RECUPERAÇÃO E MANUTENÇÃO', item_contrato: '3.1.1 Pavimento', descricao: 'Afundamento de trilha de roda', nome: 'Afundamento de trilha de roda', nao_atendimento: null, prazo_dias_padrao: 15 },
    { frente: 'RECUPERAÇÃO E MANUTENÇÃO', item_contrato: '3.1.1 Pavimento', descricao: 'Outros', nome: 'Outros (Pavimento)', nao_atendimento: null, prazo_dias_padrao: null },
    { frente: 'RECUPERAÇÃO E MANUTENÇÃO', item_contrato: '3.1.2 Sinalização e Elementos de Proteção e Segurança', descricao: 'Sinalização vertical danificada ou ausente', nome: 'Sinalização vertical danificada ou ausente', nao_atendimento: null, prazo_dias_padrao: 3 },
    { frente: 'RECUPERAÇÃO E MANUTENÇÃO', item_contrato: '3.1.2 Sinalização e Elementos de Proteção e Segurança', descricao: 'Sinalização horizontal apagada ou desgastada', nome: 'Sinalização horizontal apagada', nao_atendimento: null, prazo_dias_padrao: 15 },
    { frente: 'RECUPERAÇÃO E MANUTENÇÃO', item_contrato: '3.1.2 Sinalização e Elementos de Proteção e Segurança', descricao: 'Defensa metálica danificada ou ausente', nome: 'Defensa metálica danificada', nao_atendimento: null, prazo_dias_padrao: 7 },
    { frente: 'RECUPERAÇÃO E MANUTENÇÃO', item_contrato: '3.1.3 Obras de Arte Especiais', descricao: 'Irregularidade em obra de arte especial', nome: 'Irregularidade em OAE', nao_atendimento: null, prazo_dias_padrao: null },
    { frente: 'RECUPERAÇÃO E MANUTENÇÃO', item_contrato: '3.1.4 Sistemas de Drenagem e Obras-de-Arte Correntes', descricao: 'Drenagem obstruída ou assoreada', nome: 'Drenagem obstruída', nao_atendimento: null, prazo_dias_padrao: 15 },
    { frente: 'RECUPERAÇÃO E MANUTENÇÃO', item_contrato: '3.1.5 Terraplenos e Estruturas de Contenção', descricao: 'Deslizamento ou erosão em terrapleno', nome: 'Deslizamento/erosão', nao_atendimento: null, prazo_dias_padrao: null },
    { frente: 'RECUPERAÇÃO E MANUTENÇÃO', item_contrato: '3.1.6 Canteiro Central e Faixa de Domínio', descricao: 'Vegetação alta no acostamento / faixa de domínio', nome: 'Vegetação alta', nao_atendimento: '3.1.6 Ausência total de vegetação rasteira com comprimento superior a 40,0 cm em toda a extensão da faixa de domínio.', prazo_dias_padrao: 15 },
    { frente: 'RECUPERAÇÃO E MANUTENÇÃO', item_contrato: '3.1.8 Sistemas Elétricos e de Iluminação', descricao: 'Iluminação com defeito ou ausente', nome: 'Iluminação com defeito', nao_atendimento: null, prazo_dias_padrao: null },
    { frente: 'MELHORIAS OPERACIONAIS, DE AMPLIAÇÃO DE CAPACIDADE E DE MANUTENÇÃO DO NÍVEL DE SERVIÇO', item_contrato: 'Melhorias Gerais', descricao: 'Melhoria operacional identificada', nome: 'Melhoria operacional', nao_atendimento: null, prazo_dias_padrao: null },
    { frente: 'CONSERVAÇÃO', item_contrato: 'Conservação Geral', descricao: 'Ponto de conservação', nome: 'Conservação geral', nao_atendimento: null, prazo_dias_padrao: null },
    { frente: 'SERVIÇOS OPERACIONAIS', item_contrato: '3.4.5.1 Atendimento Médico de Emergência', descricao: 'Ausência de ambulância / serviço médico', nome: 'Ausência de ambulância', nao_atendimento: '3.4.5.1. Disponibilização de serviço de atendimento médico de emergência 24:00 horas por dia, inclusive sábados, domingos e feriados.', prazo_dias_padrao: 1 },
];

const BASE_STEPS = ['fotos', 'frente', 'per', 'descricao', 'tipo', 'sentido', 'observacao'];

// ─── Ordenação do checklist DTR ─────────────────────────────────────────────────
// Regra:
// 1. "Frentes da concessão" (1ª etapa) usa uma ordem fixa e manual (não segue
//    numeração nem alfabeto — é a ordem combinada com a equipe de fiscalização).
// 2. Todo o resto (PERs dentro de uma frente, itens dentro de um PER): se o rótulo
//    começa com numeração (ex: "3.1.1"), ordena crescente por essa numeração; sem
//    numeração, ordena em ordem alfabética (pt-BR, sem diferenciar maiúsculas/acentos).

const FRENTE_ORDER = [
    'RECUPERAÇÃO E MANUTENÇÃO',
    'MELHORIAS OPERACIONAIS, DE AMPLIAÇÃO DE CAPACIDADE E DE MANUTENÇÃO DO NÍVEL DE SERVIÇO',
    'CONSERVAÇÃO',
    'SERVIÇOS OPERACIONAIS',
];

// Extrai o código numérico líder de um rótulo (ex: "3.1.1. Pavimento" → "3.1.1")
const extractLeadingCode = (label) => {
    const m = String(label || '').trim().match(/^(\d+(?:\.\d+)*)/);
    return m ? m[1] : '';
};

// Compara dois códigos segmento a segmento como números — evita o bug de
// ordenação lexicográfica onde "3.1.10" viria antes de "3.1.2".
const compareCodes = (a, b) => {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);
    const len = Math.max(partsA.length, partsB.length);
    for (let i = 0; i < len; i++) {
        const diff = (partsA[i] ?? 0) - (partsB[i] ?? 0);
        if (diff !== 0) return diff;
    }
    return 0;
};

const isOutros = (label) => String(label || '').trim().toLowerCase() === 'outros';

// Comparador geral: numeração crescente quando presente, senão ordem alfabética.
// "Outros" é sempre a última opção, independente de numeração/alfabeto.
const compareChecklistOption = (a, b) => {
    const outrosA = isOutros(a);
    const outrosB = isOutros(b);
    if (outrosA && outrosB) return 0;
    if (outrosA) return 1;
    if (outrosB) return -1;
    const codeA = extractLeadingCode(a);
    const codeB = extractLeadingCode(b);
    if (codeA && codeB) return compareCodes(codeA, codeB);
    if (codeA && !codeB) return -1;
    if (!codeA && codeB) return 1;
    return String(a || '').trim().localeCompare(String(b || '').trim(), 'pt-BR', { sensitivity: 'base' });
};

// Ignora diferenças de espaçamento/maiúsculas ao comparar rótulos vindos do banco
// (ex: planilha importada com "DECAPACIDADE" em vez de "DE CAPACIDADE") — sem isso,
// uma frente com espaçamento levemente diferente do esperado não batia com a lista
// fixa e caía silenciosamente pro final da ordenação.
const fingerprintLabel = (s) => String(s || '').toUpperCase().replace(/\s+/g, '');

// Ordena `list` conforme a posição de cada item em `order`; itens ausentes de
// `order` vão para o final, preservando a ordem relativa original entre eles.
const sortByFixedOrder = (list, order) => {
    const fingerprintedOrder = order.map(fingerprintLabel);
    return [...list].sort((a, b) => {
        const ia = fingerprintedOrder.indexOf(fingerprintLabel(a));
        const ib = fingerprintedOrder.indexOf(fingerprintLabel(b));
        if (ia === -1 && ib === -1) return 0;
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
    });
};

function RadioCard({ label, selected, onSelect, disabled }) {
    return (
        <button
            type="button"
            onClick={disabled ? undefined : onSelect}
            disabled={disabled}
            className={`w-full text-left rounded-2xl border px-4 py-4 transition-all flex items-center gap-3 ${
                selected
                    ? 'bg-[#3d3d3d] text-white border-[#3d3d3d] shadow-md'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400 active:bg-gray-50'
            } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                selected ? 'border-white' : 'border-gray-400'
            }`}>
                {selected && <div className="w-2.5 h-2.5 rounded-full bg-white" />}
            </div>
            <span className="text-sm font-medium leading-snug">{label}</span>
        </button>
    );
}

export default function VistoriarOcorrenciaDTR() {
    const queryClient = useQueryClient();
    const navigate = useNavigate();
    const loc = useLocation();
    const searchParams = new URLSearchParams(loc.search);
    const fiscId = searchParams.get('fiscId');
    const occurrenceId = searchParams.get('id');

    const [stepIdx, setStepIdx] = useState(0);
    const [fotos, setFotos] = useState([]);
    const [fotosDirty, setFotosDirty] = useState(false);
    const fotosCarregadasRef = useRef(null);
    const kmLockedByPhotoRef = useRef(false);
    const [fixingDtr, setFixingDtr] = useState(false);
    const [fixProgress, setFixProgress] = useState('');
    const [fixError, setFixError] = useState(null);
    const [selectedFrente, setSelectedFrente] = useState('');
    const [selectedPer, setSelectedPer] = useState('');
    const [selectedItem, setSelectedItem] = useState(null);
    const [perIsOutros, setPerIsOutros] = useState(false);
    const [tipoRegistro, setTipoRegistro] = useState('');
    const [etapaObra, setEtapaObra] = useState('');
    const [sentido, setSentido] = useState('');
    const [observacao, setObservacao] = useState('');
    const [km, setKm] = useState('');
    const [trecho, setTrecho] = useState('');
    const [rodoviaSnapped, setRodoviaSnapped] = useState('');
    const [kmPoints, setKmPoints] = useState(null);
    const [kmlSegments, setKmlSegments] = useState([]);
    const [kmDataLoaded, setKmDataLoaded] = useState(false);
    const [location, setLocation] = useState(null);
    const [gettingLocation, setGettingLocation] = useState(false);
    const [gpsAccuracy, setGpsAccuracy] = useState(null);
    const [gpsError, setGpsError] = useState(null);
    const [gpsRetryTick, setGpsRetryTick] = useState(0);
    const MIN_GPS_ACCURACY_M = 20;
    const { data: fisc } = useQuery({
        queryKey: ['fiscalizacao', fiscId],
        queryFn: () => Repository.getFiscalizacaoById(fiscId),
        enabled: !!fiscId
    });

    // Carrega referências KM — 100% local (Dexie): km_points já vem sincronizado
    // no registro do contrato pelo syncEngine normal, sem precisar de rede aqui.
    // kmDataLoaded vira true assim que essa consulta local termina, então nunca
    // trava a liberação da câmera esperando internet.
    // O download do KML por rede é só um fallback legado (contratos antigos sem
    // km_points sincronizado) e roda em segundo plano, sem bloquear nada.
    useEffect(() => {
        if (!fisc) return;
        if (!fisc.rodovia) { setKmDataLoaded(true); return; }
        Repository.getKmPointsForRodovia(fisc.rodovia).then(pts => {
            if (pts && pts.length > 0) { setKmPoints(pts); return; }
            Repository.downloadKMLForRodovia(fisc.rodovia).then(kmlText => {
                if (!kmlText) return;
                const kmlPts = parseKMLKmPoints(kmlText);
                if (kmlPts && kmlPts.length > 0) { setKmPoints(kmlPts); return; }
                const segs = parseKMLSegments(kmlText);
                if (segs.length > 0) setKmlSegments(segs);
            }).catch(() => {});
        }).catch(() => {}).finally(() => setKmDataLoaded(true));
    }, [fisc]);

    const fiscRodovia = fisc?.rodovia ?? null;
    const { data: tiposDB = [] } = useQuery({
        queryKey: ['tipos_ocorrencia_dtr', fiscRodovia],
        queryFn: () => Repository.listTiposOcorrenciaDTR(fiscRodovia),
        staleTime: 5 * 60 * 1000
    });
    const tipos = tiposDB.length > 0 ? tiposDB : TIPOS_FALLBACK;

    const { data: ocorrencia } = useQuery({
        queryKey: ['unidade', occurrenceId],
        queryFn: () => Repository.getUnidadeById(occurrenceId),
        enabled: !!occurrenceId
    });

    const frentes = sortByFixedOrder(
        [...new Set(tipos.map(t => t.frente).filter(Boolean))],
        FRENTE_ORDER
    );
    const pers = [...new Set(
        tipos.filter(t => t.frente === selectedFrente).map(t => t.item_contrato).filter(Boolean)
    )].sort(compareChecklistOption);
    // Deduplica por descricao: mesma descrição pode existir para rodovias diferentes na planilha.
    // Prefere a versão com rodovia específica sobre a genérica (rodovia null).
    const itemsForPer = useMemo(() => {
        const all = tipos.filter(
            t => t.frente === selectedFrente && t.item_contrato === selectedPer
        );
        const byDesc = new Map();
        for (const item of all) {
            const key = (item.descricao || item.nome || '').trim();
            if (!key) continue;
            const existing = byDesc.get(key);
            if (!existing || (item.rodovia && !existing.rodovia)) {
                byDesc.set(key, item);
            }
        }
        const items = [...byDesc.values()];
        return items.sort((a, b) => compareChecklistOption(a.descricao || a.nome || '', b.descricao || b.nome || ''));
    }, [tipos, selectedFrente, selectedPer]);

    // Steps dinâmicos: insere 'etapa_obra' entre 'descricao' e 'tipo' quando o item tem etapas
    const activeSteps = useMemo(() => {
        const s = ['fotos', 'frente', 'per', 'descricao'];
        if (selectedItem?.etapas_obra?.trim()) s.push('etapa_obra');
        s.push('tipo', 'sentido', 'observacao');
        return s;
    }, [selectedItem?.etapas_obra]);

    // Opções de etapa separadas por \n
    const etapaOptions = useMemo(() => {
        if (!selectedItem?.etapas_obra?.trim()) return [];
        return selectedItem.etapas_obra.split('\n').map(e => e.trim()).filter(Boolean);
    }, [selectedItem?.etapas_obra]);

    // GPS on mount for new occurrences — só roda depois que kmDataLoaded confirma que
    // kmPoints/kmlSegments já terminaram de carregar (ou que não há dados a carregar),
    // para nunca resolver o KM com base num fallback incompleto.
    // Nunca bloqueia a câmera esperando precisão: numa rodovia com o carro em
    // movimento, perder a foto é pior do que registrar um KM impreciso sinalizado
    // para revisão manual depois. Por isso o watch fica sempre ativo (não para no
    // primeiro fix) e o KM/rodovia são atualizados a cada posição recebida, ficando
    // cada vez mais precisos conforme o GPS converge.
    useEffect(() => {
        if (!fisc || occurrenceId || !kmDataLoaded) return;
        let watchId = null;
        let cancelled = false;
        setGettingLocation(true);
        setGpsError(null);
        setGpsAccuracy(null);

        const resolveKm = (lat, lng) => {
            if (kmPoints && kmPoints.length > 0) {
                const nearest = findNearestKmPoint(kmPoints, lat, lng);
                setKm(nearest?.km || '');
                setRodoviaSnapped(nearest?.rodovia || fisc.rodovia || '');
            } else if (kmlSegments.length > 0) {
                const snapped = snapToNearestKMLSegment(lat, lng, kmlSegments);
                setKm(snapped.km);
                setRodoviaSnapped(snapped.rodovia || fisc.rodovia || '');
            } else {
                const snapped = snapToHighway(lat, lng, fisc.rodovia);
                setKm(snapped.km);
                setTrecho(snapped.trecho);
                setRodoviaSnapped(fisc.rodovia || '');
            }
        };

        watchId = navigator.geolocation.watchPosition(
            (pos) => {
                if (cancelled) return;
                const { latitude: lat, longitude: lng, accuracy } = pos.coords;
                setGpsAccuracy(accuracy);
                setGpsError(null);
                // Só atualiza coordenadas e KM/rodovia se nenhuma foto já travou o valor.
                // Após a primeira foto, a localização e o KM ficam fixos na coordenada da foto
                // para garantir que tabela = marca d'água.
                if (!kmLockedByPhotoRef.current) {
                    setLocation({ lat, lng });
                    resolveKm(lat, lng);
                }
                setGettingLocation(false);
                // Continua observando (não limpa o watch): a cada posição nova, o KM é
                // recalculado, refinando conforme o GPS converge ou o veículo avança.
            },
            (err) => {
                if (cancelled) return;
                if (err?.code === 1) {
                    setGpsError('Permissão de localização negada. Habilite o GPS para registrar o KM.');
                    setGettingLocation(false);
                } else {
                    setGpsError('Aguardando sinal de GPS...');
                }
            },
            { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
        );

        return () => {
            cancelled = true;
            if (watchId != null) navigator.geolocation.clearWatch(watchId);
        };
    }, [fisc, occurrenceId, kmDataLoaded, gpsRetryTick]);

    // Edit mode: pre-populate state and jump to last step
    useEffect(() => {
        if (!occurrenceId || !ocorrencia) return;
        const frente = ocorrencia.frente || '';
        const per = ocorrencia.per || '';
        setSelectedFrente(frente);
        setSelectedPer(per);
        const match = tipos.find(t =>
            t.frente === frente &&
            t.item_contrato === per &&
            (t.descricao || t.nome) === (ocorrencia.nome_unidade || '')
        );
        setSelectedItem(match || (ocorrencia.nome_unidade ? { descricao: ocorrencia.nome_unidade } : null));
        const perExists = tipos.some(t => t.frente === frente && t.item_contrato === per);
        setPerIsOutros(!!per && !perExists);
        const tr = ocorrencia.tipo_ocorrencia;
        setTipoRegistro(tr === 'nc' || tr === 'constatacao' ? tr : '');
        setSentido(ocorrencia.sentido || '');
        setObservacao(ocorrencia.endereco || '');
        setKm(ocorrencia.km || '');
        setTrecho(ocorrencia.trecho || '');
        setRodoviaSnapped(ocorrencia.rodovia || fisc?.rodovia || '');
        if (ocorrencia.latitude && ocorrencia.longitude) {
            setLocation({ lat: ocorrencia.latitude, lng: ocorrencia.longitude });
        }
        setStepIdx(BASE_STEPS.length - 1);
    }, [occurrenceId, ocorrencia]);

    // Load photos in edit mode — espera a query de `ocorrencia` carregar antes de travar
    // o ref de "já carregado". Sem isso, a primeira execução do efeito roda com
    // ocorrencia ainda undefined (query em voo), mescla só as fotos locais não
    // sincronizadas (ou nenhuma, se já sincronizadas) e trava o ref, fazendo as fotos
    // já salvas em fotos_unidade nunca mais serem carregadas nessa visita à página.
    useEffect(() => {
        if (!occurrenceId) return;
        if (fotosCarregadasRef.current === occurrenceId) return;
        if (!ocorrencia) return;
        const isLocalUrl = (u) => /^blob:|^data:|^file:|^capacitor:/i.test(String(u || ''));
        (async () => {
            try {
                const remotas = (Array.isArray(ocorrencia?.fotos_unidade) ? ocorrencia.fotos_unidade : [])
                    .map(f => typeof f === 'string' ? { url: f } : f)
                    .filter(f => f && f.url && !isLocalUrl(f.url));
                const locais = await Repository.listLocalFotos(occurrenceId).then(list =>
                    list.map(f => ({ localId: f.localId, url: f.url || '', legenda: f.legenda || '', mimeType: f.mimeType, width: f.width, height: f.height }))
                );
                const merged = [];
                const seen = new Set();
                const add = (f) => {
                    const key = f.localId || f.path || f.url || '';
                    if (key && seen.has(key)) return;
                    if (key) seen.add(key);
                    merged.push(f);
                };
                remotas.forEach(add);
                locais.forEach(add);
                setFotos(merged);
                fotosCarregadasRef.current = occurrenceId;
                setFotosDirty(false);
            } catch (err) {
                console.error('[Fotos DTR]', err);
            }
        })();
    }, [occurrenceId, ocorrencia, fotosDirty]);

    const salvarMutation = useMutation({
        mutationFn: async () => {
            if (readOnly) throw new Error('Fiscalização finalizada — não é possível editar esta ocorrência.');
            const targetId = occurrenceId;
            let uId = targetId || '';
            const descricaoItem = selectedItem?.descricao || selectedItem?.nome || '';
            const payload = {
                nome_unidade: descricaoItem,
                endereco: observacao,
                latitude: location?.lat ?? null,
                longitude: location?.lng ?? null,
                rodovia: rodoviaSnapped || fisc?.rodovia || '',
                trecho: trecho,
                km: km,
                sentido: sentido || null,
                tipo_ocorrencia: tipoRegistro,
                frente: selectedFrente,
                per: selectedPer,
                nao_atendimento: tipoRegistro === 'nc' ? (selectedItem?.nao_atendimento || '') : null,
                prazo_dias_nc: tipoRegistro === 'nc' ? (selectedItem?.prazo_dias_padrao || null) : null,
                status: 'finalizada',
                // Só grava/atualiza a precisão do GPS numa ocorrência nova, cujo KM acabou
                // de ser resolvido agora. Editar uma ocorrência já salva não deve mexer
                // nessa flag, senão qualquer edição de outro campo apagaria o aviso de
                // "KM impreciso" de um registro que já foi sinalizado antes.
                ...(!occurrenceId ? { gps_accuracy_m: gpsAccuracy ?? null, km_impreciso: !kmPreciso } : {})
            };
            if (targetId) {
                await Repository.updateUnidadeDTR(targetId, payload);
            } else {
                const res = await Repository.createUnidade({ fiscalizacao_id: fiscId, tipo_unidade_id: null, ...payload });
                uId = res.id;
                await Repository.reassignLocalFotos('novo-ponto', uId);
            }
            const fotosCompletas = fotos.map(f => typeof f === 'string'
                ? { url: f, legenda: '', mimeType: undefined, width: undefined, height: undefined }
                : { url: f.url, bucket: f.bucket, path: f.path, legenda: f.legenda || '', mimeType: f.mimeType, width: f.width, height: f.height, localId: f.localId }
            );
            await Repository.updateUnidadeFotos(uId, fotosCompletas);
            return uId;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['unidades', fiscId] });
            queryClient.invalidateQueries({ queryKey: ['unidade', occurrenceId] });
            navigate(createPageUrl('ExecutarFiscalizacaoDTR') + `?id=${fiscId}`);
        },
        onError: (err) => alert(err.message || 'Falha ao salvar ocorrência.')
    });

    // Nunca bloqueia a captura por precisão de GPS — numa rodovia com o carro em
    // movimento, perder a foto é pior do que gravar um KM impreciso sinalizado para
    // revisão manual. Só espera o carregamento local (kmDataLoaded), que é quase
    // instantâneo por ser 100% offline.
    const kmReady = !!occurrenceId || kmDataLoaded;
    const captureBlockedMessage = 'Carregando dados da rodovia...';
    const kmPreciso = gpsAccuracy != null && gpsAccuracy <= MIN_GPS_ACCURACY_M;

    // Fiscalização finalizada: ocorrências existentes só podem ser visualizadas,
    // nunca editadas — sem essa checagem, o wizard abria em modo de edição total
    // (inclusive com o botão Salvar ativo) mesmo depois de a vistoria já ter sido
    // encerrada.
    const isFinalized = fisc?.status === 'finalizada';
    const readOnly = !!occurrenceId && isFinalized;

    const currentStep = activeSteps[stepIdx];
    const isLastStep = stepIdx === activeSteps.length - 1;

    const goBack = () => {
        if (stepIdx === 0) {
            if (fotos.length > 0 && !occurrenceId) {
                if (!confirm('Sair agora? As fotos podem ser perdidas.')) return;
            }
            navigate(createPageUrl('ExecutarFiscalizacaoDTR') + `?id=${fiscId}`);
        } else {
            setStepIdx(s => s - 1);
        }
    };
    const goNext = () => setStepIdx(s => s + 1);

    // Auto-avança após selecionar uma opção (com delay para mostrar feedback visual)
    const selectAndAdvance = (setFn, value) => {
        setFn(value);
        if (!isLastStep) setTimeout(goNext, 200);
    };

    const canProceed = {
        fotos: true,
        frente: !!selectedFrente,
        per: !!selectedPer,
        descricao: !!selectedItem,
        etapa_obra: !!etapaObra,
        tipo: !!tipoRegistro,
        sentido: !!sentido,
        observacao: true,
    }[currentStep] ?? true;

    const addFoto = (f) => {
        setFotos(p => [...p, f]);
        setFotosDirty(true);
        // Sincroniza KM/rodovia e Coordenadas do state com o valor da primeira foto
        // de forma que tanto a tabela quanto a marca d'água usem a mesma coordenada e KM válidos.
        // Trava a localização e o KM para que o watchPosition não sobrescreva depois.
        if (!kmLockedByPhotoRef.current) {
            if (f.resolvedKm) setKm(f.resolvedKm);
            if (f.resolvedRodovia) setRodoviaSnapped(f.resolvedRodovia);
            if (f.latitude && f.longitude) {
                setLocation({ lat: f.latitude, lng: f.longitude });
            }
            kmLockedByPhotoRef.current = true;
        }
    };
    const removeFoto = (i) => {
        setFotos(p => {
            const list = p.filter((_, j) => j !== i);
            if (list.length === 0) {
                kmLockedByPhotoRef.current = false;
            }
            const alvo = p[i];
            if (alvo?.localId) Repository.deleteLocalFoto(alvo.localId).catch(() => {});
            return list;
        });
        setFotosDirty(true);
    };
    const updateLegenda = (i, leg) => {
        setFotos(p => {
            const n = [...p];
            const a = n[i];
            n[i] = typeof a === 'string' ? { url: a, legenda: leg } : { ...a, legenda: leg };
            if (a?.localId) Repository.updateLocalFotoLegenda(a.localId, leg).catch(() => {});
            return n;
        });
        setFotosDirty(true);
    };

    const stepLabel = {
        fotos: 'Fotos',
        frente: 'Frentes da Concessão',
        per: `Frente: ${selectedFrente}`,
        descricao: selectedPer || 'Item',
        etapa_obra: 'Etapa da Obra',
        tipo: 'Tipo',
        sentido: 'Sentido',
        observacao: 'Observação'
    }[currentStep] || '';

    const handleFixFinalizedInspection = async () => {
        if (!confirm('Deseja recalcular todos os KMs desta fiscalização a partir das coordenadas reais das fotos e atualizar as marcas d\'água das imagens?')) return;
        setFixingDtr(true);
        setFixError(null);
        setFixProgress('Carregando ocorrências...');
        try {
            // 1. Carrega unidades da fiscalização do Supabase
            const { data: unidades, error: uErr } = await supabase
                .from('unidades_fiscalizadas')
                .select('*')
                .eq('fiscalizacao_id', fiscId);
            if (uErr) throw uErr;
            if (!unidades || unidades.length === 0) throw new Error('Nenhuma ocorrência encontrada para esta fiscalização.');

            // 2. Carrega os kmPoints da rodovia
            setFixProgress('Carregando referências de KM...');
            const rodoviaId = fisc?.rodovia;
            if (!rodoviaId) throw new Error('Rodovia da fiscalização não especificada.');
            let pts = kmPoints;
            if (!pts || pts.length === 0) {
                pts = await Repository.getKmPointsForRodovia(rodoviaId);
            }
            if (!pts || pts.length === 0) {
                // Tenta baixar KML
                const kmlText = await Repository.downloadKMLForRodovia(rodoviaId);
                if (kmlText) {
                    pts = parseKMLKmPoints(kmlText);
                }
            }
            if (!pts || pts.length === 0) {
                throw new Error(`Não foi possível carregar as referências de KM para a rodovia ${rodoviaId}.`);
            }

            // 3. Processa cada ocorrência
            for (let i = 0; i < unidades.length; i++) {
                const u = unidades[i];
                setFixProgress(`Processando ocorrência ${i + 1}/${unidades.length} (${u.nome_unidade || 'Sem Nome'})...`);

                const lat = u.latitude;
                const lng = u.longitude;
                if (!lat || !lng) {
                    console.log(`Ocorrência ${u.id} sem coordenadas válidas.`);
                    continue;
                }

                // Acha o ponto do KML mais próximo
                const nearest = findNearestKmPoint(pts, lat, lng);
                if (!nearest) {
                    console.log(`Não foi possível achar vizinho para ${lat}, ${lng}`);
                    continue;
                }

                const correctKm = nearest.km;
                const correctRodovia = nearest.rodovia || rodoviaId;

                // Atualiza a tabela local (Dexie) e Supabase
                await db.unidades.update(u.id, { km: correctKm, rodovia: correctRodovia });
                const { error: updErr } = await supabase
                    .from('unidades_fiscalizadas')
                    .update({ km: correctKm, rodovia: correctRodovia })
                    .eq('id', u.id);
                if (updErr) throw updErr;

                // Processa fotos
                const fotosList = Array.isArray(u.fotos_unidade) ? u.fotos_unidade : [];
                for (let j = 0; j < fotosList.length; j++) {
                    const f = fotosList[j];
                    setFixProgress(`Processando ocorrência ${i + 1}/${unidades.length} - Foto ${j + 1}/${fotosList.length}...`);

                    const parsed = Repository.parseStorageUrl(f.url);
                    if (!parsed) continue;

                    // Baixa a imagem do Storage
                    const { data: blob, error: dlErr } = await supabase.storage.from(parsed.bucket).download(parsed.path);
                    if (dlErr || !blob) {
                        console.error('Erro ao baixar foto:', dlErr);
                        continue;
                    }

                    // Carrega imagem no Canvas
                    const img = new Image();
                    const objectUrl = URL.createObjectURL(blob);
                    await new Promise((resolve, reject) => {
                        img.onload = () => resolve();
                        img.onerror = reject;
                        img.src = objectUrl;
                    });
                    URL.revokeObjectURL(objectUrl);

                    const canvas = document.createElement('canvas');
                    canvas.width = img.naturalWidth || img.width;
                    canvas.height = img.naturalHeight || img.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0);

                    // Re-desenha a marca d'água
                    const base = Math.max(canvas.width, canvas.height);
                    const padding = Math.max(10, Math.round(base * 0.015));
                    const fontSize = Math.max(14, Math.round(base * 0.028));
                    ctx.save();
                    ctx.font = `600 ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
                    ctx.textBaseline = 'bottom';

                    // Reconstruindo linhas antiga e nova
                    const pad2 = (n) => String(n).padStart(2, '0');
                    const formatDateBR = (d) => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
                    const formatTimeBR = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
                    
                    const takenAt = f.data_hora ? new Date(f.data_hora) : new Date();
                    const dateText = `${formatDateBR(takenAt)} ${formatTimeBR(takenAt)}`;
                    const coordsText = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

                    // Formata KM decimal
                    const formatKmWatermark = (kmVal) => {
                      if (!kmVal) return '';
                      if (String(kmVal).includes('+')) return kmVal;
                      const num = parseFloat(kmVal);
                      if (isNaN(num)) return kmVal;
                      const intPart = Math.floor(num);
                      const meters = Math.round((num - intPart) * 1000);
                      return meters > 0 ? `${intPart}+${meters}m` : String(intPart);
                    };

                    const oldLocLine = `${u.rodovia || rodoviaId} KM ${formatKmWatermark(u.km)} ${u.sentido || ''}`.trim();
                    const newLocLine = `${correctRodovia} KM ${formatKmWatermark(correctKm)} ${u.sentido || ''}`.trim();

                    const oldLines = [oldLocLine, dateText, coordsText];
                    const newLines = [newLocLine, dateText, coordsText];

                    const maxTextW = Math.max(10, canvas.width - padding * 4);
                    const fitLine = (txt) => {
                        const raw = String(txt || '');
                        if (ctx.measureText(raw).width <= maxTextW) return raw;
                        const ellipsis = '…';
                        let s = raw;
                        while (s.length > 1 && ctx.measureText(`${s}${ellipsis}`).width > maxTextW) {
                            s = s.slice(0, -1);
                        }
                        return `${s}${ellipsis}`;
                    };

                    const oldFitted = oldLines.map(fitLine);
                    const newFitted = newLines.map(fitLine);

                    const lineGap = Math.round(fontSize * 0.25);
                    const heights = oldFitted.length * fontSize + (oldFitted.length - 1) * lineGap;
                    const boxH = heights + padding * 2;
                    const yBottom = canvas.height - padding;
                    const boxY = Math.max(padding, canvas.height - boxH - padding);

                    const oldMaxW = Math.max(...oldFitted.map(t => ctx.measureText(t).width));
                    const newMaxW = Math.max(...newFitted.map(t => ctx.measureText(t).width));
                    const maxW = Math.max(oldMaxW, newMaxW);

                    const boxW = Math.min(canvas.width - padding * 2, Math.ceil(maxW) + padding * 2);
                    const boxX = padding;

                    // 1. Cobre o box antigo com um box totalmente opaco (para apagar o texto antigo)
                    ctx.fillStyle = '#000000';
                    const r = Math.max(8, Math.round(fontSize * 0.4));
                    ctx.beginPath();
                    ctx.moveTo(boxX + r, boxY);
                    ctx.arcTo(boxX + boxW, boxY, boxX + boxW, boxY + boxH, r);
                    ctx.arcTo(boxX + boxW, boxY + boxH, boxX, boxY + boxH, r);
                    ctx.arcTo(boxX, boxY + boxH, boxX, boxY, r);
                    ctx.arcTo(boxX, boxY, boxX + boxW, boxY, r);
                    ctx.closePath();
                    ctx.fill();

                    // 2. Desenha o novo box com opacidade padrão
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
                    ctx.beginPath();
                    ctx.moveTo(boxX + r, boxY);
                    ctx.arcTo(boxX + boxW, boxY, boxX + boxW, boxY + boxH, r);
                    ctx.arcTo(boxX + boxW, boxY + boxH, boxX, boxY + boxH, r);
                    ctx.arcTo(boxX, boxY + boxH, boxX, boxY, r);
                    ctx.arcTo(boxX, boxY, boxX + boxW, boxY, r);
                    ctx.closePath();
                    ctx.fill();

                    // 3. Escreve o texto por cima
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.97)';
                    let y = yBottom;
                    for (let k = newFitted.length - 1; k >= 0; k--) {
                        ctx.fillText(newFitted[k], boxX + padding, y);
                        y -= fontSize + lineGap;
                    }
                    ctx.restore();

                    // Comprime canvas para Blob
                    const newBlob = await new Promise((resolve) => {
                        canvas.toBlob(resolve, 'image/jpeg', 0.88);
                    });

                    if (newBlob) {
                        // Faz o upload substituindo no Storage (upsert: true)
                        const { error: upErr } = await supabase.storage
                            .from(parsed.bucket)
                            .upload(parsed.path, newBlob, { upsert: true, contentType: 'image/jpeg' });
                        if (upErr) throw upErr;
                    }
                }
            }

            // 4. Força re-geração do relatório chamando o relatorios_enqueue
            setFixProgress('Re-gerando relatório...');
            await invokeEdgeFunction('relatorios_enqueue', { fiscalizacao_id: fiscId });

            setFixProgress('Concluído! Recarregando os dados...');
            queryClient.invalidateQueries({ queryKey: ['unidades', fiscId] });
            queryClient.invalidateQueries({ queryKey: ['unidade', occurrenceId] });
            setTimeout(() => {
                window.location.reload();
            }, 1500);

        } catch (err) {
            console.error('[Fix Finalized Fisc Error]', err);
            setFixError(err?.message || String(err));
            setFixingDtr(false);
        }
    };

    const Header = () => (
        <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-950 text-white shadow-md sticky top-0 z-10">
            <div className="max-w-md mx-auto px-4 py-4">
                <div className="flex items-center gap-3">
                    {/* Voltar */}
                    <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full flex-shrink-0" onClick={goBack}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>

                    {/* Barra de progresso + label */}
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-bold text-indigo-300 uppercase tracking-wider truncate">
                            {stepIdx + 1}. {stepLabel}
                        </p>
                        <div className="flex gap-0.5 mt-1.5">
                            {activeSteps.map((_, i) => (
                                <div key={i} className={`h-0.5 flex-1 rounded-full transition-colors ${i <= stepIdx ? 'bg-white' : 'bg-white/20'}`} />
                            ))}
                        </div>
                    </div>

                    {/* Avançar (mostrado em todos exceto no último passo) */}
                    {!isLastStep ? (
                        <Button
                            variant="ghost"
                            size="icon"
                            className={`rounded-full flex-shrink-0 transition-colors ${canProceed ? 'text-white hover:bg-white/10' : 'text-white/20 cursor-not-allowed'}`}
                            onClick={canProceed ? goNext : undefined}
                            disabled={!canProceed}
                        >
                            <ArrowRight className="h-5 w-5" />
                        </Button>
                    ) : !readOnly ? (
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm h-10 px-4 rounded-lg flex-shrink-0"
                            onClick={() => salvarMutation.mutate()} disabled={salvarMutation.isPending}>
                            {salvarMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4 mr-1" /> Salvar</>}
                        </Button>
                    ) : null}
                </div>
            </div>
        </div>
    );

    // ─── FOTOS ───────────────────────────────────────────────────────────────────
    if (currentStep === 'fotos') return (
        <div className="min-h-screen bg-[#e8eaed] flex flex-col">
            <Header />
            <div className="flex-1 max-w-md w-full mx-auto px-4 py-6">
                <h2 className="text-sm font-bold text-gray-600 mb-4 uppercase tracking-wide">{stepIdx + 1}. FOTOS</h2>
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3">
                    <PhotoGrid
                        fotos={fotos} minFotos={1} bigButton={fotos.length === 0}
                        titulo={fotos.length > 0 ? 'Evidências Fotográficas' : ''}
                        onAddFoto={addFoto} onRemoveFoto={removeFoto}
                        onUpdateLegenda={updateLegenda}
                        onReorderFotos={(n) => { setFotos(n); setFotosDirty(true); }}
                        fiscalizacaoId={fiscId} unidadeId={occurrenceId || 'novo-ponto'} isEditable={!readOnly}
                        enableLegenda={false}
                        autoCapture={!occurrenceId && fotos.length === 0}
                        captureBlocked={!kmReady}
                        captureBlockedMessage={captureBlockedMessage}
                        presetGpsFix={!occurrenceId && location ? { latitude: location.lat, longitude: location.lng, accuracy: gpsAccuracy ?? undefined, takenAt: new Date().toISOString() } : null}
                        watermarkContext={{ rodovia: rodoviaSnapped || fisc?.rodovia || '', km: km || '', sentido: sentido || '' }}
                    />
                </div>
                {!occurrenceId && gpsError && (
                    <div className="mt-3 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2.5 flex items-center justify-between gap-2">
                        <p className="text-xs text-rose-700">{gpsError}</p>
                        <Button size="sm" variant="outline" className="h-7 text-xs flex-shrink-0" onClick={() => setGpsRetryTick(t => t + 1)}>
                            Tentar novamente
                        </Button>
                    </div>
                )}
                {/* Aviso não-bloqueante: a foto pode ser tirada mesmo sem GPS preciso,
                    mas o KM/rodovia gravados podem estar errados — sinaliza pra conferir depois. */}
                {!occurrenceId && !gpsError && (!km || !kmPreciso) && (
                    <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                        <p className="text-xs text-amber-700">
                            {!km
                                ? 'Aguardando GPS — a foto pode ser tirada, mas o KM ainda não foi identificado.'
                                : `GPS impreciso (±${Math.round(gpsAccuracy)}m) — confira o KM (${km}) manualmente depois.`}
                        </p>
                    </div>
                )}
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-3">
                <Button className="w-full bg-gray-900 hover:bg-gray-700 text-white rounded-xl h-11" onClick={goNext}>
                    Próximo
                </Button>
            </div>
        </div>
    );

    // ─── FRENTE ──────────────────────────────────────────────────────────────────
    if (currentStep === 'frente') return (
        <div className="min-h-screen bg-[#e8eaed] flex flex-col">
            <Header />
            <div className="flex-1 max-w-md w-full mx-auto px-4 py-6 space-y-3">
                <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide">{stepIdx + 1}. FRENTES DA CONCESSÃO</h2>
                {frentes.map(f => (
                    <RadioCard key={f} label={f} selected={selectedFrente === f} disabled={readOnly}
                        onSelect={() => selectAndAdvance((v) => { setSelectedFrente(v); setSelectedPer(''); setSelectedItem(null); setPerIsOutros(false); }, f)} />
                ))}
            </div>
        </div>
    );

    // ─── PER ─────────────────────────────────────────────────────────────────────
    if (currentStep === 'per') return (
        <div className="min-h-screen bg-[#e8eaed] flex flex-col">
            <Header />
            <div className="flex-1 max-w-md w-full mx-auto px-4 py-6 space-y-3">
                <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide">{stepIdx + 1}. FRENTE DE {selectedFrente}</h2>
                {pers.map(p => (
                    <RadioCard key={p} label={p} selected={!perIsOutros && selectedPer === p} disabled={readOnly}
                        onSelect={() => selectAndAdvance((v) => { setSelectedPer(v); setSelectedItem(null); setPerIsOutros(false); }, p)} />
                ))}
                <RadioCard label="Outros" selected={perIsOutros} disabled={readOnly}
                    onSelect={() => { setPerIsOutros(true); setSelectedPer(''); setSelectedItem(null); }} />
                {perIsOutros && (
                    <Input
                        value={selectedPer}
                        onChange={e => setSelectedPer(e.target.value)}
                        placeholder="Escreva o PER..."
                        readOnly={readOnly}
                        autoFocus
                        className="bg-white border-gray-200 text-gray-800 text-sm rounded-2xl h-11"
                    />
                )}
            </div>
            {perIsOutros && !readOnly && (
                <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-3">
                    <Button className="w-full bg-gray-900 hover:bg-gray-700 text-white rounded-xl h-11" onClick={goNext} disabled={!canProceed}>
                        Próximo
                    </Button>
                </div>
            )}
        </div>
    );

    // ─── DESCRIÇÃO / ITEM ────────────────────────────────────────────────────────
    if (currentStep === 'descricao' && perIsOutros) return (
        <div className="min-h-screen bg-[#e8eaed] flex flex-col">
            <Header />
            <div className="flex-1 max-w-md w-full mx-auto px-4 py-6 space-y-3">
                <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide">{stepIdx + 1}. {selectedPer.toUpperCase()}</h2>
                <Textarea
                    value={selectedItem?.descricao || ''}
                    onChange={e => setSelectedItem({ descricao: e.target.value })}
                    placeholder="Descreva o que foi observado..."
                    readOnly={readOnly}
                    className="bg-white border-gray-200 text-gray-800 text-sm min-h-[120px] rounded-2xl resize-none"
                />
            </div>
            {!readOnly && (
                <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-3">
                    <Button className="w-full bg-gray-900 hover:bg-gray-700 text-white rounded-xl h-11" onClick={goNext} disabled={!canProceed}>
                        Próximo
                    </Button>
                </div>
            )}
        </div>
    );

    if (currentStep === 'descricao') return (
        <div className="min-h-screen bg-[#e8eaed] flex flex-col">
            <Header />
            <div className="flex-1 max-w-md w-full mx-auto px-4 py-6 space-y-3">
                <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide">{stepIdx + 1}. {selectedPer.toUpperCase()}</h2>
                {itemsForPer.map((item, i) => {
                    const label = item.descricao || item.nome || `Item ${i + 1}`;
                    // Os itens de fallback (TIPOS_FALLBACK) não têm "id" — comparar só por
                    // item.id fazia `undefined === undefined` virar true pra todo mundo,
                    // marcando todas as opções como selecionadas ao mesmo tempo.
                    const itemKey = item.id || label;
                    const selectedKey = selectedItem ? (selectedItem.id || (selectedItem.descricao || selectedItem.nome || '')) : null;
                    const isSel = selectedKey != null && selectedKey === itemKey;
                    return (
                        <RadioCard key={itemKey} label={label} selected={isSel} disabled={readOnly}
                            onSelect={() => {
                                setEtapaObra('');
                                setObservacao('');
                                selectAndAdvance(setSelectedItem, item);
                            }} />
                    );
                })}
            </div>
        </div>
    );

    // ─── ETAPA DA OBRA ───────────────────────────────────────────────────────────
    if (currentStep === 'etapa_obra') return (
        <div className="min-h-screen bg-[#e8eaed] flex flex-col">
            <Header />
            <div className="flex-1 max-w-md w-full mx-auto px-4 py-6 space-y-3">
                <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide">{stepIdx + 1}. ETAPA DA OBRA</h2>
                <p className="text-xs text-gray-500">{selectedItem?.descricao || selectedItem?.nome}</p>
                {etapaOptions.map(etapa => (
                    <RadioCard key={etapa} label={etapa} selected={etapaObra === etapa} disabled={readOnly}
                        onSelect={() => {
                            setEtapaObra(etapa);
                            setObservacao(etapa);
                            if (!isLastStep) setTimeout(goNext, 200);
                        }} />
                ))}
            </div>
        </div>
    );

    // ─── TIPO ────────────────────────────────────────────────────────────────────
    if (currentStep === 'tipo') return (
        <div className="min-h-screen bg-[#e8eaed] flex flex-col">
            <Header />
            <div className="flex-1 max-w-md w-full mx-auto px-4 py-6 space-y-3">
                <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide">{stepIdx + 1}. TIPO</h2>
                <RadioCard label="Constatação" selected={tipoRegistro === 'constatacao'} disabled={readOnly}
                    onSelect={() => selectAndAdvance(setTipoRegistro, 'constatacao')} />
                <RadioCard label="Não Conformidade" selected={tipoRegistro === 'nc'} disabled={readOnly}
                    onSelect={() => selectAndAdvance(setTipoRegistro, 'nc')} />
                {tipoRegistro === 'nc' && selectedItem?.nao_atendimento && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-700 space-y-1">
                        <p className="font-semibold">Não Atendimento (PER):</p>
                        <p className="leading-relaxed">{selectedItem.nao_atendimento}</p>
                        {selectedItem.prazo_dias_padrao && (
                            <p className="font-semibold">Prazo: {selectedItem.prazo_dias_padrao} {selectedItem.prazo_dias_padrao === 1 ? 'dia' : 'dias'}</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );

    // ─── SENTIDO ─────────────────────────────────────────────────────────────────
    if (currentStep === 'sentido') return (
        <div className="min-h-screen bg-[#e8eaed] flex flex-col">
            <Header />
            <div className="flex-1 max-w-md w-full mx-auto px-4 py-6 space-y-3">
                <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide">{stepIdx + 1}. SENTIDO</h2>
                {(km || gettingLocation) && (
                    <div className={`border rounded-xl px-3 py-2 text-xs flex items-center gap-2 ${km && !kmPreciso ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                        <span className="font-semibold">{rodoviaSnapped || fisc?.rodovia || ''}</span>
                        {km
                            ? <span className="font-mono">KM {km}</span>
                            : <span className="text-blue-400">Obtendo localização...</span>
                        }
                        {km && !kmPreciso && gpsAccuracy != null && (
                            <span className="text-[10px]">(±{Math.round(gpsAccuracy)}m — conferir)</span>
                        )}
                        {gettingLocation && !km && <Loader2 className="h-3 w-3 animate-spin ml-auto" />}
                    </div>
                )}
                {['N', 'S', 'N/S'].map(s => (
                    <RadioCard key={s} label={s} selected={sentido === s} disabled={readOnly}
                        onSelect={() => selectAndAdvance(setSentido, s)} />
                ))}
            </div>
        </div>
    );

    // ─── OBSERVAÇÃO (passo final) ─────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-[#e8eaed] flex flex-col">
            <Header />
            <div className="flex-1 max-w-md w-full mx-auto px-4 py-6 space-y-4">
                {isFinalized && (
                    <div className="bg-white border border-indigo-100 rounded-2xl p-4 shadow-sm space-y-3">
                        <h3 className="text-xs font-bold text-indigo-800 uppercase tracking-wider flex items-center gap-1.5">
                            <RotateCcw className="h-3.5 w-3.5" /> Suporte & Correção (DTR)
                        </h3>
                        <p className="text-[11px] text-gray-600 leading-relaxed">
                            Esta fiscalização está finalizada. Caso os KMs e marcas d'água estejam incorretos devido a falhas de movimentação de GPS, clique abaixo para recalcular todos os KMs a partir das coordenadas reais das fotos e regerar as imagens no servidor.
                        </p>
                        {fixError && (
                            <p className="text-[10px] bg-rose-50 border border-rose-100 text-rose-700 p-2 rounded-lg font-mono">
                                Erro: {fixError}
                            </p>
                        )}
                        <Button
                            size="sm"
                            disabled={fixingDtr}
                            onClick={handleFixFinalizedInspection}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-medium h-9 flex items-center justify-center gap-1.5"
                        >
                            {fixingDtr ? (
                                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {fixProgress}</>
                            ) : (
                                <><RotateCcw className="h-3.5 w-3.5" /> Corrigir KM e Marcas d'Água</>
                            )}
                        </Button>
                    </div>
                )}
                <h2 className="text-sm font-bold text-gray-600 uppercase tracking-wide">{stepIdx + 1}. OBSERVAÇÃO</h2>

                {/* Resumo do registro */}
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 space-y-2">
                    {[
                        ['Frente', selectedFrente || '—'],
                        ['PER', selectedPer || '—'],
                        ['Item', selectedItem?.descricao || selectedItem?.nome || '—'],
                        etapaObra ? ['Etapa', etapaObra] : null,
                        ['Tipo', tipoRegistro === 'nc' ? 'Não Conformidade' : 'Constatação'],
                        ['KM', km ? (kmPreciso ? km : `${km} (±${Math.round(gpsAccuracy)}m — conferir)`) : (gettingLocation ? 'Obtendo...' : '—')],
                        ['Sentido', sentido || '—'],
                        ['Rodovia', rodoviaSnapped || fisc?.rodovia || '—'],
                    ].filter(Boolean).map(([label, value]) => (
                        <div key={label} className="flex gap-2 text-xs">
                            <span className="text-gray-400 font-semibold w-16 flex-shrink-0">{label}</span>
                            <span className={`text-gray-700 ${label === 'Tipo' && tipoRegistro === 'nc' ? 'text-rose-600 font-bold' : ''}`}>
                                {value}
                            </span>
                        </div>
                    ))}
                </div>

                <Textarea
                    value={observacao}
                    onChange={e => setObservacao(e.target.value)}
                    placeholder="Observações..."
                    readOnly={readOnly}
                    className="bg-white border-gray-200 text-gray-800 text-sm min-h-[120px] rounded-2xl resize-none"
                />
            </div>

            {!readOnly && (
                <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-3">
                    <Button
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-12 text-base"
                        onClick={() => salvarMutation.mutate()}
                        disabled={salvarMutation.isPending}
                    >
                        {salvarMutation.isPending
                            ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Salvando...</>
                            : <><Save className="h-4 w-4 mr-2" /> Salvar Ocorrência</>
                        }
                    </Button>
                </div>
            )}
        </div>
    );
}
