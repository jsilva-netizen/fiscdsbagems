import { supabase } from '@/lib/supabase';

const BUCKET = 'documentos-prestadores';

export async function fetchExtraDocuments(processId) {
  const { data, error } = await supabase
    .from('caters_extra_documents')
    .select('*')
    .eq('process_id', processId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createExtraDocument(input) {
  const { data, error } = await supabase
    .from('caters_extra_documents')
    .insert(input)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function deleteExtraDocument(id) {
  const { error } = await supabase.from('caters_extra_documents').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadCatersFile({ processId, kind, file }) {
  const ext = file.name.split('.').pop();
  const path = `caters/${processId}/${kind}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type,
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl };
}
