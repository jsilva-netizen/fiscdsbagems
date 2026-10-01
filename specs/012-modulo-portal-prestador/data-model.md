# Data Model: Módulo portal do prestador

**Feature**: [spec.md](./spec.md) | **Research**: [research.md](./research.md)

O app `portal_prestador` **não tem modelos** ([research V1](./research.md)). Os dados que ele mostra
são dos apps donos; os usuários da entidade são do core.

## Modelos

Nenhum.

## Registros em memória (não são tabelas)

### CartaoPortal
Registrado no servidor por um app ([research V3](./research.md)).

| Campo | Tipo | Regras |
|---|---|---|
| codigo | texto | prefixado pelo app; único |
| app | texto | app que fornece |
| titulo | texto | |
| funcao | função (usuário → {contagem, itens, link}) | aplica o alcance do app dono |
| ordem | inteiro | posição no início |

### PaginaPortal e ItemMenuPortal
Registrados no aparelho (`frontend/src/portal/extensoes.ts`).

| Campo | Tipo | Regras |
|---|---|---|
| codigo | texto | prefixado pelo app |
| rota | texto | sob `/portal/` |
| componente | componente | da tela do app |
| rotulo, icone, ordem | texto, texto, inteiro | item de menu |

## Dados lidos de outros apps

| Dado | Dono | Consulta ou rota |
|---|---|---|
| termos, retrato notificado, respostas, AM, autos, remessa, defesas, pareceres, decisão final | processo sancionador | `termos_da_entidade(usuario)`, `processo_da_entidade(usuario, id)` (N15) |
| unidades (nome, endereço, coordenadas), recomendações, fotos, relatório anexado | fiscalização | `resumo_para_entidade(fiscalizacao_id)`, `endereco_foto_para_entidade(fiscalizacao_id, foto_id)`, só depois da regra do termo (V2) |
| fiscalizações previstas | planejamento | rota `portal/planejamento/previstas` (P11) |
| avisos e preferências | core | central de avisos (R-core-026) |
| usuário, papel, entidade | core | `Usuario` com papel `prestador` e vínculo de entidade |
