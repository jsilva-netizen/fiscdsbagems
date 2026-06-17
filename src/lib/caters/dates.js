export function daysFromToday(isoDate) {
  if (!isoDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return null;
  return Math.round((d - today) / 86400000);
}

export function addDaysToIsoDate(isoDate, days) {
  const d = new Date(isoDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

export function formatIsoDateHuman(isoDate) {
  if (!isoDate) return '—';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function toIsoDate(value) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split('T')[0];
}
