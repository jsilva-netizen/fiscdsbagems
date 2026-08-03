import { cn } from '@/lib/utils';

/** Rótulo pequeno acima de uma seção — mesmo padrão em toda página. */
export default function SectionKicker({ className, children }) {
  return (
    <p className={cn('text-xs font-bold uppercase tracking-wider text-gray-400', className)}>
      {children}
    </p>
  );
}
