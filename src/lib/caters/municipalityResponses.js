import { supabase } from '@/lib/supabase';

export async function fetchMunicipalityResponse(processId) {
  const { data, error } = await supabase
    .from('caters_municipality_responses')
    .select('*')
    .eq('process_id', processId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function upsertMunicipalityResponse(input) {
  const { data, error } = await supabase
    .from('caters_municipality_responses')
    .upsert(input, { onConflict: 'process_id' })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
