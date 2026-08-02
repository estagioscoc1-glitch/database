# Passo a passo — criar o banco de dados

Você não precisa entender o SQL. É só seguir na ordem.

---

## Passo 1 — Criar a conta e o projeto

1. Entre em https://supabase.com e clique em **Start your project** (dá para entrar com a conta do GitHub)
2. Clique em **New project**
3. Preencha:
   - **Name:** `portal-academico-coc`
   - **Database Password:** clique em *Generate a password* e **guarde essa senha** num lugar seguro
   - **Region:** escolha **South America (São Paulo)** — importante para velocidade e para a LGPD
   - **Plan:** Free
4. Clique em **Create new project** e espere uns 2 minutos

---

## Passo 2 — Criar as tabelas

1. No menu da esquerda, clique em **SQL Editor**
2. Clique em **New query**
3. Abra o arquivo `01_schema_e_seguranca.sql` (está nesta mesma pasta), copie **tudo** e cole
4. Clique em **Run** (ou Ctrl+Enter)
5. Deve aparecer **Success. No rows returned**

> Se der erro, me mande a mensagem exata que aparecer.

---

## Passo 3 — Criar seu usuário de administrador

1. Menu da esquerda → **Authentication** → **Users**
2. Botão **Add user** → **Create new user**
3. Preencha:
   - **Email:** seu e-mail
   - **Password:** uma senha forte (mínimo 12 caracteres, não reutilize de outro lugar)
   - Marque **Auto Confirm User**
4. Clique em **Create user**
5. Volte em **SQL Editor** → **New query**
6. Abra o arquivo `02_usuario_admin.sql`, copie e cole
7. **Troque** `TROQUE_AQUI@exemplo.com` pelo e-mail que você acabou de usar
8. Clique em **Run** — deve aparecer uma linha com `papel = ADMIN`

---

## Passo 4 — Me mandar as duas chaves de conexão

1. Menu da esquerda → **Project Settings** (engrenagem) → **API**
2. Copie e me mande:
   - **Project URL** (algo como `https://xxxxx.supabase.co`)
   - **anon public** (uma chave longa começando com `eyJ...`)

> Essas duas podem ser compartilhadas — elas ficam visíveis no navegador de qualquer forma,
> e é justamente por isso que toda a proteção está nas regras dentro do banco.
>
> **NUNCA me mande** a chave `service_role` nem a senha do banco. Essas duas dão acesso total
> e devem ficar só com você.

---

## O que já está garantido neste banco

Rodei 26 testes automatizados simulando tentativas de invasão. Todos passaram:

- Visitante sem login não lê **nada** — nem notas, nem alunos, nem usuários
- Aluno vê **só as próprias notas**; a nota do colega volta vazia
- Aluno **não consegue** alterar nem apagar a própria nota
- Aluno **não consegue** se promover a administrador
- Professor vê **só os diários dele** e os alunos das turmas dele
- Professor **não consegue** lançar nota em diário de outro professor
- Professor **não consegue** lançar em diário já fechado
- Professor **não** acessa o financeiro nem a auditoria
- Toda alteração de nota fica **registrada na auditoria**, e nem o administrador consegue apagar esse registro
- Matrícula e nota duplicadas são impedidas pelo banco

Para rodar os testes de novo depois de qualquer mudança:

```
pip install pgserver --break-system-packages
python3 supabase/testes/testar_seguranca.py
```

---

## Arquivos desta pasta

| Arquivo | Para que serve |
|---|---|
| `01_schema_e_seguranca.sql` | Cria todas as tabelas e as regras de acesso |
| `02_usuario_admin.sql` | Cria o primeiro administrador |
| `testes/testar_seguranca.py` | Prova que as regras funcionam |
