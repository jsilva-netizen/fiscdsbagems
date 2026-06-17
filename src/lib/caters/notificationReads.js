import { supabase } from '@/lib/supabase';

export async function fetchNotificationReads({ userId, keys }) {
  if (!keys.length) return [];
  const { data, error } = await supabase
    .from('caters_notification_reads')
    .select('key')
    .eq('user_id', userId)
    .in('key', keys);
  if (error) throw error;
  return data ?? [];
}

export async function markNotificationsRead({ userId, keys }) {
  if (!keys.length) return;
  const now = new Date().toISOString();
  const rows = keys.map((key) => ({ user_id: userId, key, read_at: now }));
  const { error } = await supabase
    .from('caters_notification_reads')
    .upsert(rows, { onConflict: 'user_id,key' });
  if (error) throw error;
}
