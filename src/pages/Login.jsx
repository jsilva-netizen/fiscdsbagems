import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2, LogIn, Mail, Lock } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const { login, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/', { replace: true });
        }
    }, [isAuthenticated, navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError(err.message || 'Erro ao realizar login. Verifique suas credenciais.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0066B3] to-[#004A8F] flex items-center justify-center px-4 py-12">
            <div className="w-full max-w-sm">
                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
                    {/* Faixa navy com logo */}
                    <div className="bg-gradient-to-br from-[#0066B3] to-[#004A8F] px-8 pt-8 pb-7 flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center p-2.5 shadow-md mb-3">
                            <svg viewBox="0 0 128 128" className="w-full h-full" aria-label="Logo AGEMS">
                                <circle cx="64" cy="64" r="56" fill="none" stroke="#101010" strokeWidth="6" />
                                <polygon points="24,32 44,32 64,64 44,96 24,96 44,64" fill="#1FA463" />
                                <polygon points="44,32 64,32 84,64 64,96 44,96 64,64" fill="#0066B3" />
                                <polygon points="64,32 84,32 104,64 84,96 64,96 84,64" fill="#F6C713" />
                            </svg>
                        </div>
                        <h1 className="text-xl font-bold text-white tracking-tight">AGEMS</h1>
                        <p className="text-blue-200 text-xs mt-1">SIFIS - Sistema Integrado de Fiscalização</p>
                    </div>

                    {/* Formulário */}
                    <div className="px-8 py-7">
                        <h2 className="text-lg font-bold text-gray-900 mb-1">Bem-vindo de volta</h2>
                        <p className="text-gray-500 text-sm mb-6">Entre com suas credenciais para acessar</p>

                        {error && (
                            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-xl mb-4">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-4">
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

                            <Button
                                type="submit"
                                className="w-full h-11 mt-2 bg-[#0066B3] hover:bg-[#004A8F] text-white font-semibold rounded-xl shadow transition-all"
                                disabled={loading}
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Entrando...
                                    </>
                                ) : (
                                    <>
                                        <LogIn className="mr-2 h-4 w-4" />
                                        Entrar
                                    </>
                                )}
                            </Button>
                        </form>

                        <div className="mt-6 text-center text-sm text-gray-500">
                            Não tem uma conta?{' '}
                            <Link to="/register" className="text-[#0066B3] font-semibold hover:underline">
                                Cadastre-se
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
