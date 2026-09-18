// Trava de execução da suíte (FR-018, decisão D7 de research.md).
//
// A suíte escreve e apaga na base real (assumption registrada em spec.md). Este guard
// existe para que "esqueci de configurar" resulte em falha imediata, nunca em escrita
// silenciosa contra a base errada. Import este módulo no topo de todo arquivo de teste que
// grava dado (tests/e2e/escrita/**, tests/e2e/offline/**, tests/e2e/permissoes/**) — a
// simples importação já dispara a checagem, antes de qualquer requisição.

function loadEnvFileIfPresent(path: string): void {
  try {
    // Node 20.6+: carrega sem dependência nova (Princípio V da constituição).
    ;(process as unknown as { loadEnvFile?: (p?: string) => void }).loadEnvFile?.(path)
  } catch {
    // Arquivo ausente é normal (.env.local não é obrigatório em CI, por exemplo) — segue.
  }
}

function extractHost(url: string | undefined): string | null {
  if (!url) return null
  try {
    return new URL(url).hostname
  } catch {
    return null
  }
}

export function assertTargetConfirmed(): void {
  loadEnvFileIfPresent('.env.local')
  loadEnvFileIfPresent('.env')

  const targetHost = extractHost(process.env.VITE_SUPABASE_URL)
  const confirmedHost = process.env.E2E_CONFIRM_BASE

  if (!targetHost) {
    throw new Error(
      '[guard] VITE_SUPABASE_URL ausente ou inválida. A suíte não sabe contra qual base ' +
        'rodaria e se recusa a continuar.'
    )
  }

  if (!confirmedHost) {
    throw new Error(
      `[guard] Confirmação ausente. Esta execução escreveria contra "${targetHost}". ` +
        `Defina E2E_CONFIRM_BASE=${targetHost} explicitamente (nunca copie de outro ` +
        'ambiente) para confirmar que você sabe qual base está sendo usada.'
    )
  }

  if (confirmedHost !== targetHost) {
    throw new Error(
      `[guard] Confirmação não corresponde à base alvo. Esperado E2E_CONFIRM_BASE=` +
        `"${targetHost}", recebido "${confirmedHost}". A execução foi abortada antes de ` +
        'qualquer requisição.'
    )
  }
}

// Efeito no import — decisão deliberada (ver cabeçalho do arquivo): a trava dispara ao
// simplesmente importar este módulo, para que nenhum arquivo de teste possa "esquecer" de
// chamá-la explicitamente.
assertTargetConfirmed()

export const targetHost = extractHost(process.env.VITE_SUPABASE_URL)
