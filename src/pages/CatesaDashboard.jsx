import {
  BarChart3,
  Folder,
  GitMerge,
  FileWarning,
  ClipboardList,
  Scale,
  Droplets,
  FileText,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import CatesaLayout from '@/components/camaras/CatesaLayout';

const MODULES = [
  {
    icon: Folder,
    label: 'Fiscalizações',
    desc: 'Lista de fiscalizações CATESA',
    to: createPageUrl('CatesaFiscalizacoes'),
    color: 'text-cyan-600',
    bg: 'bg-cyan-50',
  },
  {
    icon: FileText,
    label: 'Termos de Notificação',
    desc: 'Emissão e controle de prazos de TN',
    to: createPageUrl('GerenciarTermos'),
    color: 'text-teal-600',
    bg: 'bg-teal-50',
  },
  {
    icon: GitMerge,
    label: 'Análise da Manifestação',
    desc: 'Análise das respostas do prestador',
    to: createPageUrl('AnaliseManifestacao'),
    color: 'text-blue-600',
    bg: 'bg-blue-50',
  },
  {
    icon: FileWarning,
    label: 'Autos de Infração',
    desc: 'Gestão e remessas de AIs',
    to: createPageUrl('GestaoAutos'),
    color: 'text-orange-600',
    bg: 'bg-orange-50',
  },
  {
    icon: ClipboardList,
    label: 'Pareceres Técnicos',
    desc: 'Análise e recomendação técnica',
    to: createPageUrl('PareceresTecnicos'),
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
  },
  {
    icon: Scale,
    label: 'Câmara de Julgamento',
    desc: 'Deliberação de recursos e remessas',
    to: createPageUrl('CamaraJulgamento'),
    color: 'text-violet-600',
    bg: 'bg-violet-50',
  },
];

export default function CatesaDashboard() {
  return (
    <CatesaLayout>
      <div className="min-h-full bg-slate-50">
        <div className="max-w-4xl mx-auto px-6 py-10 space-y-8">

          {/* Banner */}
          <div className="rounded-2xl bg-gradient-to-br from-cyan-600 to-blue-700 p-8 text-white shadow-md">
            <div className="flex items-center gap-4">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-white/20">
                <Droplets className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold">Painel CATESA</h1>
                <p className="mt-1 text-cyan-100 text-sm">
                  Câmara Técnica de Saneamento Básico — Abastecimento de Água, Esgotamento Sanitário e Drenagem
                </p>
              </div>
            </div>
          </div>

          {/* Módulos */}
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
              Módulos
            </h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {MODULES.map(({ icon: Icon, label, desc, to, color, bg }) => (
                <Link
                  key={label}
                  to={to}
                  className="flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 hover:shadow-md transition-shadow group"
                >
                  <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${bg}`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-700 text-sm group-hover:text-slate-900">{label}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    </CatesaLayout>
  );
}
