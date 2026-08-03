import { cn } from '@/lib/utils';

/** Título de seção — mesmo padrão da Home ("Últimas Fiscalizações"). */
export default function SectionHeading({ className, children }) {
  return (
    <h2 className={cn('text-base font-bold text-gray-900', className)}>
      {children}
    </h2>
  );
}
