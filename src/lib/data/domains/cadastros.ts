// Domínio `cadastros` (contracts/domains.md) — dados de referência. Implementação real:
// tasks.md Fase 4 (US2), T057-T060.
//
// Atenção preservada de contracts/domains.md: `itemChecklist.atualizar` é append-only
// (insere linha nova, nunca altera em lugar) — não é uma operação `Atualizar` genérica da
// categoria Registros. Ver debitos-tecnicos-e-inconsistencias.md item 5.

function aindaNaoMigrado(operacao: string): never {
  throw new Error(`[domains/cadastros] "${operacao}" ainda não foi migrada (tasks.md Fase 4, US2).`)
}

export const cadastrosDomain = {
  prestador: {
    listar: () => aindaNaoMigrado('prestador.listar'),
    obterPorId: (_id: string) => aindaNaoMigrado('prestador.obterPorId'),
    criar: (_dados: unknown) => aindaNaoMigrado('prestador.criar'),
    atualizar: (_id: string, _dados: unknown) => aindaNaoMigrado('prestador.atualizar'),
  },
  municipio: {
    listar: () => aindaNaoMigrado('municipio.listar'),
  },
  contrato: {
    listar: () => aindaNaoMigrado('contrato.listar'),
    criar: (_dados: unknown) => aindaNaoMigrado('contrato.criar'),
  },
  tipoUnidade: {
    listar: () => aindaNaoMigrado('tipoUnidade.listar'),
    criar: (_dados: unknown) => aindaNaoMigrado('tipoUnidade.criar'),
    desativar: (_id: string) => aindaNaoMigrado('tipoUnidade.desativar'),
    reativar: (_id: string) => aindaNaoMigrado('tipoUnidade.reativar'),
  },
  itemChecklist: {
    listar: (_tipoUnidadeId: string) => aindaNaoMigrado('itemChecklist.listar'),
    /** Append-only — ver cabeçalho do arquivo. Não é Registros.atualizar. */
    atualizar: (_itemAnterior: unknown, _dados: unknown) => aindaNaoMigrado('itemChecklist.atualizar'),
    remover: (_item: unknown) => aindaNaoMigrado('itemChecklist.remover'),
  },
  perfilUsuario: {
    listar: () => aindaNaoMigrado('perfilUsuario.listar'),
    excluir: (_idOuEmail: { id?: string; email?: string }) => aindaNaoMigrado('perfilUsuario.excluir'), // via procedimentos.excluirUsuarioAdmin
  },
}
