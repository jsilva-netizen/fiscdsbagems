// Categoria Arquivos (contracts/provider.md #2) — implementação Supabase.
//
// Regras a preservar: o contrato MUST NOT expor como o endereço é construído (hoje é URL
// assinada com expiração de 30 min — ver src/lib/offline/repository.ts
// getSignedUrlFromBucket, inventario-acoplamento.md lote 3b); aceita conteúdo binário vindo
// do caminho offline (base64); restrição de acesso preservada (arquivo privado continua
// privado — ressalva: alguns buckets são públicos hoje, ver debitos-tecnicos item 7, tratado
// por repositório lógico, não aqui).

import { supabase } from '@/lib/supabase'
import type { ArquivosProvider } from '../../contract'
import type { ReferenciaArquivo } from '../../types'
import { sucesso, falha, type Resultado } from '../../types'

const EXPIRACAO_URL_ASSINADA_SEGUNDOS = 60 * 30 // preserva o valor atual — não alterar sem decisão explícita

function mapearErroStorage(erro: unknown, mensagem: string) {
  const e = erro as { message?: string; statusCode?: string | number } | null
  const status = e?.statusCode
  if (status === '404' || status === 404) {
    return falha({ tipo: 'nao_encontrado' as const, mensagem: 'Arquivo não encontrado.', origem: erro })
  }
  if (status === '401' || status === '403' || status === 401 || status === 403) {
    return falha({ tipo: 'sem_permissao' as const, mensagem: 'Você não tem permissão para este arquivo.', origem: erro })
  }
  return falha({ tipo: 'falha_servidor' as const, mensagem, origem: erro })
}

export const arquivosProvider: ArquivosProvider = {
  async enviar(ref: ReferenciaArquivo, conteudo, opcoes) {
    const { error } = await supabase.storage
      .from(ref.repositorio)
      .upload(ref.caminho, conteudo as any, { upsert: true, contentType: opcoes?.tipoConteudo })
    if (error) return mapearErroStorage(error, 'Falha ao enviar arquivo.')
    return sucesso(ref)
  },

  async obterEnderecoAcesso(ref: ReferenciaArquivo): Promise<Resultado<string>> {
    const { data, error } = await supabase.storage
      .from(ref.repositorio)
      .createSignedUrl(ref.caminho, EXPIRACAO_URL_ASSINADA_SEGUNDOS)
    if (error) return mapearErroStorage(error, 'Falha ao obter endereço do arquivo.')
    return sucesso(data.signedUrl)
  },

  async baixar(ref: ReferenciaArquivo): Promise<Resultado<Blob>> {
    const { data, error } = await supabase.storage.from(ref.repositorio).download(ref.caminho)
    if (error) return mapearErroStorage(error, 'Falha ao baixar arquivo.')
    if (!data) return falha({ tipo: 'nao_encontrado', mensagem: 'Arquivo não encontrado.' })
    return sucesso(data)
  },

  async remover(ref: ReferenciaArquivo): Promise<Resultado<void>> {
    const { error } = await supabase.storage.from(ref.repositorio).remove([ref.caminho])
    if (error) return mapearErroStorage(error, 'Falha ao remover arquivo.')
    return sucesso(undefined)
  },

  async listar(repositorio: string, prefixoCaminho?: string): Promise<Resultado<ReferenciaArquivo[]>> {
    const { data, error } = await supabase.storage.from(repositorio).list(prefixoCaminho)
    if (error) return mapearErroStorage(error, 'Falha ao listar arquivos.')
    return sucesso((data ?? []).map((item) => ({ repositorio, caminho: `${prefixoCaminho ?? ''}${item.name}` })))
  },
}
