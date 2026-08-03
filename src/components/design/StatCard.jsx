import { cn } from '@/lib/utils';

const COLOR_PAIRS = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-600' },
};

/**
 * Card de KPI/estatística — mesmo visual dos cards de estatística da Home.
 */
export default function StatCard({ icon: Icon, label, value, caption, color = 'blue', className }) {
  const pair = COLOR_PAIRS[color] || COLOR_PAIRS.blue;
  return (
    <div className={cn('bg-white border border-gray-200 rounded-2xl p-4 sm:p-5', className)}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
        {Icon && (
          <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', pair.bg)}>
            <Icon className={cn('h-4 w-4', pair.text)} />
          </div>
        )}
      </div>
      <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
      {caption && <p className="text-xs text-gray-400">{caption}</p>}
    </div>
  );
}
