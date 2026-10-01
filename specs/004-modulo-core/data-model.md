# Data Model: Módulo core

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Modelo do app `core` do sistema novo. Todas as chaves primárias são UUID e podem ser geradas no
aparelho (constituição, "Fronteiras de domínio"), exceto as de dados de referência com sigla
estável (diretoria, câmara, papel, serviço). Toda entidade que o aplicativo sincroniza tem
`criado_em` e `atualizado_em` do servidor. Colunas do sistema atual entre parênteses, para a
migração (catálogo da spec 003).

## Estrutura organizacional

### Diretoria
| Campo | Tipo | Regras |
|---|---|---|
| id | texto (sigla) | `dsb`, `dtr`, `dge` (`diretorias.id`) |
| nome | texto | obrigatório |

### CamaraTecnica
| Campo | Tipo | Regras |
|---|---|---|
| id | texto (sigla) | 10 câmaras: `catesa`, `caters`, `cres`, `catransp`, `caterf`, `catefis`, `cret`, `categas`, `catene`, `creg` (`camaras_tecnicas.id`; sem `caterm` e `catesg`, A-010) |
| nome | texto | obrigatório |
| diretoria | → Diretoria | obrigatória; não pode ser removida enquanto tiver câmara |

### Servico
Serviço regulado, que define em que diretoria a entidade aparece (R-core-016).

| Campo | Tipo | Regras |
|---|---|---|
| codigo | texto | ex.: `abastecimento_agua`, `rodovias` |
| nome | texto | ex.: "Abastecimento de Água" (valores de `prestadores_servico.tipo_servico`) |
| diretoria | → Diretoria | DSB: água, esgoto, limpeza urbana, resíduos sólidos, drenagem urbana; DTR: rodovias; DGE: energia elétrica, gás canalizado, iluminação pública |
| camara | → CamaraTecnica, opcional | câmara técnica responsável pelo serviço, da mesma diretoria. DSB: água, esgoto e drenagem urbana → CATESA; limpeza urbana e resíduos sólidos → CATERS (hoje em `camara_from_servicos`, com a correção de "Drenagem Urbana", A-021); DTR: rodovias → CATERF (decisão do responsável, 2026-09-30); os demais serviços, definidos pelo responsável na carga da referência. Usada pelos checklists e pela fiscalização para saber de que câmara é um tipo de unidade ou uma fiscalização |

## Identidade e acesso

### Papel
| Campo | Tipo | Regras |
|---|---|---|
| codigo | texto | core: `admin`, `coordenador`, `fiscal`, `diretor`, `prestador`; outros apps acrescentam os seus (R-core-023) |
| nome | texto | obrigatório |
| app | texto | app dono do papel (`core` para os cinco atuais) |
| vinculo_diretoria | obrigatório / opcional / proibido | admin: opcional; diretor, coordenador, fiscal: obrigatório; prestador: proibido |
| vinculo_camara | idem | coordenador, fiscal: obrigatório; demais do core: proibido |
| vinculo_entidade | idem | prestador: obrigatório; demais do core: proibido |

### Usuario (modelo de usuário do sistema)
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | o mesmo id do sistema atual na migração (`profiles.id`) |
| email | texto | obrigatório, único sem diferenciar maiúsculas; login e canal do código; só o admin altera |
| nome | texto | obrigatório; o próprio usuário altera (`profiles.full_name`) |
| senha | hash do Django | definida no primeiro acesso; nunca migrada |
| papel | → Papel | obrigatório, sem padrão (R-core-002; corrige `profiles.role` padrão `user`) |
| diretoria | → Diretoria, opcional | conforme o papel |
| camara | → CamaraTecnica, opcional | conforme o papel; se houver, da mesma diretoria |
| entidade | → Entidade, opcional | conforme o papel; único lugar do vínculo (R-core-004; substitui `prestadores_servico.user_id`) |
| ativo | booleano | padrão verdadeiro na criação pelo admin; desativar em vez de excluir (R-core-007) |
| desativado_em | data e hora, opcional | preenchido ao desativar |
| criado_em, atualizado_em | data e hora | do servidor |

Validações: vínculos conforme as regras do papel; câmara coerente com a diretoria; o último
administrador ativo não pode ser desativado nem ter o papel trocado; o administrador não se
desativa. Exclusão só sem nenhum registro que o referencie.

Estados: `ativo` ⇄ `desativado` (só o administrador muda). Desativar coloca os tokens de renovação
na lista de bloqueio e revoga os aparelhos confirmados.

### AparelhoConfirmado
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| usuario | → Usuario | obrigatório |
| rotulo | texto | descrição legível (navegador e sistema, informado na verificação) |
| segredo_hash | texto | hash do segredo entregue ao aparelho; o segredo não é guardado |
| confirmado_em, ultimo_uso_em | data e hora | |
| revogado_em | data e hora, opcional | revogado pelo usuário, pelo admin, pela troca de senha ou pela desativação |

### DesafioVerificacao
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | devolvido ao cliente no lugar dos tokens |
| usuario | → Usuario | |
| codigo_hash | texto | 6 dígitos, só o hash |
| expira_em | data e hora | criação + 10 minutos |
| tentativas | inteiro | até 5 |
| usado_em, substituido_em | data e hora, opcionais | uso único; novo código substitui o anterior |

### CredencialSistema
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| nome | texto | ex.: "Folha de ponto do RH" |
| prefixo | texto | parte visível da chave, para identificação |
| chave_hash | texto | a chave é mostrada uma vez, na criação |
| escopos | lista de textos | leituras permitidas; só leitura por padrão |
| criada_por | → Usuario (admin) | |
| criada_em, ultimo_uso_em, revogada_em | data e hora | |

## Cadastros de base

### Municipio
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | preservado (`municipios.id`) |
| nome | texto | único |
| codigo_ibge | texto | 7 dígitos, único |
| criado_em, atualizado_em | data e hora | do servidor (`municipios.created_at` na migração) |

### Entidade (entidade regulada)
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | gerado no aparelho; preservado na migração (`prestadores_servico.id`) |
| nome | texto | obrigatório (nome de exibição) |
| razao_social | texto | obrigatório |
| cnpj | texto | obrigatório, 14 dígitos com dígitos verificadores válidos, único |
| natureza | concessionária / órgão ou entidade pública | (`tipo_entidade`) |
| servicos | → Servico (vários) | define as diretorias em que aparece (`tipo_servico`) |
| endereco, cidade, estado, cep | textos | obrigatórios no serviço (R-core-016); estado padrão `MS`; entidade migrada sem algum deles é aceita, e a tela pede o preenchimento na próxima edição |
| responsavel, cargo | textos | dado pessoal do responsável |
| email_contato, telefone, website, observacoes | textos | opcionais |
| logotipo | chave de arquivo no repositório público, opcional | nunca imagem embutida (R-core-019) |
| ativa | booleano | situação única (substitui `ativo` e `status`); `tipo` sem uso não é levado |
| criado_por | → Usuario | |
| criado_em, atualizado_em | data e hora | |

Estados: `ativa` ⇄ `desativada`. Exclusão só sem nenhum registro vinculado (R-core-017); com
registros, só desativação.

### DocumentoEntidade
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| entidade | → Entidade | obrigatória; protegida (não some com a entidade) |
| nome | texto | nome original |
| tipo_mime | texto | PDF, PNG ou JPEG, conferido pelo conteúdo |
| tamanho | inteiro | até 20 MB |
| arquivo | chave no repositório privado | |
| enviado_por | → Usuario | |
| enviado_em | data e hora | |

Substitui a lista `prestadores_servico.documentos`: um registro por documento, sem regravar a lista
(R-core-018).

### Contrato (instrumento)
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | gerado no aparelho; preservado (`contratos.id`) |
| entidade | → Entidade | obrigatória; protegida (desativar a entidade não apaga o contrato) |
| numero | texto | obrigatório |
| vigente | booleano | (`contratos.ativo`) |
| criado_em, atualizado_em | data e hora | |

O app da CATERF estende o contrato (rodovia, traçado KML, pontos de KM), com um registro próprio
ligado a este (R-core-020); o core não conhece esses campos.

## Auditoria e sincronização

### RegistroAuditoria
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| tabela | texto | `app.modelo` (na migração, o nome da tabela atual) |
| registro_id | UUID | |
| operacao | inclusão / alteração / exclusão | |
| autor | → Usuario, opcional | quem fez; nas tarefas internas, quem pediu |
| credencial | → CredencialSistema, opcional | quando a ação veio de integração |
| autor_nome, autor_email | textos | congelados no momento |
| dados_antes, dados_depois | JSON | linha inteira antes e depois |
| camara | → CamaraTecnica, opcional | câmara do registro auditado, para o escopo de consulta |
| criado_em | data e hora | |

Imutável: o banco recusa alteração e exclusão (R-core-022).

### TipoAviso (registro em memória, não tabela)
Registrado por cada app ao iniciar (R-core-026): `codigo` (único, prefixado pelo app, ex.:
`planejamento.plano_enviado`), `nome`, `app`, `email_padrao` (sim ou não), `email_obrigatorio`
(sim ou não).

### Aviso
| Campo | Tipo | Regras |
|---|---|---|
| id | UUID | |
| usuario | → Usuario | destinatário; só ele lê |
| tipo | texto | código de `TipoAviso` registrado |
| app | texto | app de origem |
| titulo | texto | obrigatório, curto |
| texto | texto | opcional, curto; sem dado que o destinatário não possa ver |
| referencia_app, referencia_modelo, referencia_id | textos, opcionais | registro a abrir, pelas regras do app dono |
| criado_em | data e hora | |
| lido_em | data e hora, opcional | |
| email_enviado_em | data e hora, opcional | |

Guarda: apagado um ano depois de lido.

### PreferenciaAviso
| Campo | Tipo | Regras |
|---|---|---|
| usuario | → Usuario | |
| tipo | texto | código de `TipoAviso` não obrigatório |
| email | booleano | único por usuário e tipo; sem linha, vale o `email_padrao` do tipo |

### RemocaoSincronizavel
| Campo | Tipo | Regras |
|---|---|---|
| modelo | texto | `app.modelo` |
| registro_id | UUID | |
| removido_em | data e hora | usado pela sincronização para apagar a cópia local |

## Relações

```text
Diretoria 1──* CamaraTecnica
Diretoria 1──* Servico
Papel     1──* Usuario *──0..1 Diretoria / CamaraTecnica / Entidade
Usuario   1──* AparelhoConfirmado, DesafioVerificacao
Entidade  *──* Servico
Entidade  1──* DocumentoEntidade, Contrato, Usuario(prestador)
Usuario / CredencialSistema 1──* RegistroAuditoria
Usuario   1──* Aviso, PreferenciaAviso
```
