import React from 'react';
import { Repository } from '@/lib/offline/repository';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, Search, MapPin } from 'lucide-react';
import AdminShell from '@/components/layout/AdminShell';

export default function Municipios() {
    const [search, setSearch] = React.useState('');

    const { data: municipios = [], isLoading } = useQuery({
        queryKey: ['municipios'],
        queryFn: async () => await Repository.listMunicipios()
    });

    const filteredMunicipios = municipios.filter(m =>
        m.nome.toLowerCase().includes(search.toLowerCase()) ||
        m.codigo_ibge?.includes(search)
    );

    return (
        <AdminShell title="Municípios do MS">
            <div className="max-w-4xl mx-auto px-4 py-4">
                {/* Search */}
                <div className="relative mb-4">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Buscar município ou código IBGE..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10 h-11 rounded-xl bg-white border-gray-200"
                    />
                </div>

                {/* List */}
                <div className="pb-8">
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                            {filteredMunicipios.map((municipio) => (
                                <div
                                    key={municipio.id}
                                    className="bg-white border border-gray-200 rounded-xl p-3.5 flex items-center gap-3 hover:shadow-sm hover:border-indigo-200 transition-all"
                                >
                                    <div className="w-9 h-9 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <MapPin className="h-4.5 w-4.5 text-indigo-500" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-semibold text-gray-800 text-sm truncate">{municipio.nome}</p>
                                        {municipio.codigo_ibge && (
                                            <Badge className="text-[10px] bg-gray-100 text-gray-500 border-none mt-0.5 font-mono">
                                                IBGE: {municipio.codigo_ibge}
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {!isLoading && filteredMunicipios.length === 0 && (
                        <div className="text-center py-16">
                            <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                                <MapPin className="h-7 w-7 text-gray-300" />
                            </div>
                            <p className="text-gray-500 font-semibold">Nenhum município encontrado</p>
                            <p className="text-gray-400 text-sm mt-1">Tente outro termo de busca</p>
                        </div>
                    )}
                </div>
            </div>
        </AdminShell>
    );
}
