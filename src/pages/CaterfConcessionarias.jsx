import CaterfLayout from '@/components/caterf/CaterfLayout';
import PrestadoresServico from './PrestadoresServico';

export default function CaterfConcessionarias() {
  return (
    <CaterfLayout>
      <PrestadoresServico embedded />
    </CaterfLayout>
  );
}
