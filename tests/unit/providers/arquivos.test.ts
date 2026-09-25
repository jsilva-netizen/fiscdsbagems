// T032 parte 3 — categoria Arquivos: baixar (nova, para o KML de contratos no sync-down) e
// enviar (fotos da fila), com o comportamento que o motor de sync usa hoje.

import { beforeEach, describe, expect, it, vi } from 'vitest'

const chamadas: { metodo: string; args: unknown[] }[] = []
const respostas: { download?: unknown; upload?: unknown } = {}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: (bucket: string) => ({
        download: async (caminho: string) => {
          chamadas.push({ metodo: 'download', args: [bucket, caminho] })
          return respostas.download
        },
        upload: async (caminho: string, conteudo: unknown, opcoes: unknown) => {
          chamadas.push({ metodo: 'upload', args: [bucket, caminho, conteudo, opcoes] })
          return respostas.upload
        },
      }),
    },
  },
}))

import { arquivosProvider } from '@/lib/data/providers/supabase/arquivos'

beforeEach(() => {
  chamadas.length = 0
  respostas.download = undefined
  respostas.upload = undefined
})

describe('arquivos.baixar', () => {
  it('devolve o conteúdo do arquivo', async () => {
    const blob = new Blob(['<kml/>'], { type: 'application/xml' })
    respostas.download = { data: blob, error: null }
    const r = await arquivosProvider.baixar({ repositorio: 'contratos', caminho: 'c1/rodovia.kml' })
    expect(chamadas).toEqual([{ metodo: 'download', args: ['contratos', 'c1/rodovia.kml'] }])
    expect(r.ok).toBe(true)
    if (r.ok) expect(await r.dado.text()).toBe('<kml/>')
  })

  it('arquivo inexistente vira nao_encontrado, com o erro bruto em origem', async () => {
    const bruto = { message: 'Object not found', statusCode: '404' }
    respostas.download = { data: null, error: bruto }
    const r = await arquivosProvider.baixar({ repositorio: 'contratos', caminho: 'x.kml' })
    expect(r).toMatchObject({ ok: false, erro: { tipo: 'nao_encontrado', origem: bruto } })
  })

  it('sem erro mas sem conteúdo também é falha', async () => {
    respostas.download = { data: null, error: null }
    const r = await arquivosProvider.baixar({ repositorio: 'contratos', caminho: 'x.kml' })
    expect(r.ok).toBe(false)
  })
})

describe('arquivos.enviar (fotos da fila)', () => {
  it('envia com substituição e o tipo do conteúdo, como o motor faz', async () => {
    respostas.upload = { data: { path: 'p' }, error: null }
    const blob = new Blob(['x'], { type: 'image/jpeg' })
    const ref = { repositorio: 'fotos_fiscalizacao', caminho: 'fiscalizacoes/f/u/l.jpg' }
    expect(await arquivosProvider.enviar(ref, blob, { tipoConteudo: 'image/jpeg' })).toEqual({ ok: true, dado: ref })
    expect(chamadas).toEqual([
      { metodo: 'upload', args: ['fotos_fiscalizacao', 'fiscalizacoes/f/u/l.jpg', blob, { upsert: true, contentType: 'image/jpeg' }] },
    ])
  })

  it('falha preserva o erro bruto em origem (o motor relança e reclassifica)', async () => {
    const bruto = { message: 'Payload too large', statusCode: '413' }
    respostas.upload = { data: null, error: bruto }
    const r = await arquivosProvider.enviar({ repositorio: 'fotos_fiscalizacao', caminho: 'a.jpg' }, new Blob(['x']))
    expect(r).toMatchObject({ ok: false, erro: { origem: bruto } })
  })
})
