# Como testar se tudo está salvando

## Antes de começar

Na janela preta: `Ctrl + C` → `S` → Enter, depois:

```
npm run dev
```

No navegador: `Ctrl + Shift + R` e entre como `admin`.

---

## O teste que prova tudo

A ideia é simples: cadastrar coisas, **apagar tudo do navegador**, e ver se
voltam. Se voltarem, estão no servidor de verdade.

### 1. Cadastre um pouco de cada coisa

Não precisa ser muito. Um de cada já serve:

- [ ] Um **curso** (Cadastros Acadêmicos → Cadastrar Novo Curso)
- [ ] Uma **turma**
- [ ] Uma **disciplina**
- [ ] Um **aluno**
- [ ] Um **professor**
- [ ] Uma **vaga de estágio** (Movimentação)
- [ ] Um **minicurso/evento** (Movimentação)
- [ ] Um **lead** no CRM
- [ ] Um lançamento no **Financeiro**

Espere uns 5 segundos depois do último cadastro, sem fechar a aba. É o tempo
que o sistema leva para enviar tudo.

### 2. Confirme que não há aviso laranja

Se aparecer a faixa **"Alterações ainda não salvas no servidor"**, pare aqui e
me avise. Ela significa que algo não foi gravado.

### 3. Apague tudo do navegador

1. `F12` → aba **Application** (ou **Aplicativo**)
2. Menu da esquerda: **Local Storage** → `http://localhost:3000`
3. Botão direito → **Clear**
4. `F5`

Você vai cair na tela de login. É o esperado — a sessão também foi apagada.

### 4. Entre de novo e confira

Faça login como `admin` e verifique se **todos** os itens do passo 1 voltaram.

Se voltaram: está salvo no servidor. Esse é o teste real.

---

## Conferindo direto no banco

Outra forma de confirmar, sem depender da tela.

No Supabase: `Ctrl + K` → `Table Editor` → escolha a tabela na lista da esquerda.

| O que você cadastrou | Tabela onde procurar |
|---|---|
| Cursos | `cursos` |
| Turmas | `turmas` |
| Disciplinas | `disciplinas` |
| Alunos | `alunos` |
| Professores | `professores` |
| Notas | `notas` |
| Faltas | `faltas_diretas` |
| Estágios, minicursos, CRM, financeiro | `registros_modulo` |
| Quem alterou nota | `auditoria` |

> Em `registros_modulo` você vai ver linhas com nomes como
> `movimentacao_stage_vacancies` ou `gestao_crm_leads_v1` na coluna
> `ref_externa`. É assim mesmo.

---

## Teste de dois computadores (opcional, mas vale)

Se tiver outro computador na mesma rede, ou puder abrir uma **janela anônima**:

1. Abra `localhost:3000` na janela anônima
2. Entre com `admin`
3. Os dados cadastrados na outra janela devem aparecer

Isso prova que os dados estão no servidor, não presos numa máquina — que era
justamente o problema antes.

---

## Se algo não voltar

Me diga **exatamente qual item** sumiu (ex.: "a vaga de estágio não voltou, o
resto voltou"). Com isso eu localizo o módulo específico.

E mande o console junto: `F12` → aba **Console**. Procuro por linhas com
`[Espelho]`, `[Nuvem]` ou `[Banco]`.

Uma linha útil de conferir logo ao entrar:

```
[Espelho] N conjunto(s) de dados restaurado(s) do servidor.
```

Se o número for `0` depois de você ter cadastrado coisas, a gravação não
aconteceu — e aí o problema é no envio, não na leitura.
