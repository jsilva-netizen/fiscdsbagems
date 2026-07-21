// Corrige fotos restauradas de backup no bucket fotos_fiscalizacao sem o prefixo
// "fiscalizacoes/" que o app sempre usou (src/lib/offline/syncEngine.ts). Sem o
// prefixo, o relatorios_worker não encontra o arquivo pelo path salvo em
// unidades_fiscalizadas.fotos_unidade e o relatório sai sem fotos.
//
// Uso:
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/fix_photo_paths.mjs --dry-run
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/fix_photo_paths.mjs
//
// --dry-run apenas lista o que seria movido, sem alterar nada.

import { createClient } from '@supabase/supabase-js'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const bucket = process.env.PHOTO_BUCKET || 'fotos_fiscalizacao'
const dryRun = process.argv.includes('--dry-run')

if (!url || !key) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key)

async function listAllFiles(prefix = '') {
  const files = []
  let offset = 0
  const limit = 1000
  while (true) {
    const { data, error } = await supabase.storage.from(bucket).list(prefix, {
      limit,
      offset,
      sortBy: { column: 'name', order: 'asc' }
    })
    if (error) throw error
    if (!data || data.length === 0) break

    for (const item of data) {
      const fullPath = prefix ? `${prefix}/${item.name}` : item.name
      // Pastas "sintéticas" do Storage vêm sem id/metadata; arquivos reais têm ambos.
      const isFolder = item.id === null && !item.metadata
      if (isFolder) {
        const nested = await listAllFiles(fullPath)
        files.push(...nested)
      } else {
        files.push(fullPath)
      }
    }

    if (data.length < limit) break
    offset += limit
  }
  return files
}

async function main() {
  console.log(`Listando arquivos em "${bucket}"...`)
  const all = await listAllFiles()
  const toFix = all.filter((p) => !p.startsWith('fiscalizacoes/'))

  console.log(`Total de arquivos: ${all.length}`)
  console.log(`Precisam de correção (sem prefixo "fiscalizacoes/"): ${toFix.length}`)

  if (toFix.length === 0) {
    console.log('Nada para corrigir.')
    return
  }

  if (dryRun) {
    console.log('\n--dry-run: nenhuma alteração será feita. Exemplos (até 20):')
    for (const p of toFix.slice(0, 20)) {
      console.log(`  ${p}  ->  fiscalizacoes/${p}`)
    }
    return
  }

  let moved = 0
  let failed = 0
  for (const oldPath of toFix) {
    const newPath = `fiscalizacoes/${oldPath}`
    const { error } = await supabase.storage.from(bucket).move(oldPath, newPath)
    if (error) {
      failed++
      console.error(`FALHOU: ${oldPath} -> ${newPath}: ${error.message}`)
    } else {
      moved++
      if (moved % 25 === 0 || moved === toFix.length) {
        console.log(`Movidos: ${moved}/${toFix.length}`)
      }
    }
  }

  console.log(`\nConcluído. Movidos: ${moved}. Falhas: ${failed}.`)
  if (failed > 0) process.exitCode = 1
}

main().catch((err) => {
  console.error('Erro fatal:', err)
  process.exit(1)
})
