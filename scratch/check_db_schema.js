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
  console.log("Checking units columns...");
  const { data: unitsData, error: unitsErr } = await supabase
    .from('unidades_fiscalizadas')
    .select('rodovia, trecho, km, tipo_ocorrencia, gravidade')
    .limit(1);
  if (unitsErr) {
    console.error("Error reading unidades_fiscalizadas columns:", unitsErr);
  } else {
    console.log("unidades_fiscalizadas has the DTR columns!");
  }

  console.log("Checking fiscalizacoes columns...");
  const { data: fiscData, error: fiscErr } = await supabase
    .from('fiscalizacoes')
    .select('rodovia')
    .limit(1);
  if (fiscErr) {
    console.error("Error reading fiscalizacoes columns:", fiscErr);
  } else {
    console.log("fiscalizacoes has the DTR columns!");
  }
}

check();
