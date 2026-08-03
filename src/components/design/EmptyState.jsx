import { cn } from '@/lib/utils';

/** Estado vazio — mesmo padrão da Home ("Nenhuma fiscalização ainda"). */
export default function EmptyState({ icon: Icon, title, description, className }) {
  return (
    <div className={cn('bg-white border border-dashed border-gray-300 rounded-2xl p-8 text-center text-gray-400', className)}>
      {Icon && <Icon className="h-8 w-8 mx-auto mb-2 opacity-40" />}
      {title && <p className="text-sm font-medium">{title}</p>}
      {description && <p className="text-xs mt-1">{description}</p>}
    </div>
  );
}
