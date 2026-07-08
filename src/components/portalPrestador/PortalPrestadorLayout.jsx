import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';

/**
 * Layout compartilhado do Portal do Prestador — mesma estrutura visual do
 * CamaraLayout (cabeçalho gradiente, logo da AGEMS, abas sublinhadas, botão
 * Sair), mas sem os recursos exclusivos de admin interno (troca de câmara,
 * atalho de Usuários, SyncBar), já que o prestador é um usuário externo.
 *
 * @param {string}   prestadorNome - Nome do prestador logado, mostrado como subtítulo.
 * @param {Array}    navItems      - [{ value, label }] — abas locais (sem navegação de rota).
 * @param {string}   activeValue   - value do item ativo em navItems.
 * @param {Function} onNavChange   - chamado com o value do item clicado.
 * @param {ReactNode} children
 */
export default function PortalPrestadorLayout({ prestadorNome, navItems = [], activeValue, onNavChange, children }) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [saindo, setSaindo] = useState(false);

  const handleLogout = async () => {
    if (saindo) return;
    setSaindo(true);
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (err) {
      alert('Erro ao sair: ' + (err?.message || String(err)));
    } finally {
      setSaindo(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-indigo-950 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 pt-4 pb-0">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pb-3">
            {/* Logo AGEMS */}
            <Link to={createPageUrl('PortalPrestadorHome')} className="w-9 h-9 bg-white rounded-xl flex items-center justify-center p-1.5 shadow-md flex-shrink-0">
              <svg viewBox="0 0 128 128" className="w-full h-full" aria-label="Logo AGEMS">
                <circle cx="64" cy="64" r="56" fill="none" stroke="#101010" strokeWidth="6" />
                <polygon points="24,32 44,32 64,64 44,96 24,96 44,64" fill="#1FA463" />
                <polygon points="44,32 64,32 84,64 64,96 44,96 64,64" fill="#1894F2" />
                <polygon points="64,32 84,32 104,64 84,96 64,96 84,64" fill="#F6C713" />
              </svg>
            </Link>

            <div className="flex-1 min-w-[64px]">
              <h1 className="text-xs font-bold uppercase tracking-widest text-blue-200">Portal do Prestador</h1>
              {prestadorNome && <p className="hidden sm:block text-blue-200/80 text-xs truncate">{prestadorNome}</p>}
            </div>

            {/* Sair */}
            <Button
              variant="ghost"
              size="sm"
              disabled={saindo}
              onClick={handleLogout}
              className="text-blue-200 hover:text-white hover:bg-white/10 rounded-lg gap-1.5 h-8 flex-shrink-0"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline text-xs">Sair</span>
            </Button>
          </div>

          {/* Nav tabs */}
          {navItems.length > 0 && (
            <nav className="flex items-end gap-1 overflow-x-auto">
              {navItems.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => onNavChange?.(item.value)}
                  className={cn(
                    'flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap',
                    activeValue === item.value
                      ? 'border-white text-white'
                      : 'border-transparent text-blue-200 hover:border-blue-300 hover:text-white'
                  )}
                >
                  {item.label}
                </button>
              ))}
            </nav>
          )}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <div className="py-5 text-center text-xs text-slate-400 bg-white border-t border-slate-200">
        AGEMS - Agência Estadual de Regulação de Serviços Públicos de MS
      </div>
    </div>
  );
}
