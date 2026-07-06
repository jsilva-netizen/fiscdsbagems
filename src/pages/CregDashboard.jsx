import {
  TrendingUp,
  FileText,
  ClipboardList,
  Scale,
} from 'lucide-react';
import CregLayout from '@/components/creg/CregLayout';

const COMING_SOON = [
  { icon: TrendingUp,    label: 'Revisões Tarifárias',     desc: 'Processos de revisão e reajuste' },
  { icon: FileText,      label: 'Análise de Manifestação', desc: 'Processos de defesa' },
  { icon: ClipboardList, label: 'Pareceres Econômicos',    desc: 'Análises regulatórias' },
  { icon: Scale,         label: 'Câmara de Julgamento',    desc: 'Pareceres para julgamento' },
];

export default function CregDashboard() {
  return (
    <CregLayout>
      <div className="min-h-full bg-slate-50">
        <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">

          {/* Header */}
          <div>
            <h1 className="text-xs font-bold uppercase tracking-widest text-slate-400">Painel CREG</h1>
          </div>

          {/* Funcionalidades previstas */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
              Funcionalidades previstas
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {COMING_SOON.map(({ icon: Icon, label, desc }) => (
                <div
                  key={label}
                  className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 opacity-60"
                >
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-slate-100">
                    <Icon className="h-5 w-5 text-slate-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700 text-sm">{label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                  </div>
                  <span className="ml-auto shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                    Em breve
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </CregLayout>
  );
}
