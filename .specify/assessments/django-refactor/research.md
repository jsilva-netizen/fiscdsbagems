# Idea Research: Substituir o backend Supabase por um ecossistema Django/Python

- **Slug**: django-refactor
- **Created**: 2026-09-17
- **Evidence confidence (overall)**: medium — repo-internal facts are high-confidence (directly measured); anything about motivation, timeline, or external comparisons is low-confidence/assumption because no stakeholder input or external sources were available.

## Users & Demand

- This is an internal regulatory-agency system (AGEMS — fiscalização de concessionárias/prestadores), not a public product; "users" are agency fiscais, admins, and prestadores who consume the app via the React frontend. There is no support-ticket system, complaint log, or usage-analytics artifact in the repo to evidence demand for a backend change. — [source: repo inspection] (confidence: high, that no such artifact exists in-repo; it says nothing about whether such evidence exists elsewhere)
- No text in `intake.md` or elsewhere in the repo attributes this idea to a specific stakeholder or a triggering incident. — [source: `.specify/assessments/django-refactor/intake.md`] (confidence: high)
- ASSUMPTION: the idea likely originates from a technical/organizational preference (e.g., team Python skills, procurement/licensing policy for a government body) rather than an end-user-facing complaint, given the system is functioning and actively developed. — (confidence: low, unconfirmed)

## Prior Art

- No earlier attempt at a backend migration exists in this repo: no `.py`, `manage.py`, `requirements.txt`, or any Django-related file was found anywhere in the tree. This would be a greenfield backend rewrite, not a continuation of partial work. — [source: repo search, `find . -iname "*.py" -o -iname manage.py -o -iname requirements.txt`] (confidence: high)
- No prior specs, ADRs, or decisions under `.specify/` discuss backend architecture choice — this is the first assessment recorded for this project. — [source: `find .specify -maxdepth 2 -type d`] (confidence: high)
- The current backend is not a thin wrapper — it encodes substantial logic directly in Postgres/Supabase:
  - 117 SQL migrations (`supabase/migrations/000_setup_completo.sql` through `134_...sql`).
  - 163 `CREATE POLICY` statements across 27 migration files implementing Row Level Security, including custom authorization functions (`public.can_access_camara(...)`, `public.get_my_role()`) that gate access by "câmara técnica" (organizational unit) and role. — [source: `grep -ro "CREATE POLICY" supabase/migrations/*.sql`, `supabase/migrations/122_camara_tecnica_isolation.sql`] (confidence: high)
  - 9 Supabase Edge Functions organized as three enqueue/status/worker job-queue trios: `caters_ai_*`, `catesa_ai_*`, `relatorios_*` — used for async AI-assisted document analysis (via Google Gemini, called directly from `caters_ai_worker/index.ts`) and asynchronous PDF report generation. — [source: `supabase/functions/` directory listing, `supabase/functions/caters_ai_worker/index.ts`] (confidence: high)
  - An offline-first sync architecture: the frontend (`src/lib/offline/db.ts`, `repository.ts`, `syncEngine.ts`) stores changes locally (IndexedDB, including base64 photo capture) and syncs via an outbox pattern against Supabase Storage/PostgREST once connectivity returns, deleting local queue items only after an HTTP 200 confirms remote persistence. — [source: `DOCUMENTACAO_TECNICA.md` §"arquitetura baseada em sincronismo reativo híbrido", `src/lib/offline/*`] (confidence: high)

## Market & Context

- No web research was performed: the idea contains no URL, and no allowlisted-host source was available to cite for "Supabase vs. self-hosted Django" comparisons. Any claim here would be unsourced general knowledge, so none is asserted as fact.
- ASSUMPTION (general knowledge, not cited): teams cite reasons like avoiding vendor lock-in, wanting full control of authorization/business logic in application code rather than database-level RLS, cost predictability at scale, or aligning with an existing Python skill set, as motivations for such a migration — but none of these is confirmed as the actual motivation here. (confidence: low)
- Cost of doing nothing: the current system is a working, apparently actively maintained application (50 commits in git history, most recent development around report/AI-job features and a "Termos de Notificação" management interface per recent commit messages) with no in-repo evidence of it being broken, non-compliant, or over budget. — [source: `git log --oneline`, `git log -1`] (confidence: medium — commit dates in this environment appear internally inconsistent, see Gaps)

## Data & Constraints

- Frontend size: 149 JS/JSX/TS/TSX files, ~41,372 lines, with `@supabase/supabase-js` as the sole backend-integration dependency (no other HTTP client abstraction layer visible for backend calls). — [source: `find src -type f ... | wc -l`, `wc -l`, `package.json`] (confidence: high)
- Auth: Supabase Auth (`auth.uid()`) is used as the identity primitive inside RLS policies going back to the earliest migrations (`000_setup_completo.sql`, `001_initial_schema.sql`). 7 files in `src/` call `supabase.auth.*` directly. — [source: `grep`] (confidence: high)
- Storage: Supabase Storage is used for evidence photos (`fotos-evidencia` bucket) and prestador-submitted documents (`documentos-termos` bucket), referenced from 19+ files across `src/`. — [source: `DOCUMENTACAO_TECNICA.md`, `grep -rln storage src`] (confidence: high)
- No use of Supabase Realtime (no `.channel(` / `postgres_changes` usage found), and no `pg_cron` usage found in migrations — the "scheduled" deadline-status change (`data_limite` → `nao_atendida`) described in `DOCUMENTACAO_TECNICA.md` did not surface a corresponding cron/trigger definition in a targeted grep; its actual mechanism is unconfirmed. — [source: `grep` across `src/` and `supabase/migrations/`] (confidence: medium — absence of a grep match is not proof of absence, wording may differ)
- This appears to be a Brazilian public-sector regulatory system (fiscalização, autos de infração, termos de notificação — administrative/legal enforcement documents), which typically implies compliance, audit-trail, and data-retention obligations, though no explicit compliance document was found in-repo to confirm specifics. — [source: inference from domain terms in `supabase/migrations/`, `DOCUMENTACAO_TECNICA.md`] (confidence: low, ASSUMPTION)

## Evidence Against the Idea

- **Authorization logic lives in the database, not just the app layer.** 163 RLS policies plus custom SQL functions (`can_access_camara`, `get_my_role`) are the actual enforcement mechanism for who can read/write which rows. Swapping to Django/DRF typically means re-implementing this as application-layer permission logic (or keeping Postgres + RLS and having Django connect through per-role DB roles/JWT claims, which is non-trivial to replicate outside Supabase's PostgREST+GoTrue integration). This is a significant, security-sensitive re-architecture, not a drop-in replacement.
- **The offline-first sync engine is coupled to Supabase-specific semantics** (Storage upload responses, PostgREST-style REST calls, outbox-confirmed-by-200 pattern). A Django backend would need to reproduce equivalent semantics (or the sync engine would need a rewrite) to preserve the "mantendo todas as funcionalidades atuais" requirement for fiscais working offline in the field — the system's own docs frame this as necessary for its core use case (rural/industrial sites without connectivity).
- **The async job-queue pattern (enqueue/status/worker × 3 job types) and direct Gemini API integration would need a Django-side equivalent** (e.g., Celery + broker), adding new infrastructure the team does not currently operate, per repo evidence.
- **No existing Python/Django code or partial migration exists** — this would be a full, from-scratch backend rewrite behind a live, actively-used system, with the stated constraint of zero functional regression and no scoped timeline, budget, or staffing given.
- **No documented problem with the current backend was found** — nothing in the repo (docs, comments, TODOs, issue trackers) suggests the current Supabase setup is failing, insufficient, or blocking a specific need. Absent a concrete driver, the risk/cost of a full rewrite is unweighed against a stated benefit.

## Gaps & Open Questions

- [NEEDS CLARIFICATION: who is requesting this change and why — see intake.md unknowns, still unanswered]
- [NEEDS CLARIFICATION: is the intent to also self-host Postgres, or keep Supabase-managed Postgres and only replace the application/API layer with Django?]
- [NEEDS CLARIFICATION: how would the 163 RLS policies' authorization semantics be preserved or re-implemented in Django — is there a target design (e.g., DRF permission classes, django-guardian, keeping RLS at the DB level with Django as a thin client)?]
- [NEEDS CLARIFICATION: what happens to the offline sync engine — is it in scope to rewrite, or does it stay pointed at Supabase Storage/PostgREST-compatible endpoints?]
- [NEEDS CLARIFICATION: the exact trigger for `data_limite` → `nao_atendida` status changes (described in docs as "rotinas agendadas") was not located in migrations — worth confirming before claiming full functional parity is understood]
- [NEEDS CLARIFICATION: budget, timeline, and whether the migration can be incremental (module-by-module) vs. a single cutover]
- [NEEDS CLARIFICATION: git commit dates in this environment (`2026-08-11` most recent by `git log -1`, but `2026-09-17` is "today" and the session's own `gitStatus` shows different, unlisted-here-by-date commits) are internally inconsistent — treat any date-based recency claim above with caution]

## Sources

- No external URLs were fetched — the idea text carried no link, and no source in this research required an off-list host. All findings above are cited to specific in-repo files/commands rather than external sources.
