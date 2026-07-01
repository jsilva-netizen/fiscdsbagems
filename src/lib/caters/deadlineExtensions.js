import { supabase } from '@/lib/supabase';

export async function fetchDeadlineExtensions(processId) {
  const { data, error } = await supabase
    .from('caters_deadline_extensions')
    .select('*')
    .eq('process_id', processId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createDeadlineExtension(input) {
  const { data, error } = await supabase
    .from('caters_deadline_extensions')
    .insert(input)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteDeadlineExtension(id) {
  const { error } = await supabase
    .from('caters_deadline_extensions')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
