# Publicar as funções de login no Supabase

Duas funções de servidor precisam ser publicadas para que a parte de login
funcione por completo. Elas rodam **no Supabase**, não no navegador — é lá que
fica a chave secreta que cria e altera contas.

Estado conferido hoje, direto no servidor:

| Função | Situação |
|---|---|
| `criar-usuario` | Já publicada, mas com a **versão antiga**. Precisa ser atualizada. |
| `redefinir-senha` | **Não existe ainda.** Precisa ser criada. |

Enquanto `redefinir-senha` não for publicada, o botão de redefinir senha no
painel vai responder "Requested function was not found".

---

## Passo 1 — Atualizar `criar-usuario`

1. Supabase → menu lateral → **Edge Functions**
2. Clique na função **criar-usuario**
3. Abra o editor de código dela
4. **Apague tudo** que estiver lá
5. Cole o conteúdo inteiro do arquivo `PASSO_D_funcao_cadastro.txt`
6. Clique em **Deploy**

O que muda nesta versão:

- Passa a aceitar `papel: 'ADMIN'`, permitido **apenas** para quem já é ADMIN.
  Sem isso não havia como criar um segundo administrador.
- Conta de administrador passa a exigir e-mail real.
- O vínculo com a ficha do aluno/professor deixa de falhar em silêncio. Antes,
  se o vínculo não fosse gravado, a conta era criada assim mesmo e a tela dizia
  "acesso criado" — mas a pessoa entrava e encontrava o portal vazio, sem notas
  e sem turma. Agora, se o vínculo falhar, a conta é desfeita e o erro aparece.

## Passo 2 — Criar `redefinir-senha`

1. Supabase → **Edge Functions** → **Deploy a new function**
2. Nome da função: `redefinir-senha` (exatamente assim, com hífen)
3. Cole o conteúdo inteiro do arquivo `PASSO_H_funcao_redefinir_senha.txt`
4. Clique em **Deploy**

Esta é a função que atende "esqueci minha senha". Quem pode chamá-la:

- **ADMIN** → redefine a senha de qualquer pessoa.
- **SECRETARIA** → redefine apenas de aluno e professor.
- Os demais → não conseguem, mesmo tentando por fora do portal.

A secretaria **não** consegue redefinir a senha de um administrador. Se
conseguisse, bastaria uma conta de secretaria comprometida para tomar a conta
do administrador e, com ela, o sistema inteiro.

---

## Passo 3 — Conferir

Depois de publicar as duas, abra o portal e teste:

1. Entre como administrador.
2. Vá em **Gerenciar Usuários Cadastrados**.
3. Clique no ícone de chave ao lado de um aluno qualquer.
4. Deve aparecer uma senha nova na tela, para anotar.
5. Saia e entre com aquele aluno usando a senha nova.
6. O portal deve exigir a troca da senha antes de abrir qualquer tela.

Se o passo 4 disser "Requested function was not found", a função não foi
publicada — refaça o passo 2 conferindo o nome.

---

## Sobre a senha: o que o sistema NÃO faz

Ninguém consegue ver a senha de outra pessoa. Nem o administrador, nem quem
tem acesso ao banco de dados. As senhas são guardadas como hash — um resultado
matemático do qual não se volta para a senha original.

Por isso a recuperação é sempre por **substituição**, nunca por consulta. A
secretaria não descobre a senha antiga: ela gera uma nova e entrega. Quem
recebe é obrigado a trocá-la ao entrar, e a partir daí só essa pessoa a conhece.
