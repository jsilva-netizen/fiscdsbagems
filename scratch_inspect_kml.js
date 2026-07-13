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
      const val = trimmed.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      process.env[key] = val;
    }
  }
}

loadEnv('.env.local');
loadEnv('.env');

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

console.log('URL:', url);

const supabase = createClient(url, key);

async function inspect() {
    console.log('Querying contracts...');
    const { data: contratos, error: cErr } = await supabase
        .from('contratos')
        .select('id, rodovia, kml_url');

    if (cErr) {
        console.error('Error fetching contracts:', cErr);
        return;
    }

    console.log(`Contracts count: ${contratos?.length}`);
    console.log('Contracts:', JSON.stringify(contratos, null, 2));
}

inspect();
