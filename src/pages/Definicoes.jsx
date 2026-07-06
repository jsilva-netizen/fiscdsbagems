import { useState } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building2, ClipboardCheck, Users } from 'lucide-react';
import TiposUnidade from './TiposUnidade';
import Checklists from './Checklists';
import PrestadoresServico from './PrestadoresServico';

const TABS = [
    { id: 'tipos', label: 'Tipos de Unidade', icon: Building2 },
    { id: 'checklists', label: 'Checklists', icon: ClipboardCheck },
    { id: 'prestadores', label: 'Prestadores', icon: Users },
];

export default function Definicoes() {
    const [activeTab, setActiveTab] = useState('tipos');

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-950 text-white shadow-md">
                <div className="max-w-4xl mx-auto px-4 py-5">
                    <div className="flex items-center gap-3 pb-3">
                        <Link to={createPageUrl('Fiscalizacoes')}>
                            <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 rounded-full">
                                <ArrowLeft className="h-5 w-5" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-xs font-bold uppercase tracking-widest text-blue-200">Definições</h1>
                        </div>
                    </div>
                    {/* Tabs */}
                    <nav className="flex gap-1">
                        {TABS.map(({ id, label, icon: Icon }) => (
                            <button
                                key={id}
                                onClick={() => setActiveTab(id)}
                                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                                    activeTab === id
                                        ? 'border-white text-white'
                                        : 'border-transparent text-blue-200 hover:border-blue-300 hover:text-white'
                                }`}
                            >
                                <Icon className="h-4 w-4 shrink-0" />
                                {label}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1">
                {activeTab === 'tipos' && <TiposUnidade embedded />}
                {activeTab === 'checklists' && <Checklists embedded />}
                {activeTab === 'prestadores' && <PrestadoresServico embedded />}
            </div>
        </div>
    );
}
