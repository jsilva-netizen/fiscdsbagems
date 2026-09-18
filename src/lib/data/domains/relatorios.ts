// Domínio `relatorios` (contracts/domains.md) — solicitação e acompanhamento de geração de
// PDF. Implementação real: tasks.md Fase 4 (US2), T077-T079.

function aindaNaoMigrado(operacao: string): never {
  throw new Error(`[domains/relatorios] "${operacao}" ainda não foi migrada (tasks.md Fase 4, US2).`)
}

export const relatoriosDomain = {
  solicitar: (_fiscalizacaoId: string) => aindaNaoMigrado('solicitar'),
  consultarSituacao: (_jobId: string) => aindaNaoMigrado('consultarSituacao'),
  obterResumoIndicadores: (_filtros: unknown) => aindaNaoMigrado('obterResumoIndicadores'), // via procedimentos.obterResumoIndicadores
}
