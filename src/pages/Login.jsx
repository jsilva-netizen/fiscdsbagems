import { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, LogIn, Mail, Lock } from 'lucide-react';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            await login(email, password);
        } catch (err) {
            setError(err.message || 'Erro ao realizar login. Verifique suas credenciais.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 flex items-center justify-center px-4 py-12">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-400/10 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md">
                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center p-3 shadow-xl mb-4">
                        <svg viewBox="0 0 128 128" className="w-full h-full" aria-label="Logo AGEMS">
                            <circle cx="64" cy="64" r="56" fill="none" stroke="#101010" strokeWidth="6" />
                            <polygon points="24,32 44,32 64,64 44,96 24,96 44,64" fill="#1FA463" />
                            <polygon points="44,32 64,32 84,64 64,96 44,96 64,64" fill="#1894F2" />
                            <polygon points="64,32 84,32 104,64 84,96 64,96 84,64" fill="#F6C713" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">AGEMS</h1>
                    <p className="text-blue-300 text-sm mt-1">Sistema de Fiscalização</p>
                </div>

                {/* Card */}
                <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8">
                    <h2 className="text-xl font-bold text-white mb-1">Bem-vindo de volta</h2>
                    <p className="text-blue-200 text-sm mb-6">Entre com suas credenciais para acessar</p>

                    {error && (
                        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-200 text-sm px-4 py-3 rounded-xl mb-4">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-blue-200 text-xs font-semibold uppercase tracking-wider">E-mail</label>
                            <div className="relative">
                                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-300 pointer-events-none" />
                                <input
                                    id="email"
                                    type="email"
                                    placeholder="nome@agems.ms.gov.br"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full h-12 pl-10 pr-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-blue-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-blue-200 text-xs font-semibold uppercase tracking-wider">Senha</label>
                            <div className="relative">
                                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-300 pointer-events-none" />
                                <input
                                    id="password"
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full h-12 pl-10 pr-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-blue-300/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all text-sm"
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 mt-2 bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 text-white font-semibold rounded-xl shadow-lg transition-all"
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

                    <div className="mt-6 text-center text-sm text-blue-300">
                        Não tem uma conta?{' '}
                        <Link to="/register" className="text-white font-semibold hover:underline">
                            Cadastre-se
                        </Link>
                    </div>
                </div>

                <p className="text-center text-blue-400/60 text-xs mt-6">
                    AGEMS — Agência Estadual de Regulação de Serviços Públicos de MS
                </p>
            </div>
        </div>
    );
}
