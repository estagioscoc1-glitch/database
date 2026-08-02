-- ============================================================================
-- CABEÇALHO DO DIÁRIO: início, término, aulas previstas e aulas dadas
-- ============================================================================
-- Problema que isto resolve:
--
--   O professor preenchia esses quatro campos no alto do diário. A tela aceitava,
--   mostrava certo, e dava a entender que estava salvo. Mas eles NÃO existiam em
--   nenhuma tabela do banco: ficavam apenas guardados no navegador daquele
--   computador, com uma chave por turma e disciplina.
--
--   O efeito prático:
--     - abrir o diário em outro computador mostrava os campos em branco;
--     - limpar os dados do site apagava tudo sem aviso;
--     - o diário impresso saía sem o período do módulo.
--
--   Encontrado em 01/08/2026, testando o diário de Microbiologia: a carga
--   horária gravou (fica em `disciplinas`), mas as datas não foram a lugar nenhum.
--
-- Como rodar:
--   Supabase → SQL Editor → New query → cole tudo → Run
-- ============================================================================

alter table public.diarios
  add column if not exists data_inicio     text,
  add column if not exists data_termino    text,
  add column if not exists aulas_previstas integer,
  add column if not exists aulas_dadas     integer;

-- POR QUE `text` E NÃO `date`
--
-- A tela recebe a data digitada no formato brasileiro (DD/MM/AAAA) e permite
-- que ela fique incompleta enquanto a pessoa digita ("05/", "05/07/"). Guardar
-- como `date` obrigaria a converter e validar a cada tecla, e uma data pela
-- metade viraria erro de banco no meio da digitação.
--
-- Como esses campos servem para IMPRIMIR no cabeçalho do diário — e não para
-- fazer contas de data — guardar exatamente o que a pessoa escreveu é o
-- comportamento correto e o mais seguro.

comment on column public.diarios.data_inicio     is 'Início do módulo, como digitado (DD/MM/AAAA). Sai no cabeçalho do diário.';
comment on column public.diarios.data_termino    is 'Término do módulo, como digitado (DD/MM/AAAA). Sai no cabeçalho do diário.';
comment on column public.diarios.aulas_previstas is 'Total de aulas previstas para o módulo.';
comment on column public.diarios.aulas_dadas     is 'Total de aulas efetivamente dadas.';


-- ----------------------------------------------------------------------------
-- CONFERÊNCIA — as quatro colunas precisam dizer "sim"
-- ----------------------------------------------------------------------------
select
  case when exists (select 1 from information_schema.columns
                    where table_schema='public' and table_name='diarios' and column_name='data_inicio')
       then 'sim' else 'NAO' end as data_inicio,
  case when exists (select 1 from information_schema.columns
                    where table_schema='public' and table_name='diarios' and column_name='data_termino')
       then 'sim' else 'NAO' end as data_termino,
  case when exists (select 1 from information_schema.columns
                    where table_schema='public' and table_name='diarios' and column_name='aulas_previstas')
       then 'sim' else 'NAO' end as aulas_previstas,
  case when exists (select 1 from information_schema.columns
                    where table_schema='public' and table_name='diarios' and column_name='aulas_dadas')
       then 'sim' else 'NAO' end as aulas_dadas;
