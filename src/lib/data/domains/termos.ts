// Domínio `termos` (contracts/domains.md) — termos de notificação. Implementação real:
// tasks.md Fase 4 (US2), T062-T064.

function aindaNaoMigrado(operacao: string): never {
  throw new Error(`[domains/termos] "${operacao}" ainda não foi migrada (tasks.md Fase 4, US2).`)
}

export const termosDomain = {
  emitir: (_dados: unknown) => aindaNaoMigrado('emitir'),
  listar: () => aindaNaoMigrado('listar'),
  obterPorId: (_id: string) => aindaNaoMigrado('obterPorId'),
  atualizarSituacao: (_id: string, _situacao: string) => aindaNaoMigrado('atualizarSituacao'),
  registrarRespostaPrestador: (_dados: unknown) => aindaNaoMigrado('registrarRespostaPrestador'),
  anexarArquivoResposta: (_dados: unknown) => aindaNaoMigrado('anexarArquivoResposta'),
  gerarNumeroAm: () => aindaNaoMigrado('gerarNumeroAm'), // via procedimentos.gerarNumeroAm
}
