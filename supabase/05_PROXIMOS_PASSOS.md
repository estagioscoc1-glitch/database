# O que falta fazer — passo a passo

Duas coisas dependem de você. Depois disso o portal está pronto para testar.

---

## Passo 1 — Publicar a função de cadastro de usuários (10 min)

Sem isso, você não consegue criar login para aluno e professor.

**Por que precisa de uma função no servidor:** criar conta de acesso exige a chave
secreta do projeto. Essa chave ignora todas as regras de segurança — se ela ficasse
no site, qualquer visitante teria acesso total. Então a criação acontece no servidor
do Supabase, onde a chave nunca chega ao navegador.

1. No Supabase, menu da esquerda → **Edge Functions**
2. Clique em **Deploy a new function** → **Via Editor**
3. **Name:** `criar-usuario`
4. Apague o exemplo que vier na tela
5. Abra o arquivo `supabase/functions/criar-usuario/index.ts` (nesta pasta),
   copie **tudo** e cole
6. Clique em **Deploy function**

Não precisa configurar chave nenhuma: `SUPABASE_URL`, `SUPABASE_ANON_KEY` e
`SUPABASE_SERVICE_ROLE_KEY` já existem automaticamente lá dentro.

---

## Passo 2 — Rodar o portal no seu computador (5 min)

1. Abra o **Prompt de Comando** (tecla Windows, digite `cmd`, Enter)
2. Digite exatamente, um por vez:

```
cd %USERPROFILE%\Desktop\PORTAL-ACADEMICO-COC-main\PORTAL-ACADEMICO-COC-main
npm install
npm run dev
```

3. Abra o navegador em **http://localhost:3000**
4. Entre com:
   - **Perfil:** Administração
   - **Usuário:** `admin`
   - **Senha:** a que você criou no Supabase

> Se `npm` não for reconhecido, instale o Node.js em https://nodejs.org (versão LTS)
> e feche/reabra o Prompt de Comando.

---

## O que testar primeiro

- [ ] Entrar como administrador
- [ ] Tentar entrar com a senha errada (deve recusar sem dizer se o usuário existe)
- [ ] Tentar entrar com usuário vazio (antes isso entrava como admin — deve falhar)
- [ ] Tentar a senha `Admin@Lynx2026` (era a senha mestra — deve falhar)
- [ ] Cadastrar um curso, uma turma e uma disciplina
- [ ] Conferir no Supabase → **Table Editor** se apareceram nas tabelas
- [ ] Lançar uma nota e conferir se ela aparece na tabela `notas`
- [ ] Conferir a tabela `auditoria` — a alteração de nota deve estar registrada

---

## O que já está pronto e verificado

| Item | Situação |
|---|---|
| Banco relacional com 26 tabelas | Pronto |
| Regras de acesso por perfil (RLS) | 26/26 testes passando |
| Login com senha em hash no servidor | Pronto |
| Senha mestra e usuários fixos no código | Removidos |
| Firebase | Removido por completo |
| Gravação de nota linha a linha | Pronto |
| Aviso quando não conseguir salvar | Pronto |
| Auditoria de notas e frequência | Pronto |
| Cabeçalhos de segurança + limite no assistente | Pronto |
| `sanitizeInput` corrompendo nomes | Corrigido |

---

## O que ainda fica para depois

Sendo direto sobre o que **não** está pronto:

1. **Financeiro, CRM e estágios** ainda gravam em bloco (tabela `registros_modulo`),
   não em tabelas próprias. Funciona e está protegido, mas não tem a mesma
   estrutura relacional do módulo acadêmico.
2. **Envio de documentos do aluno** (RG, CPF, diploma) continua em modo de
   demonstração na tela. O armazenamento no servidor já está pronto e seguro —
   falta ligar a tela nele.
3. **`imageAssets.ts`** tem 248 KB de imagens em Base64 dentro do código. Precisa
   ir para a pasta `public`. Isso deixa o site mais rápido para todo mundo.
4. **Bloqueio por tentativas de login** ainda é por navegador (um F5 zera).
   O Supabase tem limite próprio no servidor, mas vale reforçar.
5. **Hospedagem** (Netlify) ainda não foi configurada.
6. **Importação de planilhas** precisa de validação de tamanho e número de linhas.
