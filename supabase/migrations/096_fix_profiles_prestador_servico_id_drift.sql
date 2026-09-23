-- Corrige mais um desvio de schema (drift), mesma origem do achado em 050: coluna existente
-- na base hospedada (confirmado por consulta a information_schema.columns em 2026-09-23) mas
-- nunca criada por nenhuma migration deste repositório — adicionada em algum momento via SQL
-- Editor do Dashboard sem migration correspondente commitada.
--
-- public.profiles.prestador_servico_id é usado pela função get_my_prestador_id() em
-- 097_optimized_rls_policies.sql; sem esta coluna, uma reconstrução do schema do zero falha
-- logo na 097.
--
-- profiles.diretoria_id e profiles.camara_tecnica_id NÃO têm este problema — são criadas
-- corretamente pela migration 103_multi_diretoria.sql, que também cria as tabelas
-- diretorias/camaras_tecnicas que elas referenciam.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS prestador_servico_id UUID REFERENCES public.prestadores_servico(id);

NOTIFY pgrst, 'reload schema';
