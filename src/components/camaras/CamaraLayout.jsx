import AppShell from '@/components/layout/AppShell';

/**
 * Generic shell for all chambers (DSB/DTR/DGE) — cabeçalho + barra lateral
 * institucional AGEMS.
 *
 * @param {string}   sigla     - Short name shown in header, e.g. 'CATESA'
 * @param {string}   nome      - Full chamber name, e.g. 'Câmara Técnica de Saneamento'
 * @param {string}   diretoria - 'dsb' | 'dtr' | 'dge' — usada pelo seletor de câmara do admin
 * @param {Array}    navItems  - [{ label, to, icon, badge?, activeFor? }]
 * @param {ReactNode} children
 */
export default function CamaraLayout({ sigla, nome, diretoria, navItems = [], children }) {
  return (
    <AppShell sigla={sigla} nome={nome} diretoria={diretoria} navItems={navItems} showCamaraSwitcher title={sigla} subtitle={nome}>
      {children}
    </AppShell>
  );
}
