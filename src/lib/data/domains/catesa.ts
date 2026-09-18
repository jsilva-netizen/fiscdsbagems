// Domínio `catesa` (contracts/domains.md) — tarefas de análise assistida por IA da câmara
// de saneamento. Superfície pequena. Implementação real: tasks.md Fase 4 (US2), T073.
//
// catesa/aiJobs.js é cópia quase literal de caters/aiJobs.js (inventario-acoplamento.md
// lote 2) — a implementação pode reaproveitar catersDomain.tarefasIA internamente, desde
// que o comportamento observável não mude (mesma mensagem de erro, mesmo polling de 3000ms).

function aindaNaoMigrado(operacao: string): never {
  throw new Error(`[domains/catesa] "${operacao}" ainda não foi migrada (tasks.md Fase 4, US2).`)
}

export const catesaDomain = {
  tarefasIA: {
    solicitar: (_termoId: string) => aindaNaoMigrado('tarefasIA.solicitar'),
    consultarSituacao: (_jobId: string) => aindaNaoMigrado('tarefasIA.consultarSituacao'),
    marcarRevisada: (_jobId: string, _usuarioId: string) => aindaNaoMigrado('tarefasIA.marcarRevisada'),
  },
}
