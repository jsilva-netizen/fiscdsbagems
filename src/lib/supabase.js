import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL or Anon Key is missing. Please check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Exportados explicitamente para src/lib/data/providers/supabase/alcancabilidade.ts, que
// monta URLs de sondagem de conectividade sem passar pelo cliente PostgREST. Preferir isto
// a ler propriedades internas não documentadas do client (`supabase.supabaseUrl` existe em
// runtime, mas não é API pública estável do SDK).
export { supabaseUrl, supabaseAnonKey }
