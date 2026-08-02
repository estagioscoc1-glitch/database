-- ============================================================================
-- LIMPAR OS DADOS (mantendo a estrutura e o seu login)
-- ============================================================================
-- Use quando quiser deixar o sistema vazio, pronto para receber os dados reais
-- da escola.
--
-- O QUE ESTE ARQUIVO FAZ:
--   Apaga o conteúdo das tabelas (alunos, turmas, notas, financeiro...).
--
-- O QUE ELE NÃO FAZ:
--   Não apaga as tabelas nem as regras de segurança.
--   Não apaga as contas de acesso (Authentication).
--   Não apaga o seu usuário administrador.
-- ============================================================================

truncate table
  public.frequencia,
  public.aulas,
  public.faltas_diretas,
  public.notas,
  public.diarios,
  public.matriculas,
  public.historico_escolar,
  public.documentos_aluno,
  public.alunos,
  public.professores,
  public.funcionarios,
  public.turmas,
  public.disciplinas,
  public.modulos_curso,
  public.cursos,
  public.salas,
  public.mensagens,
  public.notificacoes,
  public.importacoes,
  public.registros_modulo
restart identity cascade;

-- Zera também o histórico de auditoria (é um recomeço, não há o que auditar)
delete from public.auditoria;

-- Remove perfis de aluno/professor que tenham sobrado, preservando gestão
delete from public.usuarios where papel in ('ALUNO', 'PROFESSOR');


-- ----------------------------------------------------------------------------
-- Conferência: todas as contagens devem ser 0, menos 'usuarios_gestao' (1)
-- ----------------------------------------------------------------------------
select
  (select count(*) from public.alunos)      as alunos,
  (select count(*) from public.professores) as professores,
  (select count(*) from public.cursos)      as cursos,
  (select count(*) from public.turmas)      as turmas,
  (select count(*) from public.disciplinas) as disciplinas,
  (select count(*) from public.notas)       as notas,
  (select count(*) from public.usuarios where papel in ('ADMIN','SECRETARIA')) as usuarios_gestao;
