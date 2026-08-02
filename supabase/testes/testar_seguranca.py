# Bateria de testes de seguranca do banco (RLS).
# Rodar com:  pip install pgserver --break-system-packages && python3 testar_seguranca.py
import pgserver, subprocess, sys, os
AQUI = os.path.dirname(os.path.abspath(__file__))
PSQL="/sessions/bold-beautiful-lovelace/.local/lib/python3.10/site-packages/pgserver/pginstall/bin/psql"
db = pgserver.get_server('/tmp/pgdata'); uri = db.get_uri()
SCHEMA = os.path.join(os.path.dirname(AQUI), "01_schema_e_seguranca.sql")
def psql(sql=None, f=None):
    a=[PSQL, uri, "-v","ON_ERROR_STOP=1","-q"]+ (["-f", f] if f else ["-c", sql])
    return subprocess.run(a, capture_output=True, text=True)
for lbl, kw in [("limpar", dict(sql="drop schema if exists public cascade; drop schema if exists auth cascade; drop schema if exists storage cascade; create schema public;")),
                ("stubs", dict(f=os.path.join(AQUI,"_stubs_supabase.sql"))), ("schema", dict(f=SCHEMA)), ("seed", dict(f=os.path.join(AQUI,"_dados_teste.sql")))]:
    r = psql(**kw)
    if r.returncode:
        print(f"FALHOU em {lbl}:\n", "\n".join(l for l in r.stderr.splitlines() if 'NOTICE' not in l)[-3000:]); sys.exit(1)

CARLA='44444444-4444-4444-4444-444444444444'
ANA='22222222-2222-2222-2222-222222222222'; BRUNO='33333333-3333-3333-3333-333333333333'
ADMIN='11111111-1111-1111-1111-111111111111'
DIA_ANA='diario_anatomia_2026_2'; DIA_BRUNO='diario_farmaco_2026_2'
AL_CARLA='student_2026001'; AL_DIEGO='student_2026002'
TURMA='class_enf_m1_matutino'

def como(uid, sql, role):
    pre = f"set role {role}; " + (f"set teste.uid='{uid}'; " if uid else "set teste.uid=''; ")
    r = subprocess.run([PSQL, uri, "-t","-A","-c", pre+sql], capture_output=True, text=True)
    linhas=[l for l in (r.stdout or "").splitlines() if l.strip() not in ("SET","")]
    return r.returncode, (linhas[-1].strip() if linhas else ""), (r.stderr or "").strip()

T = [
 ("VISITANTE sem login tenta ler notas",            None,"select count(*) from public.notas;","0","anon"),
 ("VISITANTE sem login tenta ler alunos",           None,"select count(*) from public.alunos;","0","anon"),
 ("VISITANTE sem login tenta ler usuarios/senhas",  None,"select count(*) from public.usuarios;","0","anon"),
 ("Aluna Carla vê só as próprias notas (2)",        CARLA,"select count(*) from public.notas;","2","authenticated"),
 ("Carla tenta ler a nota do Diego",                CARLA,f"select count(*) from public.notas where aluno_id='{AL_DIEGO}';","0","authenticated"),
 ("Carla tenta ALTERAR a própria nota",             CARLA,f"with x as (update public.notas set av1=10 where aluno_id='{AL_CARLA}' returning 1) select count(*) from x;","0","authenticated"),
 ("Carla tenta APAGAR a própria nota",              CARLA,f"with x as (delete from public.notas where aluno_id='{AL_CARLA}' returning 1) select count(*) from x;","0","authenticated"),
 ("Carla vê só o próprio cadastro (1)",             CARLA,"select count(*) from public.alunos;","1","authenticated"),
 ("Carla tenta se promover a ADMIN",                CARLA,f"with x as (update public.usuarios set papel='ADMIN' where id='{CARLA}' returning 1) select count(*) from x;","0","authenticated"),
 ("Carla tenta ler a auditoria",                    CARLA,"select count(*) from public.auditoria;","0","authenticated"),
 ("Carla tenta ler o financeiro",                   CARLA,"select count(*) from public.registros_modulo;","0","authenticated"),
 ("Carla vê o próprio diário (leitura ok)",         CARLA,"select count(*) from public.diarios;","2","authenticated"),
 ("Prof Ana vê só as notas do diário dela (2)",     ANA,"select count(*) from public.notas;","2","authenticated"),
 ("Prof Ana vê os alunos da turma dela (2)",        ANA,"select count(*) from public.alunos;","2","authenticated"),
 ("Prof Ana lança nota no diário dela (aberto)",    ANA,f"with x as (update public.notas set av1=7.5 where diario_id='{DIA_ANA}' and aluno_id='{AL_CARLA}' returning 1) select count(*) from x;","1","authenticated"),
 ("Prof Bruno tenta alterar nota da Ana",           BRUNO,f"with x as (update public.notas set av1=1 where diario_id='{DIA_ANA}' returning 1) select count(*) from x;","0","authenticated"),
 ("Prof Bruno tenta lançar em diário FECHADO",      BRUNO,f"with x as (update public.notas set av1=1 where diario_id='{DIA_BRUNO}' returning 1) select count(*) from x;","0","authenticated"),
 ("Prof Ana tenta ler o financeiro",                ANA,"select count(*) from public.registros_modulo;","0","authenticated"),
 ("Prof Ana tenta ler a auditoria",                 ANA,"select count(*) from public.auditoria;","0","authenticated"),
 ("Prof Ana tenta cadastrar aluno",                 ANA,f"with x as (update public.alunos set nome='X' where id='{AL_CARLA}' returning 1) select count(*) from x;","0","authenticated"),
 ("Admin vê todas as notas (3)",                    ADMIN,"select count(*) from public.notas;","3","authenticated"),
 ("Admin vê a auditoria",                           ADMIN,"select case when count(*)>0 then 'sim' else 'nao' end from public.auditoria;","sim","authenticated"),
 ("Auditoria gravou a alteração da Ana",            ADMIN,"select case when count(*)>0 then 'sim' else 'nao' end from public.auditoria where tabela='notas' and acao='UPDATE';","sim","authenticated"),
 ("Nem o admin apaga a auditoria",                  ADMIN,"delete from public.auditoria;","0","authenticated"),
 ("Matrícula duplicada é impedida",                 ADMIN,f"insert into public.matriculas (aluno_id,turma_id) values ('{AL_CARLA}','{TURMA}');","0","authenticated"),
 ("Nota duplicada do mesmo aluno é impedida",       ADMIN,f"insert into public.notas (diario_id,aluno_id) values ('{DIA_ANA}','{AL_CARLA}');","0","authenticated"),
 ("Prof Ana registra aula no diario dela",            ANA,  f"with x as (insert into public.aulas (id,diario_id,data,qtd_aulas,conteudo) values ('aula_t1','{DIA_ANA}','2026-03-02',4,'Sistema esqueletico') returning 1) select count(*) from x;", "1", "authenticated"),
 ("Prof Ana faz a chamada dessa aula",                ANA,  f"with x as (insert into public.frequencia (aula_id,aluno_id,presenca) values ('aula_t1','{AL_CARLA}','P'),('aula_t1','{AL_DIEGO}','F') returning 1) select count(*) from x;", "2", "authenticated"),
 ("Prof Bruno tenta registrar aula no diario da Ana", BRUNO, f"with x as (insert into public.aulas (id,diario_id,data,qtd_aulas) values ('aula_t2','{DIA_ANA}','2026-03-09',4) returning 1) select count(*) from x;", "0", "authenticated"),
 ("Prof Bruno tenta registrar aula em diario FECHADO",BRUNO, f"with x as (insert into public.aulas (id,diario_id,data,qtd_aulas) values ('aula_t3','{DIA_BRUNO}','2026-03-09',4) returning 1) select count(*) from x;", "0", "authenticated"),
 ("Aluna Carla tenta registrar aula",                 CARLA, f"with x as (insert into public.aulas (id,diario_id,data,qtd_aulas) values ('aula_t4','{DIA_ANA}','2026-03-16',4) returning 1) select count(*) from x;", "0", "authenticated"),
 ("Carla tenta alterar a propria presenca",           CARLA, f"with x as (update public.frequencia set presenca='P' where aluno_id='{AL_CARLA}' returning 1) select count(*) from x;", "0", "authenticated"),
 ("Carla ve so a propria frequencia",                 CARLA, "select count(*) from public.frequencia;", "1", "authenticated"),
 ("Prof Ana ve a chamada do diario dela (2)",         ANA,  "select count(*) from public.frequencia;", "2", "authenticated"),
 ("Auditoria registrou a chamada",                    ADMIN, "select case when count(*)>0 then 'sim' else 'nao' end from public.auditoria where tabela='frequencia';", "sim", "authenticated"),
 ("Carla envia mensagem como ela mesma",              CARLA, f"with x as (insert into public.mensagens (id,remetente_id,conteudo) values ('msg_t1','{CARLA}','Ola professora') returning 1) select count(*) from x;", "1", "authenticated"),
 ("Carla tenta enviar mensagem SE PASSANDO pela Ana", CARLA, f"with x as (insert into public.mensagens (id,remetente_id,conteudo) values ('msg_t2','{ANA}','Nota liberada') returning 1) select count(*) from x;", "0", "authenticated"),
 ("Carla envia o proprio documento",                  CARLA, f"with x as (insert into public.documentos_aluno (id,aluno_id,tipo,situacao) values ('doc_t1','{AL_CARLA}','RG','ENVIADO') returning 1) select count(*) from x;", "1", "authenticated"),
 ("Carla tenta enviar documento NO NOME do Diego",    CARLA, f"with x as (insert into public.documentos_aluno (id,aluno_id,tipo,situacao) values ('doc_t2','{AL_DIEGO}','RG','ENVIADO') returning 1) select count(*) from x;", "0", "authenticated"),
 ("Carla ve so os proprios documentos",               CARLA, "select count(*) from public.documentos_aluno;", "1", "authenticated"),
 ("Prof Ana nao ve documentos de aluno",              ANA,  "select count(*) from public.documentos_aluno;", "0", "authenticated"),
 ("Admin ve os documentos",                           ADMIN, "select count(*) from public.documentos_aluno;", "1", "authenticated"),

 # ------------------------------------------------------------------ espelho
 # O aluno passou a gravar as proprias marcacoes (aceite da taxa de seguro de
 # estagio, por exemplo). Antes isso so existia no navegador dele e sumia ao
 # trocar de computador. A liberacao e estreita: so a linha dele.
 ("Carla grava a propria marcacao",                   CARLA, f"with x as (insert into public.registros_modulo (modulo,entidade,ref_externa,aluno_id,dados) values ('navegador','chave','{AL_CARLA}::insurance_paid_{AL_CARLA}','{AL_CARLA}','{{\"valor\":\"true\"}}') returning 1) select count(*) from x;", "1", "authenticated"),
 ("Carla tenta gravar marcacao NO NOME do Diego",     CARLA, f"with x as (insert into public.registros_modulo (modulo,entidade,ref_externa,aluno_id,dados) values ('navegador','chave','{AL_DIEGO}::insurance_paid','{AL_DIEGO}','{{\"valor\":\"true\"}}') returning 1) select count(*) from x;", "0", "authenticated"),
 ("Carla tenta gravar linha de GESTAO (sem dono)",    CARLA, "with x as (insert into public.registros_modulo (modulo,entidade,ref_externa,dados) values ('navegador','chave','gestao_fin_installments_v1','{\"valor\":\"[]\"}') returning 1) select count(*) from x;", "0", "authenticated"),
 ("Carla ve so a propria marcacao",                   CARLA, "select count(*) from public.registros_modulo;", "1", "authenticated"),
 ("Diego nao ve a marcacao da Carla",                 '55555555-5555-5555-5555-555555555555', "select count(*) from public.registros_modulo;", "0", "authenticated"),
 ("Carla tenta apagar dado do financeiro da gestao",  CARLA, "with x as (delete from public.registros_modulo where aluno_id is null returning 1) select count(*) from x;", "0", "authenticated"),
 ("Prof Ana continua sem gravar no espelho",          ANA,  f"with x as (insert into public.registros_modulo (modulo,entidade,ref_externa,aluno_id,dados) values ('navegador','chave','x::y','{AL_CARLA}','{{\"valor\":\"1\"}}') returning 1) select count(*) from x;", "0", "authenticated"),
 ("Admin grava dado administrativo no espelho",       ADMIN, "with x as (insert into public.registros_modulo (modulo,entidade,ref_externa,dados) values ('navegador','chave','gestao_crm_leads_v1','{\"valor\":\"[]\"}') returning 1) select count(*) from x;", "1", "authenticated"),
 ("Admin ve o espelho todo (gestao + aluno)",         ADMIN, "select count(*) from public.registros_modulo;", "2", "authenticated"),
]
falhas=0
for desc, uid, sql, esp, role in T:
    rc, out, err = como(uid, sql, role)
    if rc != 0:
        ok = esp=="0" and any(k in err for k in ("permission denied","violates row-level","duplicate key","não é permitido","Não é permitido"))
        out = "BLOQUEADO PELO BANCO"
    else:
        ok = out == esp
    falhas += 0 if ok else 1
    print(f"{'[ OK ]' if ok else '[FALHA]'} {desc}  ->  {out}")
    if not ok and err: print("        ", err.splitlines()[0][:200])
print(f"\n===== {len(T)-falhas}/{len(T)} testes de segurança passaram =====")
sys.exit(1 if falhas else 0)