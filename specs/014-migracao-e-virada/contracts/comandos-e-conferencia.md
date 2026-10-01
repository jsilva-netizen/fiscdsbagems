# Contrato: comandos, conferência e roteiros da virada

## Comandos do app `virada`

| Comando | Descrição |
|---|---|
| `virada executar --ensaio <nome> --tipo <ensaio\|ensaio_geral\|virada> --origem <dsn-so-leitura> --arquivos <repositorio-origem> --teste <lista> --ajustes <tabela>` | confere checksums e banco vazio; roda as 10 etapas (M3); para na primeira falha |
| `virada relatorio --ensaio <nome>` | junta as conferências dos apps, dos arquivos e as amostras; gera JSON, HTML e PDF (M6) |
| `virada conferir-backup <zip> --usuario <id> --aparelho <texto> --diretoria <id> [--excecao]` | confere o backup do aplicativo atual e grava a confirmação (M8) |
| `virada aparelhos` | lista dos usuários de campo com confirmação vigente: liberados, bloqueados, exceções, sem confirmação |
| `virada importar-backup-legado --confirmacao <id>` | importa o trabalho pendente de uma exceção pela fila da fiscalização (M9) |
| `virada portoes --ensaio <nome>` | calcula os portões automáticos e mostra o quadro (M12) |
| `virada abrir --ensaio <nome>` | exige a aprovação; liga a chave de abertura e as tarefas agendadas (M11) |
| `virada descartar --ensaio <nome>` | apaga o banco e os arquivos carregados; não toca no sistema atual |

## Etapas (`virada/etapas.py`)

| Ordem | Código | Comando do app dono | Pré-condição |
|---:|---|---|---|
| 1 | `core` | `migrar_core` | banco vazio; lista de teste e tabela de ajustes |
| 2 | `config_camaras` | `configurar_catesa`, `configurar_caters`, configuração da CATERF | etapa 1 |
| 3 | `checklists` | `migrar_checklists` | modelos das câmaras (K14) |
| 4 | `caterf_base` | `migrar_caterf --fase base` | etapa 3 |
| 5 | `fiscalizacao` | `migrar_fiscalizacao` | etapas 3 e 4 |
| 6 | `caterf_extensoes` | `migrar_caterf --fase extensoes` | etapa 5 |
| 7 | `processo_sancionador` | `migrar_processo_sancionador --excluir <lista>` | etapa 5 |
| 8 | `caters` | `migrar_caters` | etapas 5 e 2 |
| 9 | `sequencias` | serviços de sequência da fiscalização e do processo sancionador | etapas 5 e 7 |
| 10 | `avisos` | `marcar_avisos_ate(data)` da CATERS e do processo sancionador (M13) | etapas 7 e 8 |
| — | `arquivos` | conferência final dos 1.554 arquivos (M7) | todas |

## Esquema do JSON de conferência (M4)

Cada comando `migrar_<app> --conferir` grava um arquivo com:

```text
{
  "versao_esquema": 1,
  "modulo": "fiscalizacao",
  "etapa": "fiscalizacao",
  "registros": [
    {"tabela": "unidades_fiscalizadas", "total": 402, "conferidos": 400, "descartados": 0,
     "teste": 0, "legados": 2, "pendentes": [{"id": "...", "motivo": "..."}]}
  ],
  "valores": [{"tabela": "...", "id": "...", "campo": "...", "origem": "...", "esperado": "...", "obtido": "..."}],
  "arquivos": {"total": 1445, "conferidos": 1445, "diferencas": [{"caminho": "...", "checksum_origem": "...", "checksum_destino": "...", "registro_esperado": "...", "registro_obtido": "..."}]},
  "ligacoes": [{"de": "...", "para": "...", "id": "...", "motivo": "nao_encontrada"}],
  "descartes": [{"item": "coluna:...", "volume": 768, "motivo": "..."}],
  "amostra": [{"tabela": "...", "id": "...", "origem": {...}, "destino": {...}}]
}
```

O esquema fica em `backend/compartilhado/migracao/esquema_conferencia.json`, e um teste valida o
arquivo de cada app contra ele.

## Biblioteca comum (`backend/compartilhado/migracao/`)

Sem modelos; pode ser importada por qualquer app.

| Função | Uso |
|---|---|
| `ler_mapa(modulo)` | lê `anotacoes/migracao/<modulo>.toml` da spec 003 |
| `impressao_digital(campos)` | JSON canônico e SHA-256 (M5) |
| `checksum_arquivo(fluxo)` | SHA-256 em leitura contínua |
| `amostra(ids, semente, n=30)` | sorteio reproduzível |
| `escrever_conferencia(dados, caminho)` | valida contra o esquema e grava |

## Roteiros do sistema atual (executados pelo responsável)

| Roteiro | O que faz | Teste |
|---|---|---|
| `roteiros/congelar.sql` | guarda as definições de escrita; revoga INSERT, UPDATE e DELETE de `authenticated` e `anon` nas tabelas de dados; troca as políticas de escrita dos repositórios por recusa; registra a data (M10) | em cada ensaio, num PostgreSQL de teste restaurado do dump |
| `roteiros/descongelar.sql` | restaura o guardado e compara com a cópia | idem, com cronômetro (menos de 1 hora no ensaio geral) |
| `roteiros/conferir-congelado.sql` | tenta uma gravação de teste em cada papel e confere a recusa, sem deixar dado | idem |
| `roteiros/dump-e-copia.md` | passo a passo do dump final e da cópia dos 8 repositórios, com checksum e manifesto | idem |

## Tela restrita (`frontend/src/virada/`)

Só para o administrador e a equipe da virada, antes e depois da abertura.

| Tela | Ações |
|---|---|
| Aparelhos | enviar backup com usuário, aparelho e diretoria; ver liberados, bloqueados, exceções, sem confirmação |
| Ensaios | ver etapas, tempos, relatório e amostras |
| Pendências | decidir cada pendência (aceita com justificativa ou recusada) |
| Portões | quadro dos seis portões com evidências; marcar a revisão das matrizes (portão 4) |
| Aprovação | o responsável aprova a virada |
