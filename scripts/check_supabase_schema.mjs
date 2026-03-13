const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  process.exitCode = 1
  process.stdout.write('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit()
}
const base = url.endsWith('/rest/v1') ? url : `${url}/rest/v1`
const headers = { apikey: key, Authorization: `Bearer ${key}` }
const endpoints = [
  { name: 'unidades_fiscalizadas', path: '/unidades_fiscalizadas?select=*&limit=1' },
  { name: 'respostas_checklist', path: '/respostas_checklist?select=*&limit=1' },
  { name: 'constatacoes_manuais', path: '/constatacoes_manuais?select=*&limit=1' },
  { name: 'recomendacoes', path: '/recomendacoes?select=*&limit=1' },
  { name: 'determinacoes', path: '/determinacoes?select=*&limit=1' },
  { name: 'nao_conformidades', path: '/nao_conformidades?select=*&limit=1' },
  { name: 'itens_checklist', path: '/itens_checklist?select=*&limit=1' }
]
async function run() {
  for (const e of endpoints) {
    process.stdout.write(`=== ${e.name} ===\n`)
    try {
      const res = await fetch(base + e.path, { headers })
      const txt = await res.text()
      let data
      try {
        data = JSON.parse(txt)
      } catch {
        process.stdout.write(`Error parsing JSON: ${txt}\n`)
        continue
      }
      if (Array.isArray(data) && data.length > 0) {
        const cols = Object.keys(data[0])
        process.stdout.write(`Columns: ${cols.join(', ')}\n`)
      } else if (Array.isArray(data)) {
        process.stdout.write('No rows (endpoint reachable)\n')
      } else {
        process.stdout.write(`Non-array response: ${txt}\n`)
      }
    } catch (err) {
      process.stdout.write(`Error: ${String(err)}\n`)
    }
  }
}
run()
