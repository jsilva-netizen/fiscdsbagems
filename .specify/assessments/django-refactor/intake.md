# Idea Intake: Substituir o backend Supabase por um ecossistema Django/Python

- **Slug**: django-refactor
- **Created**: 2026-09-17
- **Source**: pasted text (idea for this repo)
- **Type**: exploration

## Idea (as captured)

> "precisamos trocar todo o backend por um ecosistema django/python, mantendo todas as funcionalidades atuais do sistema"

## Restated

The proposal is to replace the system's current backend with a Django/Python-based backend ecosystem, while preserving all functionality the system currently provides to users.

## Origin & Context

- **Raised by**: [NEEDS CLARIFICATION: who is proposing this — a specific stakeholder, the dev team, or a broader organizational decision?]
- **Trigger**: [NEEDS CLARIFICATION: what prompted this — a limitation of the current backend, a cost concern, a skills/staffing change, a compliance requirement, or something else?]

## Repo Context (as found)

The current codebase (`fiscdsbagems`) is a React/Vite frontend (`src/`, `vite.config.js`, `package.json`) backed by **Supabase** (`supabase/config.toml`, `supabase/migrations/`, `supabase/functions/`) — i.e., Postgres, auth, storage, and edge functions managed through Supabase, not a bespoke backend service. "The backend" in this idea therefore refers to the Supabase layer (database, auth, storage, edge functions, RLS policies), not a separate app server. This scoping note is factual (from repo inspection) and not an evaluation of feasibility.

## First-Glance Unknowns

- [NEEDS CLARIFICATION: does "todo o backend" mean replacing Supabase entirely (Postgres hosting, auth, storage, edge functions, RLS) with a self-hosted Django + DRF + Postgres stack, or only replacing the edge functions/application logic while keeping Supabase-managed Postgres/auth/storage?]
- [NEEDS CLARIFICATION: what is the motivating problem with the current Supabase-based backend — cost, vendor lock-in, missing features, team's Python/Django expertise, performance, or something else?]
- [NEEDS CLARIFICATION: "mantendo todas as funcionalidades atuais" — is there an inventory of current functionality (auth flows, RLS-based authorization, storage, edge functions, realtime features) to use as the completeness baseline?]
- [NEEDS CLARIFICATION: does the system currently use Supabase Auth, Row Level Security policies, Realtime subscriptions, or Storage — all of which would need Django-side equivalents?]
- [NEEDS CLARIFICATION: what is the expected timeline, budget, and team capacity for a full backend migration of this scope?]
- [NEEDS CLARIFICATION: is there a hosting/infrastructure preference for the new Django ecosystem (self-hosted, cloud VM, PaaS), and does that carry cost/ops implications not present today?]
- [NEEDS CLARIFICATION: can the migration be incremental (strangler pattern, module by module) or does it need to be a single cutover?]
