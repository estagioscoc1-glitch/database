# Manual do Sistema — Portal Acadêmico COC / LYnx EDU

> **Este arquivo é atualizado sempre que uma funcionalidade nova entra no
> sistema.** Ele é a fonte de verdade do conteúdo que também aparece dentro
> do próprio Portal, no botão "Ajuda" (arquivo
> `src/components/AjudaModal.tsx`) — sempre que este arquivo mudar, o
> `AjudaModal.tsx` precisa ser atualizado junto, pra não ficarem
> desincronizados.

---

## Dashboard

Mostra os números principais da escola: total de alunos, professores,
turmas, diários pendentes, matrículas online recebidas, e outros
indicadores. É a primeira tela que o Admin vê ao entrar.

---

## CRM

- **Dashboard do CRM** — resumo de leads, tarefas, matrículas do funil
  comercial, e também o total de matrículas recebidas pelo site externo de
  matrícula online.
- **Leads** — cadastro de pessoas interessadas em fazer matrícula. Nome,
  telefone, curso de interesse, origem, responsável e status.
- **Kanban** — visão em colunas do funil comercial.
- **Tarefas** — lista de tarefas do time comercial, com prazo, prioridade e
  status.
- **Calendário** — agenda de compromissos e eventos do CRM.
- **Funcionários** — cadastro da equipe comercial (diferente dos
  professores/secretaria do resto do sistema).
- **Atendimento** — linha do tempo de tudo que já aconteceu com um lead
  específico.

---

## Cadastros Acadêmicos

### Cadastrar Novo Curso
Cria um curso técnico: nome, descrição, carga horária, turnos, status.
Também é aqui que se escolhe o **Coordenador** (um professor) e a
**Resolução** (ato legal que autoriza o curso) — os dois opcionais.

### Funcionários do Sistema
Gerencia contas de Secretaria/Admin.

### Dependências
Matricula um aluno em dependência de uma disciplina específica. Gera o
diário automaticamente.

### Turmas, Professores & Alunos

- **Cadastrar Nova Turma** — nome, código, curso, turno, módulo.
- **Nova Disciplina** — nome, curso/módulo, carga horária, **Código**
  (opcional) e **Ementa** (resumo oficial, opcional).
- **Cadastrar Usuário (Docente ou Administração)** — cadastro rápido de
  professor/admin: nome, e-mail, senha.
- **Matricular Aluno na Turma** — cadastro rápido de aluno: nome e
  matrícula (digitada à mão), já vincula numa turma.
- **Cadastro Completo (Aluno ou Professor)** — card roxo. Matrícula
  sugerida automaticamente (editável). Permite preencher endereço,
  filiação, documentos e (professor) conselho de classe já na criação.
  Cria ficha + acesso de login juntos.
- **Gerenciar Usuários Cadastrados** — lista com busca. Cada linha tem:
  Editar (nome, e-mail, senha, papel, matrícula, CPF), **Ficha Completa**
  (ícone de cartão — endereço, filiação, documentos), Apagar Tudo (só
  cadastro de teste). Professor também ganha os botões **"Ver Histórico"**
  e **"Ver Acessos"** — concede permissão extra pra esse professor
  específico, sem virar admin.
- **Gerenciador de Acessos de Professores** — define quais salas/diários
  cada professor pode ver e lançar nota.
- **Transferência de Aluno** — move aluno entre turmas. Botão **"Remover
  da Turma"** tira o aluno de uma turma errada sem precisar indicar outra
  na hora (protege nota real já lançada).
- **Controle de Documentos Obrigatórios** — mostra documentos entregues.
  Tem o marcador de **sexo do aluno** (Homem/Mulher), que decide se o
  Certificado de Reservista entra na lista. Alunos de Instrumentação
  Cirúrgica também veem Diploma/Histórico de Enfermagem.
- **Histórico de Matrículas** — busca aluno, mostra semestres/salas,
  dependências (com botão de cancelar) e estágios (Realizados/Pendentes).
  É aqui que se **cancela a matrícula do semestre atual** — vira
  "Desistente" em todas as disciplinas daquela turma, já refletindo no
  diário do professor.
- **Matrículas Semestrais** — clica em "Pesquisar" e mostra: novas,
  veteranos, dependências, estágios, total geral, e a quebra por sala, do
  período letivo ativo.

### Ver Como
Admin "vira" a tela de um professor ou aluno específico (mesmas
permissões). Fica no log de segurança.

---

## Importar Planilhas
Sobe uma planilha (Excel/CSV) com vários alunos de uma vez, matriculando
numa turma escolhida.

---

## Mensagens & Avisos
Envia avisos pra alunos e/ou professores, por turma ou individualmente.

---

## Histórico do Aluno
Busca um aluno, mostra o boletim de todas as disciplinas de todos os
módulos já cursados, com opção de imprimir o Histórico Completo oficial.

---

## Estágio (Secretaria de Estágios)
Busca o aluno e mostra a grade de componentes curriculares de estágio do
curso dele — carga horária, local, professor e nota, com botão "Lançar"
em cada um. Mostra automaticamente o que já foi feito e o que está
pendente.

---

## Movimentação

- **Estágios (Vagas)** — sistema separado de vagas de estágio: vincula um
  grupo de alunos a uma empresa/campo específico, com professor
  responsável, cronograma e ficha de avaliação. Tem a sub-aba **"Estágios
  Realizados e Pendentes"**, que busca o aluno e mostra as duas colunas
  lado a lado.
- **Minicursos e Eventos** — cadastra minicurso/evento (título, instrutor,
  local, data, carga horária, taxa). Inscreve participantes, marca
  presença, gera certificado (modelo pronto ou upload de PDF).

> As demais sub-abas deste menu (Grade Curricular, Matrículas,
> Transferências, Cancelamento, Matrícula de Dependência, Requerimentos,
> Importar Alunos) existem no código mas ficam **escondidas do menu** de
> propósito — duplicam funcionalidade que já existe em outro lugar do
> sistema. "Upload de Documentos" está reservado pro futuro menu "Gerar e
> Requerer Documentos".

---

## Criador de Provas (painel do professor)
Escolhe turma/disciplina, monta o cabeçalho, adiciona questões (múltipla
escolha, objetiva, ou correlacionar colunas), pode inserir imagem e
tabela dentro de uma questão, define frase motivacional (com alinhamento
escolhido) e imprime — com timbre oficial da escola. Opção de incluir
folha de gabarito separada, só pro professor.

---

## Pendências conhecidas / decisões já tomadas

- **Financeiro** e **Relatórios** (menus ocultos) — ainda não investigados.
- **Sala de Aula** e **Módulo como entidade própria** — o banco já tem
  suporte pronto (`salas`, `modulos_curso`, `turmas.sala_id`), só nunca
  foi conectado a nenhuma tela.
- **Upload de Documentos** (dentro de Movimentação) — guardado pro futuro
  menu "Gerar e Requerer Documentos".
- **Histórico Financeiro** (hoje dentro do módulo Pesquisa) — quando o
  menu Financeiro for construído, essa sub-aba deve ser movida/integrada
  pra lá.
