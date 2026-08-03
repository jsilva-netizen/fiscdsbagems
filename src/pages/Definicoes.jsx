import { useState } from 'react';
import { Building2, ClipboardCheck, Users } from 'lucide-react';
import TiposUnidade from './TiposUnidade';
import Checklists from './Checklists';
import PrestadoresServico from './PrestadoresServico';
import AdminShell from '@/components/layout/AdminShell';
import { cn } from '@/lib/utils';

const TABS = [
    { id: 'tipos', label: 'Tipos de Unidade', icon: Building2 },
    { id: 'checklists', label: 'Checklists', icon: ClipboardCheck },
    { id: 'prestadores', label: 'Prestadores', icon: Users },
];

export default function Definicoes() {
    const [activeTab, setActiveTab] = useState('tipos');

    return (
        <AdminShell title="Definições">
            {/* Tabs */}
            <nav className="flex gap-1 border-b border-slate-200 px-4">
                {TABS.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        onClick={() => setActiveTab(id)}
                        className={cn(
                            'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                            activeTab === id
                                ? 'border-blue-900 text-blue-900'
                                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
                        )}
                    >
                        <Icon className="h-4 w-4 shrink-0" />
                        {label}
                    </button>
                ))}
            </nav>

            {/* Content */}
            <div className="flex-1">
                {activeTab === 'tipos' && <TiposUnidade embedded />}
                {activeTab === 'checklists' && <Checklists embedded />}
                {activeTab === 'prestadores' && <PrestadoresServico embedded />}
            </div>
        </AdminShell>
    );
}
