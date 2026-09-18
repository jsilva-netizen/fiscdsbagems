// Domínio `caters` (contracts/domains.md) — reaproveita a organização já existente em
// src/lib/caters/ (9 arquivos). Implementação real: tasks.md Fase 4 (US2), T072.

function aindaNaoMigrado(operacao: string): never {
  throw new Error(`[domains/caters] "${operacao}" ainda não foi migrada (tasks.md Fase 4, US2).`)
}

export const catersDomain = {
  processos: {
    listar: (_filtros?: unknown) => aindaNaoMigrado('processos.listar'),
    obterPorId: (_id: string) => aindaNaoMigrado('processos.obterPorId'),
    criar: (_dados: unknown) => aindaNaoMigrado('processos.criar'),
    atualizar: (_id: string, _dados: unknown) => aindaNaoMigrado('processos.atualizar'),
    remover: (_id: string) => aindaNaoMigrado('processos.remover'),
    listarFiscalizacoesParaVincular: () => aindaNaoMigrado('processos.listarFiscalizacoesParaVincular'),
    importarDeFiscalizacao: (_fiscalizacaoId: string, _processoId: string, _prazoDias?: number) =>
      aindaNaoMigrado('processos.importarDeFiscalizacao'), // via procedimentos.importarDoCaters
  },
  recomendacoes: {
    listarPorProcesso: (_processoId: string) => aindaNaoMigrado('recomendacoes.listarPorProcesso'),
    criar: (_dados: unknown) => aindaNaoMigrado('recomendacoes.criar'),
    atualizar: (_id: string, _dados: unknown) => aindaNaoMigrado('recomendacoes.atualizar'),
    remover: (_id: string) => aindaNaoMigrado('recomendacoes.remover'),
  },
  dashboard: {
    obterResumo: () => aindaNaoMigrado('dashboard.obterResumo'),
    obterAlertas: () => aindaNaoMigrado('dashboard.obterAlertas'),
  },
  documentos: {
    listarExtras: (_processoId: string) => aindaNaoMigrado('documentos.listarExtras'),
    enviarExtra: (_dados: unknown) => aindaNaoMigrado('documentos.enviarExtra'),
  },
  prorrogacoes: {
    listar: (_processoId: string) => aindaNaoMigrado('prorrogacoes.listar'),
    criar: (_dados: unknown) => aindaNaoMigrado('prorrogacoes.criar'),
  },
  historico: {
    listar: (_processoId: string) => aindaNaoMigrado('historico.listar'),
  },
  notificacoes: {
    marcarLidas: (_chaves: string[]) => aindaNaoMigrado('notificacoes.marcarLidas'),
  },
  tarefasIA: {
    solicitar: (_dados: unknown) => aindaNaoMigrado('tarefasIA.solicitar'),
    consultarSituacao: (_jobId: string) => aindaNaoMigrado('tarefasIA.consultarSituacao'),
  },
}
