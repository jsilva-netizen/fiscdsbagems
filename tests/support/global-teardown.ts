// Conecta cleanupAfter() (FR-015) ao ciclo de vida real da suíte Playwright. Roda mesmo se
// algum teste falhou — cleanupAfter() só some o que esta execução marcou, então não há risco
// de mascarar a causa da falha (o trace/screenshot de falha já foi capturado antes disso).
import { cleanupAfter } from './cleanup'

export default async function globalTeardown(): Promise<void> {
  await cleanupAfter()
}
