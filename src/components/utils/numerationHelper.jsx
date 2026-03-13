import { supabase } from '@/lib/supabase';

/**
 * Calcula a próxima numeração contínua entre unidades da mesma fiscalização
 * Usa Supabase para buscar dados
 */
export async function calcularProximaNumeracao(fiscalizacaoId, unidadeAtualId) {
    try {
        // 1. Buscar dados da unidade atual para saber a data de criação
        const { data: unidadeAtual, error: uaError } = await supabase
            .from('unidades_fiscalizadas')
            .select('created_at')
            .eq('id', unidadeAtualId)
            .single();

        if (uaError) throw uaError;

        // 2. Buscar unidades anteriores finalizadas da mesma fiscalização
        const { data: unidadesAnteriores, error: uError } = await supabase
            .from('unidades_fiscalizadas')
            .select('id, total_constatacoes, total_ncs')
            .eq('fiscalizacao_id', fiscalizacaoId)
            .eq('status', 'finalizada')
            .lt('created_at', unidadeAtual.created_at);

        if (uError) throw uError;

        let contadores = { C: 0, NC: 0, D: 0, R: 0 };

        if (!unidadesAnteriores || unidadesAnteriores.length === 0) {
            return contadores;
        }

        // 3. Somar totais já calculados (C e NC)
        for (const unidade of unidadesAnteriores) {
            contadores.C += unidade.total_constatacoes || 0;
            contadores.NC += unidade.total_ncs || 0;
        }

        // 4. Buscar totais de D e R para as unidades anteriores
        const idsAnteriores = unidadesAnteriores.map(u => u.id);
        
        if (idsAnteriores.length > 0) {
            const { count: countD, error: dError } = await supabase
                .from('determinacoes')
                .select('*', { count: 'exact', head: true })
                .in('unidade_fiscalizada_id', idsAnteriores);

            if (dError) throw dError;
            contadores.D = countD || 0;

            const { count: countR, error: rError } = await supabase
                .from('recomendacoes')
                .select('*', { count: 'exact', head: true })
                .in('unidade_fiscalizada_id', idsAnteriores);

            if (rError) throw rError;
            contadores.R = countR || 0;
        }

        return contadores;
    } catch (error) {
        console.error('Erro ao calcular numeração:', error);
        // Fallback: retornar contadores zerados
        return { C: 0, NC: 0, D: 0, R: 0 };
    }
}

/**
 * Gera números sequenciais para a unidade atual
 */
export function gerarNumeroConstatacao(contadores) {
    return `C${contadores.C + 1}`;
}

export function gerarNumeroNC(contadores) {
    return `NC${contadores.NC + 1}`;
}

export function gerarNumeroDeterminacao(contadores) {
    return `D${contadores.D + 1}`;
}

export function gerarNumeroRecomendacao(contadores) {
    return `R${contadores.R + 1}`;
}