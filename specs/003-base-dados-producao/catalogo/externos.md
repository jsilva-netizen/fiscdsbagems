<!-- GERADO por ferramentas/gerar.py a partir de .specify/assessments/novo-sistema-django-apps/inventario-producao.csv + .specify/assessments/novo-sistema-django-apps/inventario-producao-parte2.csv e anotacoes/. Não editar. -->

# Informações do sistema atual que não estão no banco

Necessárias às specs de módulo (FR-023), mas fora do alcance dos inventários do banco.

## Código publicado das 9 edge functions

O processamento assíncrono (geração de relatórios e análises com IA do CATERS e do CATESA) roda em
edge functions fora do banco: caters_ai_enqueue, caters_ai_status, caters_ai_worker,
catesa_ai_enqueue, catesa_ai_status, catesa_ai_worker, relatorios_enqueue, relatorios_status e
relatorios_worker. O banco guarda só as filas (relatorios_jobs, caters_ai_jobs) e as funções que as
reivindicam e acionam (claim_relatorios_jobs, claim_caters_ai_jobs, kick_relatorios_worker).
Como aconteceu com as migrations, o código publicado pode diferir do que está no repositório.

**Como obter**: Baixar o código de cada função publicada pelo painel do Supabase (Edge Functions → função →
código) e salvar em .specify/assessments/novo-sistema-django-apps/edge-functions-producao/.
Até lá, a referência provisória é supabase/functions/ do repositório, e os objetos que dependem
dela ficam marcados como tal nas anotações.

**Usado por**: fiscalizacao (relatórios), caters, catesa

## Configuração de autenticação

Regras de login que o banco não guarda: confirmação de e-mail obrigatória ou não, validade da
sessão e da renovação, URLs de retorno permitidas, provedores habilitados, modelos e remetente dos
e-mails de autenticação. O banco mostra só o efeito (8 usuários, 7 com provedor e-mail, todos com
e-mail confirmado) e o gatilho que cria o perfil no cadastro (on_auth_user_created).

**Como obter**: Capturar pelo painel do Supabase (Authentication → Providers, URL Configuration, Email Templates e
Settings), sem copiar chaves nem senhas, e registrar em
.specify/assessments/novo-sistema-django-apps/autenticacao-producao.md.

**Usado por**: core (identidade e perfis)
