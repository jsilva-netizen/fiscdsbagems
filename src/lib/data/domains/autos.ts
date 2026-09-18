// Domínio `autos` (contracts/domains.md) — processo sancionador. Implementação real:
// tasks.md Fase 4 (US2), T066-T071.

function aindaNaoMigrado(operacao: string): never {
  throw new Error(`[domains/autos] "${operacao}" ainda não foi migrada (tasks.md Fase 4, US2).`)
}

export const autosDomain = {
  listar: () => aindaNaoMigrado('listar'),
  emitir: (_dados: unknown) => aindaNaoMigrado('emitir'),
  registrarManifestacao: (_dados: unknown) => aindaNaoMigrado('registrarManifestacao'),
  emitirParecerTecnico: (_dados: unknown) => aindaNaoMigrado('emitirParecerTecnico'),
  registrarJulgamento: (_dados: unknown) => aindaNaoMigrado('registrarJulgamento'),
  montarRemessa: (_dados: unknown) => aindaNaoMigrado('montarRemessa'),
  listarRemessas: () => aindaNaoMigrado('listarRemessas'),
  gerarNumero: () => aindaNaoMigrado('gerarNumero'), // via procedimentos.gerarNumeroAuto
}
