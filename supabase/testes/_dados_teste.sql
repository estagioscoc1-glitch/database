-- Pessoas de teste
insert into auth.users (id, email) values
 ('11111111-1111-1111-1111-111111111111','admin@t.com'),
 ('22222222-2222-2222-2222-222222222222','prof.ana@t.com'),
 ('33333333-3333-3333-3333-333333333333','prof.bruno@t.com'),
 ('44444444-4444-4444-4444-444444444444','aluno.carla@t.com'),
 ('55555555-5555-5555-5555-555555555555','aluno.diego@t.com');

insert into public.usuarios (id, nome, email, login, papel, trocar_senha) values
 ('11111111-1111-1111-1111-111111111111','Admin','admin@t.com','admin','ADMIN',false),
 ('22222222-2222-2222-2222-222222222222','Prof Ana','prof.ana@t.com','ana','PROFESSOR',false),
 ('33333333-3333-3333-3333-333333333333','Prof Bruno','prof.bruno@t.com','bruno','PROFESSOR',false),
 ('44444444-4444-4444-4444-444444444444','Carla','aluno.carla@t.com','2026001','ALUNO',false),
 ('55555555-5555-5555-5555-555555555555','Diego','aluno.diego@t.com','2026002','ALUNO',false);

insert into public.cursos (id,nome) values ('curso_enfermagem','Enfermagem');
insert into public.turmas (id,curso_id,nome,turno,ano) values
 ('class_enf_m1_matutino','curso_enfermagem','ENF M1','MATUTINO',2026);
insert into public.disciplinas (id,curso_id,nome) values
 ('enf_m1_anatomia','curso_enfermagem','Anatomia'),
 ('enf_m1_farmacologia','curso_enfermagem','Farmacologia');

insert into public.professores (id,usuario_id,nome) values
 ('prof_ana','22222222-2222-2222-2222-222222222222','Prof Ana'),
 ('prof_bruno','33333333-3333-3333-3333-333333333333','Prof Bruno');

insert into public.alunos (id,usuario_id,matricula,nome,turma_id) values
 ('student_2026001','44444444-4444-4444-4444-444444444444','2026001','Carla','class_enf_m1_matutino'),
 ('student_2026002','55555555-5555-5555-5555-555555555555','2026002','Diego','class_enf_m1_matutino');

insert into public.matriculas (aluno_id,turma_id) values
 ('student_2026001','class_enf_m1_matutino'),
 ('student_2026002','class_enf_m1_matutino');

-- Diário da Ana (aberto) e do Bruno (fechado)
insert into public.diarios (id,turma_id,disciplina_id,professor_id,periodo,fechado) values
 ('diario_anatomia_2026_2','class_enf_m1_matutino','enf_m1_anatomia','prof_ana','2026/2',false),
 ('diario_farmaco_2026_2','class_enf_m1_matutino','enf_m1_farmacologia','prof_bruno','2026/2',true);

insert into public.notas (diario_id,aluno_id,av1,pf) values
 ('diario_anatomia_2026_2','student_2026001',8.0,8.0),
 ('diario_anatomia_2026_2','student_2026002',5.0,5.0),
 ('diario_farmaco_2026_2','student_2026001',9.0,9.0);
