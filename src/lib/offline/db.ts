import Dexie, { Table } from 'dexie'

export type UUID = string

export type Foto = {
  url: string
  bucket?: string
  path?: string
  legenda?: string
  mimeType?: string
  width?: number
  height?: number
}

export type OfflineFoto = {
  localId: UUID
  unidadeLocalId: UUID
  base64?: string
  blob?: Blob
  url?: string
  legenda?: string
  mimeType?: string
  width?: number
  height?: number
  syncedAt?: string
  storagePath?: string
  attempts?: number
  lastError?: string
  created_at?: string
}

export type Municipio = {
  id: UUID
  nome: string
  updated_at?: string
}

export type Prestador = {
  id: UUID
  nome: string
  updated_at?: string
}

export type Fiscalizacao = {
  id: UUID
  municipio_id?: UUID
  municipio_nome?: string
  prestador_servico_id?: UUID
  servico?: string
  status?: string
  data_inicio?: string
  data_fim?: string
  numero_termo?: string
  fiscal_email?: string
  created_at?: string
  updated_at?: string
}

export type Unidade = {
  id: UUID
  fiscalizacao_id: UUID
  tipo_unidade_id?: UUID
  tipo_unidade_nome?: string
  codigo_unidade?: string
  nome_unidade?: string
  status?: string
  endereco?: string
  latitude?: number | null
  longitude?: number | null
  fotos_unidade?: Foto[]
  total_constatacoes?: number
  total_ncs?: number
  data_hora_vistoria?: string
  created_at?: string
  updated_at?: string
}

export type ItemChecklist = {
  id: UUID
  tipo_unidade_id: UUID
  ordem?: number
  pergunta?: string
  texto_constatacao_sim?: string
  texto_constatacao_nao?: string
  gera_nc?: boolean
  artigo_portaria?: string
  texto_determinacao?: string
  texto_recomendacao?: string
  texto_nc?: string
  prazo_dias?: number
  ativo?: boolean
}

export type RespostaChecklist = {
  id: UUID
  unidade_fiscalizada_id: UUID
  item_checklist_id: UUID
  resposta?: 'SIM' | 'NAO' | 'NA'
  observacao?: string
  pergunta?: string | null
  numero_constatacao?: string | null
  gera_nc?: boolean
  created_at?: string
}

export type ConstatacaoManual = {
  id: UUID
  unidade_fiscalizada_id: UUID
  numero_constatacao: string
  descricao: string
  gera_nc?: boolean
  ordem?: number
  artigo_portaria?: string | null
  texto_determinacao?: string | null
  texto_recomendacao?: string | null
  created_at?: string
}

export type Recomendacao = {
  id: UUID
  unidade_fiscalizada_id: UUID
  numero_recomendacao?: string
  descricao?: string
  origem?: string
  created_at?: string
  updated_at?: string
}

export type FilaMutacao = {
  id: UUID
  tipo: string
  entity: string
  payload: any
  status?: 'pending' | 'done' | 'error'
  created_at?: string
  attempts?: number
  lastError?: string
  nextRetryAt?: string
}

export type EstadoSync = {
  id: UUID
  entidade: string
  updated_at?: string
  last_sync_at?: string
  pending_count?: number
}

export type PendingEntity = {
  id: UUID
  entity: string
  local_id: UUID
  created_at?: string
}

export class AppDB extends Dexie {
  municipios!: Table<Municipio, UUID>
  prestadores!: Table<Prestador, UUID>
  tipos_unidade!: Table<{ id: UUID; nome: string; codigo?: string; servicos_aplicaveis?: string[]; ativo?: boolean; updated_at?: string; created_at?: string }, UUID>
  fiscalizacoes!: Table<Fiscalizacao, UUID>
  unidades!: Table<Unidade, UUID>
  itens_checklist!: Table<ItemChecklist, UUID>
  respostas!: Table<RespostaChecklist, UUID>
  constatacoes_manuais!: Table<ConstatacaoManual, UUID>
  recomendacoes!: Table<Recomendacao, UUID>
  fotos!: Table<Foto & { id: UUID; unidade_fiscalizada_id: UUID; created_at?: string }, UUID>
  fotos_local!: Table<OfflineFoto, UUID>
  fila_mutacoes!: Table<FilaMutacao, UUID>
  estados_sync!: Table<EstadoSync, UUID>
  id_map!: Table<{ local_id: UUID; server_id?: UUID; entity: string }, UUID>
  pending_entities!: Table<PendingEntity, UUID>

  constructor() {
    super('agems_fiscalizacao_offline')
    this.version(1).stores({
      municipios: 'id, nome, updated_at',
      prestadores: 'id, nome, updated_at',
      tipos_unidade: 'id, nome, updated_at',
      fiscalizacoes:
        'id, municipio_id, prestador_servico_id, fiscal_email, servico, status, data_inicio, data_fim, numero_termo, updated_at, created_at',
      unidades:
        'id, fiscalizacao_id, tipo_unidade_id, status, codigo_unidade, nome_unidade, created_at, updated_at',
      itens_checklist: 'id, tipo_unidade_id, ordem',
      respostas:
        'id, unidade_fiscalizada_id, item_checklist_id, resposta, numero_constatacao, pergunta, created_at',
      constatacoes_manuais:
        'id, unidade_fiscalizada_id, numero_constatacao, ordem, created_at',
      fotos: 'id, unidade_fiscalizada_id, url, created_at',
      fila_mutacoes: 'id, tipo, status, created_at',
      estados_sync: 'id, entidade, updated_at, last_sync_at, pending_count'
    })
    this.version(2).stores({
      // add entity index to fila_mutacoes and introduce id_map
      fila_mutacoes: 'id, tipo, status, created_at, entity',
      id_map: 'local_id, server_id, entity'
    })
    this.version(3).stores({
      recomendacoes: 'id, unidade_fiscalizada_id, created_at'
    })
    this.version(4).stores({
      fotos_local: 'localId, unidadeLocalId, syncedAt'
    })
    this.version(5).stores({
      tipos_unidade: 'id, nome, updated_at'
    })
    this.version(6).stores({
      // alterar índice de prestador para prestador_servico_id
      fiscalizacoes:
        'id, municipio_id, prestador_servico_id, fiscal_email, servico, status, data_inicio, data_fim, numero_termo, updated_at, created_at'
    }).upgrade(async (tx) => {
      const table = tx.table('fiscalizacoes') as Table<Fiscalizacao, UUID>
      const all = await table.toArray()
      for (const f of all) {
        // migração suave: mover valor antigo prestador_id para prestador_servico_id
        const anyF: any = f as any
        if (anyF.prestador_id && !anyF.prestador_servico_id) {
          anyF.prestador_servico_id = anyF.prestador_id
          delete anyF.prestador_id
          await table.put(anyF)
        }
      }
    })
    this.version(7)
      .stores({
        fotos_local: 'localId, unidadeLocalId, syncedAt, created_at'
      })
      .upgrade(async (tx) => {
        const table = tx.table('fotos_local') as Table<OfflineFoto, UUID>
        const all = await table.toArray()
        for (const f of all) {
          const next: any = { ...f }
          if (next.attempts === undefined) next.attempts = 0
          if (next.storagePath === undefined) next.storagePath = undefined
          if (next.lastError === undefined) next.lastError = undefined
          await table.put(next)
        }
      })
    this.version(8)
      .stores({
        fila_mutacoes: 'id, tipo, status, created_at, entity, nextRetryAt',
        pending_entities: 'id, entity, local_id, created_at'
      })
      .upgrade(async (tx) => {
        const fila = tx.table('fila_mutacoes') as Table<FilaMutacao, UUID>
        const all = await fila.toArray()
        for (const m of all) {
          const next: any = { ...m }
          if (next.attempts === undefined) next.attempts = 0
          if (next.lastError === undefined) next.lastError = undefined
          if (next.nextRetryAt === undefined) next.nextRetryAt = undefined
          await fila.put(next)
        }
      })
  }
}

export const db = new AppDB()
