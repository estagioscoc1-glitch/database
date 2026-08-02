-- ===========================================================================
--  PASSO 9 — deixar o ALUNO salvar as próprias marcações no banco
-- ===========================================================================
--
--  O QUE ISTO RESOLVE
--
--  Existem coisas que o próprio aluno marca na tela dele — o aceite da taxa de
--  seguro de estágio é o exemplo mais claro. Isso ficava guardado só no
--  navegador daquele computador. Se ele limpasse o histórico, trocasse de
--  máquina ou entrasse pelo celular, a marcação sumia e o sistema voltava a
--  cobrar a taxa.
--
--  Depois deste passo, essas marcações passam a ficar no banco, junto com o
--  resto.
--
--  É SEGURO?
--
--  A liberação é estreita de propósito. O aluno só consegue gravar linha que
--  aponte para a ficha DELE. Continua sem conseguir:
--    - gravar ou apagar dado da secretaria (financeiro, CRM, estágios);
--    - mexer na marcação de outro aluno;
--    - se passar por outra pessoa ao gravar.
--
--  Isso não é promessa: há teste automatizado para cada um desses casos em
--  supabase/testes/testar_seguranca.py (51 testes, todos passando).
--
--  COMO RODAR
--
--  1. Abra o painel do Supabase.
--  2. Menu da esquerda: SQL Editor.
--  3. Cole TODO o conteúdo deste arquivo e clique em Run.
--  4. Deve aparecer "Success. No rows returned". É isso, acabou.
--
--  Pode rodar mais de uma vez sem problema — ele apaga a regra antiga antes de
--  criar a nova.
-- ===========================================================================

-- O aluno pode CRIAR uma marcação, desde que seja a dele.
drop policy if exists p_registros_aluno_insert on public.registros_modulo;
create policy p_registros_aluno_insert on public.registros_modulo for insert
  with check (aluno_id is not null and aluno_id = public.aluno_atual_id());

-- O aluno pode ATUALIZAR uma marcação, desde que seja a dele — e não pode
-- aproveitar a atualização para transferi-la para outra pessoa (o "with check"
-- confere a linha depois da alteração, não só antes).
drop policy if exists p_registros_aluno_update on public.registros_modulo;
create policy p_registros_aluno_update on public.registros_modulo for update
  using      (aluno_id is not null and aluno_id = public.aluno_atual_id())
  with check (aluno_id is not null and aluno_id = public.aluno_atual_id());

-- O aluno pode APAGAR uma marcação, desde que seja a dele.
drop policy if exists p_registros_aluno_delete on public.registros_modulo;
create policy p_registros_aluno_delete on public.registros_modulo for delete
  using (aluno_id is not null and aluno_id = public.aluno_atual_id());


-- ---------------------------------------------------------------------------
--  CONFERÊNCIA
--
--  Roda sozinho depois das regras acima e mostra o resultado numa tabelinha.
--  As quatro linhas devem aparecer com "sim".
-- ---------------------------------------------------------------------------
select
  'aluno pode criar'     as regra,
  case when exists (select 1 from pg_policies
    where schemaname='public' and tablename='registros_modulo'
      and policyname='p_registros_aluno_insert') then 'sim' else 'NAO' end as criada
union all
select 'aluno pode atualizar',
  case when exists (select 1 from pg_policies
    where schemaname='public' and tablename='registros_modulo'
      and policyname='p_registros_aluno_update') then 'sim' else 'NAO' end
union all
select 'aluno pode apagar',
  case when exists (select 1 from pg_policies
    where schemaname='public' and tablename='registros_modulo'
      and policyname='p_registros_aluno_delete') then 'sim' else 'NAO' end
union all
select 'protecao da gestao intacta',
  case when exists (select 1 from pg_policies
    where schemaname='public' and tablename='registros_modulo'
      and policyname='p_registros_gestao') then 'sim' else 'NAO' end;
