// Regras da lista de fotos de uma vistoria (fotos_unidade): identidade, reordenação e
// remontagem na carga. Funções puras — não tocam IndexedDB, rede nem estado de tela, e não
// alteram os argumentos. Ver specs/002-fix-photo-drag-reorder/data-model.md.

// Fotos antigas podem vir como string (URL pura).
export const normalizarFoto = (foto) => {
    if (foto == null) return null;
    return typeof foto === 'string' ? { url: foto, legenda: '' } : foto;
};

// URL que só existe no dispositivo (preview de foto ainda não enviada).
export const ehUrlLocal = (url) => /^blob:|^data:|^file:|^capacitor:/i.test(String(url || ''));

// "bucket:path" da foto no armazenamento, a partir dos campos ou da URL; null se não houver.
export const chaveDeArmazenamento = (foto) => {
    if (!foto) return null;
    const bucket = String(foto.bucket || '').trim();
    const path = String(foto.path || '').trim();
    if (bucket && path) return `${bucket}:${path}`;
    const url = String(foto.url || '').trim();
    if (!url) return null;
    // storage://bucket/path
    if (url.startsWith('storage://')) {
        const rem = url.slice('storage://'.length);
        const slash = rem.indexOf('/');
        if (slash !== -1) return `${rem.slice(0, slash)}:${rem.slice(slash + 1).split('?')[0]}`;
    }
    // https://.../storage/v1/object/public/bucket/path
    const m = url.match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+?)(?:\?|$)/);
    if (m) return `${m[1]}:${m[2]}`;
    return null;
};

// Fotos sem nenhuma referência de imagem ficam fora do grid, mas continuam na lista.
export const fotoVisivel = (foto) => !!(foto?.url || (foto?.bucket && foto?.path) || foto?.localId);

// Chave base da foto, na prioridade bucket:path > localId > url; '' se não houver identidade.
export const chaveDaFoto = (foto) => {
    const f = foto || {};
    if (f.bucket && f.path) return `${f.bucket}:${f.path}`;
    if (f.localId) return `local:${f.localId}`;
    const url = String(f.url || '');
    if (url) return `url:${url}`;
    return '';
};

// Uma chave por foto, alinhada por índice e sempre única: a chave base repetida recebe
// sufixo (#2, #3...) e a foto sem identidade recebe chave posicional. Determinística, e a
// chave de uma foto identificada não depende da posição dela.
export const chavesDasFotos = (fotos) => {
    const ocorrencias = new Map();
    return (Array.isArray(fotos) ? fotos : []).map((foto, i) => {
        const base = chaveDaFoto(normalizarFoto(foto)) || `pos:${i}`;
        const n = (ocorrencias.get(base) || 0) + 1;
        ocorrencias.set(base, n);
        return n === 1 ? base : `${base}#${n}`;
    });
};

// Nova lista com a foto de `origem` na posição `destino`; as intermediárias andam uma casa.
// Índices da lista completa. Fora dos limites ou origem == destino: cópia igual.
export const moverFoto = (fotos, origem, destino) => {
    const resultado = Array.from(fotos || []);
    const dentro = (i) => Number.isInteger(i) && i >= 0 && i < resultado.length;
    if (origem === destino || !dentro(origem) || !dentro(destino)) return resultado;
    const [movida] = resultado.splice(origem, 1);
    resultado.splice(destino, 0, movida);
    return resultado;
};

// Remonta a lista ao abrir a tela, respeitando a ordem salva em fotos_unidade.
// `salvas`: fotos_unidade gravado (pode ter fotos só locais, identificadas por localId, com
// URL de preview da sessão anterior). `locais`: fotos de fotos_local, com preview válido.
// Foto local salva entra na posição dela com os dados de `locais`; URL local sem foto local
// correspondente é descartada (já enviada ou removida); locais ainda não salvas vão para o fim.
export const mesclarFotosNaOrdemSalva = (salvas, locais) => {
    const listaLocais = Array.isArray(locais) ? locais : [];
    const locaisPorId = new Map(listaLocais.map((l) => [String(l?.localId || '').trim(), l]));
    const vistosLocalId = new Set();
    const vistosArmazenamento = new Set();
    const resultado = [];

    const adicionar = (f) => {
        if (!f) return;
        const localId = String(f.localId || '').trim();
        const armazenamento = chaveDeArmazenamento(f);
        if (localId && vistosLocalId.has(localId)) return;
        if (armazenamento && vistosArmazenamento.has(armazenamento)) return;
        if (localId) vistosLocalId.add(localId);
        if (armazenamento) vistosArmazenamento.add(armazenamento);
        resultado.push(f);
    };

    for (const s of (Array.isArray(salvas) ? salvas : []).map(normalizarFoto).filter(Boolean)) {
        const localId = String(s.localId || '').trim();
        if (localId && locaisPorId.has(localId)) {
            adicionar(locaisPorId.get(localId));
        } else if (ehUrlLocal(s.url)) {
            continue;
        } else if ((s.bucket && s.path) || s.url) {
            adicionar(s);
        }
    }
    listaLocais.forEach(adicionar);
    return resultado;
};
