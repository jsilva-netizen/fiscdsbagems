import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2, User, Mail, Lock, Building, Layers } from 'lucide-react';

const CAMARAS_TECNICAS_POR_DIRETORIA = {
    dsb: [
        { id: 'catesa', nome: 'Câmara Técnica de Saneamento' },
        { id: 'caters', nome: 'Câmara Técnica de Resíduos Sólidos' },
        { id: 'cres', nome: 'Câmara Técnica de Regulação Econômica do Saneamento' }
    ],
    dtr: [
        { id: 'catransp', nome: 'Câmara Técnica de Transporte' },
        { id: 'caterf', nome: 'Câmara Técnica de Rodovias e Ferrovias' },
        { id: 'catefis', nome: 'Câmara Técnica de Fiscalização' },
        { id: 'cret', nome: 'Câmara Técnica de Regulação Econômica' }
    ],
    dge: [
        { id: 'categas', nome: 'Câmara Técnica de Gás Canalizado' },
        { id: 'catene', nome: 'Câmara Técnica de Energia e Mineração' },
        { id: 'creg', nome: 'Câmara Técnica de Regulação Econômica' }
    ]
};

export default function Register() {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState('fiscal');
    const [prestadores, setPrestadores] = useState([]);
    const [selectedPrestador, setSelectedPrestador] = useState('');
    const [selectedDiretoria, setSelectedDiretoria] = useState('dsb');
    const [selectedCamaraTecnica, setSelectedCamaraTecnica] = useState('');
    
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        async function fetchPrestadores() {
            try {
                const { data, error } = await supabase
                    .from('prestadores_servico')
                    .select('id, nome')
                    .eq('ativo', true)
                    .order('nome');
                if (error) throw error;
                setPrestadores(data || []);
            } catch (err) {
                console.error('Erro ao carregar prestadores:', err);
            }
        }
        fetchPrestadores();
    }, []);

    const handleDiretoriaChange = (val) => {
        setSelectedDiretoria(val);
        setSelectedCamaraTecnica('');
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        
        if (loading) return;

        setError(null);

        if (password !== confirmPassword) {
            setError('As senhas não coincidem.');
            return;
        }

        if (password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres.');
            return;
        }

        if (role === 'prestador' && !selectedPrestador) {
            setError('Selecione a entidade representada.');
            return;
        }

        if (['fiscal', 'coordenador'].includes(role) && (!selectedDiretoria || !selectedCamaraTecnica)) {
            setError('Selecione a diretoria e a câmara técnica.');
            return;
        }

        if (role === 'diretor' && !selectedDiretoria) {
            setError('Selecione a diretoria.');
            return;
        }

        setLoading(true);

        try {
            // 1. Criar usuário no Supabase Auth com metadados adicionais
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName,
                        role: role,
                        diretoria_id: ['fiscal', 'coordenador', 'diretor'].includes(role) ? selectedDiretoria : 'dsb',
                        camara_tecnica_id: ['fiscal', 'coordenador'].includes(role) ? (selectedCamaraTecnica || null) : null,
                        prestador_servico_id: role === 'prestador' ? (selectedPrestador || null) : null
                    }
                }
            });

            if (authError) {
                if (authError.status === 429 || authError.message?.includes('rate limit')) {
                    throw new Error('Muitas tentativas. Aguarde alguns minutos antes de tentar novamente.');
                }
                if (authError.message?.toLowerCase().includes('already registered')) {
                    throw new Error('Este e-mail já possui cadastro. Use a senha existente para entrar ou peça ao administrador para excluir definitivamente o usuário antes de cadastrar novamente.');
                }
                throw authError;
            }

            // 2. Criar perfil manualmente se o trigger falhar ou demorar
            if (authData?.user) {
                const { data: existingProfile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('id', authData.user.id)
                    .single();

                if (!existingProfile) {
                    const { error: profileError } = await supabase
                        .from('profiles')
                        .insert({
                            id: authData.user.id,
                            email: email,
                            full_name: fullName,
                            role: role,
                            ativo: false,
                            diretoria_id: ['fiscal', 'coordenador', 'diretor'].includes(role) ? selectedDiretoria : 'dsb',
                            camara_tecnica_id: ['fiscal', 'coordenador'].includes(role) ? (selectedCamaraTecnica || null) : null,
                            prestador_servico_id: role === 'prestador' ? (selectedPrestador || null) : null
                        });
                    
                    if (profileError) {
                        console.error('Erro ao criar perfil:', profileError);
                    }
                }
            }

            alert('Cadastro realizado com sucesso! Faça login para continuar.');
            navigate('/login');

        } catch (err) {
            console.error('Erro no registro:', err);
            setError(err.message || 'Erro ao realizar cadastro.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0066B3] to-[#004A8F] flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-md my-8">
                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                    {/* Faixa navy com logo */}
                    <div className="bg-gradient-to-br from-[#0066B3] to-[#004A8F] px-6 sm:px-8 pt-7 pb-6 flex flex-col items-center text-center">
                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center p-2 shadow-md mb-3">
                            <svg viewBox="0 0 128 128" className="w-full h-full" aria-label="Logo AGEMS">
                                <circle cx="64" cy="64" r="56" fill="none" stroke="#101010" strokeWidth="6" />
                                <polygon points="24,32 44,32 64,64 44,96 24,96 44,64" fill="#1FA463" />
                                <polygon points="44,32 64,32 84,64 64,96 44,96 64,64" fill="#0066B3" />
                                <polygon points="64,32 84,32 104,64 84,96 64,96 84,64" fill="#F6C713" />
                            </svg>
                        </div>
                        <h1 className="text-xl font-bold text-white tracking-tight">AGEMS</h1>
                        <p className="text-blue-200 text-xs mt-0.5">SIFIS - Sistema Integrado de Fiscalização</p>
                    </div>

                    {/* Formulário */}
                    <div className="px-6 sm:px-8 py-7">
                    <h2 className="text-lg font-bold text-gray-900 mb-1">Crie sua conta</h2>
                    <p className="text-gray-500 text-xs mb-5">Preencha os dados abaixo para se cadastrar</p>

                    {error && (
                        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-xl mb-4">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleRegister} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Nome Completo</label>
                            <div className="relative">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                <input
                                    id="fullName"
                                    type="text"
                                    placeholder="Seu nome completo"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                    className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0066B3] focus:border-transparent transition-all text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-gray-500 text-xs font-semibold uppercase tracking-wider">E-mail</label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                <input
                                    id="email"
                                    type="email"
                                    placeholder="nome@agems.ms.gov.br"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0066B3] focus:border-transparent transition-all text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Tipo de Usuário</label>
                            <div className="relative">
                                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                <select
                                    id="role"
                                    value={role}
                                    onChange={(e) => {
                                        setRole(e.target.value);
                                        setSelectedPrestador('');
                                        setSelectedCamaraTecnica('');
                                    }}
                                    className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0066B3] focus:border-transparent transition-all text-sm cursor-pointer"
                                >
                                    <option value="fiscal">Fiscal</option>
                                    <option value="coordenador">Coordenador</option>
                                    <option value="diretor">Diretor</option>
                                    <option value="prestador">Prestador</option>
                                </select>
                            </div>
                        </div>

                        {role === 'prestador' && (
                            <div className="space-y-1.5">
                                <label className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Entidade Representada</label>
                                <div className="relative">
                                    <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                    <select
                                        id="prestador"
                                        value={selectedPrestador}
                                        onChange={(e) => setSelectedPrestador(e.target.value)}
                                        required
                                        className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0066B3] focus:border-transparent transition-all text-sm cursor-pointer"
                                    >
                                        <option value="">Selecione uma entidade...</option>
                                        {prestadores.map((p) => (
                                            <option key={p.id} value={p.id}>{p.nome}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {['fiscal', 'coordenador', 'diretor'].includes(role) && (
                            <div className="space-y-1.5">
                                <label className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Diretoria</label>
                                <div className="relative">
                                    <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                    <select
                                        id="diretoria"
                                        value={selectedDiretoria}
                                        onChange={(e) => handleDiretoriaChange(e.target.value)}
                                        required
                                        className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0066B3] focus:border-transparent transition-all text-sm cursor-pointer"
                                    >
                                        <option value="dsb">DSB (Saneamento)</option>
                                        <option value="dtr">DTR (Transportes)</option>
                                        <option value="dge">DGE (Gás e Energia)</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {['fiscal', 'coordenador'].includes(role) && (
                            <div className="space-y-1.5">
                                <label className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Câmara Técnica</label>
                                <div className="relative">
                                    <Layers className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                    <select
                                        id="camaraTecnica"
                                        value={selectedCamaraTecnica}
                                        onChange={(e) => setSelectedCamaraTecnica(e.target.value)}
                                        required
                                        className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0066B3] focus:border-transparent transition-all text-sm cursor-pointer"
                                    >
                                        <option value="">Selecione uma câmara...</option>
                                        {CAMARAS_TECNICAS_POR_DIRETORIA[selectedDiretoria]?.map((ct) => (
                                            <option key={ct.id} value={ct.id}>{ct.nome}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <label className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Senha</label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                <input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0066B3] focus:border-transparent transition-all text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-gray-500 text-xs font-semibold uppercase tracking-wider">Confirmar Senha</label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                <input
                                    id="confirmPassword"
                                    type="password"
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    className="w-full h-11 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0066B3] focus:border-transparent transition-all text-sm"
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-11 mt-2 bg-[#0066B3] hover:bg-[#004A8F] text-white font-semibold rounded-xl shadow transition-all"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Cadastrando...
                                </>
                            ) : (
                                <>
                                    Criar Conta
                                </>
                            )}
                        </Button>
                    </form>

                    <div className="mt-6 text-center text-sm text-gray-500">
                        Já tem uma conta?{' '}
                        <Link to="/login" className="text-[#0066B3] font-semibold hover:underline">
                            Faça login
                        </Link>
                    </div>
                    </div>
                </div>

                <p className="text-center text-blue-300 text-xs mt-6">
                    AGEMS — Agência Estadual de Regulação de Serviços Públicos de MS
                </p>
            </div>
        </div>
    );
}
