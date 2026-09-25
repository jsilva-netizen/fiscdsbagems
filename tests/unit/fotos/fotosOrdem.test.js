import { describe, it, expect } from 'vitest';
import { moverFoto, chavesDasFotos, mesclarFotosNaOrdemSalva } from '@/lib/fotosOrdem';

// Casos de specs/002-fix-photo-drag-reorder/contracts/fotos-ordem.md

const lista = (...nomes) => nomes.map((n) => ({ url: n, legenda: `legenda ${n}` }));
const urls = (fotos) => fotos.map((f) => f.url);

// Mover não pode perder, duplicar nem alterar foto (FR-008).
const conferirIntegridade = (entrada, copiaEntrada, saida) => {
    expect(saida).not.toBe(entrada);
    expect(entrada).toEqual(copiaEntrada);
    expect(saida).toHaveLength(entrada.length);
    for (const foto of entrada) {
        expect(saida.filter((f) => f === foto)).toHaveLength(1);
    }
    for (const foto of saida) {
        expect(foto.legenda).toBe(copiaEntrada.find((c) => c.url === foto.url)?.legenda);
    }
};

describe('moverFoto', () => {
    const casos = [
        { nome: 'A sobre D', de: 0, para: 3, esperado: 'B C D A E F G' },
        { nome: 'F sobre B', de: 5, para: 1, esperado: 'A F B C D E G' },
        { nome: 'G (3ª linha) sobre A (1ª linha)', de: 6, para: 0, esperado: 'G A B C D E F' },
        { nome: 'C sobre a última', de: 2, para: 6, esperado: 'A B D E F G C' },
    ];

    for (const { nome, de, para, esperado } of casos) {
        it(`${nome}: ${esperado}`, () => {
            const entrada = lista('A', 'B', 'C', 'D', 'E', 'F', 'G');
            const copia = structuredClone(entrada);
            const saida = moverFoto(entrada, de, para);
            expect(urls(saida).join(' ')).toBe(esperado);
            conferirIntegridade(entrada, copia, saida);
        });
    }

    it('duas fotos: inverte', () => {
        const entrada = lista('A', 'B');
        const copia = structuredClone(entrada);
        const saida = moverFoto(entrada, 0, 1);
        expect(urls(saida)).toEqual(['B', 'A']);
        conferirIntegridade(entrada, copia, saida);
    });

    it('uma foto sobre ela mesma: não muda', () => {
        const entrada = lista('A');
        const copia = structuredClone(entrada);
        const saida = moverFoto(entrada, 0, 0);
        expect(urls(saida)).toEqual(['A']);
        conferirIntegridade(entrada, copia, saida);
    });

    it('origem igual ao destino: não muda', () => {
        const entrada = lista('A', 'B', 'C');
        const saida = moverFoto(entrada, 1, 1);
        expect(urls(saida)).toEqual(['A', 'B', 'C']);
        expect(saida).not.toBe(entrada);
    });

    it.each([
        [-1, 0],
        [0, 3],
        [3, 0],
        [0, -1],
    ])('índice fora dos limites (%i → %i): cópia igual', (de, para) => {
        const entrada = lista('A', 'B', 'C');
        const copia = structuredClone(entrada);
        const saida = moverFoto(entrada, de, para);
        expect(urls(saida)).toEqual(['A', 'B', 'C']);
        conferirIntegridade(entrada, copia, saida);
    });

    it('foto oculta no meio é preservada e só se desloca', () => {
        const oculta = {};
        const [b, c, d] = lista('B', 'C', 'D');
        const entrada = [b, oculta, c, d];
        const saida = moverFoto(entrada, 3, 0);
        expect(saida).toEqual([d, b, oculta, c]);
        expect(saida[2]).toBe(oculta);
        expect(saida).toHaveLength(4);
    });
});

describe('chavesDasFotos', () => {
    it('uma chave por foto, alinhada por índice', () => {
        const fotos = lista('A', 'B', 'C');
        expect(chavesDasFotos(fotos)).toEqual(['url:A', 'url:B', 'url:C']);
    });

    it('prioridade bucket:path > localId > url', () => {
        const fotos = [
            { bucket: 'b', path: 'p1.jpg', localId: 'L1', url: 'https://x/1.jpg' },
            { localId: 'L2', url: 'blob:2' },
            { url: 'https://x/3.jpg' },
        ];
        expect(chavesDasFotos(fotos)).toEqual(['b:p1.jpg', 'local:L2', 'url:https://x/3.jpg']);
    });

    it('aceita fotos em string', () => {
        expect(chavesDasFotos(['https://x/1.jpg'])).toEqual(['url:https://x/1.jpg']);
    });

    it('chaves repetidas recebem sufixo de desempate', () => {
        const fotos = [{ url: 'A' }, { url: 'A' }, { url: 'A' }, { url: 'B' }];
        const chaves = chavesDasFotos(fotos);
        expect(chaves).toEqual(['url:A', 'url:A#2', 'url:A#3', 'url:B']);
        expect(new Set(chaves).size).toBe(fotos.length);
    });

    it('foto sem identidade recebe chave posicional única', () => {
        const chaves = chavesDasFotos([{}, { url: 'A' }, {}, null]);
        expect(new Set(chaves).size).toBe(4);
        expect(chaves).toContain('url:A');
    });

    it('é determinística', () => {
        const fotos = [{ url: 'A' }, { url: 'A' }, { localId: 'L1' }, {}];
        expect(chavesDasFotos(fotos)).toEqual(chavesDasFotos(fotos));
    });

    it('a chave de uma foto identificada não muda quando ela troca de posição', () => {
        const fotos = [
            { bucket: 'b', path: '1.jpg' },
            { localId: 'L2' },
            { url: 'https://x/3.jpg' },
            { bucket: 'b', path: '4.jpg' },
        ];
        const chaveDe = (lst) => new Map(lst.map((f, i) => [f, chavesDasFotos(lst)[i]]));
        const antes = chaveDe(fotos);
        const depois = chaveDe(moverFoto(fotos, 0, 3));
        for (const foto of fotos) {
            expect(depois.get(foto)).toBe(antes.get(foto));
        }
    });
});

describe('mesclarFotosNaOrdemSalva', () => {
    const local = (id, extra = {}) => ({ localId: id, url: `blob:novo-${id}`, legenda: id.toLowerCase(), ...extra });
    const localSalva = (id) => ({ localId: id, url: `blob:antigo-${id}` });
    const remota = (nome) => ({ bucket: 'fotos_fiscalizacao', path: `u/${nome}.jpg`, url: `storage://fotos_fiscalizacao/u/${nome}.jpg` });

    // Toda foto só do dispositivo aparece exatamente uma vez (Princípio II).
    const cadaLocalUmaVez = (saida, locais) => {
        for (const l of locais) expect(saida.filter((f) => f === l)).toHaveLength(1);
    };

    it('mantém a posição salva da foto local, com o preview novo', () => {
        const [r1, r2] = [remota('r1'), remota('r2')];
        const locais = [local('L1')];
        const saida = mesclarFotosNaOrdemSalva([r1, localSalva('L1'), r2], locais);
        expect(saida).toEqual([r1, locais[0], r2]);
        expect(saida[1]).toBe(locais[0]);
        cadaLocalUmaVez(saida, locais);
    });

    it('segue a ordem salva, não a ordem de locais', () => {
        const r1 = remota('r1');
        const locais = [local('L1'), local('L2')];
        const saida = mesclarFotosNaOrdemSalva([localSalva('L2'), r1, localSalva('L1')], locais);
        expect(saida).toEqual([locais[1], r1, locais[0]]);
        cadaLocalUmaVez(saida, locais);
    });

    it('foto local capturada depois do último salvamento vai para o fim', () => {
        const [r1, r2] = [remota('r1'), remota('r2')];
        const locais = [local('L1')];
        const saida = mesclarFotosNaOrdemSalva([r1, r2], locais);
        expect(saida).toEqual([r1, r2, locais[0]]);
        cadaLocalUmaVez(saida, locais);
    });

    it('descarta URL local da sessão anterior sem foto local correspondente', () => {
        const r1 = remota('r1');
        expect(mesclarFotosNaOrdemSalva([r1, localSalva('L1')], [])).toEqual([r1]);
    });

    it('foto local já enviada não duplica a remota', () => {
        const r1 = remota('r1');
        const locais = [local('L1', { url: 'https://x/storage/v1/object/public/fotos_fiscalizacao/u/r1.jpg' })];
        const saida = mesclarFotosNaOrdemSalva([r1], locais);
        expect(saida).toEqual([r1]);
    });

    it('sem lista salva: só as locais, na ordem delas', () => {
        const locais = [local('L1'), local('L2')];
        const saida = mesclarFotosNaOrdemSalva([], locais);
        expect(saida).toEqual(locais);
        cadaLocalUmaVez(saida, locais);
    });

    it('lista salva nula e sem locais: vazia', () => {
        expect(mesclarFotosNaOrdemSalva(null, [])).toEqual([]);
        expect(mesclarFotosNaOrdemSalva(undefined, undefined)).toEqual([]);
    });

    it('aceita foto remota salva como string', () => {
        const url = 'https://x/storage/v1/object/public/b/p.jpg';
        expect(mesclarFotosNaOrdemSalva([url], [])).toEqual([{ url, legenda: '' }]);
    });

    it('mantém foto remota só com bucket e path, sem url', () => {
        const foto = { bucket: 'b', path: 'p.jpg', legenda: 'x' };
        expect(mesclarFotosNaOrdemSalva([foto], [])).toEqual([foto]);
    });

    it('não altera os argumentos', () => {
        const salvas = [remota('r1'), localSalva('L1')];
        const locais = [local('L1'), local('L2')];
        const copiaSalvas = structuredClone(salvas);
        const copiaLocais = structuredClone(locais);
        mesclarFotosNaOrdemSalva(salvas, locais);
        expect(salvas).toEqual(copiaSalvas);
        expect(locais).toEqual(copiaLocais);
    });
});
