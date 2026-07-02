import {
  ClipboardCheck,
  FileWarning,
  ClipboardList,
  Scale,
  Construction,
} from 'lucide-react';
import CatranspLayout from '@/components/catransp/CatranspLayout';

const COMING_SOON = [
  { icon: ClipboardCheck, label: 'Fiscalização de Transporte', desc: 'Vistorias e inspeções de transporte rodoviário' },
  { icon: FileWarning,    label: 'Autos de Infração',          desc: 'Emissão e acompanhamento de autos' },
  { icon: ClipboardList,  label: 'Pareceres Técnicos',          desc: 'Análises regulatórias' },
  { icon: Scale,          label: 'Câmara de Julgamento',        desc: 'Pareceres para julgamento' },
];

export default function CatranspDashboard() {
  return (
    <CatranspLayout>
      <div className="min-h-full bg-slate-50">
        <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">

          {/* Banner */}
          <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-700 p-8 text-white shadow-md">
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-white/20">
                <Construction className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold">Painel CATRANSP</h1>
                <p className="mt-1 text-violet-100 text-sm">
                  Câmara Técnica de Transporte — em implementação
                </p>
              </div>
            </div>
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
    </CatranspLayout>
  );
}
