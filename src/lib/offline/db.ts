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
  localId?: string
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
  razao_social?: string
  endereco?: string
  cidade?: string
  telefone?: string
  email_contato?: string
  cnpj?: string
  responsavel?: string
  cargo?: string
  tipo?: string
  documentos?: any
  created_at?: string
  updated_at?: string
  tipo_entidade?: string
  tipo_servico?: string[]
  logo_url?: string
  status?: string
  website?: string
  estado?: string
  cep?: string
  observacoes?: string
}

export type KmPoint = { lat: number; lng: number; km: string; rodovia?: string }

export type Contrato = {
  id: UUID
  numero_contrato: string
  prestador_servico_id: UUID
  rodovia: string
  ativo: boolean
  kml_url?: string
  km_points?: KmPoint[] | null
  created_at?: string
  updated_at?: string
}

export type TipoOcorrenciaDTR = {
  id: UUID
  nome: string
  gera_nc: boolean
  item_contrato?: string
  nao_atendimento?: string
  prazo_dias_padrao?: number
  /** Texto para a coluna DESCRIÇÃO do relatório de constatações */
  descricao?: string
  /** Observação-padrão que aparece em ambas as tabelas (constatações e NCs) */
  observacoes?: string
  /** Rodovia específica (ex: "112"). NULL = aplica-se a todas as rodovias. */
  rodovia?: string | null
  /** Etapas de obra separadas por \n. Preenchido = item de obra com passo extra no wizard. */
  etapas_obra?: string | null
  ativo: boolean
  created_at?: string
  updated_at?: string
}

export type Fiscalizacao = {
  id: UUID
  municipio_id?: UUID
  municipio_nome?: string
  prestador_servico_id?: UUID
  prestador_servico_nome?: string
  fiscal_nome?: string
  servico?: string
  status?: string
  data_inicio?: string
  data_fim?: string
  numero_termo?: string
  fiscal_email?: string
  last_modified_by?: string
  last_modified_at?: string
  created_at?: string
  updated_at?: string
  tipo_modulo?: string
  rodovia?: string
}

export type Unidade = {
  id: UUID
  fiscalizacao_id: UUID
  tipo_unidade_id?: UUID
  tipo_unidade_nome?: string
  codigo_unidade?: string
  nome_unidade?: string
  ordem?: number
  status?: string
  endereco?: string
  coordenadas?: string
  latitude?: number | null
  longitude?: number | null
  fotos_unidade?: Foto[]
  total_constatacoes?: number
  total_ncs?: number
  data_hora_vistoria?: string
  created_at?: string
  updated_at?: string
  rodovia?: string
  trecho?: string
  km?: string
  sentido?: string
  per?: string
  frente?: string
  tipo_ocorrencia?: string
  gravidade?: string
  nao_atendimento?: string
  prazo_dias_nc?: number | null
  gps_accuracy_m?: number | null
  km_impreciso?: boolean
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
  created_at?: string
  updated_at?: string
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
  updated_at?: string
}

export type ConstatacaoManual = {
  id: UUID
  unidade_fiscalizada_id: UUID
  numero_constatacao: string
  descricao: string
  descricao_nc?: string | null
  gera_nc?: boolean
  ordem?: number
  artigo_portaria?: string | null
  texto_determinacao?: string | null
  texto_recomendacao?: string | null
  created_at?: string
  updated_at?: string
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

export type Determinacao = {
  id: UUID
  unidade_fiscalizada_id: UUID
  numero_determinacao?: string
  descricao?: string
  prazo_dias?: number | null
  data_limite?: string | null
  status?: string | null
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
  contratos!: Table<Contrato, UUID>
  tipos_ocorrencia_dtr!: Table<TipoOcorrenciaDTR, UUID>
  tipos_unidade!: Table<{ id: UUID; nome: string; codigo?: string; servicos_aplicaveis?: string[]; ativo?: boolean; updated_at?: string; created_at?: string }, UUID>
  fiscalizacoes!: Table<Fiscalizacao, UUID>
  unidades!: Table<Unidade, UUID>
  itens_checklist!: Table<ItemChecklist, UUID>
  respostas!: Table<RespostaChecklist, UUID>
  constatacoes_manuais!: Table<ConstatacaoManual, UUID>
  recomendacoes!: Table<Recomendacao, UUID>
  determinacoes!: Table<Determinacao, UUID>
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

    this.version(9)
      .stores({
        unidades: 'id, fiscalizacao_id, ordem, tipo_unidade_id, status, codigo_unidade, nome_unidade, created_at, updated_at'
      })
      .upgrade(async (tx) => {
        const table = tx.table('unidades') as Table<Unidade, UUID>
        const all = await table.toArray()
        const byFisc = new Map<string, any[]>()
        for (const u of all as any[]) {
          const fid = String(u?.fiscalizacao_id || '')
          if (!fid) continue
          const arr = byFisc.get(fid) || []
          arr.push(u)
          byFisc.set(fid, arr)
        }
        for (const [fid, unidades] of byFisc.entries()) {
          const sorted = unidades
            .slice()
            .sort((a, b) => String(a?.created_at || '').localeCompare(String(b?.created_at || '')) || String(a?.id || '').localeCompare(String(b?.id || '')))
          for (let i = 0; i < sorted.length; i++) {
            const u = sorted[i]
            const nextOrdem = Number(u?.ordem) > 0 ? Number(u.ordem) : i + 1
            if (Number(u?.ordem) !== nextOrdem) {
              await table.update(u.id as any, { ...u, ordem: nextOrdem } as any)
            }
          }
        }
      })

    this.version(10).stores({
      determinacoes: 'id, unidade_fiscalizada_id, numero_determinacao, origem, created_at'
    })

    this.version(11).stores({
      prestadores: 'id, nome, updated_at',
      contratos: 'id, numero_contrato, prestador_servico_id, rodovia, ativo, updated_at'
    }).upgrade(async (tx) => {
      const table = tx.table('prestadores') as Table<any, UUID>
      const all = await table.toArray()
      for (const p of all) {
        let updated = false
        if (!p.tipo_entidade) {
          p.tipo_entidade = 'Concessionária'
          updated = true
        }
        if (!p.status) {
          p.status = 'ativa'
          updated = true
        }
        if (!p.tipo_servico) {
          if (p.nome === 'SANESUL') {
            p.tipo_servico = ['Abastecimento de Água', 'Esgotamento Sanitário']
          } else if (p.nome === 'Município de Paraíso das Águas') {
            p.tipo_servico = ['Abastecimento de Água', 'Esgotamento Sanitário', 'Limpeza Urbana', 'Manejo de Resíduos Sólidos', 'Drenagem Urbana']
          } else if (['CCR MSVia', 'Way-306', 'Way-112'].includes(p.nome)) {
            p.tipo_servico = ['Rodovias']
          } else {
            p.tipo_servico = []
          }
          updated = true
        }
        if (!p.estado) {
          p.estado = 'MS'
          updated = true
        }
        if (!p.cep) {
          p.cep = p.nome === 'SANESUL' ? '79040-040' : (p.nome === 'Município de Paraíso das Águas' ? '79556-000' : '79000-000')
          updated = true
        }
        if (updated) {
          await table.put(p)
        }
      }
    })
    this.version(12).stores({
      tipos_ocorrencia_dtr: 'id, nome, gera_nc, ativo, updated_at'
    })
    this.version(13).stores({
      // sentido adicionado em unidades; tipos_ocorrencia_dtr sem mudanças de índice
      unidades: 'id, fiscalizacao_id, ordem, tipo_unidade_id, status, codigo_unidade, nome_unidade, rodovia, sentido, created_at, updated_at'
    })
  }
}

export const db = new AppDB()
