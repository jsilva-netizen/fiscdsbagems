// Domínio `fiscalizacoes` (contracts/domains.md) — núcleo de campo, único domínio
// atravessado pelo caminho offline. Implementação real: tasks.md Fase 3 (US1), T030-T034.
//
// Esqueleto por enquanto — assinatura das operações, sem corpo. Chamar qualquer uma destas
// antes da Fase 3 é erro de programação, não caso de uso válido: por isso falha alto.

function aindaNaoMigrado(operacao: string): never {
  throw new Error(
    `[domains/fiscalizacoes] "${operacao}" ainda não foi migrada (tasks.md Fase 3, US1).`
  )
}

export const fiscalizacoesDomain = {
  listar: () => aindaNaoMigrado('listar'),
  obterPorId: (_id: string) => aindaNaoMigrado('obterPorId'),
  criar: (_dados: unknown) => aindaNaoMigrado('criar'),
  criarUnidade: (_dados: unknown) => aindaNaoMigrado('criarUnidade'),
  responderChecklist: (_dados: unknown) => aindaNaoMigrado('responderChecklist'),
  registrarNaoConformidade: (_dados: unknown) => aindaNaoMigrado('registrarNaoConformidade'),
  registrarConstatacaoManual: (_dados: unknown) => aindaNaoMigrado('registrarConstatacaoManual'),
  registrarDeterminacao: (_dados: unknown) => aindaNaoMigrado('registrarDeterminacao'),
  registrarRecomendacao: (_dados: unknown) => aindaNaoMigrado('registrarRecomendacao'),
  anexarFoto: (_dados: unknown) => aindaNaoMigrado('anexarFoto'),
  listarFotos: (_unidadeId: string) => aindaNaoMigrado('listarFotos'),
  listarTiposUnidade: () => aindaNaoMigrado('listarTiposUnidade'),
  listarItensChecklist: (_tipoUnidadeId: string) => aindaNaoMigrado('listarItensChecklist'),
  finalizar: (_fiscalizacaoId: string) => aindaNaoMigrado('finalizar'), // via procedimentos.finalizarFiscalizacao
  reabrir: (_fiscalizacaoId: string) => aindaNaoMigrado('reabrir'), // via procedimentos.reabrirFiscalizacao
  buscarHistoricoAlteracoes: (_fiscalizacaoId: string) => aindaNaoMigrado('buscarHistoricoAlteracoes'),
}
