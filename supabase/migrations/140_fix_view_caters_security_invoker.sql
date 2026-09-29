-- 140: a view do CATERS passa a respeitar as políticas de quem consulta
-- (.specify/bugs/view-caters-sem-login).
--
-- Antes: caters_fiscalizacoes_disponiveis rodava com as permissões do dono (postgres), sem passar
-- pelas políticas de fiscalizacoes, e anon e authenticated tinham todos os privilégios nela:
-- qualquer pessoa, sem login, listava as fiscalizações finalizadas do CATERS.
--
-- Depois: a view usa as permissões de quem consulta (security_invoker), então vale a política de
-- fiscalizacoes (usuário ativo com acesso à câmara, ou admin). Só authenticated lê; ninguém
-- escreve por ela.

ALTER VIEW public.caters_fiscalizacoes_disponiveis SET (security_invoker = true);

REVOKE ALL ON public.caters_fiscalizacoes_disponiveis FROM anon;
REVOKE ALL ON public.caters_fiscalizacoes_disponiveis FROM authenticated;
GRANT SELECT ON public.caters_fiscalizacoes_disponiveis TO authenticated;
