import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Suas credenciais Service Role
const supabaseUrl = 'https://vuiiuguranydqwsodnqn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1aWl1Z3VyYW55ZHF3c29kbnFuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTg1ODg0NiwiZXhwIjoyMDg3NDM0ODQ2fQ.eUUUcjjQuSFHl01nFvjkGBFlnjNK0Ho8D_GGgxaDcvU';

const bucketName = 'fotos_fiscalizacao';
const pastaDestino = './backup_fotos_fiscalizacao';

const supabase = createClient(supabaseUrl, supabaseKey);

// Função inteligente que entra nas subpastas
async function processarPasta(caminhoAtual = '') {
    console.log(`\nBuscando na pasta: "${caminhoAtual || 'Raiz'}"...`);

    const { data: itens, error } = await supabase.storage.from(bucketName).list(caminhoAtual, { limit: 1000 });

    if (error) {
        console.error(`Erro ao listar a pasta ${caminhoAtual}:`, error.message);
        return;
    }

    if (!itens || itens.length === 0) return;

    for (const item of itens) {
        if (item.name === '.emptyFolderPlaceholder') continue;

        // Monta o caminho correto na nuvem (ex: fiscalizacoes/foto1.jpg)
        const caminhoCompleto = caminhoAtual ? `${caminhoAtual}/${item.name}` : item.name;

        // No Supabase, se o item não tem 'id' ou 'metadata', ele é uma pasta!
        if (!item.id || item.metadata === null) {
            console.log(`📁 Pasta encontrada: ${item.name}. Entrando nela...`);

            // Cria a pasta espelhada no seu computador
            const pastaLocal = path.join(pastaDestino, caminhoCompleto);
            if (!fs.existsSync(pastaLocal)) {
                fs.mkdirSync(pastaLocal, { recursive: true });
            }

            // Chama a si mesma para vasculhar dentro da nova pasta
            await processarPasta(caminhoCompleto);
        } else {
            // É um arquivo de verdade, vamos baixar!
            const caminhoLocal = path.join(pastaDestino, caminhoCompleto);

            // Garante que a pasta local existe antes de salvar
            const diretorioBase = path.dirname(caminhoLocal);
            if (!fs.existsSync(diretorioBase)) {
                fs.mkdirSync(diretorioBase, { recursive: true });
            }

            if (fs.existsSync(caminhoLocal)) {
                console.log(`⏭ Já existe, pulando: ${caminhoCompleto}`);
                continue;
            }

            const { data: blob, error: downloadError } = await supabase.storage.from(bucketName).download(caminhoCompleto);

            if (downloadError) {
                console.error(`❌ Erro ao baixar ${caminhoCompleto}:`, downloadError.message);
                continue;
            }

            const buffer = Buffer.from(await blob.arrayBuffer());
            fs.writeFileSync(caminhoLocal, buffer);
            console.log(`✔ Baixado: ${caminhoCompleto}`);
        }
    }
}

async function iniciar() {
    if (!fs.existsSync(pastaDestino)) {
        fs.mkdirSync(pastaDestino, { recursive: true });
    }
    await processarPasta('');
    console.log('\n✅ Download de todas as pastas e fotos concluído com sucesso!');
}

iniciar();