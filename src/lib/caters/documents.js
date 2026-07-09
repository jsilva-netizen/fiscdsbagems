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
  return { url: data.publicUrl, bucket: BUCKET, path };
}

// Recupera bucket/path a partir de uma URL pública ou assinada do Storage —
// usado para reconstruir a referência do arquivo em documentos antigos que
// só têm a URL salva (ex.: campos padrão em caters_processes).
export function parseCatersFileRef(url) {
  const raw = String(url || '').trim();
  if (!raw) return null;
  const publicMarker = '/storage/v1/object/public/';
  const signMarker = '/storage/v1/object/sign/';
  let marker = '';
  let idx = raw.indexOf(publicMarker);
  if (idx !== -1) marker = publicMarker;
  else {
    idx = raw.indexOf(signMarker);
    if (idx !== -1) marker = signMarker;
  }
  if (!marker) return null;
  const remainder = raw.slice(idx + marker.length);
  const slash = remainder.indexOf('/');
  if (slash === -1) return null;
  const bucket = remainder.slice(0, slash);
  let path = remainder.slice(slash + 1);
  const q = path.indexOf('?');
  if (q !== -1) path = path.slice(0, q);
  if (!bucket || !path) return null;
  return { bucket, path };
}
