import { FileText } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';

/**
 * Shell do Portal do Prestador — mesma chrome do resto do app, mas sem os
 * recursos exclusivos de admin interno (troca de câmara, atalho de
 * Usuários), já que o prestador é um usuário externo.
 *
 * @param {string}   prestadorNome - Nome do prestador logado, mostrado como subtítulo.
 * @param {Array}    navItems      - [{ value, label, icon? }] — abas locais (sem navegação de rota).
 * @param {string}   activeValue   - value do item ativo em navItems.
 * @param {Function} onNavChange   - chamado com o value do item clicado.
 * @param {ReactNode} children
 */
export default function PortalPrestadorLayout({ prestadorNome, navItems = [], activeValue, onNavChange, children }) {
  const sidebarItems = navItems.map((item) => ({
    label: item.label,
    icon: item.icon || FileText,
    active: activeValue === item.value,
    onClick: () => onNavChange?.(item.value),
  }));

  return (
    <AppShell sigla="Portal do Prestador" navItems={sidebarItems} title="Portal do Prestador" subtitle={prestadorNome}>
      {children}
      <div className="border-t border-slate-200 bg-white py-5 text-center text-xs text-slate-400">
        AGEMS - Agência Estadual de Regulação de Serviços Públicos de MS
      </div>
    </AppShell>
  );
}
