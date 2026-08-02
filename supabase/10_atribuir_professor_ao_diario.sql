-- ===========================================================================
--  ATRIBUIR PROFESSOR AO DIÁRIO (pelo banco)
-- ===========================================================================
--
--  ⚠️ LEIA ANTES DE USAR — ISTO PODE SER APAGADO
--
--  Descobri depois de escrever este arquivo: o portal REESCREVE a coluna
--  `professor_id` a cada poucos segundos, usando o que o navegador conhece.
--  Se você atribuir por aqui com o portal aberto, a atribuição some sozinha em
--  segundos — foi exatamente o que aconteceu comigo.
--
--  Então: FECHE o portal (a janela preta do servidor) antes de rodar isto, ou
--  prefira atribuir pela tela mesmo.
--
--  ===========================================================================
--
--  POR QUE ESTE ARQUIVO EXISTE
--
--  A tela "Gerenciador de Acessos de Professores" ainda não está gravando essa
--  atribuição no banco. Marcar a disciplina funciona na tela, mas ao recarregar
--  o vínculo some. Enquanto eu não termino a correção, use isto — é o mesmo
--  resultado, só que escrito direto.
--
--  Sem professor no diário, ninguém lança nota. É o passo entre "os alunos
--  estão no sistema" e "a escola consegue usar".
--
--  COMO USAR
--
--  1. Rode a CONSULTA 1 para ver os ids dos professores.
--  2. Rode a CONSULTA 2 para ver os diários de uma turma.
--  3. Use o COMANDO 3 para atribuir.
-- ===========================================================================


-- ------------------------------------------------------------- CONSULTA 1
-- Quem são os professores e qual o id de cada um.
select p.id, p.nome, p.matricula, u.login
  from public.professores p
  left join public.usuarios u on u.id = p.usuario_id
 order by p.nome;


-- ------------------------------------------------------------- CONSULTA 2
-- Diários de uma turma e quem responde por cada um hoje.
-- Troque o código da turma na linha do WHERE.
select d.disciplina_id,
       disc.nome as disciplina,
       coalesce(p.nome, '— SEM PROFESSOR —') as professor
  from public.diarios d
  join public.turmas t     on t.id = d.turma_id
  left join public.disciplinas disc on disc.id = d.disciplina_id
  left join public.professores p    on p.id = d.professor_id
 where t.codigo = 'ENF-M1-MAT'          -- <<< troque aqui
 order by disc.nome;


-- ------------------------------------------------------------- COMANDO 3
-- Atribui UM professor a UMA disciplina de UMA turma.
-- Troque os três valores marcados.
update public.diarios d
   set professor_id = (select id from public.professores where matricula = '1004')   -- <<< matrícula do professor
  from public.turmas t
 where t.id = d.turma_id
   and t.codigo = 'ENF-M1-MAT'                                                       -- <<< código da turma
   and d.disciplina_id = 'enf_m1_anatomia';                                          -- <<< id da disciplina


-- ------------------------------------------------------- COMANDO 3-B (atalho)
-- Mesmo professor em TODAS as disciplinas de uma turma.
-- Útil quando um professor cobre o módulo inteiro.
--
-- update public.diarios d
--    set professor_id = (select id from public.professores where matricula = '1004')
--   from public.turmas t
--  where t.id = d.turma_id
--    and t.codigo = 'ENF-M1-MAT';


-- ------------------------------------------------------------- CONFERÊNCIA
-- Rode depois para confirmar. Nenhuma linha deve voltar "— SEM PROFESSOR —"
-- nas disciplinas que você acabou de atribuir.
--
-- (é a mesma CONSULTA 2 acima)


-- ===========================================================================
--  DOIS PROFESSORES NA MESMA DISCIPLINA: NÃO ACONTECE
--
--  Cada linha de `diarios` tem um único `professor_id`. Atribuir um segundo
--  professor à mesma disciplina da mesma turma substitui o primeiro — não
--  cria duplicata. O desenho da tabela já garante isso.
-- ===========================================================================
