import { cn } from '@/lib/utils';

const TONES = {
  success: 'bg-emerald-100 text-emerald-700',
  info: 'bg-sky-100 text-sky-700',
  tag: 'bg-indigo-50 text-indigo-700',
  danger: 'bg-rose-100 text-rose-700',
  neutral: 'bg-gray-100 text-gray-600',
};

/** Badge em pílula — mesmo padrão dos badges da Home (sem ícone, sem outline). */
export default function Pill({ tone = 'neutral', className, children }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full text-[10px] font-semibold px-2 py-0.5 border-none',
        TONES[tone] || TONES.neutral,
        className
      )}
    >
      {children}
    </span>
  );
}
