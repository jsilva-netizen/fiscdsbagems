// Conecta sweepBefore() (FR-016) ao ciclo de vida real da suíte Playwright — sem isto,
// tests/support/cleanup.ts existe mas nunca roda. Import de './guard' aqui dispara a trava
// (FR-018) antes de qualquer teste começar, não só antes da primeira escrita.
import './guard'
import { sweepBefore } from './cleanup'

export default async function globalSetup(): Promise<void> {
  await sweepBefore()
}
