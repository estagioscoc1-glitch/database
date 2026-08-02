-- ============================================================================
-- O PROFESSOR PRECISA PODER GRAVAR O CABEÇALHO DO PRÓPRIO DIÁRIO
-- ============================================================================
-- Problema que isto resolve:
--
--   Depois de criar as colunas do cabeçalho (arquivo 13), o professor preenchia
--   início, término e número de aulas, e nada chegava ao banco.
--
--   A causa: a tabela `diarios` só tinha duas regras — professor PODE LER o
--   diário dele, e ALTERAR era exclusivo da administração. O pedido do professor
--   não dava erro: ele simplesmente não encontrava nenhuma linha que tivesse
--   permissão de alterar, e o banco respondia "200, zero linhas modificadas".
--
--   Silêncio, não recusa. Foi por isso que passou despercebido.
--
-- Como rodar:
--   Supabase → SQL Editor → New query → cole tudo → Run
-- ============================================================================


-- 1. QUEM PODE ALTERAR
--
-- Só o professor dono do diário, e só enquanto o diário estiver aberto.
--
-- O `with check` repete as mesmas condições de propósito: ele é conferido sobre
-- a linha DEPOIS da alteração. Sem isso, o professor poderia passar o diário
-- para outro professor, ou marcá-lo como fechado, numa única alteração.
drop policy if exists p_diarios_professor_cabecalho on public.diarios;
create policy p_diarios_professor_cabecalho on public.diarios for update
  to authenticated
  using      (professor_id = public.professor_atual_id() and fechado = false)
  with check (professor_id = public.professor_atual_id() and fechado = false);


-- 2. O QUE ELE PODE ALTERAR
--
-- A regra acima decide QUAIS LINHAS. Ela não sabe dizer QUAIS COLUNAS — e sem
-- esse limite, um professor com conhecimento técnico poderia trocar a turma ou
-- a disciplina do próprio diário e, por tabela, enxergar as notas de uma turma
-- que não é dele.
--
-- Este gatilho fecha essa porta: fora do cabeçalho, nada muda.
create or replace function public.diario_professor_so_cabecalho()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- A administração continua com liberdade total sobre o diário.
  if public.eh_gestao() then
    return new;
  end if;

  if new.id            is distinct from old.id
  or new.turma_id      is distinct from old.turma_id
  or new.disciplina_id is distinct from old.disciplina_id
  or new.professor_id  is distinct from old.professor_id
  or new.periodo       is distinct from old.periodo
  or new.fechado       is distinct from old.fechado
  or new.fechado_em    is distinct from old.fechado_em
  or new.fechado_por   is distinct from old.fechado_por
  or new.criado_em     is distinct from old.criado_em
  then
    raise exception
      'O professor só pode alterar o cabeçalho do diário: datas de início e término e número de aulas.';
  end if;

  return new;
end;
$$;

drop trigger if exists t_diario_professor_so_cabecalho on public.diarios;
create trigger t_diario_professor_so_cabecalho
  before update on public.diarios
  for each row execute function public.diario_professor_so_cabecalho();


-- ----------------------------------------------------------------------------
-- CONFERÊNCIA — as duas precisam dizer "sim"
-- ----------------------------------------------------------------------------
select
  case when exists (select 1 from pg_policies
                    where schemaname='public' and tablename='diarios'
                      and policyname='p_diarios_professor_cabecalho')
       then 'sim' else 'NAO' end as regra_de_alteracao,
  case when exists (select 1 from pg_trigger
                    where tgname='t_diario_professor_so_cabecalho')
       then 'sim' else 'NAO' end as trava_de_colunas;
