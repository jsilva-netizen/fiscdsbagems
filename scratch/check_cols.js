import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

function loadEnv(file) {
  if (fs.existsSync(file)) {
    const lines = fs.readFileSync(file, 'utf-8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx === -1) continue;
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      process.env[key] = val;
    }
  }
}

loadEnv('.env.local');
loadEnv('.env');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.rpc('finalizar_fiscalizacao', { p_fiscalizacao_id: '00000000-0000-0000-0000-000000000000' });
  console.log("RPC Error/Result:", error || data);

  // Query table columns using a simple select
  const { data: cols, error: err } = await supabase.from('fiscalizacoes').select('*').limit(1);
  if (err) {
    console.error("Error querying fiscalizacoes:", err);
  } else {
    console.log("Fiscalizacoes columns:", Object.keys(cols[0] || {}));
  }
}

check();
