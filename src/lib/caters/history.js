import { supabase } from '@/lib/supabase';

export const HISTORY_ACTION_LABELS = {
  criacao: 'Criação',
  atualizacao_status: 'Atualização de status',
  resposta_recebida: 'Resposta recebida',
  prazo_estendido: 'Prazo estendido',
  documento_anexado: 'Documento anexado',
  encerramento: 'Encerramento',
  observacao: 'Observação',
};

export const HISTORY_ACTION_OPTIONS = Object.entries(HISTORY_ACTION_LABELS).map(([value, label]) => ({ value, label }));

export async function fetchHistory(processId) {
  const { data, error } = await supabase
    .from('caters_analysis_history')
    .select('*')
    .eq('process_id', processId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createHistory(input) {
  const { data, error } = await supabase
    .from('caters_analysis_history')
    .insert(input)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteHistory(id) {
  const { error } = await supabase.from('caters_analysis_history').delete().eq('id', id);
  if (error) throw error;
}
