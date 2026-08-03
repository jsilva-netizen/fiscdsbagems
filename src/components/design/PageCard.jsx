import { cn } from '@/lib/utils';

/**
 * Card padrão do app — mesmo visual da Home (bg-white, border-gray-200, rounded-2xl).
 * `interactive` acrescenta o hover usado em cards clicáveis de lista.
 */
export default function PageCard({ interactive = false, className, children, ...props }) {
  return (
    <div
      className={cn(
        'bg-white border border-gray-200 rounded-2xl p-4 sm:p-5',
        interactive && 'hover:shadow-md hover:-translate-y-0.5 transition-all',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
