# Portal Acadêmico COC — leia isto primeiro

Arquivo de contexto para o Claude. Toda conversa nova começa por aqui, sem
precisar reler transcrições. **Atualizado em 01/08/2026.**

Se algo estiver desatualizado, o código e o banco mandam — este arquivo não.

---

## Decisão em vigor

**Trabalho todo no localhost.** O site só vai ao ar quando **tudo estiver
comprovadamente gravando no banco**. Não publicar antes disso, mesmo que o
código pareça pronto. Decidido pelo LG em 01/08.

---

## Como o sistema roda

- **Pilha:** React 19 + Vite + Express (`server.ts`) + **Supabase** (banco).
- **Local:** `npm run dev` → `localhost:3000`.
- **Publicar:** `PUBLICAR_SITE.bat` (duplo clique) → build + GitHub → Cloudflare
  Pages publica sozinho em ~2 min.
- **Importante:** o localhost grava no **mesmo Supabase** do site publicado.
  Testar local **é** prova real; só a tela é local.

Arquivos de referência: `ONDE_PARAMOS.md` (histórico longo, até 31/07),
`SOCORRO.txt` (o que fazer quando trava), `HOSPEDAR.md`, `COMO_TESTAR.md`.

---

## Comprovado no banco, funcionando

- **Diário completo:** AV1–AV3, S1, S2, PF, AFC, EX, CS, conceito, aulas,
  chamada, carga horária, cabeçalho com datas.
- **Resultados:** APTO, NÃO APTO, F. NOTA, DESISTENTE e **DISPENSADO**.
- **Logins:** admin, professor e aluno entram; tela única sem escolha de
  perfil; troca de senha obrigatória no 1º acesso; redefinição pela secretaria.
- **Cadastro de admin novo** e **de professor novo**, com vínculo correto entre
  ficha e conta de login.
- **Menu do painel enxuto** — 7 abas ocultas via `ABAS_VISIVEIS` no topo de
  `src/components/AdminDashboard.tsx`. Nada foi apagado: trocar `false` por
  `true` traz a tela de volta inteira. Abre em Cadastros Acadêmicos.

---

## Corrigido em 01/08 (comprovado no banco, ainda sem commit)

- **Edição só chegava ao banco se o NOME mudasse.** A publicação da estrutura
  compara uma "assinatura" do que mudou; de um curso entravam só `id` e `nome`.
  Editar carga horária, descrição, turnos ou ativar/inativar não mudava a
  assinatura e **nada era gravado** — a tela mostrava o valor novo, o banco
  guardava o antigo, sem erro nenhum. Valia também para módulo/carga de
  disciplina e para quase todos os campos de turma. A assinatura agora inclui
  todos os campos que de fato são gravados. **Se um campo novo passar a ser
  gravado, ele precisa entrar na assinatura também** (`AppContext.tsx`, ~1523).
- **Turnos do curso nunca eram gravados** — a coluna `turnos` existia e ficava
  vazia. Agora grava e volta na leitura (`repositorios.ts`).
- **Aviso de falha do calendário quebrava sozinho.** Quando a gravação de uma
  data falhava, o código chamava `mostrarAviso`, que não existe naquele escopo:
  estourava dentro do `.then` e a secretaria não era avisada de nada. Trocado
  por `setAviso`.

- **Funcionário era cadastrado sem conta de acesso.** A tela "Funcionários do
  Sistema" mostrava usuário e a senha fixa `Func@2026`, o botão dizia "Gerar
  Login" — e nenhuma conta era criada no banco. A pessoa recebia os dados e não
  conseguia entrar; para quem cadastrou não aparecia erro nenhum. Agora a tela
  usa o mesmo caminho já testado do cadastro de secretaria: papel SECRETARIA
  (que o portal traduz para funcionário, não administrador), login
  `func_nome.sobrenome` com resolução automática de repetição, e senha forte
  gerada pelo servidor. Se a conta falhar, o cadastro **não** é salvo — um
  funcionário na lista que não entra é pior que nenhum.
  Comprovado: `func_maria.teste | SECRETARIA | MARIA DAS DORES TESTE` está em
  `usuarios`, e a tela mostrou a senha real de 14 caracteres.

Comprovado com `CURSO TESTE CLAUDE` (`TESTE_CLD`): editei carga horária de 1200
para 800 e marquei SÁBADO e EAD **sem tocar no nome**; o banco recebeu
`ch=800` e `["MATUTINO","VESPERTINO","NOTURNO","SABADO","EAD"]`, e o valor
sobreviveu ao recarregar a página.

**Os 5 cursos reais foram regravados** (abrir e salvar cada um): agora têm
`carga_horaria = 1200` e `turnos = MATUTINO, VESPERTINO, NOTURNO` no banco.

**Atenção a esses turnos:** eles eram o que a *tela* mostrava, e a tela mostrava
o padrão do componente, não uma escolha de ninguém. Para ENF_EAD (curso EAD) e
RAD (que tem turma de sábado) quase certamente estão errados — antes o dado
estava ausente, agora está afirmado. Corrigir é abrir o curso, marcar os turnos
certos e salvar.

---

## Pendências abertas

1. **Turma errada na matrícula (não confirmado).** Selecionei *Enfermagem 1º
   matutino* e o aluno caiu em *Radiologia 2º sábado*. Selecionei por código,
   não pelo mouse — pode ser artefato do teste. **Falta matricular um aluno
   clicando com o mouse** para separar bug real de artefato.
2. **Correções de 01/08 não publicadas.** Estão só no computador, sem commit.
   `git status` mostra `AdminDashboard.tsx`, `AttendanceJournal.tsx`,
   `FirstLoginPasswordChange.tsx`, `AppContext.tsx`, `repositorios.ts`,
   `nuvem.ts`, `supabase.ts`, `vite.config.ts` e 2 SQL novos.
3. **Antivírus barrando o site publicado** nesta máquina. Ele bloqueia um
   arquivo de ~1,9 MB, o painel carrega pela metade e a gravação não completa.
   **Isso já causou um bug que passamos horas caçando no código.** Local
   funciona; publicado, nesta máquina, não. Em outras máquinas: desconhecido.
4. **`F. NOTA` gravado como `NÃO APTO`** dentro do importador de histórico.
   Três pontos já corrigidos, a conversão persiste. Não isolado.
5. **Os 14 mapas de notas nunca foram importados.**
   `MAPAS/mapas_importacao.json` está pronto e conferido (258 matrículas,
   1.902 notas, zero divergência). Importa arrastando o arquivo na aba
   Importar Planilhas — o canal de automação não aguenta os 337 KB.
6. **Acessos dos alunos importados** — os mapas trazem só o nome, sem
   matrícula. Cruzar por nome (`Alunos_e_Matriculas.xlsx`) antes de criar.

## Nunca testado

AV4/AV5/AV6 · Rec S1/Rec S2 · login de secretaria · botões de fechar S1/S2 ·
envio de arquivo do aluno (só demonstração na tela).

---

## Resíduos de teste no banco (apagar quando quiser)

| Registro | Detalhe |
|---|---|
| `teste.claude.admin` | administrador |
| TESTE CLAUDE PROFESSOR | ficha 1006, **sem acesso** (a tentativa que falhou) |
| MARIANA CLAUDE TESTE | professora 1007, login `prof_mariana.teste` |
| ALUNO CLAUDE DE TESTE | matrícula 26109999, hoje em Radiologia 2º sábado |
| ALUNO TESTE DA SILVA | 26109001, em ENF-M2-VESP 2026/2 |
| `prof_eu` | matrícula 1004, senha `TesteCOC2026` |
| `prof_prof` | PROF PERF TESTE, matrícula 1005 |

---

## Dívida técnica conhecida

- **Funcionário não tem tabela própria.** A ficha vai junto num retrato
  (`backups/estado/portal_estado.json`) gravado por inteiro a cada vez. Sobrevive
  a troca de computador, mas dois administradores cadastrando ao mesmo tempo se
  sobrescrevem. A conta de login, essa sim, está em `usuarios`.
- **`addStaffMember` ainda cria um usuário local falso** com papel ADMIN e senha
  em texto puro no estado do navegador. Não vai para o banco e não é usado no
  login (que agora é de verdade), mas é resíduo e confunde quem ler o código.

- Financeiro, CRM e estágios salvam como bloco em `registros_modulo`, não em
  tabelas próprias. Os dados estão salvos e protegidos — falta formato.
- `imageAssets.ts` tem 248 KB de imagem dentro do código.
- `xlsx` desatualizado, com vulnerabilidade conhecida na importação.
- Lentidão de digitação nos formulários de nova turma, nova disciplina e
  matrícula (mesma causa já corrigida no cadastro de professor).

---

## Regras para o Claude nesta pasta

- **Não afirmar que algo funciona sem ter visto rodando.** Separar sempre
  "corrigi o código" de "vi funcionando". Esse foi o erro mais repetido aqui.
- **Conferir no Supabase**, não na tela. Tela mostra intenção; banco mostra
  fato.
- **Evitar screenshot e leitura de página inteira** — a página é pesada e isso
  já travou a conversa. Ler pelo caminho mais barato possível.
- **Testar clicando quando o teste for sobre a tela.** Preencher campo por
  código gera falso positivo e falso negativo (ver pendência 1).
- **Atualizar este arquivo** ao fim de cada trabalho relevante.
