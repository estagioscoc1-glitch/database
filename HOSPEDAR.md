# Colocar o Portal no ar (Cloudflare Pages)

Hoje o portal só funciona no seu computador, com a janela preta aberta. Depois
disto ele fica acessível de qualquer lugar, pela internet, sem depender da sua
máquina estar ligada.

**Custo: zero.** O plano gratuito do Cloudflare cobre folgadamente uma escola
deste porte, e o site não "dorme" como acontece em outros serviços gratuitos.

---

## Antes de começar: o que já deixei pronto

- **`functions/api/helper-bot.ts`** — o assistente adaptado para o Cloudflare.
  Ele não roda Express, então converti a única rota de API que o sistema tem.
- **`src/lib/assistente.ts`** — as respostas do assistente saíram do servidor
  para um arquivo compartilhado, usado tanto aqui quanto no Cloudflare. Assim
  existe **uma cópia só** do texto, e as duas versões nunca divergem.
- **`public/_redirects`** — faz o endereço direto (ex.: `/boletim`) abrir o
  portal em vez de dar erro 404.
- **`.gitignore`** — impede que a chave do banco e os dados dos alunos subam
  para o GitHub. Isso é importante: o repositório é público.

---

## Passo 1 — Enviar o código para o GitHub

O código ainda não está versionado. Abra a caixa **Executar** (tecla Windows +
R), cole e dê Enter — um comando por vez:

```
cmd /k "cd /d C:\Users\andre\Desktop\PORTAL-ACADEMICO-COC-main\PORTAL-ACADEMICO-COC-main && git init && git add . && git commit -m \"Portal Academico COC - versao com Supabase\""
```

Depois, ligue ao seu repositório e envie:

```
cmd /k "cd /d C:\Users\andre\Desktop\PORTAL-ACADEMICO-COC-main\PORTAL-ACADEMICO-COC-main && git branch -M main && git remote add origin https://github.com/estagioscoc1-glitch/PORTAL-ACADEMICO-COC.git && git push -u origin main --force"
```

Ele vai pedir usuário e senha do GitHub. **A senha não é a da sua conta** — é
um token: GitHub → Settings → Developer settings → Personal access tokens →
Generate new token (classic) → marque `repo` → copie e use como senha.

### Confira antes de seguir

Abra o repositório no navegador e verifique que **NÃO** existem lá:
- o arquivo `.env.local`
- a pasta `MAPAS`

Se algum dos dois aparecer, **pare e me avise** — significa que dados de alunos
ou a chave do banco foram publicados, e é preciso desfazer antes de continuar.

---

## Passo 2 — Criar o site no Cloudflare

1. Entre em **dash.cloudflare.com** e crie a conta (gratuita).
2. No menu da esquerda: **Workers & Pages** → **Create** → aba **Pages** →
   **Connect to Git**.
3. Autorize o GitHub e escolha o repositório **PORTAL-ACADEMICO-COC**.
4. Na tela de configuração, preencha:

   | Campo | Valor |
   |---|---|
   | Framework preset | `Vite` |
   | Build command | `npm run build` |
   | Build output directory | `dist` |

5. Ainda nessa tela, abra **Environment variables** e adicione as duas chaves
   do arquivo `.env.local`:

   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

   Copie os valores exatamente como estão no arquivo. **Sem isso o portal sobe,
   mas não conecta no banco** — vai abrir a tela de login e não deixar ninguém
   entrar.

6. Clique em **Save and Deploy** e espere alguns minutos.

Ao final você recebe um endereço parecido com
`portal-academico-coc.pages.dev`. É por ele que a escola acessa.

---

## Passo 3 — Liberar o endereço no Supabase

O banco só aceita conexões de endereços conhecidos. Como o portal mudou de
endereço, é preciso avisar:

1. Painel do Supabase → **Authentication** → **URL Configuration**
2. Em **Site URL**, coloque o endereço novo (`https://...pages.dev`)
3. Em **Redirect URLs**, adicione o mesmo endereço

Sem este passo, a recuperação de senha por e-mail leva a pessoa para o
endereço antigo e não funciona.

---

## Passo 4 — Conferir que subiu certo

Abra o endereço novo e teste, nesta ordem:

1. A tela de login aparece
2. Você entra como administrador
3. Os alunos e as notas aparecem (são os mesmos do banco — não se perdem)
4. O assistente responde (o botão "DÚVIDAS? FALE COMIGO")

Se o login não funcionar, quase sempre é a variável de ambiente do passo 2.5.

---

## Depois disso

- **Toda vez que o código mudar**, envie ao GitHub e o Cloudflare atualiza o
  site sozinho, em poucos minutos.
- **A janela preta não é mais necessária** para a escola usar o portal. Você só
  precisa dela se for mexer no código no seu computador.
- **Endereço próprio** (ex.: `portal.colegiooswaldocruz.com.br`): dá para
  configurar depois, em Custom domains, se a escola tiver um domínio.

---

## O que continua igual

Os dados **não estão no Cloudflare** — continuam no Supabase, onde já estão
hoje. O Cloudflare entrega apenas as telas. Por isso a mudança de endereço não
apaga nem move nada: os 191 alunos e as 1.897 notas seguem exatamente onde
estão.
