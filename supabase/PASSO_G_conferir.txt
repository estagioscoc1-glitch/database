-- ============================================================================
-- CONFERIR O QUE FOI SALVO — consulta única
-- ============================================================================
-- O SQL Editor mostra apenas o resultado da ÚLTIMA consulta quando há várias.
-- Por isso aqui está tudo reunido num resultado só.
--
-- Cole e clique em Run. Pode rodar quantas vezes quiser.
-- ============================================================================

select secao, item, detalhe from (

  -- ---------------------------------------------------- 1. contagem por tabela
  select 1 as ordem, 0 as sub, '1. TABELAS' as secao, 'cursos' as item, count(*)::text as detalhe from public.cursos
  union all select 1, 1, '1. TABELAS', 'disciplinas', count(*)::text from public.disciplinas
  union all select 1, 2, '1. TABELAS', 'turmas',      count(*)::text from public.turmas
  union all select 1, 3, '1. TABELAS', 'professores', count(*)::text from public.professores
  union all select 1, 4, '1. TABELAS', 'alunos',      count(*)::text from public.alunos
  union all select 1, 5, '1. TABELAS', 'diarios',     count(*)::text from public.diarios
  union all select 1, 6, '1. TABELAS', 'notas',       count(*)::text from public.notas
  union all select 1, 7, '1. TABELAS', 'matriculas',  count(*)::text from public.matriculas
  union all select 1, 8, '1. TABELAS', 'CRM/estagios/financeiro', count(*)::text from public.registros_modulo

  -- --------------------------------------------------------- 2. diários criados
  union all
  select 2, row_number() over (order by d.periodo, t.nome, di.nome)::int,
         '2. DIARIOS',
         d.periodo || ' | ' || t.nome || ' | ' || di.nome,
         coalesce(p.nome, '(SEM PROFESSOR)') ||
           case when d.fechado then ' [FECHADO]' else ' [aberto]' end
  from public.diarios d
  join public.turmas t        on t.id  = d.turma_id
  join public.disciplinas di  on di.id = d.disciplina_id
  left join public.professores p on p.id = d.professor_id

  -- ------------------------------------- 3. professores: conseguem entrar?
  union all
  select 3, row_number() over (order by p.nome)::int,
         '3. ACESSO DOS PROFESSORES',
         p.nome || ' (mat. ' || coalesce(p.matricula, '-') || ')',
         case when p.usuario_id is null
              then '>>> SEM LOGIN — nao consegue entrar <<<'
              else 'pode entrar como: ' || coalesce(u.login, '?') end
  from public.professores p
  left join public.usuarios u on u.id = p.usuario_id

  -- ------------------------------------- 4. dados espelhados do navegador
  union all
  select 4, row_number() over (order by ref_externa)::int,
         '4. CRM / ESTAGIOS / FINANCEIRO',
         ref_externa,
         pg_size_pretty(length(dados::text)::bigint) || '  ·  ' ||
         to_char(atualizado_em, 'DD/MM HH24:MI')
  from public.registros_modulo
  where modulo = 'navegador'

) resultado
order by ordem, sub;
